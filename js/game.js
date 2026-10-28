let G = loadGame() || defaultState();
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const els = {
  screens: $$(".screen"), money: { desktop: $("#money-desktop"), market: $("#money-market"), workshop: $("#money-workshop"), profile: $("#money-profile"), business: $("#money-business") },
  marketList: $("#market-list"), lotOfDay: $("#lot-of-day"), workshopEmpty: $("#workshop-empty"), workshopActive: $("#workshop-active"),
  faultsList: $("#faults-list"), partsTray: $("#parts-tray"), solderPanel: $("#solder-panel"), solderProgress: $("#solder-progress"), solderBonus: $("#solder-bonus"),
  btnSell: $("#btn-sell"), btnReset: $("#btn-reset"), stars: $("#stars"), repValue: $("#rep-value"),
  statRepairs: $("#stat-repairs"), statEarned: $("#stat-earned"), statSales: $("#stat-sales"), statLosses: $("#stat-losses"),
  businessList: $("#business-list")
};

function fmt(n) { return Math.round(n).toLocaleString("ru-RU"); }
function updateMoneyUI() { Object.values(els.money).forEach(el => { if (el) el.textContent = fmt(G.money); }); }

// Логика асинхронной продажи (Имба-фича)
function checkSaleStatus() {
  if (G.activeSale) {
    const now = Date.now();
    if (now >= G.activeSale.endTime) {
      G.money += G.activeSale.price;
      G.stats.sales += 1; G.stats.repairs += 1;
      if (G.activeSale.profit >= 0) { G.stats.earned += G.activeSale.profit; G.reputation += 1; } else { G.stats.losses += 1; }
      G.soldLotIds.push(G.activeSale.lotId);
      G.activeSale = null;
      saveGame(G); updateMoneyUI();
      alert("✅ Покупатель найден! Девайс продан.");
      showScreen("market");
    }
  }
}
setInterval(checkSaleStatus, 1000); // Проверяем каждую секунду

function showScreen(id) {
  els.screens.forEach(s => s.classList.toggle("active", s.id === "screen-" + id));
  if (id === "market") renderMarket();
  if (id === "workshop") renderWorkshop();
  if (id === "profile") renderProfile();
  if (id === "business") renderBusiness();
}

function todayKey() { return new Date().toISOString().slice(0, 10); }
function getLotOfDay() {
  const available = LOTS.filter(l => l.reqRep <= G.reputation);
  if (!available.length) return null;
  const seed = todayKey().split("-").join("");
  return available[Number(seed) % available.length];
}

function renderLotOfDay() {
  const lot = getLotOfDay();
  if (!lot) { els.lotOfDay.classList.add("hidden"); return; }
  const dev = DEVICES[lot.device];
  const discountPrice = Math.round(lot.buy * 0.6);
  const discountProfit = lot.sell - discountPrice - partsCost(lot.faults);
  els.lotOfDay.classList.remove("hidden");
  els.lotOfDay.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div><div style="font-weight:900;font-size:16px;">${dev.emoji} ${dev.name}</div>
      <div style="font-size:12px;opacity:.9;">Поломки: ${lot.faults.map(f => PARTS[f].name).join(", ")}</div></div>
      <div style="text-align:right;"><div style="text-decoration:line-through;opacity:.6;font-size:12px;">${fmt(lot.buy)} ₽</div>
      <div style="font-weight:900;font-size:18px;color:#fbbf24;">${fmt(discountPrice)} ₽</div></div>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:10px;background:#fff;color:#4a148c;" data-buy-lot="${lot.id}" data-discount="true">Купить (прибыль ~${fmt(discountProfit)} ₽)</button>`;
  els.lotOfDay.querySelector("[data-buy-lot]").addEventListener("click", e => buyLot(e.target.dataset.buyLot, true));
}

function renderMarket() {
  renderLotOfDay();
  els.marketList.innerHTML = LOTS.map(lot => {
    const dev = DEVICES[lot.device];
    const locked = lot.reqRep > G.reputation;
    const profit = lotProfit(lot);
    const alreadyOwned = G.soldLotIds.includes(lot.id);
    const isActive = G.activeRepair && G.activeRepair.lotId === lot.id;
    const isSelling = G.activeSale && G.activeSale.lotId === lot.id;
    let statusBadge = "";
    if (alreadyOwned) statusBadge = `<span style="color:#22c55e;font-size:12px;font-weight:800;">✅ Продано</span>`;
    else if (isActive) statusBadge = `<span style="color:#fbbf24;font-size:12px;font-weight:800;">🔧 В ремонте</span>`;
    else if (isSelling) statusBadge = `<span style="color:#fbbf24;font-size:12px;font-weight:800;">⏳ На продаже</span>`;

    return `
      <div class="lot-card ${locked ? "locked" : ""}">
        <div class="lot-icon">${dev.emoji}</div>
        <div class="lot-info">
          <div class="lot-name">${dev.name}</div>
          <div class="lot-price">${fmt(lot.buy)} ₽</div>
          <div class="lot-faults">Поломки: ${lot.faults.map(f => PARTS[f].name).join(", ")}</div>
        </div>
        <div>
          ${statusBadge}
          ${!locked && !alreadyOwned && !isActive && !isSelling ? `<button class="btn-primary" data-buy-lot="${lot.id}">Купить</button>` : ""}
        </div>
      </div>`;
  }).join("");
  els.marketList.querySelectorAll("[data-buy-lot]").forEach(btn => {
    btn.addEventListener("click", e => buyLot(e.target.dataset.buyLot, false));
  });
}

function buyLot(lotId, withDiscount) {
  const lot = LOTS.find(l => l.id === lotId);
  if (!lot || G.activeRepair) return alert("Сначала закончи текущий ремонт!");
  if (G.soldLotIds.includes(lotId)) return;
  const price = withDiscount ? Math.round(lot.buy * 0.6) : lot.buy;
  if (G.money < price) return alert("Не хватает денег!");
  G.money -= price;
  const partsNeeded = lot.faults.map(f => ({ id: f, done: false }));
  G.activeRepair = { 
    lotId: lot.id, device: lot.device, buyPrice: price, faults: partsNeeded, bonus: 0, solderDone: false,
    backCoverRemoved: false, batteryRemoved: false, backCoverClosed: false
  };
  saveGame(G); updateMoneyUI(); showScreen("workshop");
}

function renderWorkshop() {
  if (!G.activeRepair) { els.workshopEmpty.classList.remove("hidden"); els.workshopActive.classList.add("hidden"); return; }
  els.workshopEmpty.classList.add("hidden"); els.workshopActive.classList.remove("hidden");
  const r = G.activeRepair;

  els.faultsList.innerHTML = r.faults.map(f => {
    const p = PARTS[f.id]; return `<div class="fault-chip ${f.done ? "fixed" : ""}">${p.emoji} ${p.name}${f.done ? " ✓" : ""}</div>`;
  }).join("");

  renderPartsTray(r.faults.filter(f => !f.done).map(f => f.id), els.partsTray);

  // Биндим Drag&Drop на весь SVG
  const deviceSvg = document.getElementById("device-svg");
  if (deviceSvg) {
    bindDragDrop(els.partsTray, deviceSvg, partId => {
      const fault = r.faults.find(f => f.id === partId && !f.done);
      if (!fault) return;
      if (partId === "battery" && !r.backCoverRemoved) return alert("Сначала снимите крышку!");
      fault.done = true;
      G.money -= partPriceWithDiscount(partId, G.reputation);
      if (partId === "battery") r.backCoverClosed = false;
      saveGame(G); updateMoneyUI(); renderWorkshop();
    });
  }

  // Рисуем механики
  renderDeviceMechanics(r);

  // Пайка
  const allFixed = r.faults.every(f => f.done);
  if (allFixed && !r.solderDone) {
    els.solderPanel.classList.remove("hidden"); resetSolderUI(els.solderProgress, els.solderBonus);
    const zone = $("#solder-zone"); const fresh = zone.cloneNode(true); zone.parentNode.replaceChild(fresh, zone);
    startSolderGame(fresh, els.solderProgress, els.solderBonus, bonus => {
      r.bonus = bonus; r.solderDone = true; saveGame(G); renderWorkshop();
    });
  } else if (allFixed && r.solderDone) {
    els.solderPanel.classList.remove("hidden"); els.solderProgress.style.width = "100%"; els.solderBonus.textContent = r.bonus;
  } else { els.solderPanel.classList.add("hidden"); }

  // Кнопка продажи
  const canSell = allFixed && r.backCoverClosed;
  els.btnSell.disabled = !canSell;
  if (canSell) {
    const lot = LOTS.find(l => l.id === r.lotId);
    const sellPrice = finalSellPrice(lot, r.bonus + (G.upgrades.fastSale ? 20 : 0));
    els.btnSell.textContent = `Выставить на продажу за ${fmt(sellPrice)} ₽`;
  } else {
    els.btnSell.textContent = allFixed && !r.backCoverClosed ? "Закройте крышку!" : "Продать девайс";
  }
}

// Имба: выставление на продажу с ожиданием
function sellDevice() {
  const r = G.activeRepair;
  if (!r) return;
  const allFixed = r.faults.every(f => f.done);
  if (!allFixed || !r.backCoverClosed) return;

  const lot = LOTS.find(l => l.id === r.lotId);
  const bonusMultiplier = (r.bonus + (G.upgrades.fastSale ? 20 : 0)) / 100;
  const sellPrice = Math.round(lot.sell * (1 + bonusMultiplier));
  const spentOnParts = r.faults.reduce((sum, f) => sum + partPriceWithDiscount(f.id, G.reputation), 0);
  const profit = sellPrice - r.buyPrice - spentOnParts;

  // Таймер продажи: 15 секунд (для теста, потом можно сделать 10 минут)
  const waitTime = 15000; 
  G.activeSale = { lotId: r.lotId, price: sellPrice, profit: profit, endTime: Date.now() + waitTime };
  G.activeRepair = null;
  
  saveGame(G); updateMoneyUI(); showScreen("market");
  alert("📈 Девайс выставлен на рынок! Покупатель найдется через 15 секунд (для теста).");
}

function renderProfile() {
  const stars = starsFromRep(G.reputation);
  els.stars.textContent = "★".repeat(stars) + "☆".repeat(5 - stars);
  els.repValue.textContent = G.reputation;
  els.statRepairs.textContent = G.stats.repairs;
  els.statEarned.textContent = fmt(G.stats.earned) + " ₽";
  els.statSales.textContent = G.stats.sales;
  els.statLosses.textContent = G.stats.losses;
}

// НОВЫЙ ЭКРАН: Бизнес и Апгрейды
function renderBusiness() {
  els.businessList.innerHTML = UPGRADES.map(upg => {
    const isBought = (upg.id === "fastSale" && G.upgrades.fastSale) || (upg.id === "solderPro" && G.upgrades.solderBonus > 0);
    const locked = G.reputation < upg.reqRep;
    const price = isBought ? "Куплено" : fmt(upg.basePrice) + " ₽";
    return `
      <div class="business-card glass ${locked ? "locked" : ""}">
        <div class="business-info">
          <h3>${upg.name}</h3>
          <p>${upg.desc}</p>
        </div>
        <button class="btn-primary" ${isBought || locked ? "disabled" : ""} onclick="buyUpgrade('${upg.id}', ${upg.basePrice})">
          ${price}
        </button>
      </div>`;
  }).join("");
}

window.buyUpgrade = function(id, price) {
  if (G.money < price) return alert("Не хватает денег!");
  G.money -= price;
  if (id === "solderPro") G.upgrades.solderBonus = 15;
  if (id === "fastSale") G.upgrades.fastSale = true;
  saveGame(G); updateMoneyUI(); renderBusiness();
};

function init() {
  updateMoneyUI();
  $$("[data-screen]").forEach(btn => btn.addEventListener("click", e => { e.preventDefault(); showScreen(btn.dataset.screen); }));
  $$("[data-back]").forEach(btn => btn.addEventListener("click", e => { e.preventDefault(); showScreen("desktop"); }));
  if (els.btnSell) els.btnSell.addEventListener("click", sellDevice);
  if (els.btnReset) els.btnReset.addEventListener("click", () => { if (confirm("Сбросить прогресс?")) { resetGame(); G = defaultState(); saveGame(G); updateMoneyUI(); showScreen("desktop"); }});
  setInterval(() => saveGame(G), 15000);
  showScreen("desktop");
}
document.addEventListener("DOMContentLoaded", init);
