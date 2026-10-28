// SVG-иконки
const SVG_PARTS = {
  screen: `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 21h8"/></svg>`,
  battery: `<svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10l3 2-3 2"/></svg>`,
  cooler: `<svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg>`,
  paste: `<svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
};
const SVG_DEVICES = {
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="12" cy="18" r="1" fill="#fff"/><rect x="7" y="4" width="10" height="12" rx="1"/></svg>`,
  pc: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`
};

// ГЕНЕРАЦИЯ ЗАПЧАСТЕЙ (от 1000 до 300 000 ₽)
const PARTS = {};
const PART_TYPES = [
  { name: "Экран", svg: SVG_PARTS.screen, basePrice: 2500 },
  { name: "Батарея", svg: SVG_PARTS.battery, basePrice: 1200 },
  { name: "Кулер", svg: SVG_PARTS.cooler, basePrice: 800 },
  { name: "Термопаста", svg: SVG_PARTS.paste, basePrice: 500 },
  { name: "Контроллер питания", svg: SVG_PARTS.power, basePrice: 3000 },
  { name: "Процессор", svg: SVG_PARTS.power, basePrice: 50000 },
  { name: "Видеокарта", svg: SVG_PARTS.paste, basePrice: 150000 },
  { name: "Блок питания", svg: SVG_PARTS.battery, basePrice: 15000 },
  { name: "Материнская плата", svg: SVG_PARTS.cooler, basePrice: 25000 },
  { name: "Клавиатура", svg: SVG_PARTS.screen, basePrice: 5000 },
  { name: "Мышка", svg: SVG_PARTS.screen, basePrice: 3000 }
];

let partId = 0;
PART_TYPES.forEach(type => {
  // Создаем по 10 уровней качества для каждой запчасти (Ур. 1 - дешевые, Ур. 10 - топовые)
  for (let i = 1; i <= 10; i++) {
    PARTS[`p_${partId}`] = { 
      id: `p_${partId}`, 
      name: `${type.name} (Ур. ${i})`, 
      svg: type.svg, 
      price: Math.round(type.basePrice * (i * 0.5)) // Чем выше уровень, тем дороже
    };
    partId++;
  }
});

// ГЕНЕРАЦИЯ УСТРОЙСТВ (500+ штук с реальными ценами)
const DEVICES = {};
const BRANDS_PHONES = ["aPHone", "CAMSUNG", "HUAWEY", "NOVA", "ORION", "QUANT", "REALMY", "OPPO", "VIVO", "MOTORO"];
const MODELS_PHONES = ["Pro", "Ultra", "Max", "Lite", "Neo", "S24", "S23", "X15", "12T", "Note"];
const BRANDS_PC = ["TITAN", "ATLAS", "VECTOR", "LUMEN", "MSI", "ASUS", "ACER", "LENOVO", "HP", "DELL"];
const MODELS_PC = ["Game", "Workstation", "Office", "Extreme", "Air", "Pro", "Creator", "Gaming"];

let devId = 0;
// Генерация телефонов (от 3 000 до 150 000 ₽)
BRANDS_PHONES.forEach((b, bIndex) => MODELS_PHONES.forEach((m, mIndex) => {
  devId++;
  const basePrice = 3000 + (bIndex * 5000) + (mIndex * 2000);
  DEVICES[`dev_${devId}`] = { 
    id: `dev_${devId}`, name: `${b} ${m}`, type: "phone", svg: SVG_DEVICES.phone, 
    basePrice: Math.min(basePrice, 150000) // Ограничение
  };
}));

// Генерация ПК (от 50 000 до 3 000 000 ₽)
BRANDS_PC.forEach((b, bIndex) => MODELS_PC.forEach((m, mIndex) => {
  devId++;
  const basePrice = 50000 + (bIndex * 100000) + (mIndex * 50000);
  DEVICES[`dev_${devId}`] = { 
    id: `dev_${devId}`, name: `${b} ${m} PC`, type: "pc", svg: SVG_DEVICES.pc, 
    basePrice: Math.min(basePrice, 3000000) // Ограничение
  };
}));

// ГЕНЕРАЦИЯ ЛОТОВ (У каждого устройства свой набор поломок)
const LOTS = [];
const DEVICE_KEYS = Object.keys(DEVICES);
const PART_KEYS = Object.keys(PARTS);

for (let i = 0; i < 100; i++) {
  const devKey = DEVICE_KEYS[Math.floor(Math.random() * DEVICE_KEYS.length)];
  const dev = DEVICES[devKey];
  
  // Выбираем 1-3 СЛУЧАЙНЫЕ поломки
  const numFaults = Math.floor(Math.random() * 3) + 1;
  const faults = [];
  for (let j = 0; j < numFaults; j++) {
    faults.push(PART_KEYS[Math.floor(Math.random() * PART_KEYS.length)]);
  }
  
  // Цена покупки сломанного = 30-40% от базовой цены устройства
  const buyPrice = Math.round(dev.basePrice * (0.3 + Math.random() * 0.1));
  
  LOTS.push({
    id: `lot_${i}`,
    device: devKey,
    buy: buyPrice,
    sell: dev.basePrice, // Продаем по изначальной цене устройства
    faults: faults,
    reqRep: Math.floor(i / 10)
  });
}

function partsCost(faults) { return faults.reduce((sum, id) => sum + (PARTS[id]?.price || 0), 0); }
function lotProfit(lot) { return lot.sell - lot.buy - partsCost(lot.faults); }
function starsFromRep(rep) { return Math.min(5, Math.floor(rep / 20)); }
function partsDiscount(rep) { return Math.min(0.25, rep * 0.005); }
function partPriceWithDiscount(partId, rep) { return Math.round((PARTS[partId]?.price || 0) * (1 - partsDiscount(rep))); }
function finalSellPrice(lot, bonusPercent) { return Math.round(lot.sell * (1 + (bonusPercent || 0) / 100)); }

const UPGRADES = [
  { id: "solderPro", name: "Имба-паяльник", desc: "Увеличивает бонус пайки на +15%", basePrice: 50000, reqRep: 10 },
  { id: "fastSale", name: "Свой человек на рынке", desc: "Продажа приносит на 20% больше", basePrice: 100000, reqRep: 20 },
  { id: "office", name: "Аренда офиса", desc: "Увеличивает лимит склада до 100", basePrice: 500000, reqRep: 30 },
  { id: "employee", name: "Нанять сотрудника", desc: "Автоматически чинит устройства", basePrice: 1000000, reqRep: 50 }
];
