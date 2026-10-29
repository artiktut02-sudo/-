// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let G = loadGame() || null;
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

// Если игры нет, показываем заставку и экран авторизации
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => { document.getElementById("splash-screen").classList.add("hidden"); }, 2000);
  
  if (!G) {
    showScreen("login");
  } else {
    initGame();
  }
});

// === АВТОРИЗАЦИЯ ===
window.doAuth = function() {
  const login = document.getElementById("auth-login").value.trim();
  const pass = document.getElementById("auth-password").value;
  
  if (login.length < 3 || pass.length < 3) {
    return alert("Логин и пароль должны быть не менее 3 символов!");
  }

  if (login.toLowerCase() === "enjota" && pass === "admin") {
    if (!G) G = defaultState();
    G.username = "ENJOTA";
    G.isAdmin = true;
    G.money = 99999999;
    saveGame(G);
    initGame();
    return;
  }

  // Проверка на существующего пользователя (эмуляция, так как мы в браузере)
  const savedUsers = JSON.parse(localStorage.getItem("tehnobaraholka_users") || "{}");
  if (savedUsers[login]) {
    if (savedUsers[login] !== pass) return alert("Неверный пароль!");
  } else {
    savedUsers[login] = pass;
    localStorage.setItem("tehnobaraholka_users", JSON.stringify(savedUsers));
    alert("✅ Аккаунт создан! Добро пожаловать.");
  }

  // Создаем или грузим стейт
  G = defaultState();
  G.username = login;
  saveGame(G);
  initGame();
};

window.logout = function() {
  if(confirm("Выйти из аккаунта?")) {
    G = null;
    location.reload();
  }
};

// === ИНИЦИАЛИЗАЦИЯ ===
function initGame() {
  if (G.isAdmin) {
    document.getElementById("admin-icon").classList.remove("hidden");
  }
  document.getElementById("welcome-text").textContent = `Добро пожаловать, ${G.username}!`;
  document.getElementById("profile-name").textContent = G.username;
  document.getElementById("stat-total-sales").textContent = G.stats.totalSales || 0;

  updateMoneyUI(); updateInventoryUI();
  
  $$("[data-screen]").forEach(btn => { btn.addEventListener("click", e => { e.preventDefault(); showScreen(btn.dataset.screen); }); });
  $$("[data-back]").forEach(btn => { btn.addEventListener("click", e => { e.preventDefault(); showScreen("desktop"); }); });
  if ($("#btn-finish-repair")) $("#btn-finish-repair").addEventListener("click", finishRepair);
  if ($("#btn-reset")) {
    $("#btn-reset").addEventListener("click", () => {
      if (confirm("Сбросить ВЕСЬ прогресс?")) {
        resetGame(); location.reload();
      }
    });
  }
  setInterval(() => saveGame(G), 15000);
  showScreen("desktop");
}

// === БАЗОВЫЕ ФУНКЦИИ ===
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
  if (document.getElementById("inv-count")) document.getElementById("inv-count").textContent = `${G.inventory.length}/${G.maxInventory || 50}`;
}

function showScreen(id) {
  $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + id));
  if (id === "market") renderMarket();
  if (id === "parts-market") { currentPartsFilter = "all"; renderPartsMarket(); }
  if (id === "workshop") renderWorkshop();
  if (id === "profile") renderProfile();
  if (id === "business") renderBusiness();
  if (id === "inventory") renderInventory();
  if (id === "leaderboard") renderLeaderboard();
  if (id === "admin") { /* Логика админки уже в кнопках */ }
  const activeScreen = document.getElementById("screen-" + id);
  if (activeScreen) activeScreen.scrollTop = 0;
}

// === ТАЙМЕРЫ (ПРОДАЖА И БИЗНЕС) ===
setInterval(() => {
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

  // Таймер активной продажи
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
}, 1000);

// === АДМИНКА ===
window.spawnDevice = function(type) {
  if (!G.isAdmin) return;
  const keys = Object.keys(DEVICES).filter(k => DEVICES[k].type === type);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const dev = DEVICES[randomKey];
  
  // Создаем лот
  const faultSet = new Set();
  while(faultSet.size < 2) {
    const parts = Object.keys(PARTS).filter(p => PARTS[p].type === type);
    faultSet.add(parts[Math.floor(Math.random() * parts.length)]);
  }
  
  LOTS.unshift({ id: `admin_${Date.now()}`, device: randomKey, buy: Math.round(dev.basePrice * 0.3), sell: dev.basePrice, faults: Array.from(faultSet), reqRep: 0 });
  alert(`👑 Устройство ${dev.name} добавлено на рынок!`);
  showScreen("market");
};

// === ЛИДЕРБОРД ===
function renderLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  // Эмуляция лидеров (в реальной игре это был бы сервер)
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

// === ПРОДАЖА С ВВОДОМ ЦЕНЫ ===
function renderInventory() {
  updateInventoryUI();
  if (G.inventory.length === 0) {
    $("#inventory-list").innerHTML = `<div class="empty-state glass"><div class="empty-icon">📦</div><h3>Склад пуст</h3></div>`;
    return;
  }
  $("#inventory-list").innerHTML = G.inventory.map((item, index) => {
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
  const promptPrice = prompt(`Введи цену, за которую хочешь продать ${dev.name}:\n(Рекомендуемая: ${fmt(item.sellPrice || dev.basePrice)})`);
  
  if (!promptPrice) return;
  const price = parseInt(promptPrice);
  if (isNaN(price) || price <= 0) return alert("Некорректная цена!");

  // Удаляем со склада
  G.inventory.splice(index, 1);
  
  // Время ожидания случайное (от 5 до 15 секунд для теста)
  const waitTime = Math.floor(Math.random() * 10000) + 5000;
  // Шанс продажи зависит от цены (чем дороже, тем меньше шанс)
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

// === ОСТАЛЬНЫЕ ФУНКЦИИ (МАРКЕТ, МАСТЕРСКАЯ, ПРОФИЛЬ) ===
// (Вставь сюда остальные функции renderMarket, renderPartsMarket, renderWorkshop, finishRepair и т.д. из прошлых сообщений. 
// Я не стал их дублировать, чтобы не раздувать сообщение, они остаются без изменений, кроме renderWorkshop, где мы убрали проверку на крышку, если нет поломки батареи).
