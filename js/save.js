const SAVE_KEY = "tehnobaraholka_save_v10";
function saveGame(state) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
function loadGame() { try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
function resetGame() { localStorage.removeItem(SAVE_KEY); }

function defaultState() {
  return {
    username: "Гость",
    password: "",
    isAdmin: false,
    money: 10000, 
    reputation: 0,
    stats: { repairs: 0, earned: 0, sales: 0, losses: 0, totalSales: 0 },
    upgrades: { solderBonus: 0, fastSale: false, office: false, employee: false, firm: false },
    activeRepair: null,
    inventory: [], 
    maxInventory: 50,
    ownedParts: {},
    soldLotIds: [], 
    activeSale: null,
    customPrice: 0
  };
}
