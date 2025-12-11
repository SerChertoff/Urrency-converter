import { roundFiveDigits } from "./helpers.js";

// Кэширование DOM элементов (используем ID для лучшей доступности)
const firstSelect = document.getElementById("firstSelect") || document.querySelector("[data-first-select]");
const secondSelect = document.getElementById("secondSelect") || document.querySelector("[data-second-select]");
const swapBtn = document.querySelector("[data-swap-btn]");
const comparisonInfo = document.querySelector("[data-comparison-info]");
const firstInput = document.getElementById("firstInput") || document.querySelector("[data-first-input]");
const secondInput = document.getElementById("secondInput") || document.querySelector("[data-second-input]");
const popularCurrenciesContainer = document.querySelector(
  "[data-popular-currencies]"
);

const BASE_URL = "https://open.er-api.com/v6/latest";
const FIRST_DEFAULT_CURRENCY = "USD";
const SECOND_DEFAULT_CURRENCY = "RUB";

// 15 самых популярных валют
const POPULAR_CURRENCIES = [
  { code: "USD", name: "Доллар США", symbol: "$" },
  { code: "EUR", name: "Евро", symbol: "€" },
  { code: "GBP", name: "Фунт стерлингов", symbol: "£" },
  { code: "JPY", name: "Японская йена", symbol: "¥" },
  { code: "CNY", name: "Китайский юань", symbol: "¥" },
  { code: "AUD", name: "Австралийский доллар", symbol: "A$" },
  { code: "CAD", name: "Канадский доллар", symbol: "C$" },
  { code: "CHF", name: "Швейцарский франк", symbol: "Fr" },
  { code: "HKD", name: "Гонконгский доллар", symbol: "HK$" },
  { code: "NZD", name: "Новозеландский доллар", symbol: "NZ$" },
  { code: "SEK", name: "Шведская крона", symbol: "kr" },
  { code: "KRW", name: "Южнокорейская вона", symbol: "₩" },
  { code: "SGD", name: "Сингапурский доллар", symbol: "S$" },
  { code: "NOK", name: "Норвежская крона", symbol: "kr" },
  { code: "RUB", name: "Российский рубль", symbol: "₽" },
];

let rates = {};
let currencyChips = new Map(); // Кэш чипов валют
let isUpdating = false; // Флаг для предотвращения одновременных обновлений
let updateTimeout = null; // Таймер для debounce

// Debounce функция
const debounce = (func, wait) => {
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(updateTimeout);
      func(...args);
    };
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(later, wait);
  };
};

// Оптимизированная функция обновления информации
const renderInfo = () => {
  if (!rates || !rates[secondSelect.value]) {
    comparisonInfo.textContent = "Загрузка...";
    comparisonInfo.setAttribute("aria-live", "polite");
    return;
  }

  const rate = roundFiveDigits(rates[secondSelect.value]);
  const formattedRate = rate.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  // Обновляем aria-label для screen readers
  const rateText = `1 ${firstSelect.value} равно ${formattedRate} ${secondSelect.value}`;
  comparisonInfo.setAttribute("aria-label", `Текущий курс обмена: ${rateText}`);

  // Используем textContent для быстрого обновления, затем innerHTML для стилей
  requestAnimationFrame(() => {
    comparisonInfo.innerHTML = `
      <span style="font-size: 16px; opacity: 0.8;">1 ${firstSelect.value}</span>
      <span style="margin: 0 12px; opacity: 0.5;">=</span>
      <span style="font-size: 22px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${formattedRate}</span>
      <span style="font-size: 16px; opacity: 0.8;">${secondSelect.value}</span>
    `;
  });

  // Обновляем значения только если они не в фокусе
  if (document.activeElement !== firstInput) {
    firstInput.value = rates[firstSelect.value] || 1;
  }
  if (document.activeElement !== secondInput) {
    const value = parseFloat(firstInput.value) || 0;
    secondInput.value = roundFiveDigits(value * rates[secondSelect.value]);
  }
};

// Оптимизированная функция обновления курсов
const updateExchangeRates = async () => {
  if (isUpdating) return;
  
  isUpdating = true;
  const selectedCurrency = firstSelect.value;
  
  try {
    const response = await fetch(`${BASE_URL}/${selectedCurrency}`);
    const data = await response.json();
    rates = data.rates;
    
    // Обновляем активный чип
    requestAnimationFrame(() => {
      currencyChips.forEach((chip, code) => {
        chip.classList.toggle("active", code === selectedCurrency);
      });
      renderInfo();
    });
  } catch (error) {
    console.error(error.message);
  } finally {
    isUpdating = false;
  }
};

// Оптимизированная функция заполнения селектов
const populateSelects = () => {
  // Используем DocumentFragment для быстрой вставки
  const currencies = Object.keys(rates).sort();
  const firstFragment = document.createDocumentFragment();
  const secondFragment = document.createDocumentFragment();

  currencies.forEach((currency) => {
    const option1 = document.createElement("option");
    option1.value = currency;
    option1.textContent = currency;
    if (currency === FIRST_DEFAULT_CURRENCY) {
      option1.selected = true;
    }
    firstFragment.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = currency;
    option2.textContent = currency;
    if (currency === SECOND_DEFAULT_CURRENCY) {
      option2.selected = true;
    }
    secondFragment.appendChild(option2);
  });

  firstSelect.innerHTML = "";
  secondSelect.innerHTML = "";
  firstSelect.appendChild(firstFragment);
  secondSelect.appendChild(secondFragment);
};

// Оптимизированное создание чипов популярных валют
const createPopularCurrencies = () => {
  const fragment = document.createDocumentFragment();
  currencyChips.clear();

  POPULAR_CURRENCIES.forEach((currency) => {
    const chip = document.createElement("button");
    chip.className = "currency-chip";
    chip.textContent = `${currency.code} ${currency.symbol}`;
    chip.title = currency.name;
    chip.setAttribute("data-currency", currency.code);
    chip.setAttribute("aria-label", `Выбрать валюту ${currency.name} (${currency.code})`);
    chip.setAttribute("aria-pressed", "false");
    chip.setAttribute("type", "button");

    // Используем делегирование событий через один обработчик
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isUpdating) return;
      
      // Обновляем активные чипы
      currencyChips.forEach((c) => {
        c.classList.remove("active");
        c.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("active");
      chip.setAttribute("aria-pressed", "true");

      // Устанавливаем значение селекта программно
      if (firstSelect) {
        firstSelect.value = currency.code;
        // Триггерим событие change для обновления
        const changeEvent = new Event("change", { bubbles: true });
        firstSelect.dispatchEvent(changeEvent);
      }
      
      // Не фокусируем селект на мобильных устройствах
      if (window.innerWidth > 768) {
        firstSelect.focus();
      }
    });

    // Поддержка клавиатурной навигации
    chip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        chip.click();
      }
    });
    
    // Предотвращаем всплытие событий
    chip.addEventListener("touchstart", (e) => {
      e.stopPropagation();
    });
    
    chip.addEventListener("touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    currencyChips.set(currency.code, chip);
    fragment.appendChild(chip);
  });

  popularCurrenciesContainer.innerHTML = "";
  popularCurrenciesContainer.appendChild(fragment);
};

// Debounced обработчики для input
const handleFirstInput = debounce(() => {
  if (!rates[secondSelect.value]) return;
  const value = parseFloat(firstInput.value) || 0;
  secondInput.value = roundFiveDigits(value * rates[secondSelect.value]);
  renderInfo();
}, 100);

const handleSecondInput = debounce(() => {
  if (!rates[secondSelect.value]) return;
  const value = parseFloat(secondInput.value) || 0;
  firstInput.value = roundFiveDigits(value / rates[secondSelect.value]);
  renderInfo();
}, 100);

// Обработчики событий
firstSelect.addEventListener("change", () => updateExchangeRates());
secondSelect.addEventListener("change", () => renderInfo());
firstInput.addEventListener("input", handleFirstInput);
secondInput.addEventListener("input", handleSecondInput);

swapBtn.addEventListener("click", () => {
  if (isUpdating) return;
  
  const temp = firstSelect.value;
  firstSelect.value = secondSelect.value;
  secondSelect.value = temp;

  updateExchangeRates();
});

// Инициализация
const getInitialRates = async () => {
  try {
    const response = await fetch(`${BASE_URL}/${FIRST_DEFAULT_CURRENCY}`);
    const data = await response.json();
    rates = data.rates;
    
    requestAnimationFrame(() => {
      populateSelects();
      createPopularCurrencies();
      renderInfo();

      const usdChip = currencyChips.get("USD");
      if (usdChip) {
        usdChip.classList.add("active");
      }
    });
  } catch (error) {
    console.error(error.message);
  }
};

getInitialRates();
