const SAVE_KEY = "tehnobaraholka_save_v12";
const USERS_KEY = "tehnobaraholka_users_db";

function saveGame(state) { 
  try { 
    localStorage.setItem(SAVE_KEY, JSON.stringify(state)); 
    if (state.username) {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
      users[state.username] = {
        sales: state.stats.totalSales || 0,
        money: state.money,
        isAdmin: state.isAdmin || false
      };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  } catch (e) {}
}

function loadGame(username) { 
  try { 
    const raw = localStorage.getItem(SAVE_KEY); 
    if (raw) {
      const data = JSON.parse(raw);
      if (data.username === username) return data;
    }
    return null; 
  } catch (e) { return null; } 
}

function resetGame() { 
  localStorage.removeItem(SAVE_KEY); 
}

function defaultState(username) {
  return {
    username: username || "Гость",
    isAdmin: username === "ENJOTA",
    money: 10000, 
    reputation: 0,
    stats: { repairs: 0, earned: 0, sales: 0, losses: 0, totalSales: 0 },
    upgrades: { solderBonus: 0, fastSale: false, office: false, employee: false, firm: false },
    activeRepair: null,
    inventory: [], 
    maxInventory: 50,
    ownedParts: {},
    soldLotIds: [], 
    activeSale: null
  };
}
