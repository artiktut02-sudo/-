let G = loadGame() || defaultState();
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const els = {
  screens: $$(".screen"), 
  money: { desktop: $("#money-desktop"), market: $("#money-market"), workshop: $("#money-workshop"), profile: $("#money-profile"), business: $("#money-business"), inventory: $("#money-inventory"), parts: $("#money-parts") },
  marketList: $("#market-list"), partsMarketList: $("#parts-market-list"), lotOfDay: $("#lot-of-day"),
  workshopEmpty: $("#workshop-empty"), workshopActive: $("#workshop-active"),
  faultsList: $("#faults-list"), partsTray: $("#parts-tray"), solderPanel: $("#solder-panel"), solderProgress: $("#solder-progress"), solderBonus: $("#solder-bonus"),
  btnFinishRepair: $("#btn-finish-repair"), btnReset: $("#btn-reset"), stars: $("#stars"), repValue: $("#rep-value"),
  statRepairs: $("#stat-repairs"), statEarned: $("#stat-earned"), statSales: $("#stat-sales"), statLosses: $("#stat-losses"),
  businessList: $("#business-list"), inventoryList: $("#inventory-list"), invCount: $("#inv-count")
};

let activeDetailLotId = null;

function fmt(n) { return Math.round(n).toLocaleString("ru-RU"); }
function updateMoneyUI() { Object.values(els.money).forEach(el => { if (el) el.textContent = fmt(G.money); }); }
function updateInventoryUI() { if (els.invCount) els.invCount.textContent = `${G.inventory.length}/${G.maxInventory || 50}`; }

function checkSaleStatus() {
  if (G.activeSale) {
    if (Date.now() >= G.activeSale.endTime) {
      G.money += G.activeSale.price;
      G.stats.sales += 1; G.stats.repairs += 1;
      if (G.activeSale.profit >= 0) { G.stats.earned += G.activeSale.profit; G.reputation += 5; } else { G.stats.losses += 1; }
      G.soldLotIds.push(G.activeSale.lotId);
      G.activeSale = null;
      saveGame(G); updateMoneyUI();
      alert("💰 Покупатель нашелся! Деньги зачислены.");
      showScreen("inventory");
    }
  }
}
setInterval(checkSaleStatus, 1000);

setInterval(() => {
  if (G.upgrades.employee && G.inventory.length > 0) {
    const brokenIndex = G.inventory.findIndex(i => !i.faults.every(f => f.done) || !i.backCoverClosed);
    if (brokenIndex !== -1) {
      const item = G.inventory[brokenIndex];
      item.faults.forEach(f => f.done = true);
      item.backCoverClosed = true;
      item.solderDone = true;
      item.faults.forEach(f => { if (G.ownedParts[f.id] > 0) G.ownedParts[f.id]--; });
      saveGame(G);
      if (document.getElementById("screen-inventory").classList.contains("active")) renderInventory();
    }
  }
}, 5000);

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

function renderMarket() {
  const visibleLots = LOTS.filter(l => l.reqRep <= G.reputation).slice(0, 20);
  els.marketList.innerHTML = visibleLots.map(lot => {
    const dev = DEVICES[lot.device];
    const profit = lotProfit(lot);
    return `
      <div class="lot-card" onclick="window.openDeviceDetail('${lot.id}')" style="cursor: pointer;">
        <div class="lot-icon">${dev.svg}</div>
        <div class="lot-info">
          <div class="lot-name">${dev.name}</div>
          <div class="lot-price">${fmt(lot.buy)} ₽</div>
          <div class="lot-faults" style="color:${profit >= 0 ? '#22c55e' : '#ef4444'};">Прибыль: ${profit >= 0 ? '+' : ''}${fmt(profit)} ₽</div>
        </div>
        <div style="color: var(--muted); font-size: 24px;">›</div>
      </div>`;
  }).join("");
}

window.openDeviceDetail = function(lotId) {
  const lot = LOTS.find(l => l.id === lotId);
  if (!lot) return;
  const dev = DEVICES[lot.device];
  const profit = lotProfit(lot);
  
  activeDetailLotId = lotId;
  
  document.getElementById("detail-title").textContent = dev.name;
  document.getElementById("detail-name").textContent = dev.name;
  document.getElementById("detail-desc").textContent = `Оригинальное устройство ${dev.name}. Требует ремонта и замены деталей.`;
  document.getElementById("detail-svg-container").innerHTML = `<div style="width: 120px; height: 120px; margin: 0 auto;">${dev.svg}</div>`;
  
  document.getElementById("detail-faults").innerHTML = lot.faults.map(f => 
    `<span class="fault-chip">${PARTS[f].name}</span>`
  ).join("");
  
  document.getElementById("detail-buy-price").textContent = fmt(lot.buy) + " ₽";
  document.getElementById("detail-profit").textContent = (profit >= 0 ? '+' : '') + fmt(profit) + " ₽";
  document.getElementById("detail-profit").style.color = profit >= 0 ? "var(--accent)" : "var(--danger)";
  
  const btn = document.getElementById("btn-buy-device");
  btn.onclick = () => {
    buyLot(lotId, false);
    showScreen("market");
  };
  
  showScreen("device-detail");
};

function buyLot(lotId, withDiscount) {
  const lot = LOTS.find(l => l.id === lotId);
  if (!lot) return;
  if (G.inventory.length >= (G.maxInventory || 50)) return alert("Склад переполнен! Купите офис.");
  if (G.inventory.some(i => i.lotId === lotId) || G.soldLotIds.includes(lotId)) return alert("Уже куплено!");
  
  const price = withDiscount ? Math.round(lot.buy * 0.6) : lot.buy;
  if (G.money < price) return alert("Не хватает денег!");
  
  G.money -= price;
  G.inventory.push({
    lotId: lot.id, device: lot.device, buyPrice: price, faults: lot.faults.map(f => ({ id: f, done: false })),
    bonus: 0, solderDone: false, repairId: Date.now(), backCoverClosed: false
  });
  
  saveGame(G); updateMoneyUI(); updateInventoryUI();
  alert("📦 Устройство куплено и отправлено на склад!");
}

function renderPartsMarket() {
  els.partsMarketList.innerHTML = Object.keys(PARTS).slice(0, 50).map(id => {
    const p = PARTS[id];
    const price = partPriceWithDiscount(id, G.reputation);
    const count = G.ownedParts[id] || 0;
    return `
      <div class="lot-card">
        <div class="lot-icon">${p.svg}</div>
        <div class="lot-info">
          <div class="lot-name">${p.name}</div>
          <div class="lot-price">${fmt(price)} ₽</div>
          <div class="lot-faults">В инвентаре: ${count} шт.</div>
        </div>
        <button class="btn-primary" onclick="buyPart('${id}', ${price})">Купить</button>
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
  G.activeRepair = { ...G.inventory[idx], backCoverRemoved: false, batteryRemoved: false, backCoverClosed: false };
  G.inventory.splice(idx, 1);
  saveGame(G); updateMoneyUI(); updateInventoryUI(); showScreen("workshop");
};

function renderWorkshop() {
  if (!G.activeRepair) { els.workshopEmpty.classList.remove("hidden"); els.workshopActive.classList.add("hidden"); return; }
  els.workshopEmpty.classList.add("hidden"); els.workshopActive.classList.remove("hidden");
  const r = G.activeRepair;

  els.faultsList.innerHTML = r.faults.map(f => {
    const p = PARTS[f.id]; return `<div class="fault-chip ${f.done ? "fixed" : ""}">${p.name}${f.done ? " ✓" : ""}</div>`;
  }).join("");

  renderPartsTray(r.faults.filter(f => !f.done).map(f => f.id), els.partsTray);

  const deviceDropZone = document.getElementById("device-wrapper-click");
  if (deviceDropZone) {
    bindDragDrop(els.partsTray, deviceDropZone, partId => {
      const fault = r.faults.find(f => f.id === partId && !f.done);
      if (!fault) return;
      
      const isBattery = PARTS[partId]?.name.includes("Батарея");
      if (isBattery && !r.backCoverRemoved) return alert("Сначала снимите крышку!");
      if ((G.ownedParts[partId] || 0) <= 0) return alert("У тебя нет этой запчасти!");
      if (isBattery && !r.batteryRemoved) return alert("Сначала вытащите старую батарею!");

      fault.done = true;
      G.ownedParts[partId] -= 1; 
      if (isBattery) { r.backCoverClosed = false; r.batteryRemoved = true; }
      
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

  G.activeSale = { lotId: item.lotId, price: sellPrice, profit: profit, endTime: Date.now() + 15000 };
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
    const isBought = G.upgrades[upg.id];
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
  G.upgrades[id] = true;
  if (id === "solderPro") G.upgrades.solderBonus = 15;
  if (id === "office") G.maxInventory = 100;
  saveGame(G); updateMoneyUI(); renderBusiness();
};

window.tryLogin = function() {
  const user = document.getElementById("admin-login").value;
  const pass = document.getElementById("admin-password").value;
  if (user === "enjota" && pass === "admin") {
    G.isAdmin = true;
    saveGame(G);
    alert("✅ Добро пожаловать, Админ!");
    showScreen("desktop");
    if (!document.getElementById("admin-panel")) {
      const panel = document.createElement("div");
      panel.id = "admin-panel";
      panel.style.cssText = "position:fixed; bottom:20px; right:20px; background:#000; border:2px solid #fbbf24; padding:10px; border-radius:10px; z-index:9999; color:#fff; font-size:12px; box-shadow: 0 0 20px rgba(0,0,0,0.8);";
      panel.innerHTML = `
        <div style="font-weight:bold; color:#fbbf24; margin-bottom:5px;">👑 АДМИНКА</div>
        <button onclick="window.addMoney(1000000)" style="background:#22c55e; color:#fff; padding:5px 10px; border-radius:5px; margin-bottom:5px; border:none; cursor:pointer;">+1 000 000 ₽</button><br>
        <button onclick="window.addRep(10)" style="background:#8b5cf6; color:#fff; padding:5px 10px; border-radius:5px; border:none; cursor:pointer;">+10 Репутации</button>
      `;
      document.body.appendChild(panel);
    }
  } else {
    alert("❌ Неверный логин или пароль");
  }
};

window.addMoney = function(amount) { G.money += amount; saveGame(G); updateMoneyUI(); };
window.addRep = function(amount) { G.reputation += amount; saveGame(G); renderProfile(); };

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
