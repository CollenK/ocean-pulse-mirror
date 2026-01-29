// ISO 3166-1 alpha-3 to alpha-2 code mapping
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  AFG: 'AF', ALB: 'AL', DZA: 'DZ', ASM: 'AS', AND: 'AD',
  AGO: 'AO', ATG: 'AG', ARG: 'AR', ARM: 'AM', AUS: 'AU',
  AUT: 'AT', AZE: 'AZ', BHS: 'BS', BHR: 'BH', BGD: 'BD',
  BRB: 'BB', BLR: 'BY', BEL: 'BE', BLZ: 'BZ', BEN: 'BJ',
  BTN: 'BT', BOL: 'BO', BIH: 'BA', BWA: 'BW', BRA: 'BR',
  BRN: 'BN', BGR: 'BG', BFA: 'BF', BDI: 'BI', KHM: 'KH',
  CMR: 'CM', CAN: 'CA', CPV: 'CV', CAF: 'CF', TCD: 'TD',
  CHL: 'CL', CHN: 'CN', COL: 'CO', COM: 'KM', COG: 'CG',
  COD: 'CD', CRI: 'CR', CIV: 'CI', HRV: 'HR', CUB: 'CU',
  CYP: 'CY', CZE: 'CZ', DNK: 'DK', DJI: 'DJ', DMA: 'DM',
  DOM: 'DO', ECU: 'EC', EGY: 'EG', SLV: 'SV', GNQ: 'GQ',
  ERI: 'ER', EST: 'EE', SWZ: 'SZ', ETH: 'ET', FJI: 'FJ',
  FIN: 'FI', FRA: 'FR', GAB: 'GA', GMB: 'GM', GEO: 'GE',
  DEU: 'DE', GHA: 'GH', GRC: 'GR', GRD: 'GD', GTM: 'GT',
  GIN: 'GN', GNB: 'GW', GUY: 'GY', HTI: 'HT', HND: 'HN',
  HUN: 'HU', ISL: 'IS', IND: 'IN', IDN: 'ID', IRN: 'IR',
  IRQ: 'IQ', IRL: 'IE', ISR: 'IL', ITA: 'IT', JAM: 'JM',
  JPN: 'JP', JOR: 'JO', KAZ: 'KZ', KEN: 'KE', KIR: 'KI',
  PRK: 'KP', KOR: 'KR', KWT: 'KW', KGZ: 'KG', LAO: 'LA',
  LVA: 'LV', LBN: 'LB', LSO: 'LS', LBR: 'LR', LBY: 'LY',
  LIE: 'LI', LTU: 'LT', LUX: 'LU', MDG: 'MG', MWI: 'MW',
  MYS: 'MY', MDV: 'MV', MLI: 'ML', MLT: 'MT', MHL: 'MH',
  MRT: 'MR', MUS: 'MU', MEX: 'MX', FSM: 'FM', MDA: 'MD',
  MCO: 'MC', MNG: 'MN', MNE: 'ME', MAR: 'MA', MOZ: 'MZ',
  MMR: 'MM', NAM: 'NA', NRU: 'NR', NPL: 'NP', NLD: 'NL',
  NZL: 'NZ', NIC: 'NI', NER: 'NE', NGA: 'NG', MKD: 'MK',
  NOR: 'NO', OMN: 'OM', PAK: 'PK', PLW: 'PW', PAN: 'PA',
  PNG: 'PG', PRY: 'PY', PER: 'PE', PHL: 'PH', POL: 'PL',
  PRT: 'PT', QAT: 'QA', ROU: 'RO', RUS: 'RU', RWA: 'RW',
  KNA: 'KN', LCA: 'LC', VCT: 'VC', WSM: 'WS', SMR: 'SM',
  STP: 'ST', SAU: 'SA', SEN: 'SN', SRB: 'RS', SYC: 'SC',
  SLE: 'SL', SGP: 'SG', SVK: 'SK', SVN: 'SI', SLB: 'SB',
  SOM: 'SO', ZAF: 'ZA', ESP: 'ES', LKA: 'LK', SDN: 'SD',
  SUR: 'SR', SWE: 'SE', CHE: 'CH', SYR: 'SY', TWN: 'TW',
  TJK: 'TJ', TZA: 'TZ', THA: 'TH', TLS: 'TL', TGO: 'TG',
  TON: 'TO', TTO: 'TT', TUN: 'TN', TUR: 'TR', TKM: 'TM',
  TUV: 'TV', UGA: 'UG', UKR: 'UA', ARE: 'AE', GBR: 'GB',
  USA: 'US', URY: 'UY', UZB: 'UZ', VUT: 'VU', VEN: 'VE',
  VNM: 'VN', YEM: 'YE', ZMB: 'ZM', ZWE: 'ZW',
  // Territories and special regions
  ATA: 'AQ', GLP: 'GP', GUF: 'GF', MTQ: 'MQ', MYT: 'YT',
  NCL: 'NC', REU: 'RE', SPM: 'PM', WLF: 'WF', PYF: 'PF',
  ATF: 'TF', HKG: 'HK', MAC: 'MO', FLK: 'FK', GIB: 'GI',
  GRL: 'GL', FRO: 'FO', SJM: 'SJ', BMU: 'BM', CYM: 'KY',
  VGB: 'VG', VIR: 'VI', PRI: 'PR', GUM: 'GU', MNP: 'MP',
  TCA: 'TC', AIA: 'AI', MSR: 'MS', COK: 'CK', NIU: 'NU',
  TKL: 'TK', PCN: 'PN', SHN: 'SH', IOT: 'IO', SGS: 'GS',
  BVT: 'BV', HMD: 'HM', CCK: 'CC', CXR: 'CX', NFK: 'NF',
  UMI: 'UM', ESH: 'EH', PSE: 'PS', SSD: 'SS', ABW: 'AW',
  CUW: 'CW', SXM: 'SX', BES: 'BQ', MAF: 'MF', BLM: 'BL',
};

let displayNames: Intl.DisplayNames | null = null;

function getDisplayNames(): Intl.DisplayNames {
  if (!displayNames) {
    displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  }
  return displayNames;
}

/**
 * Converts an ISO 3166-1 alpha-3 country code to a display name.
 * Falls back to the original code if no mapping is found.
 */
export function getCountryName(code: string): string {
  if (!code) return 'Unknown';

  const alpha2 = ALPHA3_TO_ALPHA2[code.toUpperCase()];
  if (!alpha2) return code;

  try {
    return getDisplayNames().of(alpha2) || code;
  } catch {
    return code;
  }
}
