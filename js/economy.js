const SVG_PARTS = {
  screen: `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 21h8"/></svg>`,
  battery: `<svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10l3 2-3 2"/></svg>`,
  cooler: `<svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg>`,
  paste: `<svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  gpu: `<svg viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 18v4M18 18v4M6 6V2M18 6V2"/></svg>`,
  cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>`,
  mouse: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v6"/></svg>`,
  monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`
};

const PARTS = {};
const PART_TYPES = [
  { key: "screen", name: "Экран", svg: SVG_PARTS.screen, basePrice: 2500, type: "phone" },
  { key: "battery", name: "Батарея", svg: SVG_PARTS.battery, basePrice: 1200, type: "phone" },
  { key: "charging", name: "Разъем зарядки", svg: SVG_PARTS.power, basePrice: 800, type: "phone" },
  { key: "backcover", name: "Задняя крышка", svg: SVG_PARTS.cooler, basePrice: 1000, type: "phone" },
  { key: "speaker", name: "Динамик", svg: SVG_PARTS.cooler, basePrice: 600, type: "phone" },
  { key: "gpu", name: "Видеокарта", svg: SVG_PARTS.gpu, basePrice: 150000, type: "pc" },
  { key: "cpu", name: "Процессор", svg: SVG_PARTS.cpu, basePrice: 50000, type: "pc" },
  { key: "psu", name: "Блок питания", svg: SVG_PARTS.battery, basePrice: 15000, type: "pc" },
  { key: "motherboard", name: "Материнская плата", svg: SVG_PARTS.cooler, basePrice: 25000, type: "pc" },
  { key: "ram", name: "Оперативная память", svg: SVG_PARTS.paste, basePrice: 12000, type: "pc" },
  { key: "cooler", name: "Кулер", svg: SVG_PARTS.cooler, basePrice: 800, type: "pc" },
  { key: "paste", name: "Термопаста", svg: SVG_PARTS.paste, basePrice: 500, type: "pc" },
  { key: "monitor", name: "Монитор", svg: SVG_PARTS.monitor, basePrice: 8000, type: "pc" },
  { key: "keyboard", name: "Клавиатура", svg: SVG_PARTS.keyboard, basePrice: 5000, type: "pc" },
  { key: "mouse", name: "Мышка", svg: SVG_PARTS.mouse, basePrice: 3000, type: "pc" }
];

let partId = 0;
PART_TYPES.forEach(type => {
  for (let i = 1; i <= 5; i++) {
    PARTS[`p_${partId}`] = { 
      id: `p_${partId}`, 
      name: `${type.name} (Ур. ${i})`, 
      svg: type.svg, 
      price: Math.round(type.basePrice * (i * 0.8)),
      type: type.type,
      key: type.key
    };
    partId++;
  }
});

const DEVICES = {};
const BRANDS_PHONES = ["aPHone", "CAMSUNG", "HUAWEY", "NOVA", "ORION", "QUANT", "REALMY", "OPPO", "VIVO", "MOTORO"];
const MODELS_PHONES = ["Pro", "Ultra", "Max", "Lite", "Neo", "S24", "S23", "X15", "12T", "Note"];
const BRANDS_PC = ["TITAN", "ATLAS", "VECTOR", "LUMEN", "MSI", "ASUS", "ACER", "LENOVO", "HP", "DELL"];
const MODELS_PC = ["Game", "Workstation", "Office", "Extreme", "Air", "Pro", "Creator", "Gaming"];

const PHONE_COLORS = ["#e0e0e0", "#1a1a1a", "#2a3b5c", "#4a2c2c", "#6b4c8a", "#a1a1a1", "#5c2a2a", "#2a5c3b"];
const PC_COLORS = ["#2a2d35", "#111", "#1e3a8a", "#b91c1c", "#ffffff"];

let devId = 0;
BRANDS_PHONES.forEach((b, bIndex) => MODELS_PHONES.forEach((m, mIndex) => {
  devId++;
  const basePrice = 3000 + (bIndex * 5000) + (mIndex * 2000);
  const color = PHONE_COLORS[devId % PHONE_COLORS.length];
  DEVICES[`dev_${devId}`] = { 
    id: `dev_${devId}`, name: `${b} ${m}`, type: "phone", 
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="3" fill="${color}"/><rect x="7" y="4" width="10" height="12" rx="1" fill="#111"/><circle cx="12" cy="18" r="1" fill="#fff"/></svg>`,
    basePrice: Math.min(basePrice, 150000),
    textureColor: color
  };
}));
BRANDS_PC.forEach((b, bIndex) => MODELS_PC.forEach((m, mIndex) => {
  devId++;
  const basePrice = 50000 + (bIndex * 100000) + (mIndex * 50000);
  const color = PC_COLORS[devId % PC_COLORS.length];
  DEVICES[`dev_${devId}`] = { 
    id: `dev_${devId}`, name: `${b} ${m} PC`, type: "pc", 
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" fill="${color}"/><path d="M8 21h8M12 17v4"/></svg>`,
    basePrice: Math.min(basePrice, 3000000),
    textureColor: color
  };
}));

let LOTS = [];
function generateLots() {
  LOTS = [];
  const DEVICE_KEYS = Object.keys(DEVICES);
  for (let i = 0; i < 100; i++) {
    const devKey = DEVICE_KEYS[Math.floor(Math.random() * DEVICE_KEYS.length)];
    const dev = DEVICES[devKey];
    const availableParts = Object.keys(PARTS).filter(pId => PARTS[pId].type === dev.type);
    
    // ИСПРАВЛЕН БАГ: Используем Set для уникальных поломок
    const numFaults = Math.floor(Math.random() * 3) + 1;
    const faultSet = new Set();
    while(faultSet.size < numFaults) {
      faultSet.add(availableParts[Math.floor(Math.random() * availableParts.length)]);
    }
    const faults = Array.from(faultSet);
    
    LOTS.push({ id: `lot_${i}_${Date.now()}`, device: devKey, buy: Math.round(dev.basePrice * 0.3), sell: dev.basePrice, faults: faults, reqRep: Math.floor(i / 10) });
  }
}
generateLots();

function partsCost(faults) { return faults.reduce((sum, id) => sum + (PARTS[id]?.price || 0), 0); }
function lotProfit(lot) { return lot.sell - lot.buy - partsCost(lot.faults); }
function starsFromRep(rep) { return Math.min(5, Math.floor(rep / 20)); }
function partsDiscount(rep) { return Math.min(0.25, rep * 0.005); }
function partPriceWithDiscount(partId, rep) { return Math.round((PARTS[partId]?.price || 0) * (1 - partsDiscount(rep))); }
function finalSellPrice(lot, bonusPercent) { return Math.round(lot.sell * (1 + (bonusPercent || 0) / 100)); }

const UPGRADES = [
  { id: "solderPro", name: "Имба-паяльник", desc: "Бонус пайки +15%", basePrice: 50000, reqRep: 10 },
  { id: "fastSale", name: "Свой человек", desc: "Быстрая продажа", basePrice: 100000, reqRep: 20 },
  { id: "office", name: "Аренда офиса", desc: "Лимит склада до 100", basePrice: 500000, reqRep: 30 },
  { id: "employee", name: "Нанять сотрудника", desc: "Авто-ремонт", basePrice: 1000000, reqRep: 50 },
  { id: "firm", name: "Открыть свою фирму", desc: "Случайные продажи (от 40к до 1млн)", basePrice: 5000000, reqRep: 100 }
];
