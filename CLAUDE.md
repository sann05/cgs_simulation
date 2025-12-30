# CLAUDE.md — CGS Simulation Project

## Обзор проекта

CGS (Capital Growth System) — симулятор DeFi-портфеля для стратегии накопления BTC через залоговое кредитование и LP-позиции. HTML-приложение с Chart.js для визуализации.

## Технический стек

- **Frontend:** Vanilla HTML/CSS/JS (single file)
- **Графики:** Chart.js 4.4.1 (CDN)
- **Деплой:** Vercel (статический хостинг)
- **Защита:** Пароль в sessionStorage

## Структура файлов

```
cgs-simulation/
├── index.html           # Базовая версия (v4.7) — для пользователей
├── index_extended.html  # Расширенная версия (v4.8) — для исследований
├── CLAUDE.md            # Этот файл (инструкции для разработки)
└── README.md            # Документация проекта
```

### Различия версий

| Файл | Версия | Колонки | S/G и Y/L Ratio |
|------|--------|---------|-----------------|
| `index.html` | v4.8 | 14 | Нет |
| `index_extended.html` | v4.9 | 18 | Да (до/после действий) |

#### index.html (базовая)
- Чистая таблица без дополнительных метрик S/G и Y/L
- Для конечных пользователей
- Колонки: Drop, BTC Price, Collateral BTC/$, Debt, HF до, HF после, LTV, GM/CLMM/Reserve/Stability $, BTC добавлено, Действия

#### index_extended.html (расширенная)
- Добавлены колонки: S/G до, S/G после, Y/L до, Y/L после
- Обе версии имеют HF до/после для анализа влияния действий на Health Factor
- Лог показывает ratios до и после действий с дельтами
- Для исследований и анализа эффекта ребалансировки

### Синхронизация изменений

**ВАЖНО:** При изменении общей логики симуляции нужно обновлять ОБА файла!

Общие секции (синхронизировать):
- `runSimulation()` — основной цикл симуляции
- `calcCLMMBtc()` — расчёт BTC при выходе CLMM
- `calcCLMMValue()` — стоимость CLMM в ренже
- `renderCharts()` — графики
- `renderSummary()` — итоговый блок
- CSS стили
- HTML структура параметров

Различающиеся секции (НЕ синхронизировать):
- `renderTable()` — разное количество колонок
- Заголовок таблицы `<thead>`
- Вывод ratios в лог (только в extended)

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
// S/G Ratio (Stability/Growth) — отношение стейблов к залогу
const sgRatio = collateralVal > 0 ? (stabilityZone + reserve) / collateralVal : 0;

// Y/L Ratio (Yield/Loan) — отношение Yield Zone к долгу
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

## Правила разработки

### При изменении расчётов
1. Сначала проверь формулу вручную на бумаге
2. Добавь console.log для промежуточных значений
3. Сравни с ожидаемыми результатами из документации
4. Убедись что все edge cases обработаны (деление на 0, Infinity)
5. **Обнови ОБА файла** если меняешь общую логику

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

## Контакты и ресурсы

- Документация: см. README.md
- Симулятор (базовый): https://cgs-simulation.vercel.app
- Симулятор (extended): https://cgs-simulation.vercel.app/index_extended.html
- Пароль: web3academy_cgs_2025

---

## Версионирование

| Версия | Файл | Описание |
|--------|------|----------|
| v4.8 | index.html | Базовая версия с HF до/после, без S/G и Y/L |
| v4.9 | index_extended.html | Расширенная с HF и ratios до/после |

При обновлении:
1. Инкрементировать версию в `<div class="version">vX.X</div>`
2. Обновить таблицу версий выше
3. Обновить документацию если изменилась логика
4. **Синхронизировать общую логику между файлами**
