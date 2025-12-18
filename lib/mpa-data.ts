import { MPA } from '@/types';

/**
 * Sample MPA data for initial development
 * Data includes real MPAs from around the world with realistic coordinates
 */
export const sampleMPAs: MPA[] = [
  {
    id: 'gbr-australia',
    name: 'Great Barrier Reef Marine Park',
    country: 'Australia',
    bounds: [
      [14.0, 142.5],
      [24.5, 154.0],
    ],
    center: [-18.2871, 147.6992],
    area: 344400,
    healthScore: 85,
    speciesCount: 1625,
    establishedYear: 1975,
    protectionLevel: 'Multiple Use',
    description:
      'The Great Barrier Reef Marine Park protects a large part of Australia\'s Great Barrier Reef from damaging activities.',
    regulations:
      'Various zones with different levels of protection. Green zones prohibit all extractive activities.',
  },
  {
    id: 'galapagos-ecuador',
    name: 'Galápagos Marine Reserve',
    country: 'Ecuador',
    bounds: [
      [-1.4, -92.0],
      [1.4, -89.0],
    ],
    center: [-0.9537, -90.9656],
    area: 133000,
    healthScore: 92,
    speciesCount: 2909,
    establishedYear: 1998,
    protectionLevel: 'No Take',
    description:
      'One of the world\'s largest marine reserves, protecting unique endemic species.',
    regulations: 'No fishing or extractive activities. Tourism is regulated and monitored.',
  },
  {
    id: 'monterey-bay-usa',
    name: 'Monterey Bay National Marine Sanctuary',
    country: 'United States',
    bounds: [
      [35.7, -122.5],
      [37.7, -121.7],
    ],
    center: [36.8, -121.9],
    area: 15783,
    healthScore: 78,
    speciesCount: 545,
    establishedYear: 1992,
    protectionLevel: 'Multiple Use',
    description:
      'Protecting one of the world\'s most diverse marine ecosystems along California\'s central coast.',
    regulations:
      'Prohibits oil and gas development, waste discharge. Commercial fishing is regulated.',
  },
  {
    id: 'phoenix-islands-kiribati',
    name: 'Phoenix Islands Protected Area',
    country: 'Kiribati',
    bounds: [
      [-6.0, -175.0],
      [-1.0, -170.0],
    ],
    center: [-3.7219, -172.7114],
    area: 408250,
    healthScore: 95,
    speciesCount: 800,
    establishedYear: 2008,
    protectionLevel: 'No Take',
    description:
      'One of the world\'s largest and deepest UNESCO World Heritage marine sites.',
    regulations: 'Fully protected no-take zone. No fishing or extractive activities allowed.',
  },
  {
    id: 'papahānaumokuākea-usa',
    name: 'Papahānaumokuākea Marine National Monument',
    country: 'United States',
    bounds: [
      [23.0, -179.0],
      [28.5, -160.0],
    ],
    center: [25.7, -171.7],
    area: 1508870,
    healthScore: 91,
    speciesCount: 7000,
    establishedYear: 2006,
    protectionLevel: 'No Take',
    description:
      'The largest contiguous fully protected conservation area under the U.S. flag.',
    regulations: 'No commercial fishing. Recreational fishing prohibited. Entry by permit only.',
  },
  {
    id: 'mediterranean-sea',
    name: 'Mediterranean Specially Protected Areas',
    country: 'Multiple',
    bounds: [
      [30.0, -6.0],
      [46.0, 36.0],
    ],
    center: [36.0, 15.0],
    area: 250000,
    healthScore: 68,
    speciesCount: 17000,
    establishedYear: 1995,
    protectionLevel: 'Multiple Use',
    description:
      'Network of protected areas across the Mediterranean Sea protecting biodiversity hotspots.',
    regulations: 'Varies by zone. Some areas prohibit fishing, others regulate tourism.',
  },
  {
    id: 'ross-sea-antarctica',
    name: 'Ross Sea Marine Protected Area',
    country: 'Antarctica',
    bounds: [
      [-78.0, 160.0],
      [-60.0, -150.0],
    ],
    center: [-75.0, 175.0],
    area: 1550000,
    healthScore: 88,
    speciesCount: 10000,
    establishedYear: 2016,
    protectionLevel: 'Mixed',
    description:
      'The world\'s largest marine protected area, preserving one of the last intact marine ecosystems.',
    regulations: 'No fishing in 72% of the area. Research fishing only in special zones.',
  },
  {
    id: 'belize-barrier-reef',
    name: 'Belize Barrier Reef Reserve System',
    country: 'Belize',
    bounds: [
      [15.9, -88.4],
      [18.5, -87.3],
    ],
    center: [17.3, -87.5],
    area: 963,
    healthScore: 74,
    speciesCount: 1400,
    establishedYear: 1996,
    protectionLevel: 'Multiple Use',
    description:
      'UNESCO World Heritage site protecting the largest barrier reef in the Northern Hemisphere.',
    regulations: 'No-take zones, limited fishing areas, and tourism management zones.',
  },
  {
    id: 'raja-ampat-indonesia',
    name: 'Raja Ampat Marine Protected Area',
    country: 'Indonesia',
    bounds: [
      [-2.0, 129.5],
      [1.0, 131.5],
    ],
    center: [-0.25, 130.5],
    area: 4600,
    healthScore: 82,
    speciesCount: 1600,
    establishedYear: 2007,
    protectionLevel: 'Multiple Use',
    description:
      'Recognized as one of the most biodiverse marine areas on Earth.',
    regulations: 'Core no-take zones, sustainable use zones, and tourism zones.',
  },
  {
    id: 'palau-national-marine-sanctuary',
    name: 'Palau National Marine Sanctuary',
    country: 'Palau',
    bounds: [
      [2.0, 131.0],
      [8.5, 135.0],
    ],
    center: [7.5, 134.5],
    area: 500000,
    healthScore: 89,
    speciesCount: 1300,
    establishedYear: 2015,
    protectionLevel: 'No Take',
    description:
      'One of the world\'s largest fully protected marine areas, covering 80% of Palau\'s waters.',
    regulations: 'No commercial fishing. Domestic fishing limited to 20% of territorial waters.',
  },
];
