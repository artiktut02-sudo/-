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
  
  // Секретный админ
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

// ... остальные функции (fmt, updateMoneyUI, updateInventoryUI, showScreen, tickEvents, renderLeaderboard, renderAdminPanel, adminAddMoney, spawnDevice, renderInventory, openPriceModal, startRepair) из прошлого сообщения
// ... и функции маркета, мастерской, профиля и бизнеса
