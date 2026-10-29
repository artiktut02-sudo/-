let G = null;

// Загрузка или создание профиля при старте
window.addEventListener("DOMContentLoaded", () => {
  // Скрываем заставку
  setTimeout(() => { 
    const splash = document.getElementById("splash-screen");
    if (splash) splash.classList.add("hidden"); 
  }, 2000);
  
  // Проверяем, есть ли сохранение
  const saved = localStorage.getItem("tehnobaraholka_save_v10");
  if (saved) {
    G = JSON.parse(saved);
    startGame(); // Если есть, сразу заходим
  } else {
    showScreen("login"); // Если нет, просим зарегистрироваться
  }
});

// ФУНКЦИЯ РЕГИСТРАЦИИ / ВХОДА
window.doAuth = function() {
  const login = document.getElementById("auth-login").value.trim();
  const pass = document.getElementById("auth-password").value;
  
  if (login.length < 3 || pass.length < 3) {
    return alert("Логин и пароль должны быть не менее 3 символов!");
  }

  // Секретный вход для админа
  if (login.toLowerCase() === "enjota" && pass === "admin") {
    G = defaultState();
    G.username = "ENJOTA";
    G.isAdmin = true;
    G.money = 99999999; // Много денег для теста
    saveGame(G);
    startGame();
    return;
  }

  // Обычная регистрация (сохраняем логин/пароль в localStorage)
  let users = JSON.parse(localStorage.getItem("tehnobaraholka_users") || "{}");
  
  if (users[login]) {
    if (users[login] !== pass) return alert("Неверный пароль!");
  } else {
    users[login] = pass;
    localStorage.setItem("tehnobaraholka_users", JSON.stringify(users));
    alert("✅ Аккаунт создан! Добро пожаловать.");
  }

  // Создаем новый стейт для игрока
  G = defaultState();
  G.username = login;
  saveGame(G);
  startGame();
};

// ЗАПУСК ИГРЫ (после успешного входа)
function startGame() {
  // Показываем кнопку админки, если мы админ
  if (G.isAdmin) {
    document.getElementById("admin-icon").classList.remove("hidden");
  }
  
  // Обновляем имена
  document.getElementById("welcome-text").textContent = `Добро пожаловать, ${G.username}!`;
  document.getElementById("profile-name").textContent = G.username;
  document.getElementById("stat-total-sales").textContent = G.stats.totalSales || 0;

  updateMoneyUI(); 
  updateInventoryUI();
  
  // Навешиваем обработчики
  document.querySelectorAll("[data-screen]").forEach(btn => { 
    btn.addEventListener("click", e => { e.preventDefault(); showScreen(btn.dataset.screen); }); 
  });
  document.querySelectorAll("[data-back]").forEach(btn => { 
    btn.addEventListener("click", e => { e.preventDefault(); showScreen("desktop"); }); 
  });
  
  if (document.getElementById("btn-finish-repair")) {
    document.getElementById("btn-finish-repair").addEventListener("click", finishRepair);
  }
  
  if (document.getElementById("btn-reset")) {
    document.getElementById("btn-reset").addEventListener("click", () => {
      if (confirm("Сбросить ВЕСЬ прогресс?")) {
        resetGame(); 
        location.reload();
      }
    });
  }

  // Автосохранение
  setInterval(() => saveGame(G), 15000);
  
  // Таймеры продаж и случайных событий
  setInterval(tickEvents, 1000);

  // Переход на рабочий стол
  showScreen("desktop");
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function fmt(n) { return Math.round(n).toLocaleString("ru-RU"); }

function updateMoneyUI() { 
  if (!G) return;
  ["money-desktop", "money-market", "money-workshop", "money-profile", "money-business", "money-inventory", "money-parts"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = fmt(G.money);
  });
}

function updateInventoryUI() { 
  if (!G) return;
  const el = document.getElementById("inv-count");
  if (el) el.textContent = `${G.inventory.length}/${G.maxInventory || 50}`;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + id));
  
  if (id === "market") renderMarket();
  if (id === "parts-market") { currentPartsFilter = "all"; renderPartsMarket(); }
  if (id === "workshop") renderWorkshop();
  if (id === "profile") renderProfile();
  if (id === "business") renderBusiness();
  if (id === "inventory") renderInventory();
  if (id === "leaderboard") renderLeaderboard();
  
  const activeScreen = document.getElementById("screen-" + id);
  if (activeScreen) activeScreen.scrollTop = 0;
}

// ТАЙМЕР СОБЫТИЙ (ПРОДАЖА + ФИРМА)
function tickEvents() {
  if (!G) return;

  // Рандомная продажа для фирмы
  if (G.upgrades.firm) {
    if (Math.random() < 0.1) { // 10% шанс раз в секунду
      const win = Math.floor(Math.random() * 1000000) + 40000;
      G.money += win;
      saveGame(G); updateMoneyUI();
      alert(`🏢 Твоя фирма совершила случайную продажу на ${fmt(win)} ₽!`);
    }
  }

  // Ожидание продажи устройства
  if (G.activeSale) {
    if (Date.now() >= G.activeSale.endTime) {
      if (Math.random() > (G.activeSale.chance || 0.5)) {
        alert("❌ Покупатель передумал. Устройство возвращено на склад.");
        if (G.inventory.length < G.maxInventory) G.inventory.push(G.activeSale.item);
      } else {
        G.money += G.activeSale.price;
        G.stats.sales += 1; 
        G.stats.totalSales = (G.stats.totalSales || 0) + 1;
        if (G.activeSale.profit >= 0) { G.stats.earned += G.activeSale.profit; G.reputation += 5; } 
        else { G.stats.losses += 1; }
        alert(`✅ Товар продан за ${fmt(G.activeSale.price)} ₽!`);
      }
      G.activeSale = null;
      saveGame(G); updateMoneyUI(); renderInventory();
    }
  }
}

// СПАВН УСТРОЙСТВ ИЗ АДМИНКИ
window.spawnDevice = function(type) {
  if (!G.isAdmin) return;
  const keys = Object.keys(DEVICES).filter(k => DEVICES[k].type === type);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const dev = DEVICES[randomKey];
  
  const faultSet = new Set();
  while(faultSet.size < 2) {
    const parts = Object.keys(PARTS).filter(p => PARTS[p].type === type);
    faultSet.add(parts[Math.floor(Math.random() * parts.length)]);
  }
  
  LOTS.unshift({ id: `admin_${Date.now()}`, device: randomKey, buy: Math.round(dev.basePrice * 0.3), sell: dev.basePrice, faults: Array.from(faultSet), reqRep: 0 });
  alert(`👑 Устройство ${dev.name} добавлено на рынок!`);
  showScreen("market");
};

// ЛИДЕРБОРД
function renderLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  const fakeLeaders = [
    { name: G.username, sales: G.stats.totalSales || 0, isMe: true },
    { name: "Иван_Мастер", sales: 145 },
    { name: "ТехноБог", sales: 89 },
    { name: "ProRepair", sales: 42 }
  ];
  
  fakeLeaders.sort((a, b) => b.sales - a.sales);

  list.innerHTML = fakeLeaders.map((u, i) => `
    <div class="lot-card" style="${u.isMe ? 'border: 2px solid var(--gold);' : ''}">
      <div class="lot-icon" style="font-size:24px; font-weight:900; color: ${i===0?'gold':(i===1?'silver':(i===2?'#cd7f32':'#888'))};">#${i+1}</div>
      <div class="lot-info">
        <div class="lot-name">${u.name} ${u.isMe ? '(Ты)' : ''}</div>
        <div class="lot-faults">Всего продаж: ${u.sales}</div>
      </div>
    </div>
  `).join("");
}

// ПРОДАЖА С ВВОДОМ ЦЕНЫ
function renderInventory() {
  updateInventoryUI();
  const container = document.getElementById("inventory-list");
  if (G.inventory.length === 0) {
    container.innerHTML = `<div class="empty-state glass"><div class="empty-icon">📦</div><h3>Склад пуст</h3></div>`;
    return;
  }
  
  container.innerHTML = G.inventory.map((item, index) => {
    const dev = DEVICES[item.device];
    const isFixed = item.faults.every(f => f.done) && item.backCoverClosed;
    return `
      <div class="lot-card">
        <div class="lot-icon">${dev.svg}</div>
        <div class="lot-info">
          <div class="lot-name">${dev.name}</div>
          ${isFixed 
            ? `<div class="lot-price" style="color:var(--accent);">✅ Готов к продаже</div>`
            : `<div class="lot-price" style="color:#ff6b6b;">Сломан</div>`}
        </div>
        <div>
          ${isFixed 
            ? `<button class="btn-primary" onclick="window.openPriceModal(${index})">Продать</button>`
            : `<button class="btn-primary" style="background:linear-gradient(135deg,#f59e0b,#d97706);" onclick="window.startRepair(${index})">Починить</button>`}
        </div>
      </div>`;
  }).join("");
}

window.openPriceModal = function(index) {
  const item = G.inventory[index];
  const dev = DEVICES[item.device];
  const promptPrice = prompt(`Введи цену, за которую хочешь продать ${dev.name}:\n(Рекомендуемая: ${fmt(dev.basePrice)})`);
  
  if (!promptPrice) return;
  const price = parseInt(promptPrice);
  if (isNaN(price) || price <= 0) return alert("Некорректная цена!");

  G.inventory.splice(index, 1);
  
  const waitTime = Math.floor(Math.random() * 10000) + 5000;
  const chance = Math.max(0.2, Math.min(0.95, 1 - (price / (dev.basePrice * 1.5))));
  
  G.activeSale = { 
    item: item, 
    price: price, 
    profit: price - item.buyPrice, 
    endTime: Date.now() + waitTime,
    chance: chance 
  };
  
  saveGame(G); renderInventory();
  alert(`📈 Выставлено за ${fmt(price)} ₽. Ожидание: ${(waitTime/1000).toFixed(0)} сек. Шанс продажи: ${(chance*100).toFixed(0)}%`);
};

window.startRepair = function(index) {
  const item = G.inventory[index];
  G.activeRepair = { ...item, backCoverRemoved: false, batteryRemoved: false, backCoverClosed: false, boltsRemoved: 0 };
  G.inventory.splice(index, 1);
  saveGame(G); updateMoneyUI(); updateInventoryUI(); showScreen("workshop");
};

// МАРКЕТ УСТРОЙСТВ
let currentMarketFilter = "all";
let marketSearchText = "";
let marketLimit = 20;

function renderMarket() {
  let visibleLots = LOTS.filter(l => l.reqRep <= G.reputation);
  if (currentMarketFilter !== "all") visibleLots = visibleLots.filter(l => DEVICES[l.device].type === currentMarketFilter);
  if (marketSearchText) visibleLots = visibleLots.filter(l => DEVICES[l.device].name.toLowerCase().includes(marketSearchText.toLowerCase()));

  const total = visibleLots.length;
  const shown = visibleLots.slice(0, marketLimit);
  const container = document.getElementById("market-list");

  container.innerHTML = shown.map(lot => {
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
  }).join("") || `<div class="empty-state glass"><p>Ничего не найдено.</p></div>`;

  const loadBtn = document.getElementById("load-more-market");
  if (loadBtn) {
    loadBtn.style.display = shown.length < total ? "block" : "none";
    loadBtn.textContent = `Показать ещё (${total - shown.length})`;
  }
}

window.filterMarket = function(type) {
  currentMarketFilter = type; marketLimit = 20;
  document.querySelectorAll("#screen-market .filter-btn").forEach(b => b.classList.remove("active"));
  if(type === 'all') document.getElementById("fm-btn-all")?.classList.add("active");
  if(type === 'phone') document.getElementById("fm-btn-phone")?.classList.add("active");
  if(type === 'pc') document.getElementById("fm-btn-pc")?.classList.add("active");
  renderMarket();
};

window.searchMarket = function(text) { marketSearchText = text; marketLimit = 20; renderMarket(); };
window.loadMoreMarket = function() { marketLimit += 20; renderMarket(); };

// ДЕТАЛИ УСТРОЙСТВА
window.openDeviceDetail = function(lotId) {
  const lot = LOTS.find(l => l.id === lotId);
  if (!lot) return;
  const dev = DEVICES[lot.device];
  const profit = lotProfit(lot);
  
  document.getElementById("detail-title").textContent = dev.name;
  document.getElementById("detail-name").textContent = dev.name;
  document.getElementById("detail-desc").textContent = `Оригинальное устройство ${dev.name}. Требует ремонта.`;
  document.getElementById("detail-svg-container").innerHTML = `<div style="width: 120px; height: 120px; margin: 0 auto;">${dev.svg}</div>`;
  document.getElementById("detail-faults").innerHTML = lot.faults.map(f => `<span class="fault-chip">${PARTS[f].name}</span>`).join("");
  document.getElementById("detail-buy-price").textContent = fmt(lot.buy) + " ₽";
  document.getElementById("detail-profit").textContent = (profit >= 0 ? '+' : '') + fmt(profit) + " ₽";
  document.getElementById("detail-profit").style.color = profit >= 0 ? "var(--accent)" : "var(--danger)";
  
  const btn = document.getElementById("btn-buy-device");
  btn.onclick = () => { buyLot(lotId); showScreen("market"); };
  showScreen("device-detail");
};

function buyLot(lotId) {
  const lot = LOTS.find(l => l.id === lotId);
  if (!lot) return;
  if (G.inventory.length >= (G.maxInventory || 50)) return alert("Склад переполнен!");
  if (G.inventory.some(i => i.lotId === lotId) || G.soldLotIds.includes(lotId)) return alert("Уже куплено!");
  
  if (G.money < lot.buy) return alert("Не хватает денег!");
  
  G.money -= lot.buy;
  G.inventory.push({
    lotId: lot.id, device: lot.device, buyPrice: lot.buy, faults: lot.faults.map(f => ({ id: f, done: false })),
    bonus: 0, solderDone: false, repairId: Date.now(), backCoverClosed: false, 
    backCoverRemoved: false, boltsRemoved: 0, batteryRemoved: false
  });
  G.soldLotIds.push(lot.id);
  
  saveGame(G); updateMoneyUI(); updateInventoryUI();
  alert("📦 Устройство куплено!");
}

// ЗАПЧАСТИ
let currentPartsFilter = "all";
let partsSearchText = "";
let partsLimit = 20;

function renderPartsMarket() {
  let visibleParts = Object.keys(PARTS);
  if (currentPartsFilter !== "all") visibleParts = visibleParts.filter(id => PARTS[id].type === currentPartsFilter);
  if (partsSearchText) visibleParts = visibleParts.filter(id => PARTS[id].name.toLowerCase().includes(partsSearchText.toLowerCase()));

  const total = visibleParts.length;
  const shown = visibleParts.slice(0, partsLimit);
  const container = document.getElementById("parts-market-list");

  container.innerHTML = shown.map(id => {
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
  }).join("") || `<div class="empty-state glass"><p>Ничего не найдено.</p></div>`;

  const loadBtn = document.getElementById("load-more-parts");
  if (loadBtn) {
    loadBtn.style.display = shown.length < total ? "block" : "none";
    loadBtn.textContent = `Показать ещё (${total - shown.length})`;
  }
}

window.filterParts = function(type) {
  currentPartsFilter = type; partsLimit = 20;
  document.querySelectorAll("#screen-parts-market .filter-btn").forEach(b => b.classList.remove("active"));
  if(type === 'all') document.getElementById("f-btn-all")?.classList.add("active");
  if(type === 'phone') document.getElementById("f-btn-phone")?.classList.add("active");
  if(type === 'pc') document.getElementById("f-btn-pc")?.classList.add("active");
  renderPartsMarket();
};

window.searchParts = function(text) { partsSearchText = text; partsLimit = 20; renderPartsMarket(); };
window.loadMoreParts = function() { partsLimit += 20; renderPartsMarket(); };

window.buyPart = function(partId, price) {
  if (G.money < price) return alert("Не хватает денег!");
  G.money -= price;
  G.ownedParts[partId] = (G.ownedParts[partId] || 0) + 1;
  saveGame(G); updateMoneyUI(); renderPartsMarket();
};

// МАСТЕРСКАЯ
function renderWorkshop() {
  const emptyEl = document.getElementById("workshop-empty");
  const activeEl = document.getElementById("workshop-active");
  
  if (!G.activeRepair) { 
    emptyEl.classList.remove("hidden"); 
    activeEl.classList.add("hidden"); 
    return; 
  }
  emptyEl.classList.add("hidden"); 
  activeEl.classList.remove("hidden");
  
  const r = G.activeRepair;
  const dev = DEVICES[r.device];

  const textureEl = document.getElementById("device-texture");
  const backEl = document.getElementById("device-back");
  if (textureEl && dev.textureColor) {
    textureEl.style.borderColor = dev.textureColor;
    backEl.style.background = dev.textureColor;
  }

  const hasBatteryFault = r.faults.some(f => PARTS[f.id]?.key === "battery");
  if (!hasBatteryFault) r.backCoverClosed = true;

  document.getElementById("faults-list").innerHTML = r.faults.map(f => {
    const p = PARTS[f.id]; return `<div class="fault-chip ${f.done ? "fixed" : ""}">${p.name}${f.done ? " ✓" : ""}</div>`;
  }).join("");

  renderPartsTray(null, document.getElementById("parts-tray"));

  const deviceDropZone = document.getElementById("device-wrapper-click");
  if (deviceDropZone) {
    bindDragDrop(document.getElementById("parts-tray"), deviceDropZone, partId => {
      const fault = r.faults.find(f => PARTS[f.id]?.key === PARTS[partId]?.key && !f.done);
      if (PARTS[partId].type !== dev.type) return alert("❌ Эта запчасть не подходит!");
      if (!fault) return alert("Эта запчасть здесь не нужна!");
      const isBattery = PARTS[partId]?.key === "battery";
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
    document.getElementById("solder-panel").classList.remove("hidden"); resetSolderUI(document.getElementById("solder-progress"), document.getElementById("solder-bonus"));
    const zone = document.getElementById("solder-zone"); const fresh = zone.cloneNode(true); zone.parentNode.replaceChild(fresh, zone);
    startSolderGame(fresh, document.getElementById("solder-progress"), document.getElementById("solder-bonus"), bonus => {
      r.bonus = bonus; r.solderDone = true; saveGame(G); renderWorkshop();
    });
  } else if (allFixed && r.solderDone) {
    document.getElementById("solder-panel").classList.remove("hidden"); document.getElementById("solder-progress").style.width = "100%"; document.getElementById("solder-bonus").textContent = r.bonus;
  } else { document.getElementById("solder-panel").classList.add("hidden"); }

  const canFinish = allFixed && r.backCoverClosed;
  const btn = document.getElementById("btn-finish-repair");
  btn.disabled = !canFinish;
  btn.textContent = canFinish ? "Отправить на склад" : (allFixed && !r.backCoverClosed ? "Закройте крышку!" : "Завершить ремонт");
}

function finishRepair() {
  const r = G.activeRepair;
  if (!r) return;
  if (!r.faults.every(f => f.done) || !r.backCoverClosed) return;
  G.inventory.push(r);
  G.activeRepair = null;
  saveGame(G); updateInventoryUI(); showScreen("inventory");
}

// ПРОФИЛЬ И БИЗНЕС
function renderProfile() {
  const stars = starsFromRep(G.reputation);
  document.getElementById("stars").textContent = "★".repeat(stars) + "☆".repeat(5 - stars);
  document.getElementById("rep-value").textContent = G.reputation;
  document.getElementById("stat-repairs").textContent = G.stats.repairs;
  document.getElementById("stat-earned").textContent = fmt(G.stats.earned) + " ₽";
  document.getElementById("stat-sales").textContent = G.stats.sales;
  document.getElementById("stat-losses").textContent = G.stats.losses;
  document.getElementById("stat-total-sales").textContent = G.stats.totalSales || 0;
}

function renderBusiness() {
  document.getElementById("business-list").innerHTML = UPGRADES.map(upg => {
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
