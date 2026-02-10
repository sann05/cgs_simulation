# CLAUDE.md — CGS Simulation Project

## Обзор проекта

CGS (Capital Growth System) — симулятор DeFi-портфеля для стратегий накопления BTC через залоговое кредитование и LP-позиции. HTML-приложение с Chart.js для визуализации.

### Модели

| Модель | Цель | Файл |
|--------|------|------|
| **Capital Growth** | Максимальное накопление BTC | `capital_growth.html` |
| **Capital Growth Dynamic** | Накопление BTC (HF-триггеры) | `capital_growth_dynamic.html` |
| **Capital Growth: Full Cycle 2021-2024** | Накопление BTC (реальный медвежий рынок 2021-2022) | `capital_growth_full_cycle_2021.html` |
| **Hybrid Model** | Ежемесячный доход + рост капитала | `hybrid.html` |

### Quiz

| Раздел | Описание | Файл |
|--------|----------|------|
| **CGS Quiz** | Тренировка принятия решений | `quiz.html` |

## Технический стек

- **Frontend:** Vanilla HTML/CSS/JS
- **Общие ресурсы:** `shared.css`, `shared.js`
- **Графики:** Chart.js 4.4.1 (CDN)
- **Деплой:** Vercel (статический хостинг)
- **Защита:** Пароль в sessionStorage

## Структура файлов

```
cgs-simulation/
├── index.html                    # Landing page — выбор модели
├── capital_growth.html           # Capital Growth симуляция
├── capital_growth_dynamic.html   # Capital Growth Dynamic (HF-триггеры)
├── capital_growth_full_cycle_2021.html   # Capital Growth: Full Cycle 2021-2024 (реальный медвежий рынок 2021-2022)
├── index_extended.html           # Capital Growth расширенная (+ S/G, Y/L)
├── hybrid.html                   # Hybrid Model симуляция
├── quiz.html                     # Quiz — тренировка принятия решений
├── shared.css                    # Общие стили для всех страниц
├── shared.js                     # Общие утилиты (auth, форматирование, расчёты)
├── CLAUDE.md                     # Этот файл (инструкции для разработки)
└── README.md                     # Документация проекта
```

### Описание файлов

| Файл | Назначение |
|------|------------|
| `index.html` | Landing page с выбором модели |
| `capital_growth.html` | Capital Growth — базовая версия (v4.8) |
| `capital_growth_dynamic.html` | Capital Growth Dynamic — HF-триггеры (v1.0) |
| `capital_growth_full_cycle_2021.html` | Capital Growth: Full Cycle 2021-2024 — реальный медвежий рынок 2021-2022 (v1.0) |
| `index_extended.html` | Capital Growth — расширенная (v4.9) с S/G и Y/L |
| `hybrid.html` | Hybrid Model (v1.0) |
| `quiz.html` | Quiz — тренировка принятия решений (v1.0) |
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

### DCA → Stability, Yield или Growth Zone
```javascript
// Логика (HF не влияет!)
if (sgRatio < targetSGRatio) → Stability Zone (перекос в Growth)
else if (ylRatio < 1.0) → GM Pool в Yield Zone (Yield Zone мала)
else → BTC в залог (Growth Zone) (всё в норме)
```

**Принцип:** Простая последовательная проверка трех условий для балансировки портфеля.

---

## Capital Growth Dynamic — HF-триггеры

Экспериментальная модификация Capital Growth с триггерами на основе Health Factor.

### Параметры

| Параметр | Значение по умолчанию |
|----------|----------------------|
| HF Trigger | 1.45 |
| HF Target | 1.70 |
| CLMM ренж | -15% / +5% |
| Yield Zone | 40% GM, 30% CLMM, 30% Reserve |

### Логика триггеров

```javascript
// Проверка триггера
if (hfBefore < hfTrigger) {
  // Case 1: CLMM активен и вышел из ренжа
  if (clmmActive && btcPrice <= clmmLowerPrice) {
    // CLMM → BTC в залог
    // Reserve → CLMM#2 (если первый триггер)
  }
  // Case 2: CLMM активен, но ещё в ренже
  else if (clmmActive && btcPrice > clmmLowerPrice) {
    // Ждём выхода CLMM
  }
  // Case 3: CLMM не активен — продаём GM
  else {
    // GM → BTC в залог + USDC для новых GM
    // + Stability Zone подлив (по порядку: 1/3, 1/2, всё)
  }
}
```

### Последовательность триггеров

1. **Триггер #1:** CLMM#1 → BTC, Reserve → CLMM#2
2. **Триггер #2:** CLMM#2 → BTC, CLMM STOP
3. **Триггер #3+:** GM продажа + 1/3 Stability → GM
4. **Триггер #4:** GM продажа + 1/2 оставшейся Stability → GM
5. **Триггер #5:** GM продажа + вся оставшаяся Stability → GM

### Преимущества HF-триггеров

- **Учитывают доходы с DeFi** — прибыль от CLMM/GM реинвестируется в залог
- **Объективная метрика** — HF показывает реальное здоровье позиции
- **Учитывают DCA** — регулярные пополнения могут отодвигать триггеры

---

## Capital Growth: Full Cycle 2021-2024 — Полный цикл от ATH до нового ATH

Симуляция полного рыночного цикла: падение (реальные данные) + восстановление (расчетные данные).

### Параметры полного цикла

| Параметр | Значение |
|----------|----------|
| **Полный период** | **866 дней** (10.11.2021 — 14.03.2024) |
| Начальная цена (ATH 2021) | **$68,982** (10 ноября 2021) |
| Конечная цена (ATH 2024) | **$73,805** (14 марта 2024) |
| **Итоговый результат** | **+7%** (новый ATH) |

### Фаза 1: Падение (Bear Market)

| Параметр | Значение |
|----------|----------|
| Период | **376 дней** (10.11.2021 — 21.11.2022) |
| Цены | $68,982 → $15,768 |
| Падение | **-77.2%** |
| Данные | **Реальные исторические цены** |
| События | Terra Luna crash (май), FTX collapse (ноябрь) |

### Фаза 2: Восстановление (Recovery)

| Параметр | Значение |
|----------|----------|
| Период | **490 дней** (21.11.2022 — 14.03.2024) |
| Цены | $15,768 → $73,805 |
| Рост | **+368%** от минимума |
| Данные | **Расчетные** (ежедневный рост ~0.317%) |
| Ежедневный множитель | 1.003174 |

### Общие параметры

| Параметр | Значение |
|----------|----------|
| HF Trigger | 1.45 (только в фазе падения) |
| HF Target | 1.70 |
| CLMM ренж | -15% / +5% |
| Yield Zone | 40% GM, 30% CLMM, 30% Reserve |

### Логика симуляции

```javascript
const TOTAL_DAYS = 866;  // Full cycle
const BEAR_MARKET_DAYS = 376;  // Phase 1: Bear market
const RECOVERY_DAYS = 490;     // Phase 2: Recovery

// Phase 2 recovery parameters
const RECOVERY_START_PRICE = 15819.79;
const RECOVERY_END_PRICE = 73805;
const DAILY_RECOVERY_MULTIPLIER = Math.pow(RECOVERY_END_PRICE / RECOVERY_START_PRICE, 1 / RECOVERY_DAYS);
// = 1.003174 (daily growth +0.317%)

for (let day = 0; day <= TOTAL_DAYS; day++) {
  let btcPrice;

  if (day <= BEAR_MARKET_DAYS) {
    // Phase 1: Use real historical prices from REAL_BTC_PRICES array
    btcPrice = REAL_BTC_PRICES[day].price;
  } else {
    // Phase 2: Calculate recovery price dynamically
    const recoveryDay = day - BEAR_MARKET_DAYS;
    btcPrice = RECOVERY_START_PRICE * Math.pow(DAILY_RECOVERY_MULTIPLIER, recoveryDay);
  }

  // Triggers work ONLY during Phase 1 (bear market)
  if (day > 0 && day <= BEAR_MARKET_DAYS && hfBefore < hfTrigger) {
    // Trigger logic...
  }
}
```

### Расчет фазы восстановления

Для достижения роста +368% за 490 дней:
- Начальная цена: $15,768 (100%)
- Конечная цена: $73,805 (468%)
- Формула: `finalPrice = initialPrice × (dailyMultiplier)^490`
- `73805 = 15768 × (dailyMultiplier)^490`
- `dailyMultiplier = (73805/15768)^(1/490) = 1.003174`
- **Ежедневный рост: +0.317%**

Проверка: `15768 × 1.003174^490 ≈ 73805` ✓

### Особенности отображения

- **Таблица:** Показывает все 866 дней (376 падение + 490 восстановление)
- **Колонка "Дата":** Реальные даты для Phase 1, расчетные для Phase 2 (формат DD.MM)
- **Маркер фазы:** День 377 помечен как "🟢 НАЧАЛО ФАЗЫ ВОССТАНОВЛЕНИЯ"
- **Графики:** Фильтруются (каждый 20-й день + триггеры) для читабельности
- **Триггеры:** Работают только в фазе падения (дни 1-376)

### Ключевые даты цикла 2021-2024

- **10 ноября 2021** — All-Time High Bitcoin ($68,982)
- **Май 2022** — Крах Terra Luna (усиление давления на рынок)
- **11 ноября 2022** — Крах FTX (катализатор финального падения)
- **21 ноября 2022** — Достижение минимума ($15,768)
- **14 марта 2024** — Новый ATH ($73,805), превышение предыдущего максимума на 7%

### Преимущества симуляции полного цикла

- **Полная картина** — показывает не только падение, но и восстановление
- **Реалистичность** — использует точные исторические цены для фазы падения
- **Долгосрочная перспектива** — 2.4 года от ATH до нового ATH
- **Проверка стратегии** — как Capital Growth работает в полном рыночном цикле
- **Сравнение результатов** — BTC восстановился на +7%, а портфель?
- **Временные рамки** — восстановление заняло на 30% больше времени чем падение

---

## Планы будущей разработки

### Калькулятор DCA
Добавить интерактивный блок для расчёта куда направить DCA:
- Ввод: текущие значения HF, S/G, Y/L
- Вывод: рекомендация куда направить DCA

### Симуляция с APY от DeFi позиций
Расширить симуляцию для учёта:
- APY от CLMM позиций (например 25% годовых)
- APY от GM Pool (пересчет через sqrt)
- APY от Stability Zone (например 10% годовых)
- Реинвестирование доходов в залог

### Алерты и уведомления
Показывать предупреждения когда:
- HF приближается к опасному уровню
- S/G или Y/L сильно отклонились от цели
- Рекомендуется DCA в определённую зону

---

## Quiz — Тренировка принятия решений

### Описание

Quiz для проверки понимания стратегии Capital Growth. Помогает тренировать принятие решений в различных рыночных сценариях.

### Особенности

- 10 случайных вопросов из банка вопросов
- Категории: GM Pool, CLMM, Stability Zone, DCA, DeFi доходы
- Перемешанные варианты ответов (правильный ответ на случайной позиции)
- Детальное отображение сценария: HF, LTV, Debt, распределение портфеля
- Отслеживание ошибок по категориям
- Генерация картинки результата для Discord

### Структура вопроса

Каждый вопрос содержит:
- **Сценарий:** текущая цена BTC, % изменения, HF, LTV, Debt
- **Распределение портфеля:** Growth/Stability с целевыми значениями
- **Yield Zone:** GM Pool, CLMM (с ренжем), Reserve
- **4 варианта ответа:** только 1 правильный

### Добавление новых вопросов

```javascript
{
  id: 17,
  category: "gm",           // gm, clmm, stability, dca, defi
  categoryName: "GM Pool",  // Для отображения
  scenario: {
    btcPrice: 93000,
    btcChange: -7,
    hf: 1.58,
    ltv: 54,
    debt: 30000,
    portfolio: {
      growth: { value: 55800, pct: 58, target: 60 },
      stability: { value: 40000, pct: 42, target: 40 }
    },
    yieldZone: {
      gm: { value: 11600, pct: 40 },
      clmm: { value: 8700, pct: 30, rangeLow: 85000, rangeHigh: 105000 },
      reserve: { value: 9000, pct: 30 }
    }
  },
  question: "Текст вопроса?",
  options: [
    { id: "a", text: "Правильный ответ", correct: true },
    { id: "b", text: "Неправильный ответ", correct: false },
    { id: "c", text: "Неправильный ответ", correct: false },
    { id: "d", text: "Неправильный ответ", correct: false }
  ]
}
```

---

## Контакты и ресурсы

- Документация: см. README.md
- Landing page: https://cgs-simulation.vercel.app
- Capital Growth: https://cgs-simulation.vercel.app/capital_growth.html
- Capital Growth Dynamic: https://cgs-simulation.vercel.app/capital_growth_dynamic.html
- Capital Growth: Full Cycle 2021-2024: https://cgs-simulation.vercel.app/capital_growth_full_cycle_2021.html
- Capital Growth Extended: https://cgs-simulation.vercel.app/index_extended.html
- Hybrid Model: https://cgs-simulation.vercel.app/hybrid.html
- Quiz: https://cgs-simulation.vercel.app/quiz.html
- Пароль: web3academy_cgs_2025

---

## Версионирование

| Версия | Файл | Описание |
|--------|------|----------|
| v1.0 | index.html | Landing page — выбор модели |
| v4.8 | capital_growth.html | Capital Growth базовая |
| v1.0 | capital_growth_dynamic.html | Capital Growth Dynamic (HF-триггеры) |
| v1.0 | capital_growth_full_cycle_2021.html | Capital Growth: Full Cycle 2021-2024 (реальный медвежий рынок 2021-2022) |
| v4.9 | index_extended.html | Capital Growth расширенная с S/G и Y/L |
| v1.0 | hybrid.html | Hybrid Model |
| v1.0 | quiz.html | Quiz — тренировка принятия решений |

При обновлении:
1. Инкрементировать версию в `<div class="version">vX.X</div>`
2. Обновить таблицу версий выше
3. Обновить документацию если изменилась логика
4. **Обновить shared.js если меняется общая функциональность**
5. **Синхронизировать логику между capital_growth.html и index_extended.html**
