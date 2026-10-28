let G = loadGame() || defaultState();
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const els = {
  screens: $$(".screen"), money: { desktop: $("#money-desktop"), market: $("#money-market"), workshop: $("#money-workshop"), profile: $("#money-profile"), business: $("#money-business") },
  marketList: $("#market-list"), lotOfDay: $("#lot-of-day"), workshopEmpty: $("#workshop-empty"), workshopActive: $("#workshop-active"),
  deviceName: $("#device-name"), deviceEmoji: $("#device-emoji"), faultsList: $("#faults-list"), partsTray: $("#parts-tray"),
  deviceZone: $("#device-zone"), solderPanel: $("#solder-panel"), solderProgress: $("#solder-progress"), solderBonus: $("#solder-bonus"),
  btnSell: $("#btn-sell"), btnReset: $("#btn-reset"), stars: $("#stars"), repValue: $("#rep-value"),
  statRepairs: $("#stat-repairs"), statEarned: $("#stat-earned"), statSales: $("#stat-sales"), statLosses: $("#stat-losses")
};

function fmt(n) { return Math.round(n).toLocaleString("ru-RU"); }
function updateMoneyUI() { Object.values(els.money).forEach(el => { if (el) el.textContent = fmt(G.money); }); }

function showScreen(id) {
  els.screens.forEach(s => s.classList.toggle("active", s.id === "screen-" + id));
  if (id === "market") renderMarket();
  if (id === "workshop") renderWorkshop();
  if (id === "profile") renderProfile();
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
      <div><div style="font-weight:700;font-size:15px;">${dev.emoji} ${dev.name}</div>
      <div style="font-size:12px;opacity:.85;">Поломки: ${lot.faults.map(f => PARTS[f].name).join(", ")}</div></div>
      <div style="text-align:right;"><div style="text-decoration:line-through;opacity:.6;font-size:12px;">${fmt(lot.buy)} ₽</div>
      <div style="font-weight:800;font-size:18px;">${fmt(discountPrice)} ₽</div></div>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:10px;background:#fff;color:#4a148c;" data-buy-lot="${lot.id}" data-discount="true">Купить со скидкой (прибыль ~${fmt(discountProfit)} ₽)</button>
  `;
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
    let statusBadge = "";
    if (alreadyOwned) statusBadge = `<span style="color:#22c55e;font-size:12px;">✅ Куплено</span>`;
    else if (isActive) statusBadge = `<span style="color:#fbbf24;font-size:12px;">🔧 В ремонте</span>`;

    return `
      <div class="lot-card ${locked ? "locked" : ""}">
        <div class="lot-head"><div class="lot-name">${dev.emoji} ${dev.name}</div><div class="lot-price">${fmt(lot.buy)} ₽</div></div>
        <div class="lot-faults">Поломки: ${lot.faults.map(f => PARTS[f].name).join(", ")}</div>
        <div class="lot-faults" style="color:${profit >= 0 ? "#22c55e" : "#ef4444"};">Прогноз прибыли: ${
