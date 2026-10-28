let G = loadGame() || defaultState();
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const els = {
  screens: $$(".screen"), 
  money: { 
    desktop: $("#money-desktop"), market: $("#money-market"), workshop: $("#money-workshop"), 
    profile: $("#money-profile"), business: $("#money-business"), inventory: $("#money-inventory"), parts: $("#money-parts") 
  },
  marketList: $("#market-list"), partsMarketList: $("#parts-market-list"), lotOfDay: $("#lot-of-day"),
  workshopEmpty: $("#workshop-empty"), workshopActive: $("#workshop-active"),
  faultsList: $("#faults-list"), partsTray: $("#parts-tray"), solderPanel: $("#solder-panel"), solderProgress: $("#solder-progress"), solderBonus: $("#solder-bonus"),
  btnFinishRepair: $("#btn-finish-repair"), btnReset: $("#btn-reset"), stars: $("#stars"), repValue: $("#rep-value"),
  statRepairs: $("#stat-repairs"), statEarned: $("#stat-earned"), statSales: $("#stat-sales"), statLosses: $("#stat-losses"),
  businessList: $("#business-list"), inventoryList: $("#inventory-list"), invCount: $("#inv-count")
};

function fmt(n) { return Math.round(n).toLocaleString("ru-RU"); }
function updateMoneyUI() { Object.values(els.money).forEach(el => { if (el) el.textContent = fmt(G.money); }); }

function updateInventoryUI() {
  if (els.invCount) els.invCount.textContent = `${G.inventory.length}/50`;
}

function checkSaleStatus() {
  if (G.activeSale) {
    if (Date.now() >= G.activeSale.endTime) {
      G.money += G.activeSale.price;
      G.stats.sales += 1; G.stats.repairs += 1;
      if (G.activeSale.profit >= 0) { G.stats.earned += G.activeSale.profit; G.reputation += 1; } 
      else { G.stats.losses += 1; }
      G.soldLotIds.push(G.activeSale.lotId);
      G.activeSale = null;
      saveGame(G); updateMoneyUI();
      alert("💰 Покупатель нашелся! Деньги зачислены.");
      showScreen("inventory");
    }
  }
}
setInterval(checkSaleStatus, 1000);

function showScreen(id) {
  els.screens.forEach(s => s.classList.toggle("active", s.id === "screen-" + id));
  if (id === "market") renderMarket();
  if (id === "parts-market") renderPartsMarket();
  if (id === "workshop") renderWorkshop();
  if (id === "profile") renderProfile();
  if (id === "business") renderBusiness();
  if (id === "inventory") renderInventory();
  const activeScreen = document.getElementById("screen-" + id);
  if (activeScreen) activeScreen.scrollTop = 0;
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
  els.lotOfDay.classList.remove("hidden");
  els.lotOfDay.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div><div style="font-weight:900;font-size:16px;">${dev.svg} ${dev.name}</div>
      <div style="font-size:12px;opacity:.9;">Поломки: ${lot.faults.map(f => PARTS[f].name).join(", ")}</div></div>
      <div style="text-align:right;"><div style="text-decoration:line-through;opacity:.6;font-size:12px;">${fmt(lot.buy)} ₽</div>
      <div style="font-weight:900;font-size:18px;color:#fbbf24;">${fmt(discountPrice)} ₽</div></div>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:10px;background:#fff;color:#4a148c;" data-buy-lot="${lot.id}" data-discount="true">Купить в 1 клик</button>`;
  els.lotOfDay.querySelector("[data-buy-lot]").addEventListener("click", e => buyLot(e.target.dataset.buyLot, true));
}

function renderMarket() {
  renderLotOfDay();
  els.marketList.innerHTML = LOTS.map(lot => {
    const dev = DEVICES[lot.device];
    const locked = lot.reqRep > G.reputation;
    const alreadyOwned = G.inventory.some(i => i.lotId === lot.id) || G.soldLotIds.includes(lot.id) || (G.activeRepair && G.activeRepair.lotId === lot.id) || (G.activeSale && G.activeSale.lotId === lot.id);
    return `
      <div class="lot-card ${locked ? "locked" : ""}">
        <div class="lot-icon">${dev.svg}</div>
        <div class="lot-info">
          <div class="lot-name">${dev.name}</div>
          <div class="lot-price">${fmt(lot.buy)} ₽</div>
          <div class="lot-faults">${lot.faults.map(f => PARTS[f].name).join(", ")}</div>
        </div>
        <div>${alreadyOwned ? `<span style="color:#22c55e;font-size:12px;font-weight:800;">Куплено</span>` : `<button class="btn-primary" data-buy-lot="${lot.id}">Купить</button>`}</div>
      </div>`;
  }).join("");
  els.marketList.querySelectorAll("[data-buy-lot]").forEach(btn => btn.addEventListener("click", e => buyLot(e.target.dataset.buyLot, false)));
}

function buyLot(lotId, withDiscount) {
  const lot = LOTS.find(l => l.id === lotId);
  if (!lot) return;
  if (G.inventory.length >= 50) return alert("Склад переполнен! Максимум 50 устройств.");
  if (G.inventory.some(i => i.lotId === lotId) || G.soldLotIds.includes(lotId) || (G.activeRepair && G.activeRepair.lotId === lotId)) return alert("У тебя уже есть это устройство.");
  
  const price = withDiscount ? Math.round(lot.buy * 0.6) : lot.buy;
  if (G.money < price) return alert("Не хватает денег!");
  
  G.money -= price;
  G.inventory.push({
    lotId: lot.id, device: lot.device, buyPrice: price, faults: lot.faults.map(f => ({ id: f, done: false })),
    bonus: 0, solderDone: false, repairId: Date.now()
  });
  
  saveGame(G); updateMoneyUI(); updateInventoryUI();
  alert("📦 Устройство куплено и отправлено на склад!");
}

function renderPartsMarket() {
  els.partsMarketList.innerHTML = Object.values(PARTS).map(p => {
    const price = partPriceWithDiscount(p.id, G.reputation);
    const count = G.ownedParts[p.id] || 0;
    return `
      <div class="lot-card">
        <div class="lot-icon">${p.svg}</div>
        <div class="lot-info">
          <div class="lot-name">${p.name}</div>
          <div class="lot-price">${fmt(price)} ₽</div>
          <div class="lot-faults">В инвентаре: ${count} шт.</div>
        </div>
        <button class="btn-primary" onclick="buyPart('${p.id}', ${price})">Купить</button>
      </div>`;
  }).join("");
}

window.buyPart = function(partId, price) {
  if (G.money < price) return alert("Не хватает денег!");
  G.money -= price;
  G.ownedParts[partId] = (G.ownedParts[partId] || 0) + 1;
  saveGame(G); updateMoneyUI(); renderPartsMarket();
};

function renderInventory() {
  updateInventoryUI();
  if (G.inventory.length === 0) {
    els.inventoryList.innerHTML = `<div class="empty-state glass"><div class="empty-icon">📦</div><h3>Склад пуст</h3><p>Купи устройства на барахолке.</p></div>`;
    return;
  }
  els.inventoryList.innerHTML = G.inventory.map(item => {
    const dev = DEVICES[item.device];
    const isFixed = item.faults.every(f => f.done) && item.backCoverClosed;
    const lot = LOTS.find(l => l.id === item.lotId);
    const sellPrice = Math.round(lot.sell * (1 + (item.bonus/100)));
    
    return `
      <div class="lot-card">
        <div class="lot-icon">${dev.svg}</div>
        <div class="lot-info">
          <div class="lot-name">${dev.name}</div>
          ${isFixed 
            ? `<div class="lot-price">К продаже: ${fmt(sellPrice)} ₽</div><div class="lot-faults" style="color:#22c55e;">✅ Готов к продаже</div>`
            : `<div class="lot-price" style="color:#ff6b6b;">Сломан</div><div class="lot-faults">Требует ремонта</div>`}
        </div>
        <div>
          ${isFixed 
            ? `<button class="btn-primary" onclick="window.listOnMarket(${item.repairId})">Выставить</button>`
            : `<button class="btn-primary" style="background:linear-gradient(135deg,#f59e0b,#d97706);" onclick="window.startRepair(${item.repairId})">Починить</button>`}
        </div>
      </div>`;
  }).join("");
}

window.startRepair = function(repairId) {
  const idx = G.inventory.findIndex(i => i.repairId === repairId);
  if (idx === -1) return;
  const item = G.inventory[idx];
  
  G.activeRepair = { ...item, backCoverRemoved: false, batteryRemoved: false, backCoverClosed: false };
  G.inventory.splice(idx, 1);
  
  saveGame(G); updateMoneyUI(); updateInventoryUI(); showScreen("workshop");
};

function renderWorkshop() {
  if (!G.activeRepair) { 
    if (els.workshopEmpty) els.workshopEmpty.classList.remove("hidden"); 
    if (els.workshopActive) els.workshopActive.classList.add("hidden"); 
    return; 
  }
  if (els.workshopEmpty) els.workshopEmpty.classList.add("hidden"); 
  if (els.workshopActive) els.workshopActive.classList.remove("hidden");
  
  const r = G.activeRepair;

  els.faultsList.innerHTML = r.faults.map(f => {
    const p = PARTS[f.id]; return `<div class="fault-chip ${f.done ? "fixed" : ""}">${p.name}${f.done ? " ✓" : ""}</div>`;
  }).join("");

  renderPartsTray(r.faults.filter(f => !f.done).map(f => f.id), els.partsTray);

  // ИЗМЕНЕНИЕ ЗДЕСЬ: dropEl теперь = весь блок с телефоном
  const deviceDropZone = document.getElementById("device-wrapper-click");
  if (deviceDropZone) {
    bindDragDrop(els.partsTray, deviceDropZone, partId => {
      const fault = r.faults.find(f => f.id === partId && !f.done);
      if (!fault) return;
      if (partId === "battery" && !r.backCoverRemoved) return alert("Сначала снимите крышку!");
      if ((G.ownedParts[partId] || 0) <= 0) return alert("У тебя нет этой запчасти! Купи её в магазине запчастей.");
      
      if (partId === "battery" && !r.batteryRemoved) {
        return alert("Сначала вытащите старую батарею! Нажмите на неё.");
      }

      fault.done = true;
      G.ownedParts[partId] -= 1; 
      if (partId === "battery") {
        r.backCoverClosed = false;
        r.batteryRemoved = true;
      }
      
      saveGame(G); renderWorkshop();
    });
  }

  renderDeviceMechanics(r);

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

  const canFinish = allFixed && r.backCoverClosed;
  els.btnFinishRepair.disabled = !canFinish;
  els.btnFinishRepair.textContent = canFinish ? "Отправить на склад" : (allFixed && !r.backCoverClosed ? "Закройте крышку!" : "Завершить ремонт");
}

function finishRepair() {
  const r = G.activeRepair;
  if (!r) return;
  if (!r.faults.every(f => f.done) || !r.backCoverClosed) return;
  
  G.inventory.push(r);
  G.activeRepair = null;
  saveGame(G); updateInventoryUI(); showScreen("inventory");
}

window.listOnMarket = function(repairId) {
  const idx = G.inventory.findIndex(i => i.repairId === repairId);
  if (idx === -1) return;
  const item = G.inventory[idx];
  const lot = LOTS.find(l => l.id === item.lotId);
  const sellPrice = Math.round(lot.sell * (1 + ((item.bonus + (G.upgrades.fastSale ? 20 : 0))/100)));
  const spentOnParts = item.faults.reduce((sum, f) => sum + partPriceWithDiscount(f.id, G.reputation), 0);
  const profit = sellPrice - item.buyPrice - spentOnParts;

  const waitTime = 15000; 
  G.activeSale = { lotId: item.lotId, price: sellPrice, profit: profit, endTime: Date.now() + waitTime };
  G.inventory.splice(idx, 1);
  
  saveGame(G); updateInventoryUI(); renderInventory();
  alert("📈 Выставлено на продажу! Ждем покупателя (15 сек).");
};

function renderProfile() {
  const stars = starsFromRep(G.reputation);
  els.stars.textContent = "★".repeat(stars) + "☆".repeat(5 - stars);
  els.repValue.textContent = G.reputation;
  els.statRepairs.textContent = G.stats.repairs;
  els.statEarned.textContent = fmt(G.stats.earned) + " ₽";
  els.statSales.textContent = G.stats.sales;
  els.statLosses.textContent = G.stats.losses;
}

function renderBusiness() {
  els.businessList.innerHTML = UPGRADES.map(upg => {
    const isBought = (upg.id === "fastSale" && G.upgrades.fastSale) || (upg.id === "solderPro" && G.upgrades.solderBonus > 0);
    const locked = G.reputation < upg.reqRep;
    const price = isBought ? "Куплено" : fmt(upg.basePrice) + " ₽";
    return `
      <div class="business-card glass ${locked ? "locked" : ""}">
        <div class="business-info"><h3>${upg.name}</h3><p>${upg.desc}</p></div>
        <button class="btn-primary" ${isBought || locked ? "disabled" : ""} onclick="buyUpgrade('${upg.id}', ${upg.basePrice})">${price}</button>
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
  updateMoneyUI(); updateInventoryUI();
  
  $$("[data-screen]").forEach(btn => {
    btn.addEventListener("click", e => { e.preventDefault(); showScreen(btn.dataset.screen); });
  });
  
  $$("[data-back]").forEach(btn => {
    btn.addEventListener("click", e => { e.preventDefault(); showScreen("desktop"); });
  });
  
  if (els.btnFinishRepair) els.btnFinishRepair.addEventListener("click", finishRepair);
  
  if (els.btnReset) {
    els.btnReset.addEventListener("click", () => {
      if (confirm("Вы уверены, что хотите сбросить ВЕСЬ прогресс?")) {
        resetGame(); G = defaultState(); saveGame(G); updateMoneyUI(); updateInventoryUI(); showScreen("desktop");
      }
    });
  }
  
  setInterval(() => saveGame(G), 15000);
  showScreen("desktop");
}

document.addEventListener("DOMContentLoaded", init);
