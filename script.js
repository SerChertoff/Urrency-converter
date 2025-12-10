import { roundFiveDigits } from "./helpers.js";

const firstSelect = document.querySelector("[data-first-select]");
const secondSelect = document.querySelector("[data-second-select]");

const swapBtn = document.querySelector("[data-swap-btn]");
const comparisonInfo = document.querySelector("[data-comparison-info]");

const firstInput = document.querySelector("[data-first-input]");
const secondInput = document.querySelector("[data-second-input]");
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

firstSelect.addEventListener("change", () => updateExchangeRates());
secondSelect.addEventListener("change", () => renderInfo());

firstInput.addEventListener("input", () => {
  if (!rates[secondSelect.value]) return;
  const value = parseFloat(firstInput.value) || 0;
  secondInput.value = roundFiveDigits(value * rates[secondSelect.value]);
  renderInfo();
});

secondInput.addEventListener("input", () => {
  if (!rates[secondSelect.value]) return;
  const value = parseFloat(secondInput.value) || 0;
  firstInput.value = roundFiveDigits(value / rates[secondSelect.value]);
  renderInfo();
});

swapBtn.addEventListener("click", () => {
  const temp = firstSelect.value;
  firstSelect.value = secondSelect.value;
  secondSelect.value = temp;

  updateExchangeRates();
});

const updateExchangeRates = async () => {
  try {
    const response = await fetch(`${BASE_URL}/${firstSelect.value}`);
    const data = await response.json();
    rates = data.rates;
    renderInfo();

    // Обновляем активный чип
    document.querySelectorAll(".currency-chip").forEach((chip) => {
      chip.classList.toggle(
        "active",
        chip.getAttribute("data-currency") === firstSelect.value
      );
    });
  } catch (error) {
    console.error(error.message);
  }
};

const renderInfo = () => {
  if (!rates || !rates[secondSelect.value]) {
    comparisonInfo.textContent = "Загрузка...";
    return;
  }

  const rate = roundFiveDigits(rates[secondSelect.value]);
  const formattedRate = rate.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  comparisonInfo.innerHTML = `
    <span style="font-size: 16px; opacity: 0.8;">1 ${firstSelect.value}</span>
    <span style="margin: 0 12px; opacity: 0.5;">=</span>
    <span style="font-size: 22px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${formattedRate}</span>
    <span style="font-size: 16px; opacity: 0.8;">${secondSelect.value}</span>
  `;

  if (document.activeElement !== firstInput) {
    firstInput.value = rates[firstSelect.value] || 1;
  }
  if (document.activeElement !== secondInput) {
    const value = parseFloat(firstInput.value) || 0;
    secondInput.value = roundFiveDigits(value * rates[secondSelect.value]);
  }
};

const populateSelects = () => {
  firstSelect.innerHTML = "";
  secondSelect.innerHTML = "";
  for (const currency of Object.keys(rates)) {
    firstSelect.innerHTML += `
            <option value="${currency}" ${
      currency === FIRST_DEFAULT_CURRENCY ? "selected" : ""
    }>${currency}</option>
        `;
    secondSelect.innerHTML += `
            <option value="${currency}" ${
      currency === SECOND_DEFAULT_CURRENCY ? "selected" : ""
    }>${currency}</option>
        `;
  }
};

// Создание чипов популярных валют
const createPopularCurrencies = () => {
  popularCurrenciesContainer.innerHTML = "";

  POPULAR_CURRENCIES.forEach((currency) => {
    const chip = document.createElement("button");
    chip.className = "currency-chip";
    chip.textContent = `${currency.code} ${currency.symbol}`;
    chip.title = currency.name;
    chip.setAttribute("data-currency", currency.code);

    chip.addEventListener("click", () => {
      // Удаляем активный класс со всех чипов
      document.querySelectorAll(".currency-chip").forEach((c) => {
        c.classList.remove("active");
      });

      // Добавляем активный класс к выбранному
      chip.classList.add("active");

      // Устанавливаем валюту в первый селект
      firstSelect.value = currency.code;
      updateExchangeRates();
    });

    popularCurrenciesContainer.appendChild(chip);
  });
};

const getInitialRates = async () => {
  try {
    const response = await fetch(`${BASE_URL}/${FIRST_DEFAULT_CURRENCY}`);
    const data = await response.json();
    rates = data.rates;
    populateSelects();
    createPopularCurrencies();
    renderInfo();

    // Устанавливаем активный чип для USD
    const usdChip = document.querySelector('[data-currency="USD"]');
    if (usdChip) {
      usdChip.classList.add("active");
    }
  } catch (error) {
    console.error(error.message);
  }
};

getInitialRates();
