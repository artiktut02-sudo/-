/* ============================================================
   game.js — точка входа: состояние, экраны, покупка, продажа
   ============================================================ */

/* ---------- Глобальное состояние ---------- */
let G = loadGame() || defaultState();

/* ---------- DOM-кэш ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const els = {
  screens: $$(".screen"),
  money: {
    desktop: $("#money-desktop"),
    market: $("#money-market"),
    workshop: $("#money-workshop"),
    profile: $("#money-profile"),
    business: $("#money-business"),
  },
  marketList: $("#market-list"),
  lotOfDay: $("#lot-of-day"),
  workshopEmpty: $("#workshop-empty"),
  workshopActive: $("#workshop-active"),
  deviceName: $("#device-name"),
  deviceEmoji: $("#device-emoji"),
  faultsList: $("#faults-list"),
  partsTray: $("#parts-tray"),
  deviceZone: $("#device-zone"),
  solderPanel: $("#solder-panel"),
  solderProgress: $("#solder-progress"),
  solderBonus: $("#solder-bonus"),
  btnSell: $("#btn-sell"),
  btnReset: $("#btn-reset"),
  stars: $("#stars"),
  repValue: $("#rep-value"),
  statRepairs: $("#stat-repairs"),
  statEarned: $("#stat-earned"),
  statSales: $("#stat-sales"),
  statLosses: $("#stat-losses"),
};

/* ---------- Утилиты ---------- */
function fmt(n) {
  return Math.round(n).toLocaleString("ru-RU");
}

function updateMoneyUI() {
  Object.values(els.money).forEach(el => {
    if (el) el.textContent = fmt(G.money);
  });
}

/* ---------- Переключение экранов ---------- */
function showScreen(id) {
  els.screens.forEach(s => s.classList.toggle("active", s.id === "screen-" + id));
  // При переходе обновляем содержимое соответствующего экрана
  if (id === "market") renderMarket();
  if (id === "workshop") renderWorkshop();
  if (id === "profile") renderProfile();
}

/* ---------- Барахолка ---------- */
function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Выбрать "лот дня" — случайный из доступных, стабильно в течение дня */
function getLotOfDay() {
  const available = LOTS.filter(l => l.reqRep <= G.reputation);
  if (!available.length) return null;
  // простой детерминированный хэш от даты
  const seed = todayKey().split("-").join("");
  const idx = Number(seed) % available.length;
  return available[idx];
}

function renderLotOfDay() {
  const lot = getLotOfDay();
  if (!lot) {
    els.lotOfDay.classList.add("hidden");
    return;
  }
  const dev = DEVICES[lot.device];
  const baseProfit = lotProfit(lot);
  const discountPrice = Math.round(lot.buy * 0.6); // -40%
  const discountProfit = lot.sell - discountPrice - partsCost(lot.faults);

  els.lotOfDay.classList.remove("hidden");
  els.lotOfDay.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:700;font-size:15px;">${dev.emoji} ${dev.name}</div>
        <div style="font-size:12px;opacity:.85;">Поломки: ${lot.faults.map(f => PARTS[f].name).join(", ")}</div>
      </div>
      <div style="text-align:right;">
        <div style="text-decoration:line-through;opacity:.6;font-size:12px;">${fmt(lot.buy)} ₽</div>
        <div style="font-weight:800;font-size:18px;">${fmt(discountPrice)} ₽</div>
      </div>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:10px;background:#fff;color:#4a148c;"
            data-buy-lot="${lot.id}" data-discount="true">
      Купить со скидкой (прибыль ~${fmt(discountProfit)} ₽)
    </button>
  `;

  // навесить обработчик
  els.lotOfDay.querySelector("[data-buy-lot]").addEventListener("click", e => {
    buyLot(e.target.dataset.buyLot, true);
  });
}

function renderMarket() {
  renderLotOfDay();

  els.marketList.innerHTML = LOTS.map(lot => {
    const dev = DEVICES[lot.device];
    const locked = lot.reqRep > G.reputation;
    const profit = lotProfit(lot);
    const alreadyOwned = G.soldLotIds.includes(lot.id);
    const isActive = G.activeRepair && G.activeRepair.lotId === lot.id;

    let statusBadge = "";
    if (alreadyOwned) statusBadge = `<span style="color:#7ee787;font-size:12px;">✅ Куплено</span>`;
    else if (isActive) statusBadge = `<span style="color:#ffab40;font-size:12px;">🔧 В ремонте</span>`;

    const profitColor = profit >= 0 ? "#7ee787" : "#ff6b6b";

    return `
      <div class="lot-card ${locked ? "locked" : ""}">
        <div class="lot-head">
          <div class="lot-name">${dev.emoji} ${dev.name}</div>
          <div class="lot-price">${fmt(lot.buy)} ₽</div>
        </div>
        <div class="lot-faults">Поломки: ${lot.faults.map(f => PARTS[f].name).join(", ")}</div>
        <div class="lot-faults" style="color:${profitColor};">
          Прогноз прибыли: ${profit >= 0 ? "+" : ""}${fmt(profit)} ₽
        </div>
        ${locked ? `<div class="lot-desc">🔒 Нужна репутация ${lot.reqRep}</div>` : ""}
        <div class="lot-actions">
          ${statusBadge}
          ${!locked && !alreadyOwned && !isActive ? `<button class="btn-primary" data-buy-lot="${lot.id}">Купить</button>` : ""}
        </div>
      </div>
    `;
  }).join("");

  // обработчики покупки
  els.marketList.querySelectorAll("[data-buy-lot]").forEach(btn => {
    btn.addEventListener("click", e => buyLot(e.target.dataset.buyLot, false));
  });
}

/* ---------- Покупка лота ---------- */
function buyLot(lotId, withDiscount) {
  const lot = LOTS.find(l => l.id === lotId);
  if (!lot) return;
  if (G.activeRepair) {
    alert("Сначала закончи текущий ремонт в мастерской.");
    return;
  }
  if (G.soldLotIds.includes(lotId)) return;

  const price = withDiscount ? Math.round(lot.buy * 0.6) : lot.buy;
  if (G.money < price) {
    alert("Не хватает денег!");
    return;
  }

  G.money -= price;

  // создаём активный ремонт
  const partsNeeded = lot.faults.map(f => ({ id: f, done: false }));
  G.activeRepair = {
    lotId: lot.id,
    device: lot.device,
    buyPrice: price,
    faults: partsNeeded,
    bonus: 0,
    solderDone: false,
  };

  saveGame(G);
  updateMoneyUI();
  showScreen("workshop");
}

/* ---------- Мастерская ---------- */
function renderWorkshop() {
  if (!G.activeRepair) {
    els.workshopEmpty.classList.remove("hidden");
    els.workshopActive.classList.add("hidden");
    return;
  }
  els.workshopEmpty.classList.add("hidden");
  els.workshopActive.classList.remove("hidden");

  const r = G.activeRepair;
  const dev = DEVICES[r.device];
  els.deviceName.textContent = dev.name;
  els.deviceEmoji.textContent = dev.emoji;

  // Отображаем поломки — починенные помечаем
  els.faultsList.innerHTML = r.faults.map(f => {
    const p = PARTS[f.id];
    return `<div class="fault-chip ${f.done ? "fixed" : ""}">${p.emoji} ${p.name}${f.done ? " ✓" : ""}</div>`;
  }).join("");

  // Какие запчасти осталось установить
  const remaining = r.faults.filter(f => !f.done).map(f => f.id);
  renderPartsTray(remaining, els.partsTray);

  // Drag&Drop
  bindDragDrop(els.partsTray, els.deviceZone, partId => {
    const fault = r.faults.find(f => f.id === partId && !f.done);
    if (!fault) return;
    fault.done = true;

    // списываем стоимость запчасти
    const price = partPriceWithDiscount(partId, G.reputation);
    G.money -= price;

    saveGame(G);
    updateMoneyUI();
    renderWorkshop();
  });

  // Мини-игра "пайка" — показываем, когда все поломки устранены
  const allFixed = r.faults.every(f => f.done);
  if (allFixed && !r.solderDone) {
    els.solderPanel.classList.remove("hidden");
    resetSolderUI(els.solderProgress, els.solderBonus);

    // снимаем старые листенеры, клонируя зону (простой способ)
    const zone = $("#solder-zone");
    const fresh = zone.cloneNode(true);
    zone.parentNode.replaceChild(fresh, zone);

    startSolderGame(fresh, els.solderProgress, els.solderBonus, bonus => {
      r.bonus = bonus;
      r.solderDone = true;
      saveGame(G);
      renderWorkshop();
    });
  } else if (allFixed && r.solderDone) {
    els.solderPanel.classList.remove("hidden");
    els.solderProgress.style.width = "100%";
    els.solderBonus.textContent = r.bonus;
  } else {
    els.solderPanel.classList.add("hidden");
  }

  // Кнопка продажи активна, когда всё починено
  els.btnSell.disabled = !allFixed;
  if (allFixed) {
    const lot = LOTS.find(l => l.id === r.lotId);
    const sellPrice = finalSellPrice(lot, r.bonus);
    els.btnSell.textContent = `Продать за ${fmt(sellPrice)} ₽`;
  } else {
    els.btnSell.textContent = "Продать девайс";
  }
}

/* ---------- Продажа ---------- */
function sellDevice() {
  const r = G.activeRepair;
  if (!r) return;
  const allFixed = r.faults.every(f => f.done);
  if (!allFixed) return;

  const lot = LOTS.find(l => l.id === r.lotId);
  const sellPrice = finalSellPrice(lot, r.bonus);
  const spentOnParts = r.faults.reduce(
    (sum, f) => sum + partPriceWithDiscount(f.id, G.reputation),
    0
  );
  const profit = sellPrice - r.buyPrice - spentOnParts;

  G.money += sellPrice;
  G.stats.sales += 1;
  G.stats.repairs += 1;

  if (profit >= 0) {
    G.stats.earned += profit;
    G.reputation += 1;
  } else {
    G.stats.losses += 1;
  }

  G.soldLotIds.push(r.lotId);
  G.activeRepair = null;

  saveGame(G);
  updateMoneyUI();

  // Простой фидбек
  const msg = profit >= 0
    ? `✅ Продано за ${fmt(sellPrice)} ₽\nПрибыль: +${fmt(profit)} ₽`
    : `⚠️ Продано за ${fmt(sellPrice)} ₽\nУбыток: ${fmt(profit)} ₽`;
  alert(msg);

  showScreen("market");
}

/* ---------- Профиль ---------- */
function renderProfile() {
  const stars = starsFromRep(G.reputation);
  els.stars.textContent = "★".repeat(stars) + "☆".repeat(5 - stars);
  els.repValue.textContent = G.reputation;
  els.statRepairs.textContent = G.stats.repairs;
  els.statEarned.textContent = fmt(G.stats.earned) + " ₽";
  els.statSales.textContent = G.stats.sales;
  els.statLosses.textContent = G.stats.losses;
}

/* ---------- Инициализация ---------- */
function init() {
  updateMoneyUI();

  // Обработчики кнопок навигации
  $$("[data-screen]").forEach(btn => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });

  // Кнопки "назад"
  $$("[data-back]").forEach(btn => {
    btn.addEventListener("click", () => showScreen("desktop"));
  });

  // Продажа
  els.btnSell.addEventListener("click", sellDevice);

  // Сброс
  els.btnReset.addEventListener("click", () => {
    if (confirm("Сбросить весь прогресс?")) {
      resetGame();
      G = defaultState();
      saveGame(G);
      updateMoneyUI();
      showScreen("desktop");
    }
  });

  // Автосохранение каждые 15 секунд
  setInterval(() => saveGame(G), 15000);

  // Стартовый экран
  showScreen("desktop");
}

document.addEventListener("DOMContentLoaded", init);
