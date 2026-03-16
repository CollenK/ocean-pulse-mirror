/**
 * Monthly marine educational tips for the "Did you know?" section
 * Each tip is tied to a calendar month and written in plain language
 */

export interface MarineTip {
  month: number; // 1-12
  title: string;
  body: string;
  icon: string; // Flaticon UIcons name
}

export const MARINE_TIPS: MarineTip[] = [
  {
    month: 1,
    title: 'Winter whale migration',
    body: 'Many whale species migrate to warmer waters during winter months to breed and give birth. Keep an eye out for humpback whales, which can travel up to 8,000 km on their annual journey.',
    icon: 'water',
  },
  {
    month: 2,
    title: 'Coral spawning season',
    body: 'In tropical waters, mass coral spawning events often begin around this time. Corals release millions of eggs and sperm into the water simultaneously, creating underwater "snowstorms" visible to divers.',
    icon: 'star',
  },
  {
    month: 3,
    title: 'Spring plankton bloom',
    body: 'As daylight increases and waters begin to warm, phytoplankton populations explode. These microscopic organisms produce about half of all oxygen on Earth, making them essential for life.',
    icon: 'leaf',
  },
  {
    month: 4,
    title: 'Seabird nesting begins',
    body: 'Coastal seabirds begin nesting on cliffs and beaches. If you spot nesting birds, keep your distance; even brief disturbances can cause parents to abandon eggs or chicks.',
    icon: 'feather',
  },
  {
    month: 5,
    title: 'Sea turtle season starts',
    body: 'Female sea turtles begin coming ashore to lay eggs on sandy beaches. If you find a nest, do not disturb it. Many species are endangered, and every egg counts for their survival.',
    icon: 'shield-check',
  },
  {
    month: 6,
    title: 'Jellyfish season',
    body: 'Warmer waters bring more jellyfish to coastal areas. While most are harmless, some species can deliver painful stings. Check local advisories before swimming and look for warning flags on beaches.',
    icon: 'exclamation',
  },
  {
    month: 7,
    title: 'Peak marine biodiversity',
    body: 'Summer warmth supports the highest diversity of marine life in temperate waters. Snorkeling and diving conditions are often at their best, with clear waters and abundant fish activity.',
    icon: 'fish',
  },
  {
    month: 8,
    title: 'Ocean temperature peaks',
    body: 'Sea surface temperatures reach their annual maximum in many regions. While warm water is great for swimming, prolonged heat can stress corals and trigger bleaching events.',
    icon: 'temperature-half',
  },
  {
    month: 9,
    title: 'Autumn migration begins',
    body: 'Shorebirds and marine mammals begin their southward migrations. Estuaries and coastal wetlands become important rest stops, making them excellent places for wildlife observation.',
    icon: 'arrow-right',
  },
  {
    month: 10,
    title: 'Storm season awareness',
    body: 'Autumn storms can churn up the ocean, bringing nutrients to the surface and sometimes washing unusual creatures onto beaches. After storms, beachcombing can reveal fascinating marine life.',
    icon: 'wind',
  },
  {
    month: 11,
    title: 'Bioluminescence season',
    body: 'Cooler months can trigger bioluminescent plankton displays in many coastal areas. On dark nights, wave action causes tiny organisms to glow blue-green, creating a magical light show.',
    icon: 'sparkles',
  },
  {
    month: 12,
    title: 'Seal pupping season',
    body: 'Many seal species give birth during winter months on protected beaches. If you spot seal pups, observe from a safe distance. The mother is likely nearby and will return after foraging.',
    icon: 'heart',
  },
];

/**
 * Get the marine tip for the current month
 */
export function getCurrentMarineTip(): MarineTip {
  const month = new Date().getMonth() + 1; // 1-12
  return MARINE_TIPS.find(tip => tip.month === month) || MARINE_TIPS[0];
}
