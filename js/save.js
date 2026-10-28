const SAVE_KEY = "tehnobaraholka_save_v6";
function saveGame(state) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
function loadGame() { try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
function resetGame() { localStorage.removeItem(SAVE_KEY); }

function defaultState() {
  return {
    money: 10000, reputation: 0, // Стартовый капитал 10к
    stats: { repairs: 0, earned: 0, sales: 0, losses: 0 },
    upgrades: { solderBonus: 0, fastSale: false, office: false, employee: false },
    activeRepair: null,
    inventory: [], 
    maxInventory: 50,
    ownedParts: {},
    soldLotIds: [], 
    activeSale: null,
    isAdmin: false
  };
}
