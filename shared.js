/* CGS Shared JavaScript v1.0 */

// ============================================
// PASSWORD AUTHENTICATION
// ============================================

const CGS_PASSWORD = 'web3academy_cgs_2025';

function checkPassword() {
  const input = document.getElementById('passwordInput').value;
  if (input === CGS_PASSWORD) {
    document.getElementById('passwordOverlay').style.display = 'none';
    document.getElementById('mainContent').classList.remove('content-hidden');
    sessionStorage.setItem('cgs_auth', 'true');
    if (typeof onAuthSuccess === 'function') {
      onAuthSuccess();
    }
  } else {
    document.getElementById('passwordError').style.display = 'block';
    document.getElementById('passwordInput').value = '';
  }
}

function checkSavedAuth() {
  if (sessionStorage.getItem('cgs_auth') === 'true') {
    document.getElementById('passwordOverlay').style.display = 'none';
    document.getElementById('mainContent').classList.remove('content-hidden');
    return true;
  }
  return false;
}

// ============================================
// FORMATTING UTILITIES
// ============================================

const fmt = (n, d = 2) => n.toLocaleString(undefined, {
  minimumFractionDigits: d,
  maximumFractionDigits: d
});

const fmtUSD = n => '$' + n.toLocaleString(undefined, {
  maximumFractionDigits: 0
});

const fmtPct = (n, d = 1) => fmt(n, d) + '%';

const fmtBTC = (n, d = 4) => fmt(n, d) + ' BTC';

// ============================================
// CLMM CALCULATIONS (Uniswap V3)
// ============================================

/**
 * Calculate BTC amount when CLMM position exits range (converts fully to BTC)
 * Uses geometric mean as average execution price
 * @param {number} usdcAmount - Initial USDC value
 * @param {number} entryPrice - Entry price when position was opened
 * @param {number} exitPrice - Exit price (lower bound)
 * @returns {number} BTC amount received
 */
function calcCLMMBtc(usdcAmount, entryPrice, exitPrice) {
  const avgPrice = Math.sqrt(entryPrice * exitPrice);
  return usdcAmount / avgPrice;
}

/**
 * Calculate CLMM position value at current price using V3 formula
 * @param {number} initialValue - Initial position value in USD
 * @param {number} entryPrice - Price when position was opened
 * @param {number} currentPrice - Current BTC price
 * @param {number} lowerPrice - Lower bound of range
 * @param {number} upperPrice - Upper bound of range
 * @returns {number} Current position value in USD
 */
function calcCLMMValue(initialValue, entryPrice, currentPrice, lowerPrice, upperPrice) {
  if (currentPrice <= lowerPrice) {
    // Fully converted to BTC
    const btcAmount = initialValue / Math.sqrt(entryPrice * lowerPrice);
    return btcAmount * currentPrice;
  } else if (currentPrice >= upperPrice) {
    // Fully in USDC
    return initialValue;
  } else {
    // Inside range - V3 formula
    const sqrtP = Math.sqrt(currentPrice);
    const sqrtP0 = Math.sqrt(entryPrice);
    const sqrtPa = Math.sqrt(lowerPrice);
    const sqrtPb = Math.sqrt(upperPrice);

    // L from initial position: V₀ = L × [2√P₀ - P₀/√Pb - √Pa]
    const L = initialValue / (2 * sqrtP0 - entryPrice / sqrtPb - sqrtPa);

    // x (BTC) = L × (1/√P - 1/√Pb)
    const x = L * (1 / sqrtP - 1 / sqrtPb);
    // y (USDC) = L × (√P - √Pa)
    const y = L * (sqrtP - sqrtPa);

    return x * currentPrice + y;
  }
}

/**
 * Calculate liquidity L for a CLMM position
 * @param {number} initialValue - Initial position value in USD
 * @param {number} entryPrice - Price when position was opened
 * @param {number} lowerPrice - Lower bound of range
 * @param {number} upperPrice - Upper bound of range
 * @returns {number} Liquidity value L
 */
function calcCLMMLiquidity(initialValue, entryPrice, lowerPrice, upperPrice) {
  const sqrtP0 = Math.sqrt(entryPrice);
  const sqrtPa = Math.sqrt(lowerPrice);
  const sqrtPb = Math.sqrt(upperPrice);
  return initialValue / (2 * sqrtP0 - entryPrice / sqrtPb - sqrtPa);
}

/**
 * Calculate BTC and USDC amounts in CLMM position
 * @param {number} L - Liquidity
 * @param {number} currentPrice - Current price
 * @param {number} lowerPrice - Lower bound
 * @param {number} upperPrice - Upper bound
 * @returns {Object} {btc, usdc}
 */
function calcCLMMAmounts(L, currentPrice, lowerPrice, upperPrice) {
  const sqrtP = Math.sqrt(currentPrice);
  const sqrtPa = Math.sqrt(lowerPrice);
  const sqrtPb = Math.sqrt(upperPrice);

  if (currentPrice <= lowerPrice) {
    return {
      btc: L * (1 / sqrtPa - 1 / sqrtPb),
      usdc: 0
    };
  } else if (currentPrice >= upperPrice) {
    return {
      btc: 0,
      usdc: L * (sqrtPb - sqrtPa)
    };
  } else {
    return {
      btc: L * (1 / sqrtP - 1 / sqrtPb),
      usdc: L * (sqrtP - sqrtPa)
    };
  }
}

// ============================================
// GM POOL CALCULATIONS (Uniswap V2 / Constant Product)
// ============================================

/**
 * Calculate GM value change based on BTC price change
 * Formula: GM_change = sqrt(P_new / P_old)
 * @param {number} prevValue - Previous GM value
 * @param {number} prevPrice - Previous BTC price
 * @param {number} newPrice - New BTC price
 * @returns {number} New GM value
 */
function calcGMValue(prevValue, prevPrice, newPrice) {
  const ratio = Math.sqrt(newPrice / prevPrice);
  return prevValue * ratio;
}

// ============================================
// HEALTH FACTOR & LTV CALCULATIONS
// ============================================

/**
 * Calculate Health Factor
 * @param {number} collateralValue - Collateral value in USD
 * @param {number} debt - Debt amount in USD
 * @param {number} liqThreshold - Liquidation threshold (e.g., 0.85 for 85%)
 * @returns {number} Health Factor
 */
function calcHealthFactor(collateralValue, debt, liqThreshold) {
  return (collateralValue * liqThreshold) / debt;
}

/**
 * Calculate LTV
 * @param {number} debt - Debt amount in USD
 * @param {number} collateralValue - Collateral value in USD
 * @returns {number} LTV in percentage
 */
function calcLTV(debt, collateralValue) {
  return (debt / collateralValue) * 100;
}

/**
 * Get CSS class for HF value
 * @param {number} hf - Health Factor
 * @returns {string} CSS class name
 */
function getHFClass(hf) {
  return hf > 1.5 ? 'positive' : hf > 1.2 ? 'warning' : 'danger';
}

/**
 * Get CSS class for LTV value
 * @param {number} ltv - LTV percentage
 * @returns {string} CSS class name
 */
function getLTVClass(ltv) {
  return ltv > 75 ? 'danger' : ltv > 65 ? 'warning' : '';
}

// ============================================
// RATIO CALCULATIONS (S/G, Y/L)
// ============================================

/**
 * Calculate S/G Ratio (Stability / Growth)
 * @param {number} stabilityValue - Stability Zone value
 * @param {number} collateralValue - Collateral value (Growth Zone)
 * @returns {number} S/G ratio
 */
function calcSGRatio(stabilityValue, collateralValue) {
  const total = stabilityValue + collateralValue;
  return total > 0 ? stabilityValue / collateralValue : 0;
}

/**
 * Calculate Y/L Ratio (Yield / Loan)
 * @param {number} yieldValue - Total Yield Zone value (GM + CLMM + Reserve)
 * @param {number} debt - Debt amount
 * @returns {number} Y/L ratio
 */
function calcYLRatio(yieldValue, debt) {
  return debt > 0 ? yieldValue / debt : 0;
}

/**
 * Calculate deviation from target
 * @param {number} current - Current value
 * @param {number} target - Target value
 * @returns {number} Deviation percentage
 */
function calcDeviation(current, target) {
  return target > 0 ? Math.abs(current - target) / target * 100 : 0;
}

/**
 * Get CSS class for S/G deviation
 * @param {number} deviation - Deviation percentage
 * @returns {string} CSS class name
 */
function getSGDeviationClass(deviation) {
  return deviation > 20 ? 'danger' : deviation > 10 ? 'warning' : '';
}

/**
 * Get CSS class for Y/L deviation
 * @param {number} deviation - Deviation percentage
 * @returns {string} CSS class name
 */
function getYLDeviationClass(deviation) {
  return deviation > 50 ? 'danger' : deviation > 20 ? 'warning' : '';
}

// ============================================
// INCOME CALCULATIONS
// ============================================

/**
 * Calculate monthly income from APR
 * @param {number} value - Position value in USD
 * @param {number} apr - Annual percentage rate (e.g., 0.25 for 25%)
 * @returns {number} Monthly income in USD
 */
function calcMonthlyIncome(value, apr) {
  return value * apr / 12;
}

/**
 * Calculate annual income from APR
 * @param {number} value - Position value in USD
 * @param {number} apr - Annual percentage rate
 * @returns {number} Annual income in USD
 */
function calcAnnualIncome(value, apr) {
  return value * apr;
}

// ============================================
// CHART UTILITIES
// ============================================

// Global chart storage
const charts = {};

/**
 * Create or update a line chart
 * @param {string} canvasId - Canvas element ID
 * @param {Array} labels - X-axis labels
 * @param {Object} config - Chart configuration
 */
function createChart(canvasId, labels, config) {
  if (charts[canvasId]) {
    charts[canvasId].destroy();
  }

  const ctx = document.getElementById(canvasId).getContext('2d');
  const datasets = [{
    label: config.label,
    data: config.data,
    borderColor: config.color,
    backgroundColor: config.color + '33',
    fill: true,
    tension: 0.3,
    pointRadius: 5
  }];

  if (config.refLine) {
    datasets.push({
      label: config.refLabel,
      data: Array(labels.length).fill(config.refLine),
      borderColor: '#ff4444',
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false
    });
  }

  charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: '#e0e0e0' }
        }
      },
      scales: {
        x: {
          ticks: { color: '#888' },
          grid: { color: '#333' }
        },
        y: {
          ticks: { color: '#888' },
          grid: { color: '#333' }
        }
      }
    }
  });
}

/**
 * Create multiple charts at once
 * @param {Array} configs - Array of chart configurations
 * @param {Array} labels - X-axis labels (shared)
 */
function createCharts(configs, labels) {
  configs.forEach(c => {
    createChart(c.id, labels, c);
  });
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Setup growth/stability slider
 * @param {string} sliderId - Slider input ID
 * @param {string} growthId - Growth value display ID
 * @param {string} stabilityId - Stability value display ID
 */
function setupGrowthSlider(sliderId, growthId, stabilityId) {
  const slider = document.getElementById(sliderId);
  const growthEl = document.getElementById(growthId);
  const stabilityEl = document.getElementById(stabilityId);

  slider.addEventListener('input', function(e) {
    growthEl.textContent = (100 - e.target.value) + '%';
    stabilityEl.textContent = e.target.value + '%';
  });
}

/**
 * Setup yield zone total validation
 * @param {Array} inputIds - Array of input element IDs
 * @param {string} totalId - Total display element ID
 */
function setupYieldTotal(inputIds, totalId) {
  const update = () => {
    const values = inputIds.map(id => +document.getElementById(id).value || 0);
    const total = values.reduce((a, b) => a + b, 0);
    const el = document.getElementById(totalId);
    el.textContent = 'Сумма: ' + total + '% ' + (total === 100 ? '✓' : '✗');
    el.className = 'yield-total ' + (total === 100 ? 'valid' : 'invalid');
    return total === 100;
  };

  inputIds.forEach(id => {
    document.getElementById(id).addEventListener('input', update);
  });

  return update;
}

/**
 * Validate yield zone total equals 100%
 * @param {Array} inputIds - Array of input element IDs
 * @returns {boolean} True if total is 100%
 */
function validateYieldTotal(inputIds) {
  const values = inputIds.map(id => +document.getElementById(id).value || 0);
  const total = values.reduce((a, b) => a + b, 0);

  if (total !== 100) {
    const message = '⚠️ Сумма Yield Zone должна быть 100%!\n\nСейчас: ' + total + '%\n\n' +
      inputIds.map(id => {
        const label = document.querySelector(`label[for="${id}"]`)?.textContent || id;
        const value = +document.getElementById(id).value || 0;
        return label + ': ' + value + '%';
      }).join('\n');
    alert(message);
    return false;
  }
  return true;
}

/**
 * Get numeric value from input
 * @param {string} id - Input element ID
 * @param {number} defaultVal - Default value if empty
 * @returns {number} Numeric value
 */
function getInputValue(id, defaultVal = 0) {
  return +document.getElementById(id).value || defaultVal;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Setup password input enter key
  const passwordInput = document.getElementById('passwordInput');
  if (passwordInput) {
    passwordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') checkPassword();
    });
  }

  // Check saved auth
  if (checkSavedAuth()) {
    if (typeof onAuthSuccess === 'function') {
      onAuthSuccess();
    }
  }
});
