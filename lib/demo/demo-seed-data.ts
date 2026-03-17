/**
 * Pre-built observations for the demo account.
 *
 * Each entry references an MPA by its WDPA external_id. At seed time the
 * API route resolves these to internal UUIDs. If an MPA is not found in the
 * database it is silently skipped.
 */

export interface DemoObservation {
  /** WDPA external_id of the target MPA */
  mpaExternalId: string;
  reportType:
    | 'species_sighting'
    | 'habitat_condition'
    | 'water_quality'
    | 'threat_concern'
    | 'enforcement_activity'
    | 'research_observation'
    | 'marine_litter';
  speciesName?: string;
  quantity?: number;
  notes: string;
  latitude: number;
  longitude: number;
  healthScoreAssessment?: number;
  qualityTier: 'casual' | 'needs_id' | 'community_verified' | 'research_grade';
  /** Days ago from "now" when this observation was made (0 = today) */
  daysAgo: number;
  /** Litter fields (for marine_litter reports) */
  litterItems?: Record<string, number>;
  litterWeightKg?: number;
  surveyLengthM?: number;
}

/**
 * Seed observations spread across 10 European MPAs, covering all report types.
 *
 * MPAs used:
 *   365008     - Archipielago De Cabrera, Spain
 *   365015     - Pelagos Sanctuary, France/Italy/Monaco
 *   365004     - Torre Guaceto, Italy
 *   365005     - Plemmirio, Italy
 *   365002     - Miramare, Italy
 *   365010     - Islas Medas, Spain
 *   389004     - Cap Gros-Cap de Creus, Spain
 *   365022     - Acantilados De Maro Cerro Gordo, Spain
 *   902368     - St Kilda, Scotland
 *   555583014  - Lundy, England
 *   555624864  - Skomer, Skokholm and the Seas off Pembrokeshire, Wales
 *   555556998  - Flamborough Head, Yorkshire, England
 *   555559192  - Strangford Lough, Northern Ireland
 *   900898     - Voordelta, South Holland, Netherlands
 *   555578895  - Noordzeekustzone, Netherlands
 *   555557220  - Vlakte van de Raan, Zeeland, Netherlands
 *   555517927  - Helgoland, Germany
 */
export const DEMO_OBSERVATIONS: DemoObservation[] = [
  // --- Species Sightings (5) ---
  {
    mpaExternalId: '365008', // Cabrera, Spain
    reportType: 'species_sighting',
    speciesName: 'Tursiops truncatus',
    quantity: 6,
    notes: 'Pod of bottlenose dolphins feeding near the eastern cliffs. They stayed close to the surface for about 20 minutes. Amazing to watch them hunt together.',
    latitude: 39.158,
    longitude: 2.952,
    healthScoreAssessment: 8,
    qualityTier: 'community_verified',
    daysAgo: 2,
  },
  {
    mpaExternalId: '365005', // Plemmirio, Italy
    reportType: 'species_sighting',
    speciesName: 'Caretta caretta',
    quantity: 1,
    notes: 'Loggerhead turtle spotted swimming slowly along the rocky coastline. Looked like an adult, maybe 70-80 cm shell length. Kept a safe distance while photographing.',
    latitude: 37.007,
    longitude: 15.322,
    healthScoreAssessment: 9,
    qualityTier: 'community_verified',
    daysAgo: 5,
  },
  {
    mpaExternalId: '555517927', // Helgoland, Germany
    reportType: 'species_sighting',
    speciesName: 'Halichoerus grypus',
    quantity: 8,
    notes: 'Grey seals hauled out on the northern rocks. Counted 8 individuals including what looked like 2 juveniles. They were very relaxed despite a few birdwatchers nearby.',
    latitude: 54.196,
    longitude: 7.872,
    healthScoreAssessment: 7,
    qualityTier: 'needs_id',
    daysAgo: 8,
  },
  {
    mpaExternalId: '365004', // Torre Guaceto, Italy
    reportType: 'species_sighting',
    speciesName: 'Posidonia oceanica',
    quantity: 1,
    notes: 'Healthy Posidonia meadow extending from 5 to 15 metres depth along the reserve. Leaves looked dense and green with minimal epiphyte cover. Good sign for the ecosystem.',
    latitude: 40.726,
    longitude: 17.803,
    healthScoreAssessment: 9,
    qualityTier: 'community_verified',
    daysAgo: 12,
  },
  {
    mpaExternalId: '389004', // Cap de Creus, Spain
    reportType: 'species_sighting',
    speciesName: 'Thunnus thynnus',
    quantity: 3,
    notes: 'Three large bluefin tuna seen breaking the surface while chasing baitfish. Estimated around 1.5 metres each. Rare to see them this close to shore.',
    latitude: 42.327,
    longitude: 3.289,
    healthScoreAssessment: 8,
    qualityTier: 'needs_id',
    daysAgo: 15,
  },

  // --- Habitat Conditions (2) ---
  {
    mpaExternalId: '365010', // Islas Medas, Spain
    reportType: 'habitat_condition',
    notes: 'Spectacular rocky reef walls covered in gorgonian fans and sponges. The no-take zone is really paying off; fish biomass is visibly higher than outside the reserve. Groupers everywhere.',
    latitude: 42.048,
    longitude: 3.227,
    healthScoreAssessment: 9,
    qualityTier: 'community_verified',
    daysAgo: 3,
  },
  {
    mpaExternalId: '365002', // Miramare, Italy
    reportType: 'habitat_condition',
    notes: 'Rocky reef in the shallow zone showing good recovery. Noticed some areas with less algal coverage than expected, possibly from recent storms. Still plenty of biodiversity overall with juvenile fish in the crevices.',
    latitude: 45.702,
    longitude: 13.713,
    healthScoreAssessment: 6,
    qualityTier: 'needs_id',
    daysAgo: 10,
  },

  // --- Water Quality (2) ---
  {
    mpaExternalId: '365022', // Maro Cerro Gordo, Spain
    reportType: 'water_quality',
    notes: 'Crystal clear water today, visibility easily 15+ metres. Slight algal bloom visible offshore to the east but not reaching the cliffs yet. Temperature felt warmer than last week.',
    latitude: 36.738,
    longitude: -3.794,
    healthScoreAssessment: 8,
    qualityTier: 'casual',
    daysAgo: 1,
  },
  {
    mpaExternalId: '365015', // Pelagos Sanctuary
    reportType: 'water_quality',
    notes: 'Open water conditions very good. Visibility about 25 metres with deep blue colour. No signs of pollution or unusual discolouration. Saw what looked like a thermocline at around 20 metres.',
    latitude: 42.709,
    longitude: 8.769,
    healthScoreAssessment: 9,
    qualityTier: 'casual',
    daysAgo: 7,
  },

  // --- Threat/Concern (2) ---
  {
    mpaExternalId: '365008', // Cabrera, Spain
    reportType: 'threat_concern',
    notes: 'Found a cluster of discarded fishing nets tangled around rocks near the harbour entrance. Looks like it could trap marine life. Reported to the park rangers on shore. They said they will send divers tomorrow.',
    latitude: 39.152,
    longitude: 2.944,
    healthScoreAssessment: 4,
    qualityTier: 'community_verified',
    daysAgo: 6,
  },
  {
    mpaExternalId: '365010', // Islas Medas, Spain
    reportType: 'threat_concern',
    notes: 'Several dive boats anchoring very close to the protected reef. One boat dropped anchor directly on what looked like a Posidonia patch. The mooring buoys in this area need maintenance, two were missing.',
    latitude: 42.046,
    longitude: 3.224,
    healthScoreAssessment: 5,
    qualityTier: 'needs_id',
    daysAgo: 11,
  },

  // --- Enforcement Activity (1) ---
  {
    mpaExternalId: '365004', // Torre Guaceto, Italy
    reportType: 'enforcement_activity',
    notes: 'Coast guard patrol boat checking fishing licences along the southern boundary. They stopped two small boats and seemed to be doing thorough checks. Good to see active enforcement during the summer season.',
    latitude: 40.724,
    longitude: 17.806,
    healthScoreAssessment: 7,
    qualityTier: 'casual',
    daysAgo: 4,
  },

  // --- Research Observation (1) ---
  {
    mpaExternalId: '902368', // St Kilda, UK
    reportType: 'research_observation',
    notes: 'Counted 34 grey seals on the western rocks during the afternoon haul-out. Visibility was good and I could photograph most of them for identification. Three appeared to be young-of-the-year based on size.',
    latitude: 57.838,
    longitude: -8.564,
    healthScoreAssessment: 7,
    qualityTier: 'community_verified',
    daysAgo: 14,
  },

  // --- Marine Litter (2) ---
  {
    mpaExternalId: '365022', // Maro Cerro Gordo, Spain
    reportType: 'marine_litter',
    notes: 'Beach cleanup at a small cove below the cliffs. Mostly small plastic fragments and cigarette butts. Some fishing line tangled in the rocks. Overall not too bad for a popular snorkelling spot.',
    latitude: 36.737,
    longitude: -3.795,
    healthScoreAssessment: 6,
    qualityTier: 'community_verified',
    daysAgo: 9,
    litterItems: {
      'Plastic/polystyrene pieces 2.5-50cm': 28,
      'Cigarette stubs and filters': 42,
      'Crisp/sweet packets and lolly sticks': 11,
      'Fishing line (monofilament)': 5,
      'Cotton bud sticks': 8,
      'Caps and lids': 15,
      'String and cord (d<1cm)': 3,
      'Drink bottles (plastic)': 7,
    },
    litterWeightKg: 1.8,
    surveyLengthM: 100,
  },
  {
    mpaExternalId: '555517927', // Helgoland, Germany
    reportType: 'marine_litter',
    notes: 'Survey of the south beach after a storm. Found quite a lot of fishing-related debris washed up. Several large pieces of polystyrene from fish boxes. North Sea storms always bring in a mix of stuff from shipping lanes.',
    latitude: 54.194,
    longitude: 7.870,
    healthScoreAssessment: 5,
    qualityTier: 'needs_id',
    daysAgo: 18,
    litterItems: {
      'Plastic/polystyrene pieces 2.5-50cm': 45,
      'Polystyrene pieces': 22,
      'Fishing line (monofilament)': 14,
      'Rope (d>1cm)': 6,
      'Fishing net': 2,
      'Drink cans': 4,
      'Drink bottles (plastic)': 9,
      'Food containers (plastic)': 3,
    },
    litterWeightKg: 3.2,
    surveyLengthM: 50,
  },

  // --- UK: Lundy (555583014) ---
  {
    mpaExternalId: '555583014',
    reportType: 'species_sighting',
    speciesName: 'Eunicella verrucosa',
    quantity: 1,
    notes: 'Beautiful pink sea fan colony on the east side reef at about 18 metres. The colony looked healthy and well-established, roughly 30 cm across. Surrounded by jewel anemones and dead man\'s fingers.',
    latitude: 51.184,
    longitude: -4.668,
    healthScoreAssessment: 8,
    qualityTier: 'community_verified',
    daysAgo: 3,
  },
  {
    mpaExternalId: '555583014',
    reportType: 'habitat_condition',
    notes: 'Dived the no-take zone along the east coast. The rocky reef is thriving with kelp forests, sponges, and big lobsters in the crevices. Visibility was about 8 metres, decent for the Bristol Channel. Huge difference compared to outside the reserve.',
    latitude: 51.186,
    longitude: -4.665,
    healthScoreAssessment: 9,
    qualityTier: 'community_verified',
    daysAgo: 7,
  },

  // --- UK: Skomer, Pembrokeshire (555624864) ---
  {
    mpaExternalId: '555624864',
    reportType: 'species_sighting',
    speciesName: 'Fratercula arctica',
    quantity: 14,
    notes: 'Counted at least 14 puffins on the water near the landing jetty. Several were carrying sand eels back to their burrows. It is still early in the season but numbers are building. A great sign for the colony.',
    latitude: 51.540,
    longitude: -5.567,
    healthScoreAssessment: 8,
    qualityTier: 'community_verified',
    daysAgo: 4,
  },
  {
    mpaExternalId: '555624864',
    reportType: 'water_quality',
    notes: 'Crystal clear water around the north coast of Skomer today. Visibility easily 10 metres which is excellent for Pembrokeshire. Strong tidal flow keeping the water well oxygenated. No signs of algal bloom or pollution.',
    latitude: 51.542,
    longitude: -5.570,
    healthScoreAssessment: 9,
    qualityTier: 'casual',
    daysAgo: 10,
  },

  // --- UK: Flamborough Head (555556998) ---
  {
    mpaExternalId: '555556998',
    reportType: 'species_sighting',
    speciesName: 'Morus bassanus',
    quantity: 200,
    notes: 'The gannet colony on the chalk cliffs is spectacular. Estimated over 200 birds on the ledges with constant aerial displays. The noise and smell are incredible up close. Several birds were diving into the water just offshore.',
    latitude: 54.111,
    longitude: -0.080,
    healthScoreAssessment: 8,
    qualityTier: 'needs_id',
    daysAgo: 6,
  },
  {
    mpaExternalId: '555556998',
    reportType: 'marine_litter',
    notes: 'Survey of the beach at the base of the cliffs after spring tides. Mostly fishing debris, rope fragments, and plastic bottles. The chalk platform traps a lot of material in the rock pools. Cleared two bags worth.',
    latitude: 54.113,
    longitude: -0.078,
    healthScoreAssessment: 5,
    qualityTier: 'community_verified',
    daysAgo: 13,
    litterItems: {
      'Rope (d>1cm)': 8,
      'Fishing line (monofilament)': 6,
      'Drink bottles (plastic)': 12,
      'Crisp/sweet packets and lolly sticks': 9,
      'Plastic/polystyrene pieces 2.5-50cm': 34,
      'Caps and lids': 7,
      'Cigarette stubs and filters': 18,
    },
    litterWeightKg: 2.4,
    surveyLengthM: 100,
  },

  // --- UK: Strangford Lough (555559192) ---
  {
    mpaExternalId: '555559192',
    reportType: 'species_sighting',
    speciesName: 'Phoca vitulina',
    quantity: 12,
    notes: 'A group of common seals hauled out on the mud flats near the narrows. Counted 12 including 3 pups. They were very relaxed and barely moved as the boat drifted past at a safe distance.',
    latitude: 54.453,
    longitude: -5.597,
    healthScoreAssessment: 7,
    qualityTier: 'community_verified',
    daysAgo: 5,
  },
  {
    mpaExternalId: '555559192',
    reportType: 'habitat_condition',
    notes: 'Snorkelled over the horse mussel beds in the central part of the lough. The reefs are showing signs of recovery since the dredging ban. Saw several large horse mussels and the associated community of brittlestars, anemones, and small fish is coming back.',
    latitude: 54.450,
    longitude: -5.595,
    healthScoreAssessment: 6,
    qualityTier: 'needs_id',
    daysAgo: 16,
  },

  // --- Netherlands: Voordelta (900898) ---
  {
    mpaExternalId: '900898',
    reportType: 'species_sighting',
    speciesName: 'Sterna sandvicensis',
    quantity: 30,
    notes: 'Large flock of Sandwich terns feeding just offshore from the Brouwersdam. At least 30 birds diving repeatedly into the shallows. They seemed to be following a school of small fish moving along the coast.',
    latitude: 51.744,
    longitude: 3.666,
    healthScoreAssessment: 7,
    qualityTier: 'community_verified',
    daysAgo: 2,
  },
  {
    mpaExternalId: '900898',
    reportType: 'marine_litter',
    notes: 'Beach cleanup along the Voordelta shore near Ouddorp. The North Sea deposits a lot of material here after westerly storms. Quite a bit of industrial packaging and fishing gear mixed in with the usual consumer plastics.',
    latitude: 51.740,
    longitude: 3.670,
    healthScoreAssessment: 5,
    qualityTier: 'community_verified',
    daysAgo: 11,
    litterItems: {
      'Plastic/polystyrene pieces 2.5-50cm': 52,
      'Drink bottles (plastic)': 8,
      'Rope (d>1cm)': 11,
      'Fishing net': 3,
      'Food containers (plastic)': 6,
      'Polystyrene pieces': 19,
      'Caps and lids': 14,
      'Cigarette stubs and filters': 22,
      'Cotton bud sticks': 5,
    },
    litterWeightKg: 4.1,
    surveyLengthM: 100,
  },

  // --- Netherlands: Noordzeekustzone (555578895) ---
  {
    mpaExternalId: '555578895',
    reportType: 'species_sighting',
    speciesName: 'Phoca vitulina',
    quantity: 5,
    notes: 'Five common seals resting on a sandbank near Texel. They were sunbathing and occasionally lifting their heads to watch passing boats. The sandbank is a well-known haul-out spot for this colony.',
    latitude: 53.271,
    longitude: 5.255,
    healthScoreAssessment: 7,
    qualityTier: 'needs_id',
    daysAgo: 8,
  },
  {
    mpaExternalId: '555578895',
    reportType: 'water_quality',
    notes: 'Water along the North Sea coast near Bergen aan Zee was slightly murky today with about 3 metres visibility. Typical for this stretch after some wave action. No unusual discolouration or smell. Temperature felt cool, around 12 degrees.',
    latitude: 53.268,
    longitude: 5.250,
    healthScoreAssessment: 6,
    qualityTier: 'casual',
    daysAgo: 14,
  },

  // --- Netherlands: Vlakte van de Raan (555557220) ---
  {
    mpaExternalId: '555557220',
    reportType: 'species_sighting',
    speciesName: 'Phocoena phocoena',
    quantity: 2,
    notes: 'Two harbour porpoises spotted from the boat near the Belgian border. They surfaced briefly several times before heading west. The Vlakte van de Raan sandbanks seem to be a regular feeding ground for them.',
    latitude: 51.499,
    longitude: 3.323,
    healthScoreAssessment: 7,
    qualityTier: 'needs_id',
    daysAgo: 9,
  },
  {
    mpaExternalId: '555557220',
    reportType: 'threat_concern',
    notes: 'Noticed heavy shipping traffic cutting very close to the sandbanks. Several large cargo vessels were transiting well inside what I thought was the protected zone. The wash from these ships must disturb the seabed sediments significantly.',
    latitude: 51.496,
    longitude: 3.320,
    healthScoreAssessment: 4,
    qualityTier: 'casual',
    daysAgo: 17,
  },
];

/**
 * Health assessments to seed alongside the observations.
 * These create entries in user_health_assessments, giving the demo user
 * a visible "Your Impact" section on the profile page.
 */
export interface DemoHealthAssessment {
  mpaExternalId: string;
  score: number;
  daysAgo: number;
}

export const DEMO_HEALTH_ASSESSMENTS: DemoHealthAssessment[] = [
  // Mediterranean
  { mpaExternalId: '365008', score: 7, daysAgo: 2 },
  { mpaExternalId: '365005', score: 9, daysAgo: 5 },
  { mpaExternalId: '365004', score: 8, daysAgo: 12 },
  { mpaExternalId: '365010', score: 9, daysAgo: 3 },
  { mpaExternalId: '365022', score: 7, daysAgo: 1 },
  { mpaExternalId: '365015', score: 9, daysAgo: 7 },
  // UK
  { mpaExternalId: '902368', score: 7, daysAgo: 14 },
  { mpaExternalId: '555583014', score: 8, daysAgo: 3 },
  { mpaExternalId: '555624864', score: 8, daysAgo: 4 },
  { mpaExternalId: '555556998', score: 7, daysAgo: 6 },
  { mpaExternalId: '555559192', score: 6, daysAgo: 5 },
  // Netherlands
  { mpaExternalId: '900898', score: 6, daysAgo: 2 },
  { mpaExternalId: '555578895', score: 7, daysAgo: 8 },
  { mpaExternalId: '555557220', score: 5, daysAgo: 9 },
  // Germany
  { mpaExternalId: '555517927', score: 7, daysAgo: 8 },
];
