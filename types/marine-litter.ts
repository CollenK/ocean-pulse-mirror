/**
 * Marine Litter Types & OSPAR-Compatible Item Categories
 *
 * Based on the OSPAR Beach Litter Monitoring Guidelines and the
 * Joint List of Litter Categories (JRC EUR 30348 EN, 2021).
 *
 * Progressive disclosure: COMMON_LITTER_ITEMS (top 10) shown by default,
 * full OSPAR_LITTER_ITEMS available in expanded/survey mode.
 */

export type LitterMaterial =
  | 'plastic'
  | 'metal'
  | 'glass'
  | 'paper'
  | 'wood'
  | 'cloth'
  | 'rubber'
  | 'sanitary'
  | 'medical'
  | 'other';

export type LitterSource =
  | 'fishing'
  | 'aquaculture'
  | 'shipping'
  | 'food_drink'
  | 'smoking'
  | 'sewage'
  | 'recreation'
  | 'agriculture'
  | 'construction'
  | 'medical'
  | 'unknown';

export interface LitterItemDefinition {
  code: string;       // OSPAR J-code or internal code
  name: string;       // Human-readable name
  material: LitterMaterial;
  source: LitterSource;
}

export interface LitterTallyEntry {
  code: string;
  name: string;
  material: LitterMaterial;
  count: number;
}

export interface LitterReportData {
  items: LitterTallyEntry[];
  totalWeight?: number;       // kg
  surveyLengthM?: number;     // metres (10, 50, 100 for OSPAR compatibility)
  isSurvey: boolean;          // true = structured survey, false = quick report
}

// Material category display config
export const MATERIAL_CONFIG: Record<LitterMaterial, { label: string; color: string; bg: string }> = {
  plastic: { label: 'Plastic', color: 'text-blue-600', bg: 'bg-blue-50' },
  metal: { label: 'Metal', color: 'text-gray-600', bg: 'bg-gray-100' },
  glass: { label: 'Glass', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  paper: { label: 'Paper & Cardboard', color: 'text-amber-700', bg: 'bg-amber-50' },
  wood: { label: 'Wood', color: 'text-orange-700', bg: 'bg-orange-50' },
  cloth: { label: 'Cloth & Textile', color: 'text-purple-600', bg: 'bg-purple-50' },
  rubber: { label: 'Rubber', color: 'text-stone-700', bg: 'bg-stone-100' },
  sanitary: { label: 'Sanitary Waste', color: 'text-pink-600', bg: 'bg-pink-50' },
  medical: { label: 'Medical', color: 'text-red-600', bg: 'bg-red-50' },
  other: { label: 'Other', color: 'text-balean-gray-500', bg: 'bg-balean-gray-50' },
};

// Source category display config
export const SOURCE_CONFIG: Record<LitterSource, { label: string; icon: string }> = {
  fishing: { label: 'Fishing', icon: 'fish' },
  aquaculture: { label: 'Aquaculture', icon: 'water' },
  shipping: { label: 'Shipping', icon: 'ship' },
  food_drink: { label: 'Food & Drink', icon: 'utensils' },
  smoking: { label: 'Smoking', icon: 'flame' },
  sewage: { label: 'Sewage', icon: 'water' },
  recreation: { label: 'Recreation', icon: 'ball' },
  agriculture: { label: 'Agriculture', icon: 'tree' },
  construction: { label: 'Construction', icon: 'building' },
  medical: { label: 'Medical', icon: 'first-aid' },
  unknown: { label: 'Unknown', icon: 'question' },
};

/**
 * Top 10 most commonly found items on European beaches.
 * Shown by default in the quick-report item picker.
 * Based on OSPAR QSR 2023 and JRC Top Marine Beach Litter Items analysis.
 */
export const COMMON_LITTER_ITEMS: LitterItemDefinition[] = [
  { code: 'J79', name: 'Plastic/polystyrene pieces (2.5cm-50cm)', material: 'plastic', source: 'unknown' },
  { code: 'J82', name: 'String and cord (diameter < 1cm)', material: 'plastic', source: 'fishing' },
  { code: 'J31', name: 'Caps/lids (drinks)', material: 'plastic', source: 'food_drink' },
  { code: 'J75', name: 'Crisp/sweet packets and lolly sticks', material: 'plastic', source: 'food_drink' },
  { code: 'J2', name: 'Bags (e.g., shopping)', material: 'plastic', source: 'food_drink' },
  { code: 'J27', name: 'Drink bottles (plastic)', material: 'plastic', source: 'food_drink' },
  { code: 'J26', name: 'Cigarette butts and filters', material: 'plastic', source: 'smoking' },
  { code: 'J64', name: 'Rope (diameter > 1cm)', material: 'plastic', source: 'fishing' },
  { code: 'J12', name: 'Food containers (fast food, takeaway)', material: 'plastic', source: 'food_drink' },
  { code: 'J10', name: 'Cups and cup lids', material: 'plastic', source: 'food_drink' },
];

/**
 * Extended OSPAR-compatible item list organized by material category.
 * Used in survey mode and when "Show all items" is expanded.
 */
export const OSPAR_LITTER_ITEMS: LitterItemDefinition[] = [
  // Plastic / Polystyrene
  { code: 'J1', name: '4/6-pack yokes, rings', material: 'plastic', source: 'food_drink' },
  { code: 'J2', name: 'Bags (e.g., shopping)', material: 'plastic', source: 'food_drink' },
  { code: 'J3', name: 'Bags (small, e.g., freezer bags)', material: 'plastic', source: 'food_drink' },
  { code: 'J4', name: 'Balloon sticks', material: 'plastic', source: 'recreation' },
  { code: 'J5', name: 'Balloons', material: 'plastic', source: 'recreation' },
  { code: 'J10', name: 'Cups and cup lids', material: 'plastic', source: 'food_drink' },
  { code: 'J12', name: 'Food containers (fast food, takeaway)', material: 'plastic', source: 'food_drink' },
  { code: 'J17', name: 'Straws and stirrers', material: 'plastic', source: 'food_drink' },
  { code: 'J22', name: 'Cutlery, plates, trays', material: 'plastic', source: 'food_drink' },
  { code: 'J26', name: 'Cigarette butts and filters', material: 'plastic', source: 'smoking' },
  { code: 'J27', name: 'Drink bottles (plastic)', material: 'plastic', source: 'food_drink' },
  { code: 'J30', name: 'Crates and containers', material: 'plastic', source: 'shipping' },
  { code: 'J31', name: 'Caps/lids (drinks)', material: 'plastic', source: 'food_drink' },
  { code: 'J32', name: 'Caps/lids (other)', material: 'plastic', source: 'unknown' },
  { code: 'J35', name: 'Fishing line and monofilament', material: 'plastic', source: 'fishing' },
  { code: 'J36', name: 'Fishing net', material: 'plastic', source: 'fishing' },
  { code: 'J37', name: 'Fish boxes (plastic)', material: 'plastic', source: 'fishing' },
  { code: 'J38', name: 'Floats and buoys', material: 'plastic', source: 'fishing' },
  { code: 'J40', name: 'Gloves (household)', material: 'plastic', source: 'unknown' },
  { code: 'J42', name: 'Gloves (industrial/professional)', material: 'plastic', source: 'fishing' },
  { code: 'J44', name: 'Hard hat / helmet', material: 'plastic', source: 'construction' },
  { code: 'J47', name: 'Jerry cans', material: 'plastic', source: 'shipping' },
  { code: 'J50', name: 'Lighters', material: 'plastic', source: 'smoking' },
  { code: 'J54', name: 'Oyster nets and trays', material: 'plastic', source: 'aquaculture' },
  { code: 'J55', name: 'Packaging (plastic film)', material: 'plastic', source: 'food_drink' },
  { code: 'J59', name: 'Pots and traps', material: 'plastic', source: 'fishing' },
  { code: 'J64', name: 'Rope (diameter > 1cm)', material: 'plastic', source: 'fishing' },
  { code: 'J66', name: 'Sheeting (agriculture/industrial)', material: 'plastic', source: 'agriculture' },
  { code: 'J71', name: 'Shoes and sandals', material: 'plastic', source: 'unknown' },
  { code: 'J75', name: 'Crisp/sweet packets and lolly sticks', material: 'plastic', source: 'food_drink' },
  { code: 'J78', name: 'Strapping bands', material: 'plastic', source: 'shipping' },
  { code: 'J79', name: 'Plastic/polystyrene pieces (2.5cm-50cm)', material: 'plastic', source: 'unknown' },
  { code: 'J80', name: 'Plastic/polystyrene pieces (> 50cm)', material: 'plastic', source: 'unknown' },
  { code: 'J82', name: 'String and cord (diameter < 1cm)', material: 'plastic', source: 'fishing' },
  { code: 'J83', name: 'Polystyrene (insulation/packaging)', material: 'plastic', source: 'construction' },
  { code: 'J84', name: 'Foam sponge', material: 'plastic', source: 'unknown' },
  { code: 'J85', name: 'Tableware (plastic)', material: 'plastic', source: 'food_drink' },
  { code: 'J87', name: 'Toys and party poppers', material: 'plastic', source: 'recreation' },
  { code: 'J88', name: 'Tubes (e.g., cosmetics)', material: 'plastic', source: 'unknown' },
  { code: 'J91', name: 'Wet wipes', material: 'plastic', source: 'sewage' },

  // Metal
  { code: 'J93', name: 'Aerosol/spray cans', material: 'metal', source: 'unknown' },
  { code: 'J95', name: 'Bottle caps (metal)', material: 'metal', source: 'food_drink' },
  { code: 'J96', name: 'Cans (drink)', material: 'metal', source: 'food_drink' },
  { code: 'J97', name: 'Cans (food)', material: 'metal', source: 'food_drink' },
  { code: 'J99', name: 'Foil wrappers', material: 'metal', source: 'food_drink' },
  { code: 'J100', name: 'Wire and wire pieces', material: 'metal', source: 'unknown' },
  { code: 'J101', name: 'Fishing weights/sinkers', material: 'metal', source: 'fishing' },
  { code: 'J104', name: 'Drums (oil, industrial)', material: 'metal', source: 'shipping' },
  { code: 'J106', name: 'Paint tins', material: 'metal', source: 'construction' },

  // Glass
  { code: 'J110', name: 'Bottles and jars', material: 'glass', source: 'food_drink' },
  { code: 'J112', name: 'Glass pieces and fragments', material: 'glass', source: 'unknown' },
  { code: 'J113', name: 'Light bulbs/tubes', material: 'glass', source: 'unknown' },

  // Paper / Cardboard
  { code: 'J115', name: 'Cardboard boxes and pieces', material: 'paper', source: 'shipping' },
  { code: 'J116', name: 'Cartons (milk, juice)', material: 'paper', source: 'food_drink' },
  { code: 'J117', name: 'Cigarette packets', material: 'paper', source: 'smoking' },
  { code: 'J118', name: 'Cups (paper)', material: 'paper', source: 'food_drink' },
  { code: 'J119', name: 'Newspapers and magazines', material: 'paper', source: 'unknown' },
  { code: 'J120', name: 'Paper bags', material: 'paper', source: 'food_drink' },
  { code: 'J121', name: 'Paper pieces and fragments', material: 'paper', source: 'unknown' },

  // Wood
  { code: 'J125', name: 'Corks', material: 'wood', source: 'food_drink' },
  { code: 'J127', name: 'Ice cream sticks, lolly sticks', material: 'wood', source: 'food_drink' },
  { code: 'J129', name: 'Pallets', material: 'wood', source: 'shipping' },
  { code: 'J131', name: 'Painted wood', material: 'wood', source: 'construction' },
  { code: 'J132', name: 'Crab/lobster pots (wood)', material: 'wood', source: 'fishing' },

  // Cloth / Textile
  { code: 'J136', name: 'Clothing and shoes (textile)', material: 'cloth', source: 'unknown' },
  { code: 'J137', name: 'Furnishing (carpet, mattress)', material: 'cloth', source: 'unknown' },
  { code: 'J138', name: 'Rope and string (natural)', material: 'cloth', source: 'fishing' },
  { code: 'J139', name: 'Sacking and canvas', material: 'cloth', source: 'shipping' },

  // Rubber
  { code: 'J140', name: 'Balloons (rubber)', material: 'rubber', source: 'recreation' },
  { code: 'J143', name: 'Boots and shoes (rubber)', material: 'rubber', source: 'unknown' },
  { code: 'J144', name: 'Tyres and pieces', material: 'rubber', source: 'unknown' },
  { code: 'J146', name: 'Rubber bands', material: 'rubber', source: 'unknown' },

  // Sanitary Waste
  { code: 'J148', name: 'Cotton bud sticks', material: 'sanitary', source: 'sewage' },
  { code: 'J149', name: 'Sanitary towels/tampons', material: 'sanitary', source: 'sewage' },
  { code: 'J150', name: 'Nappies/diapers', material: 'sanitary', source: 'sewage' },
  { code: 'J151', name: 'Condoms', material: 'sanitary', source: 'sewage' },

  // Medical
  { code: 'J155', name: 'Syringes', material: 'medical', source: 'medical' },
  { code: 'J156', name: 'Pharmaceutical containers', material: 'medical', source: 'medical' },
];

/**
 * All items combined (common items are a subset of the full list, so use full list for search)
 */
export function getAllLitterItems(): LitterItemDefinition[] {
  return OSPAR_LITTER_ITEMS;
}

/**
 * Get items grouped by material for the expanded picker
 */
export function getItemsByMaterial(): Record<LitterMaterial, LitterItemDefinition[]> {
  const groups: Record<string, LitterItemDefinition[]> = {};
  for (const item of OSPAR_LITTER_ITEMS) {
    if (!groups[item.material]) groups[item.material] = [];
    groups[item.material].push(item);
  }
  return groups as Record<LitterMaterial, LitterItemDefinition[]>;
}

/**
 * OSPAR-compatible survey lengths
 */
export const SURVEY_LENGTHS = [
  { value: 10, label: '10m (hotspot)' },
  { value: 50, label: '50m (modified)' },
  { value: 100, label: '100m (standard OSPAR)' },
] as const;
