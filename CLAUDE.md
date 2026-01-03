# CLAUDE.md — CGS Simulation Project

## Обзор проекта

CGS (Capital Growth System) — симулятор DeFi-портфеля для стратегий накопления BTC через залоговое кредитование и LP-позиции. HTML-приложение с Chart.js для визуализации.

### Две модели

| Модель | Цель | Файл |
|--------|------|------|
| **Capital Growth** | Максимальное накопление BTC | `capital_growth.html` |
| **Hybrid Model** | Ежемесячный доход + рост капитала | `hybrid.html` |

## Технический стек

- **Frontend:** Vanilla HTML/CSS/JS
- **Общие ресурсы:** `shared.css`, `shared.js`
- **Графики:** Chart.js 4.4.1 (CDN)
- **Деплой:** Vercel (статический хостинг)
- **Защита:** Пароль в sessionStorage

## Структура файлов

```
cgs-simulation/
├── index.html              # Landing page — выбор модели
├── capital_growth.html     # Capital Growth симуляция (бывший index.html)
├── index_extended.html     # Capital Growth расширенная (+ S/G, Y/L)
├── hybrid.html             # Hybrid Model симуляция
├── shared.css              # Общие стили для всех страниц
├── shared.js               # Общие утилиты (auth, форматирование, расчёты)
├── CLAUDE.md               # Этот файл (инструкции для разработки)
└── README.md               # Документация проекта
```

### Описание файлов

| Файл | Назначение |
|------|------------|
| `index.html` | Landing page с выбором модели |
| `capital_growth.html` | Capital Growth — базовая версия (v4.8) |
| `index_extended.html` | Capital Growth — расширенная (v4.9) с S/G и Y/L |
| `hybrid.html` | Hybrid Model (v1.0) |
| `shared.css` | Общие CSS стили |
| `shared.js` | Утилиты: auth, fmt(), fmtUSD(), calcCLMM*, chart helpers |

### Shared.js — ключевые функции

```javascript
// Аутентификация
checkPassword()           // Проверка пароля
checkSavedAuth()          // Проверка sessionStorage

// Форматирование
fmt(n, d=2)               // Числа с точностью
fmtUSD(n)                 // Долларовый формат
fmtPct(n, d=1)            // Процентный формат

// CLMM расчёты (Uniswap V3)
calcCLMMBtc(usdc, entry, exit)     // BTC при выходе за ренж
calcCLMMValue(val, entry, cur, lo, hi)  // Стоимость внутри ренжа

// Health Factor / LTV
calcHealthFactor(collateral, debt, liqThresh)
calcLTV(debt, collateral)
getHFClass(hf)            // CSS класс для HF
getLTVClass(ltv)          // CSS класс для LTV

// Графики
createChart(canvasId, labels, config)
createCharts(configs, labels)
```

### Синхронизация изменений

**ВАЖНО:** При изменении общей логики:
1. Обновить `shared.js` если это общая функция
2. Обновить все файлы, использующие эту функцию
3. Обновить документацию (CLAUDE.md, README.md)

#### Capital Growth (синхронизировать между capital_growth.html и index_extended.html):
- `runSimulation()` — основной цикл
- GM и CLMM логика
- `renderCharts()`, `renderSummary()`

#### Различающиеся секции (НЕ синхронизировать):
- `renderTable()` — разные колонки
- `<thead>` — разные заголовки
- S/G и Y/L (только в extended)

---

## Критические формулы (НЕ МЕНЯТЬ без согласования)

### GM токены (AMM / Uniswap V2)
```javascript
// Изменение стоимости GM при изменении цены BTC
gmValue = gmValuePrev * Math.sqrt(btcPrice / btcPricePrev);
```

### CLMM позиции (Uniswap V3)
```javascript
// Liquidity расчёт
const sqrtP0 = Math.sqrt(entryPrice);
const sqrtPa = Math.sqrt(lowerBound);  // -15% от входа
const sqrtPb = Math.sqrt(upperBound);  // +5% от входа
const L = initialValue / (2 * sqrtP0 - entryPrice / sqrtPb - sqrtPa);

// Стоимость внутри ренжа
const x = L * (1 / Math.sqrt(currentPrice) - 1 / sqrtPb);  // BTC
const y = L * (Math.sqrt(currentPrice) - sqrtPa);          // USDC
const value = x * currentPrice + y;

// BTC при выходе за нижнюю границу
const btcReceived = usdcAmount / Math.sqrt(entryPrice * exitPrice);
```

### Health Factor и LTV
```javascript
const hf = (collateralValue * liquidationThreshold) / debt;
const ltv = (debt / collateralValue) * 100;
```

### Метрики портфеля (только в extended версии)
```javascript
// S/G Ratio (Stability/Growth) — отображается как дробь X/Y где X+Y=100
// Формула: S% = Stability / (Stability + Collateral) * 100, G% = 100 - S%
// Пример: при Stability $40k и Collateral $60k → "40/60"
const fmtSG = (stability, collateral) => {
  const total = stability + collateral;
  if (total <= 0) return '-';
  const sPct = Math.round(stability / total * 100);
  return sPct + '/' + (100 - sPct);
};

// Y/L Ratio (Yield/Loan) — отношение Yield Zone к долгу (десятичная дробь)
const ylRatio = debt > 0 ? (gmValue + clmmValue + reserve) / debt : 0;

// "До" — с новой ценой, но до ребалансировки (GM пересчитан, но не продан)
// "После" — после всех действий (продажи, переводы, добавление BTC в залог)
```

---

## Уровни падения и триггеры

| Уровень | GM Action | CLMM Action | Stability Action |
|---------|-----------|-------------|------------------|
| 0% | Начальное состояние | Открыть CLMM#1 | — |
| -7% | Продать 30% | — | — |
| -15% | Продать всё | CLMM#1→BTC, открыть CLMM#2 | — |
| -30% | Продать всё | CLMM#2→BTC, STOP | 30% → GM |
| -40% | *Мониторинг* | — | — |
| -50% | Продать всё | STOP | 40% → GM |
| -60% | *Мониторинг* | — | — |
| -70% | Продать всё | STOP | 30% → GM |

**Мониторинг (-40%, -60%):** Никаких активных действий. GM пересчитывается пассивно, BTC не добавляется в залог. Используется для отслеживания состояния портфеля.

### Особый случай: CLMM = 0%

Если изначально CLMM = 0%, то при -15%:
- CLMM не открывается (её нет)
- **Reserve → GM** (вместо открытия CLMM#2)

---

## Hybrid Model — Логика

### Распределение

При выборе Growth/Stability через слайдер:
- **Growth Zone** — выбранный % (BTC в залоге)
- **Yield Zone** — ½ от Stability + Debt → CLMM
- **Stability Zone** — ½ от оставшегося (стейблкоины)

```javascript
const growthPct = sliderVal / 100;
const totalStabilityPct = (100 - sliderVal) / 100;
const yieldPct = totalStabilityPct / 2;
const stabilityPct = totalStabilityPct / 2;

// CLMM = yieldPct * portfolio + debt
let clmmValue = total * yieldPct + debt;
```

### Параметры по умолчанию

| Параметр | Значение |
|----------|----------|
| Initial LTV | 30% |
| Liquidation Threshold | 85% |
| CLMM APR | 25% |
| Stability APR | 10% |
| CLMM ренж | +10% / -25% |

### Уровни падения и триггеры (Hybrid)

| Уровень | Действие |
|---------|----------|
| 0% | Начальное состояние, CLMM#1 открыта |
| **-25%** | CLMM#1 → BTC → залог. Займ до 30% LTV. Stability + займ → CLMM#2 |
| **-45%** | CLMM#2 → BTC → залог. Займ до 60% LTV. Займ → CLMM#3 |
| **-60%** | CLMM#3 → BTC → залог. STOP |

### Расчёт дохода

```javascript
const monthlyClmm = clmmValue * clmmAPR / 12;
const monthlyStability = stabilityZone * stabilityAPR / 12;
const monthlyTotal = monthlyClmm + monthlyStability;
```

---

## Правила разработки

### ⚠️ ВАЖНО: Обновление документации
**После КАЖДОГО изменения в коде обязательно обнови CLAUDE.md и README.md** со всеми релевантными изменениями:
- Новые формулы и расчёты
- Изменения в логике триггеров
- Новые поля в таблице
- Изменения в отображении данных

### При изменении расчётов
1. Сначала проверь формулу вручную на бумаге
2. Добавь console.log для промежуточных значений
3. Сравни с ожидаемыми результатами из документации
4. Убедись что все edge cases обработаны (деление на 0, Infinity)
5. **Обнови ОБА файла** если меняешь общую логику
6. **Обнови документацию** (CLAUDE.md, README.md)

### При добавлении новых полей в таблицу
1. Добавь `<th>` в header таблицы
2. Добавь расчёт в основной цикл симуляции
3. Добавь отображение в `renderTable()` функции
4. Добавь в детальный лог если нужно
5. Обнови Summary блок если метрика важная
6. **Решить:** добавлять в оба файла или только в extended

### Стилизация
- Цветовая схема: тёмная (#0f0f23, #1a1a3e)
- Акцент: оранжевый (#f7931a) для BTC, зелёный (#00d4aa) для успеха
- Danger: красный (#ff4444), Warning: жёлтый (#ffaa00)
- Все числа форматировать через `fmt()` и `fmtUSD()` функции

### Валидация
```javascript
// Всегда проверять сумму Yield Zone
if (gmPct + clmmPct + reservePct !== 100) {
  alert('⚠️ Сумма Yield Zone должна быть 100%!');
  return;
}
```

---

## Частые ошибки (избегать)

### ❌ Неправильно
```javascript
// Деление без проверки на 0
const ratio = value1 / value2;

// Строковые шаблоны (могут ломаться)
const html = `<div>${value}</div>`;

// Inline обработчики
<input oninput="handleChange(this.value)">
```

### ✅ Правильно
```javascript
// С проверкой
const ratio = value2 > 0 ? value1 / value2 : 0;

// Конкатенация строк
const html = '<div>' + value + '</div>';

// addEventListener
document.getElementById('input').addEventListener('input', handleChange);
```

---

## Тестовые сценарии

### Базовый тест
- Портфель: $100,000
- Growth/Stability: 60/40
- GM/CLMM/Reserve: 40/30/30
- BTC: $100,000
- Ожидаемый начальный HF: 1.70

### Edge cases
1. Reserve = 0% → CLMM не переоткрывается после -15%
2. CLMM = 0% → Только GM в Yield Zone, при -15% Reserve → GM
3. Stability = 0% → Нет докупок при просадках
4. Падение -70% → S/G Ratio должен быть 0 (не Infinity)

---

## Команды деплоя

```bash
# Локальный просмотр
npx serve .

# Деплой на Vercel
vercel --prod
```

---

## Потоки капитала (концепция)

### DeFi доходы → Growth Zone
```
Комиссии CLMM        → Growth Zone (залог)
APY Stability coins  → Growth Zone (залог)
APY Reserve coins    → Growth Zone (залог)
```

### DCA → Stability или Yield Zone
```javascript
// Формулы отклонений
const sgDeviation = Math.abs(currentSG - targetSG) / targetSG;
const ylDeviation = Math.abs(currentYL - 1.0) / 1.0;

// Логика
if (HF < 1.5) → Stability Zone (безопасность)
else if (ylDeviation > sgDeviation) → Yield Zone
else → Stability Zone
```

**Принцип:** DCA идёт в зону с большим отклонением для балансировки.

---

## Планы будущей разработки

### Динамический режим (Dynamic Mode)
Триггеры на основе HF вместо % падения BTC:

| HF | Режим | Описание |
|----|-------|----------|
| < 1.2 | EMERGENCY | Всё → залог |
| 1.2-1.5 | ЗАЩИТА | Только GM, без CLMM |
| 1.5-1.7 | НОРМА | GM активен |
| > 1.7 | РОСТ | Можно открыть CLMM |

### Условия перезапуска CLMM
```
CLMM можно открыть если:
  HF > 1.7          AND
  Reserve > 0       AND
  Y/L > 0.8
```

### Калькулятор DCA
Добавить интерактивный блок для расчёта куда направить DCA:
- Ввод: текущие значения HF, S/G, Y/L
- Вывод: рекомендация куда направить DCA

### Симуляция с DCA и Yield
Расширить симуляцию для учёта:
- Ежемесячных DCA пополнений
- APY от DeFi позиций
- Восстановление позиций после просадок

### Алерты и уведомления
Показывать предупреждения когда:
- HF приближается к опасному уровню
- S/G или Y/L сильно отклонились от цели
- Рекомендуется DCA в определённую зону

---

## Контакты и ресурсы

- Документация: см. README.md
- Landing page: https://cgs-simulation.vercel.app
- Capital Growth: https://cgs-simulation.vercel.app/capital_growth.html
- Capital Growth Extended: https://cgs-simulation.vercel.app/index_extended.html
- Hybrid Model: https://cgs-simulation.vercel.app/hybrid.html
- Пароль: web3academy_cgs_2025

---

## Версионирование

| Версия | Файл | Описание |
|--------|------|----------|
| v1.0 | index.html | Landing page — выбор модели |
| v4.8 | capital_growth.html | Capital Growth базовая |
| v4.9 | index_extended.html | Capital Growth расширенная с S/G и Y/L |
| v1.0 | hybrid.html | Hybrid Model |

При обновлении:
1. Инкрементировать версию в `<div class="version">vX.X</div>`
2. Обновить таблицу версий выше
3. Обновить документацию если изменилась логика
4. **Обновить shared.js если меняется общая функциональность**
5. **Синхронизировать логику между capital_growth.html и index_extended.html**
