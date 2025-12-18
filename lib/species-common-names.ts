/**
 * Mapping of scientific names (genus, family, or species) to common names
 * Used as fallback when OBIS doesn't provide vernacular names
 */

// Map by exact species name
export const SPECIES_COMMON_NAMES: Record<string, string> = {
  // Sharks
  'Carcharodon carcharias': 'Great White Shark',
  'Galeocerdo cuvier': 'Tiger Shark',
  'Sphyrna mokarran': 'Great Hammerhead Shark',
  'Sphyrna lewini': 'Scalloped Hammerhead',
  'Rhincodon typus': 'Whale Shark',
  'Carcharhinus leucas': 'Bull Shark',
  'Carcharhinus amblyrhynchos': 'Grey Reef Shark',
  'Carcharhinus melanopterus': 'Blacktip Reef Shark',
  'Triaenodon obesus': 'Whitetip Reef Shark',
  'Negaprion brevirostris': 'Lemon Shark',
  'Prionace glauca': 'Blue Shark',
  'Isurus oxyrinchus': 'Shortfin Mako',

  // Rays
  'Manta birostris': 'Giant Manta Ray',
  'Manta alfredi': 'Reef Manta Ray',
  'Mobula mobular': 'Giant Devil Ray',
  'Myliobatis aquila': 'Common Eagle Ray',
  'Aetobatus narinari': 'Spotted Eagle Ray',
  'Dasyatis pastinaca': 'Common Stingray',

  // Dolphins & Whales
  'Tursiops truncatus': 'Bottlenose Dolphin',
  'Delphinus delphis': 'Common Dolphin',
  'Stenella longirostris': 'Spinner Dolphin',
  'Stenella coeruleoalba': 'Striped Dolphin',
  'Orcinus orca': 'Orca (Killer Whale)',
  'Megaptera novaeangliae': 'Humpback Whale',
  'Balaenoptera musculus': 'Blue Whale',
  'Balaenoptera physalus': 'Fin Whale',
  'Physeter macrocephalus': 'Sperm Whale',
  'Eubalaena glacialis': 'North Atlantic Right Whale',
  'Globicephala melas': 'Long-finned Pilot Whale',

  // Sea Turtles
  'Caretta caretta': 'Loggerhead Sea Turtle',
  'Chelonia mydas': 'Green Sea Turtle',
  'Eretmochelys imbricata': 'Hawksbill Sea Turtle',
  'Lepidochelys olivacea': 'Olive Ridley Sea Turtle',
  'Dermochelys coriacea': 'Leatherback Sea Turtle',

  // Fish
  'Thunnus albacares': 'Yellowfin Tuna',
  'Thunnus obesus': 'Bigeye Tuna',
  'Thunnus thynnus': 'Bluefin Tuna',
  'Katsuwonus pelamis': 'Skipjack Tuna',
  'Xiphias gladius': 'Swordfish',
  'Coryphaena hippurus': 'Mahi-Mahi',
  'Epinephelus marginatus': 'Dusky Grouper',
  'Mycteroperca bonaci': 'Black Grouper',
  'Acanthurus coeruleus': 'Blue Tang',
  'Amphiprion ocellaris': 'Clownfish',
  'Pterois volitans': 'Red Lionfish',
  'Hippocampus hippocampus': 'Short-snouted Seahorse',
  'Hippocampus guttulatus': 'Long-snouted Seahorse',
  'Mola mola': 'Ocean Sunfish',

  // Octopus & Squid
  'Octopus vulgaris': 'Common Octopus',
  'Octopus cyanea': 'Day Octopus',
  'Sepia officinalis': 'Common Cuttlefish',
  'Loligo vulgaris': 'European Squid',
  'Dosidicus gigas': 'Humboldt Squid',
  'Architeuthis dux': 'Giant Squid',

  // Crustaceans
  'Homarus americanus': 'American Lobster',
  'Homarus gammarus': 'European Lobster',
  'Panulirus argus': 'Caribbean Spiny Lobster',
  'Cancer pagurus': 'Edible Crab',
  'Callinectes sapidus': 'Blue Crab',
  'Portunus pelagicus': 'Blue Swimming Crab',

  // Mollusks
  'Octopus bimaculoides': 'California Two-spot Octopus',
  'Haliotis rufescens': 'Red Abalone',
  'Strombus gigas': 'Queen Conch',
  'Pecten maximus': 'King Scallop',
  'Crassostrea gigas': 'Pacific Oyster',
  'Mytilus edulis': 'Blue Mussel',

  // Corals
  'Acropora palmata': 'Elkhorn Coral',
  'Acropora cervicornis': 'Staghorn Coral',
  'Pocillopora damicornis': 'Cauliflower Coral',
  'Porites lobata': 'Lobe Coral',
  'Montipora capitata': 'Rice Coral',

  // Jellyfish
  'Aurelia aurita': 'Moon Jellyfish',
  'Chrysaora quinquecirrha': 'Sea Nettle',
  'Pelagia noctiluca': 'Mauve Stinger',
  'Physalia physalis': 'Portuguese Man O\' War',

  // Echinoderms
  'Asterias rubens': 'Common Starfish',
  'Pisaster ochraceus': 'Ochre Sea Star',
  'Strongylocentrotus purpuratus': 'Purple Sea Urchin',
  'Echinometra mathaei': 'Burrowing Urchin',
  'Holothuria scabra': 'Sandfish Sea Cucumber',
};

// Map by genus (when species not found)
export const GENUS_COMMON_NAMES: Record<string, string> = {
  // Sharks
  'Carcharodon': 'White Shark',
  'Carcharhinus': 'Requiem Shark',
  'Sphyrna': 'Hammerhead Shark',
  'Galeocerdo': 'Tiger Shark',
  'Rhincodon': 'Whale Shark',
  'Prionace': 'Blue Shark',
  'Isurus': 'Mako Shark',
  'Triaenodon': 'Whitetip Reef Shark',
  'Negaprion': 'Lemon Shark',

  // Rays
  'Manta': 'Manta Ray',
  'Mobula': 'Devil Ray',
  'Myliobatis': 'Eagle Ray',
  'Aetobatus': 'Eagle Ray',
  'Dasyatis': 'Stingray',
  'Pteroplatytrygon': 'Stingray',

  // Dolphins
  'Tursiops': 'Bottlenose Dolphin',
  'Delphinus': 'Common Dolphin',
  'Stenella': 'Spotted Dolphin',
  'Orcinus': 'Orca',
  'Globicephala': 'Pilot Whale',
  'Grampus': 'Risso\'s Dolphin',

  // Whales
  'Megaptera': 'Humpback Whale',
  'Balaenoptera': 'Rorqual',
  'Physeter': 'Sperm Whale',
  'Eubalaena': 'Right Whale',

  // Turtles
  'Caretta': 'Loggerhead Turtle',
  'Chelonia': 'Green Turtle',
  'Eretmochelys': 'Hawksbill Turtle',
  'Lepidochelys': 'Ridley Turtle',
  'Dermochelys': 'Leatherback Turtle',

  // Fish
  'Thunnus': 'Tuna',
  'Katsuwonus': 'Skipjack',
  'Xiphias': 'Swordfish',
  'Coryphaena': 'Dolphinfish',
  'Epinephelus': 'Grouper',
  'Mycteroperca': 'Grouper',
  'Amphiprion': 'Clownfish',
  'Acanthurus': 'Surgeonfish',
  'Pterois': 'Lionfish',
  'Hippocampus': 'Seahorse',
  'Mola': 'Sunfish',

  // Cephalopods
  'Octopus': 'Octopus',
  'Sepia': 'Cuttlefish',
  'Loligo': 'Squid',
  'Dosidicus': 'Jumbo Squid',
  'Architeuthis': 'Giant Squid',

  // Crustaceans
  'Homarus': 'Lobster',
  'Panulirus': 'Spiny Lobster',
  'Cancer': 'Crab',
  'Callinectes': 'Swimming Crab',
  'Portunus': 'Swimming Crab',

  // Corals
  'Acropora': 'Staghorn Coral',
  'Pocillopora': 'Cauliflower Coral',
  'Porites': 'Pore Coral',
  'Montipora': 'Plate Coral',

  // Jellyfish
  'Aurelia': 'Moon Jelly',
  'Chrysaora': 'Sea Nettle',
  'Pelagia': 'Purple Jellyfish',
  'Physalia': 'Portuguese Man O\' War',

  // Echinoderms
  'Asterias': 'Starfish',
  'Pisaster': 'Sea Star',
  'Strongylocentrotus': 'Sea Urchin',
  'Echinometra': 'Rock Urchin',
  'Holothuria': 'Sea Cucumber',
};

// Map by family (when genus not found)
export const FAMILY_COMMON_NAMES: Record<string, string> = {
  // Sharks
  'Lamnidae': 'Mackerel Shark',
  'Carcharhinidae': 'Requiem Shark',
  'Sphyrnidae': 'Hammerhead Shark',
  'Rhincodontidae': 'Whale Shark',
  'Alopiidae': 'Thresher Shark',

  // Rays
  'Myliobatidae': 'Eagle Ray',
  'Mobulidae': 'Manta Ray',
  'Dasyatidae': 'Stingray',

  // Dolphins & Whales
  'Delphinidae': 'Dolphin',
  'Balaenopteridae': 'Rorqual',
  'Physeteridae': 'Sperm Whale',
  'Balaenidae': 'Right Whale',

  // Turtles
  'Cheloniidae': 'Sea Turtle',
  'Dermochelyidae': 'Leatherback Turtle',

  // Fish
  'Scombridae': 'Mackerel',
  'Xiphiidae': 'Swordfish',
  'Coryphaenidae': 'Dolphinfish',
  'Serranidae': 'Grouper',
  'Pomacentridae': 'Damselfish',
  'Acanthuridae': 'Surgeonfish',
  'Scorpaenidae': 'Scorpionfish',
  'Syngnathidae': 'Pipefish & Seahorse',
  'Molidae': 'Sunfish',

  // Cephalopods
  'Octopodidae': 'Octopus',
  'Sepiidae': 'Cuttlefish',
  'Loliginidae': 'Squid',

  // Crustaceans
  'Nephropidae': 'Clawed Lobster',
  'Palinuridae': 'Spiny Lobster',
  'Cancridae': 'Rock Crab',
  'Portunidae': 'Swimming Crab',

  // Corals
  'Acroporidae': 'Staghorn Coral',
  'Pocilloporidae': 'Cauliflower Coral',
  'Poritidae': 'Stony Coral',

  // Bacteria
  'Cohaesibacteraceae': 'Marine Bacteria',
  'Pseudanabaenaceae': 'Cyanobacteria',
  'Rhodobacteraceae': 'Purple Bacteria',
};

/**
 * Get a user-friendly common name for a species
 * Falls back through: vernacularName -> species mapping -> genus mapping -> family mapping -> scientific name
 */
export function getCommonName(species: {
  scientificName: string;
  vernacularName?: string;
  genus?: string;
  family?: string;
}): string {
  // First, check if OBIS provided a vernacular name
  if (species.vernacularName) {
    return species.vernacularName;
  }

  // Try exact species match
  if (SPECIES_COMMON_NAMES[species.scientificName]) {
    return SPECIES_COMMON_NAMES[species.scientificName];
  }

  // Try genus match
  if (species.genus && GENUS_COMMON_NAMES[species.genus]) {
    return GENUS_COMMON_NAMES[species.genus];
  }

  // Try family match
  if (species.family && FAMILY_COMMON_NAMES[species.family]) {
    return FAMILY_COMMON_NAMES[species.family];
  }

  // Fall back to scientific name
  return species.scientificName;
}
