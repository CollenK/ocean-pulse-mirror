/**
 * Demo account configuration.
 *
 * All values are read from public env vars so the login page can use them
 * client-side to call signInWithPassword directly.
 */

export const DEMO_USER_EMAIL = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || 'demo@oceanpulse.app';
export const DEMO_USER_PASSWORD = process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD || 'Password123!';
export const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || '00bdbf9f-9b81-46a9-9258-64376ac14acf';

/** Returns true when all three demo env vars are set. */
export function isDemoConfigured(): boolean {
  return !!(DEMO_USER_EMAIL && DEMO_USER_PASSWORD && DEMO_USER_ID);
}

/** Returns true when the given user id or email matches the demo account. */
export function isDemoUser(userId?: string | null, email?: string | null): boolean {
  if (!isDemoConfigured()) return false;
  if (userId && userId === DEMO_USER_ID) return true;
  if (email && email === DEMO_USER_EMAIL) return true;
  return false;
}

/**
 * WDPA external IDs for the European MPAs we seed demo data into.
 * Used for map highlighting and seed data resolution.
 */
export const DEMO_MPA_EXTERNAL_IDS = new Set<string>([
  // Mediterranean
  '365008',      // Archipielago De Cabrera, Spain
  '365015',      // Pelagos Sanctuary, France/Italy/Monaco
  '365004',      // Torre Guaceto, Italy
  '365005',      // Plemmirio, Italy
  '365002',      // Miramare, Italy
  '365010',      // Islas Medas, Spain
  '389004',      // Cap Gros-Cap de Creus, Spain
  '365022',      // Acantilados De Maro Cerro Gordo, Spain
  // UK
  '902368',      // St Kilda, Scotland
  '555583014',   // Lundy, England
  '555624864',   // Skomer, Skokholm and the Seas off Pembrokeshire, Wales
  '555556998',   // Flamborough Head, Yorkshire, England
  '555559192',   // Strangford Lough, Northern Ireland
  // Netherlands
  '900898',      // Voordelta, South Holland
  '555578895',   // Noordzeekustzone, North Sea coast
  '555557220',   // Vlakte van de Raan, Zeeland
  // Germany
  '555517927',   // Helgoland, Germany
]);
