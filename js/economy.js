const PARTS = {
  screen:  { id: "screen",  name: "Экран", price: 1200, emoji: "📱" },
  battery: { id: "battery", name: "Батарея", price: 600, emoji: "🔋" },
  cooler:  { id: "cooler",  name: "Кулер", price: 400, emoji: "🌀" },
  paste:   { id: "paste",   name: "Термопаста", price: 200, emoji: "🧴" },
  power:   { id: "power",   name: "Контроллер питания", price: 800, emoji: "⚡" },
};

const DEVICES = {
  nova_x1: { name: "Нова X1", emoji: "📱" }, nova_x3pro: { name: "Нова X3 Про", emoji: "📱" },
  nova_ultra: { name: "Нова Ультра", emoji: "📱" }, quant_s2: { name: "Квант S2", emoji: "📱" },
  quant_s5max: { name: "Квант S5 Макс", emoji: "📱" }, orion_lite: { name: "Орион Лайт", emoji: "📱" },
  orion_neo: { name: "Орион Нео", emoji: "📱" }, lumen14: { name: "Люмен 14", emoji: "💻" },
  lumen16pro: { name: "Люмен 16 Про", emoji: "💻" }, vector15: { name: "Вектор Букс 15", emoji: "💻" },
  vector_ultra: { name: "Вектор Ультра", emoji: "💻" }, atlas_air: { name: "Атлас Эйр", emoji: "💻" },
  atlas_game: { name: "Атлас Гейм", emoji: "💻" }, titan_base: { name: "Титан ПК Базовая", emoji: "🖥" },
  titan_game: { name: "Титан ПК Гейм", emoji: "🖥" }
};

const LOTS = [
  { id: "l01", device: "orion_lite", buy: 800, sell: 1800, faults: ["battery"], reqRep: 0 },
  { id: "l02", device: "nova_x1", buy: 1200, sell: 2600, faults: ["screen"], reqRep: 0 },
  { id: "l03", device: "quant_s2", buy: 1000, sell: 2400, faults: ["battery", "cooler"], reqRep: 0 },
  { id: "l04", device: "orion_neo", buy: 1500, sell: 2900, faults: ["screen", "paste"], reqRep: 0 },
  { id: "l05", device: "nova_x3pro", buy: 2200, sell: 5200, faults: ["screen", "battery"], reqRep: 1 },
  { id: "l06", device: "quant_s5max", buy: 2600, sell: 5800, faults: ["screen", "power"], reqRep: 1 },
  { id: "l07", device: "lumen14", buy: 3000, sell: 6200, faults: ["battery", "cooler"], reqRep: 1 },
  { id: "l08", device: "nova_ultra", buy: 3500, sell: 7800, faults: ["screen", "battery", "paste"], reqRep: 2 },
  { id: "l09", device: "vector15", buy: 4000, sell: 8500, faults: ["cooler", "paste"], reqRep: 2 },
  { id: "l10", device: "atlas_air", buy: 4500, sell: 9200, faults: ["screen", "power"], reqRep: 2 },
  { id: "l11", device: "lumen16pro", buy: 6000, sell: 12500, faults: ["battery", "cooler", "paste"], reqRep: 3 },
  { id: "l12", device: "vector_ultra", buy: 7000, sell: 14200, faults: ["screen", "power"], reqRep: 3 },
  { id: "l13", device: "atlas_game", buy: 8500, sell: 17000, faults: ["cooler", "power", "paste"], reqRep: 3 },
  { id: "l14", device: "titan_base", buy: 9000, sell: 18000, faults: ["power"], reqRep: 4 },
  { id: "l15", device: "titan_game", buy: 12000, sell: 24000, faults: ["power", "cooler"], reqRep: 4 },
  { id: "l16", device: "nova_x1", buy: 1500, sell: 2100, faults: ["screen", "battery"], reqRep: 0 },
  { id: "l17", device: "quant_s2", buy: 1100, sell: 2200, faults: ["power"], reqRep: 1 },
  { id: "l18", device: "atlas_air", buy: 3800, sell: 9800, faults: ["paste"], reqRep: 2 }
];

function partsCost(faults) { return faults.reduce((sum, id) => sum + (PARTS[id]?.price || 0), 0); }
function lotProfit(lot) { return lot.sell - lot.buy - partsCost(lot.faults); }
function starsFromRep(rep) { return Math.min(5, Math.floor(rep / 2)); }
function partsDiscount(rep) { return Math.min(0.25, rep * 0.03); }
function partPriceWithDiscount(partId, rep) { return Math.round((PARTS[partId]?.price || 0) * (1 - partsDiscount(rep))); }
function finalSellPrice(lot, bonusPercent) { return Math.round(lot.sell * (1 + (bonusPercent || 0) / 100)); }
