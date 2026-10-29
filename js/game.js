let G = null;

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => { document.getElementById("splash-screen")?.classList.add("hidden"); }, 2000);
  
  const saved = localStorage.getItem("tehnobaraholka_save_v12");
  if (saved) {
    G = JSON.parse(saved);
    startGame();
  } else {
    showScreen("login");
  }
});

window.doAuth = function() {
  const login = document.getElementById("auth-login").value.trim();
  const pass = document.getElementById("auth-password").value;
  
  if (login.length < 3 || pass.length < 3) return alert("Логин и пароль от 3 символов!");

  let users = JSON.parse(localStorage.getItem("tehnobaraholka_users_db") || "{}");
  
  if (login.toLowerCase() === "enjota" && pass === "admin") {
    G = defaultState("ENJOTA");
    G.money = 99999999;
    saveGame(G);
    startGame();
    return;
  }

  if (!users[login]) {
    users[login] = { pass: pass };
    localStorage.setItem("tehnobaraholka_users_db", JSON.stringify(users));
    alert("✅ Аккаунт создан!");
  } else {
    if (users[login].pass !== pass) return alert("Неверный пароль!");
  }

  G = loadGame(login);
  if (!G) {
    G = defaultState(login);
    saveGame(G);
  }
  startGame();
};

window.logout = function() {
  if(confirm("Выйти?")) { location.reload(); }
};

function startGame() {
  if (G.isAdmin) document.getElementById("admin-icon").classList.remove("hidden");
  
  document.getElementById("welcome-text").textContent = `Добро пожаловать, ${G.username}!`;
  document.getElementById("profile-name").textContent = G.username;
  document.getElementById("stat-total-sales").textContent = G.stats.totalSales || 0;

  updateMoneyUI(); updateInventoryUI();
  
  document.querySelectorAll("[data-screen]").forEach(btn => { 
    btn.addEventListener("click", e => { e.preventDefault(); showScreen(btn.dataset.screen); }); 
  });
  document.querySelectorAll("[data-back]").forEach(btn => { 
    btn.addEventListener("click", e => { e.preventDefault(); showScreen("desktop"); }); 
  });
  
  document.getElementById("btn-finish-repair")?.addEventListener("click", finishRepair);
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    if (confirm("Сбросить прогресс?")) { resetGame(); location.reload(); }
  });

  setInterval(() => saveGame(G), 10000);
  setInterval(tickEvents, 1000);
  showScreen("desktop");
}

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
  if (id === "parts-market") renderPartsMarket();
  if (id === "workshop") renderWorkshop();
  if (id === "profile") renderProfile();
  if (id === "business") renderBusiness();
  if (id === "inventory") renderInventory();
  if (id === "leaderboard") renderLeaderboard();
  if (id === "admin") renderAdminPanel();
  const activeScreen = document.getElementById("screen-" + id);
  if (activeScreen) activeScreen.scrollTop = 0;
}

function tickEvents() {
  if (!G) return;
  if (G.upgrades.firm && Math.random() < 0.1) {
    const win = Math.floor(Math.random() * 1000000) + 40000;
    G.money += win;
    saveGame(G); updateMoneyUI();
    alert(`🏢 Твоя фирма совершила случайную продажу на ${fmt(win)} ₽!`);
  }

  if (G.activeSale && Date.now() >= G.activeSale.endTime) {
    if (Math.random() > G.activeSale.chance) {
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

function renderLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  const users = JSON.parse(localStorage.getItem("tehnobaraholka_users_db") || "{}");
  const players = Object.keys(users).map(name => ({
    name: name,
    sales: users[name].sales || 0,
    isMe: name === G.username
  }));
  players.sort((a, b) => b.sales - a.sales);

  list.innerHTML = players.map((u, i) => `
    <div class="lot-card" style="${u.isMe ? 'border: 2px solid var(--gold);' : ''}">
      <div class="lot-icon" style="font-size:20px; font-weight:900; color: ${i===0?'gold':(i===1?'silver':(i===2?'#cd7f32':'#888'))};">#${i+1}</div>
      <div class="lot-info">
        <div class="lot-name">${u.name} ${u.isMe ? '(Ты)' : ''}</div>
        <div class="lot-faults">Всего продаж: ${u.sales}</div>
      </div>
    </div>
  `).join("");
}

function renderAdminPanel() {
  if (!G.isAdmin) return;
  const users = JSON.parse(localStorage.getItem("tehnobaraholka_users_db") || "{}");
  const container = document.getElementById("admin-panel-list");
  if (!container) return;
  
  container.innerHTML = Object.keys(users).map(name => `
    <div class="lot-card">
      <div class="lot-info">
        <div class="lot-name">${name} ${name === G.username ? '(Ты)' : ''}</div>
        <div class="lot-faults">Продаж: ${users[name].sales || 0} | Денег: ${fmt(users[name].money)} ₽</div>
      </div>
      <button class="btn-primary" style="padding:6px 12px; font-size:12px;" onclick="window.adminAddMoney('${name}')">Выдать</button>
    </div>
  `).join("");
}

window.adminAddMoney = function(username) {
  if (!G.isAdmin) return;
  const amount = prompt(`Сколько денег выдать игроку ${username}?`);
  if (!amount) return;
  alert(`Игроку ${username} начислено ${amount} ₽!`);
};

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
            ? `<div class="lot-price" style="color:var(--accent);">✅ Готов</div>`
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
  const promptPrice = prompt(`Введи цену для ${dev.name}:\n(Базовая: ${fmt(dev.basePrice)} ₽)`);
  if (!promptPrice) return;
  const price = parseInt(promptPrice);
  if (isNaN(price) || price <= 0) return alert("Некорректная цена!");

  G.inventory.splice(index, 1);
  
  const priceRatio = price / dev.basePrice;
  const waitTime = Math.floor(Math.random() * 20000) + Math.max(5000, priceRatio * 10000);
  let chance = 0.9;
  if (priceRatio > 1) chance = Math.max(0.05, 0.9 - (priceRatio - 1) * 0.4);
  if (priceRatio > 2.5) chance = 0.05;

  G.activeSale = { item: item, price: price, profit: price - item.buyPrice, endTime: Date.now() + waitTime, chance: chance };
  saveGame(G); renderInventory();
  alert(`📈 Выставлено за ${fmt(price)} ₽.\nОжидание: ${(waitTime/1000).toFixed(0)} сек.\nШанс: ${(chance*100).toFixed(0)}%`);
};

window.startRepair = function(index) {
  const item = G.inventory[index];
  G.activeRepair = { ...item, backCoverRemoved: false, batteryRemoved: false, backCoverClosed: false, boltsRemoved: 0 };
  G.inventory.splice(index, 1);
  saveGame(G); updateMoneyUI(); updateInventoryUI(); showScreen("workshop");
};

// ОСТАЛЬНЫЕ ФУНКЦИИ (МАРКЕТ, МАСТЕРСКАЯ, ПРОФИЛЬ, БИЗНЕС)
// Вставь сюда из предыдущих сообщений: renderMarket, renderPartsMarket, renderWorkshop, finishRepair, renderProfile, renderBusiness.
// Они не менялись.
