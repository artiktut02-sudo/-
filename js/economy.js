// SVG-иконки для запчастей
const SVG_PARTS = {
  screen: `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 21h8"/></svg>`,
  battery: `<svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10l3 2-3 2"/></svg>`,
  cooler: `<svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg>`,
  paste: `<svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
};

// SVG-иконки для устройств
const SVG_DEVICES = {
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="12" cy="18" r="1" fill="#fff"/><rect x="7" y="4" width="10" height="12" rx="1"/></svg>`,
  laptop: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></svg>`
};

const PARTS = {
  screen:  { id: "screen",  name: "Экран", price: 1200, svg: SVG_PARTS.screen },
  battery: { id: "battery", name: "Батарея", price: 600, svg: SVG_PARTS.battery },
  cooler:  { id: "cooler",  name: "Кулер", price: 400, svg: SVG_PARTS.cooler },
  paste:   { id: "paste",   name: "Термопаста", price: 200, svg: SVG_PARTS.paste },
  power:   { id: "power",   name: "Контроллер", price: 800, svg: SVG_PARTS.power },
};

const DEVICES = {
  aphone_15: { name: "aPHone 15 Pro", type: "phone", svg: SVG_DEVICES.phone },
  aphone_14: { name: "aPHone 14", type: "phone", svg: SVG_DEVICES.phone },
  cams_ultra: { name: "CAMSUNG Ultra S24", type: "phone", svg: SVG_DEVICES.phone },
  cams_a54: { name: "CAMSUNG A54", type: "phone", svg: SVG_DEVICES.phone },
  huawey_p60: { name: "HUAWEY P60", type: "phone", svg: SVG_DEVICES.phone },
  nova_x1: { name: "NOVA X1", type: "phone", svg: SVG_DEVICES.phone },
  // Ноутбуки
  lumen14: { name: "LUMEN 14", type: "laptop", svg: SVG_DEVICES.laptop },
  titan_game: { name: "TITAN Game", type: "laptop", svg: SVG_DEVICES.laptop }
};

const LOTS = [
  { id: "l01", device: "nova_x1", buy: 800, sell: 1800, faults: ["battery"], reqRep: 0 },
  { id: "l02", device: "aphone_14", buy: 1200, sell: 2600, faults: ["screen"], reqRep: 0 },
  { id: "l03", device: "cams_a54", buy: 1000, sell: 2400, faults: ["battery", "cooler"], reqRep: 0 },
  { id: "l04", device: "aphone_15", buy: 2200, sell: 5200, faults: ["screen", "battery"], reqRep: 1 },
  { id: "l05", device: "cams_ultra", buy: 2600, sell: 5800, faults: ["screen", "power"], reqRep: 1 },
  { id: "l06", device: "huawey_p60", buy: 3000, sell: 6200, faults: ["battery", "cooler"], reqRep: 1 },
  { id: "l07", device: "lumen14", buy: 4000, sell: 8500, faults: ["cooler", "paste"], reqRep: 2 },
  { id: "l08", device: "titan_game", buy: 9000, sell: 18000, faults: ["power"], reqRep: 4 }
];

function partsCost(faults) { return faults.reduce((sum, id) => sum + (PARTS[id]?.price || 0), 0); }
function lotProfit(lot) { return lot.sell - lot.buy - partsCost(lot.faults); }
function starsFromRep(rep) { return Math.min(5, Math.floor(rep / 2)); }
function partsDiscount(rep) { return Math.min(0.25, rep * 0.03); }
function partPriceWithDiscount(partId, rep) { return Math.round((PARTS[partId]?.price || 0) * (1 - partsDiscount(rep))); }
function finalSellPrice(lot, bonusPercent) { return Math.round(lot.sell * (1 + (bonusPercent || 0) / 100)); }

const UPGRADES = [
  { id: "solderPro", name: "Имба-паяльник", desc: "Увеличивает бонус пайки на +15%", basePrice: 5000, reqRep: 1 },
  { id: "fastSale", name: "Свой человек на рынке", desc: "Продажа приносит на 20% больше", basePrice: 10000, reqRep: 2 }
];
