// Country to region mapping (ISO alpha-3 codes)
const COUNTRY_TO_REGION: Record<string, string> = {
  // Africa
  AGO: 'Africa', BEN: 'Africa', BWA: 'Africa', BDI: 'Africa', CMR: 'Africa',
  CPV: 'Africa', CAF: 'Africa', TCD: 'Africa', COM: 'Africa', COG: 'Africa',
  COD: 'Africa', CIV: 'Africa', DJI: 'Africa', EGY: 'Africa', GNQ: 'Africa',
  ERI: 'Africa', SWZ: 'Africa', ETH: 'Africa', GAB: 'Africa', GMB: 'Africa',
  GHA: 'Africa', GIN: 'Africa', GNB: 'Africa', KEN: 'Africa', LSO: 'Africa',
  LBR: 'Africa', LBY: 'Africa', MDG: 'Africa', MWI: 'Africa', MLI: 'Africa',
  MRT: 'Africa', MUS: 'Africa', MOZ: 'Africa', NAM: 'Africa', NER: 'Africa',
  NGA: 'Africa', RWA: 'Africa', STP: 'Africa', SEN: 'Africa', SYC: 'Africa',
  SLE: 'Africa', SOM: 'Africa', ZAF: 'Africa', SSD: 'Africa', SDN: 'Africa',
  TZA: 'Africa', TGO: 'Africa', TUN: 'Africa', UGA: 'Africa', ZMB: 'Africa',
  ZWE: 'Africa', MAR: 'Africa', REU: 'Africa', MYT: 'Africa', SHN: 'Africa',
  ESH: 'Africa',
  // Antarctica & Southern Ocean
  ATA: 'Antarctica & Southern Ocean', SGS: 'Antarctica & Southern Ocean',
  BVT: 'Antarctica & Southern Ocean', HMD: 'Antarctica & Southern Ocean',
  ATF: 'Antarctica & Southern Ocean',
  // Asia
  CHN: 'Asia', JPN: 'Asia', KOR: 'Asia', PRK: 'Asia', MNG: 'Asia',
  TWN: 'Asia', HKG: 'Asia', MAC: 'Asia', IND: 'Asia', PAK: 'Asia',
  BGD: 'Asia', LKA: 'Asia', MDV: 'Asia', NPL: 'Asia', BTN: 'Asia',
  IDN: 'Asia', MYS: 'Asia', PHL: 'Asia', VNM: 'Asia', THA: 'Asia',
  MMR: 'Asia', KHM: 'Asia', LAO: 'Asia', SGP: 'Asia', TLS: 'Asia',
  BRN: 'Asia', KAZ: 'Asia', KGZ: 'Asia', TJK: 'Asia', TKM: 'Asia',
  UZB: 'Asia',
  // Caribbean & Central America
  BHS: 'Caribbean & Central America', BRB: 'Caribbean & Central America',
  CUB: 'Caribbean & Central America', DMA: 'Caribbean & Central America',
  DOM: 'Caribbean & Central America', GRD: 'Caribbean & Central America',
  HTI: 'Caribbean & Central America', JAM: 'Caribbean & Central America',
  KNA: 'Caribbean & Central America', LCA: 'Caribbean & Central America',
  VCT: 'Caribbean & Central America', TTO: 'Caribbean & Central America',
  ATG: 'Caribbean & Central America', AIA: 'Caribbean & Central America',
  ABW: 'Caribbean & Central America', BMU: 'Caribbean & Central America',
  CYM: 'Caribbean & Central America', CUW: 'Caribbean & Central America',
  GLP: 'Caribbean & Central America', MTQ: 'Caribbean & Central America',
  MSR: 'Caribbean & Central America', PRI: 'Caribbean & Central America',
  SXM: 'Caribbean & Central America', TCA: 'Caribbean & Central America',
  VGB: 'Caribbean & Central America', VIR: 'Caribbean & Central America',
  BLM: 'Caribbean & Central America', MAF: 'Caribbean & Central America',
  BES: 'Caribbean & Central America', BLZ: 'Caribbean & Central America',
  CRI: 'Caribbean & Central America', SLV: 'Caribbean & Central America',
  GTM: 'Caribbean & Central America', HND: 'Caribbean & Central America',
  NIC: 'Caribbean & Central America', PAN: 'Caribbean & Central America',
  MEX: 'Caribbean & Central America',
  // Europe
  ALB: 'Europe', BEL: 'Europe', BGR: 'Europe', CYP: 'Europe', DEU: 'Europe',
  DNK: 'Europe', ESP: 'Europe', EST: 'Europe', FIN: 'Europe', FRA: 'Europe',
  GBR: 'Europe', GRC: 'Europe', HRV: 'Europe', IRL: 'Europe', ISL: 'Europe',
  ITA: 'Europe', LTU: 'Europe', LVA: 'Europe', MLT: 'Europe', MNE: 'Europe',
  NLD: 'Europe', NOR: 'Europe', POL: 'Europe', PRT: 'Europe', ROU: 'Europe',
  SVN: 'Europe', SWE: 'Europe', TUR: 'Europe', FRO: 'Europe', GIB: 'Europe',
  MCO: 'Europe', SJM: 'Europe', AUT: 'Europe', BIH: 'Europe', BLR: 'Europe',
  CHE: 'Europe', CZE: 'Europe', HUN: 'Europe', LIE: 'Europe', LUX: 'Europe',
  MDA: 'Europe', MKD: 'Europe', SMR: 'Europe', SRB: 'Europe', SVK: 'Europe',
  UKR: 'Europe', RUS: 'Europe',
  // Middle East
  BHR: 'Middle East', IRN: 'Middle East', IRQ: 'Middle East', ISR: 'Middle East',
  JOR: 'Middle East', KWT: 'Middle East', LBN: 'Middle East', OMN: 'Middle East',
  QAT: 'Middle East', SAU: 'Middle East', SYR: 'Middle East', ARE: 'Middle East',
  YEM: 'Middle East', PSE: 'Middle East',
  // North America
  CAN: 'North America', USA: 'North America', GRL: 'North America',
  SPM: 'North America', UMI: 'North America',
  // Oceania & Pacific
  AUS: 'Oceania & Pacific', NZL: 'Oceania & Pacific', FJI: 'Oceania & Pacific',
  PNG: 'Oceania & Pacific', SLB: 'Oceania & Pacific', VUT: 'Oceania & Pacific',
  WSM: 'Oceania & Pacific', TON: 'Oceania & Pacific', KIR: 'Oceania & Pacific',
  MHL: 'Oceania & Pacific', FSM: 'Oceania & Pacific', NRU: 'Oceania & Pacific',
  PLW: 'Oceania & Pacific', TUV: 'Oceania & Pacific', COK: 'Oceania & Pacific',
  NIU: 'Oceania & Pacific', TKL: 'Oceania & Pacific', PCN: 'Oceania & Pacific',
  NFK: 'Oceania & Pacific', NCL: 'Oceania & Pacific', PYF: 'Oceania & Pacific',
  WLF: 'Oceania & Pacific', GUM: 'Oceania & Pacific', MNP: 'Oceania & Pacific',
  CXR: 'Oceania & Pacific', CCK: 'Oceania & Pacific', IOT: 'Oceania & Pacific',
  ASM: 'Oceania & Pacific',
  // South America
  ARG: 'South America', BOL: 'South America', BRA: 'South America',
  CHL: 'South America', COL: 'South America', ECU: 'South America',
  GUY: 'South America', PRY: 'South America', PER: 'South America',
  SUR: 'South America', URY: 'South America', VEN: 'South America',
  GUF: 'South America', FLK: 'South America',
};

/** Resolves region(s) for a country field (handles semicolon-separated codes) */
export function getRegionsForCountry(countryField: string): string[] {
  const codes = countryField.split(';').map((c) => c.trim());
  const regions = new Set<string>();
  for (const code of codes) {
    const region = COUNTRY_TO_REGION[code];
    if (region) regions.add(region);
  }
  return Array.from(regions);
}
