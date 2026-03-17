/**
 * Hero images for MPAs, sourced from Unsplash.
 *
 * Maps MPA external_id (WDPA ID) to an Unsplash photo URL.
 * Images are served via Unsplash's CDN with auto-format and crop parameters.
 *
 * Attribution: All photos are from Unsplash (unsplash.com) and used under
 * the Unsplash License (free for commercial and non-commercial use).
 */

interface MPAImage {
  /** Full Unsplash URL with crop params for hero banner */
  url: string;
  /** Photographer credit */
  credit: string;
  /** Unsplash username for link */
  username: string;
}

const MPA_IMAGES: Record<string, MPAImage> = {
  // --- UK ---
  '902368': {
    // St Kilda, Scotland - remote rocky island
    url: 'https://images.unsplash.com/photo-1548018560-c7196e58424f?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Connor Mollison',
    username: 'connormollison',
  },
  '555583014': {
    // Lundy, Bristol Channel - dramatic rocky island
    url: 'https://images.unsplash.com/photo-1507667522877-ad03f0c7b0e0?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Matt Hardy',
    username: 'matthardy',
  },
  '555624864': {
    // Skomer, Skokholm and the Seas off Pembrokeshire - Welsh coast
    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Ishan @seefromthesky',
    username: 'seefromthesky',
  },
  '555556998': {
    // Flamborough Head, Yorkshire - chalk cliffs
    url: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Matt Paul Catalano',
    username: 'mattpaul',
  },
  '555559192': {
    // Strangford Lough, Northern Ireland - sheltered sea lough
    url: 'https://images.unsplash.com/photo-1468581264429-2548ef9eb732?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Jeremy Bishop',
    username: 'jeremybishop',
  },

  // --- Netherlands ---
  '900898': {
    // Voordelta, South Holland - North Sea coast
    url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Joel Vodell',
    username: 'joelvodell',
  },
  '555578895': {
    // Noordzeekustzone - wide sandy beach, North Sea
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Sean Oulashin',
    username: 'oulashin',
  },
  '555557220': {
    // Vlakte van de Raan, Zeeland - tidal flats
    url: 'https://images.unsplash.com/photo-1520942702018-0862c2f1f8f0?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Silas Baisch',
    username: 'silasbaisch',
  },

  // --- Mediterranean (existing demo MPAs) ---
  '365008': {
    // Archipielago De Cabrera, Spain - turquoise Mediterranean
    url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Shifaaz shamoon',
    username: 'sotti',
  },
  '365015': {
    // Pelagos Sanctuary, open Mediterranean
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Matt Hardy',
    username: 'matthardy',
  },
  '365004': {
    // Torre Guaceto, Italy - Italian coast with clear water
    url: 'https://images.unsplash.com/photo-1516370873344-fb7c61054fa9?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Francesco Ungaro',
    username: 'francesco_ungaro',
  },
  '365005': {
    // Plemmirio, Sicily - rocky Sicilian coast
    url: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Cristina Gottardi',
    username: 'cristina_gottardi',
  },
  '365002': {
    // Miramare, Trieste - Adriatic coast
    url: 'https://images.unsplash.com/photo-1498623116890-37e912163d5d?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'frank mckenna',
    username: 'frankiefreddie',
  },
  '365010': {
    // Islas Medas, Spain - Mediterranean islands
    url: 'https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Joseph Barrientos',
    username: 'jbarre',
  },
  '389004': {
    // Cap de Creus, Spain - rugged Costa Brava
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'v2osk',
    username: 'v2osk',
  },
  '365022': {
    // Acantilados De Maro Cerro Gordo, Spain - coastal cliffs
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Benjamin Voros',
    username: 'vorosbenisop',
  },
  '555517927': {
    // Helgoland, Germany - North Sea island
    url: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?auto=format&fit=crop&w=1200&h=500&q=80',
    credit: 'Tim Marshall',
    username: 'timmarshall',
  },
};

/**
 * Get the hero image for an MPA by its external_id (WDPA ID).
 * Returns null if no image is mapped for this MPA.
 */
export function getMPAImage(externalId: string): MPAImage | null {
  return MPA_IMAGES[externalId] ?? null;
}

/**
 * Check if an MPA has a hero image.
 */
export function hasMPAImage(externalId: string): boolean {
  return externalId in MPA_IMAGES;
}
