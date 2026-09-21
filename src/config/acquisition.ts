import { SIDEPROJECTORS_LISTING_URL } from './sideprojectors.ts';

/** Asking price for the TAAMEN 2.0 asset sale. Negotiable. Do not invent urgency. */
export const ACQUISITION_PRICE_USD = 4900;
export const ACQUISITION_PRICE_LABEL = 'USD 4,900';
export const ACQUISITION_VERSION = '2.0.0';
export const ACQUISITION_ORIGIN = 'https://taamenn.com';
export const ACQUISITION_PATH = '/acquisition';
export const ACQUISITION_URL = `${ACQUISITION_ORIGIN}${ACQUISITION_PATH}`;
export const ACQUISITION_OG_IMAGE = `${ACQUISITION_ORIGIN}/assets/taamen-brand-mark.png`;

export const ACQUISITION_LISTING_URL = SIDEPROJECTORS_LISTING_URL;

/** Same-origin product screenshots. Do not load these from SideProjectors or R2. */
export const ACQUISITION_ASSETS_BASE = '/acquisition-assets';

export const ACQUISITION_PRODUCT_SHOTS = {
  matchCenter: { file: '01-match-center', width: 1440, height: 649 },
  home: { file: '02-home', width: 1440, height: 658 },
  login: { file: '03-login', width: 1440, height: 648 },
  mobile: { file: '04-mobile', width: 254, height: 558 },
  profile: { file: '05-profile', width: 1440, height: 654 },
  stadiums: { file: '06-stadiums', width: 1440, height: 659 },
  tactical: { file: '07-tactical', width: 1440, height: 658 },
} as const;

export type AcquisitionProductShotId = keyof typeof ACQUISITION_PRODUCT_SHOTS;

/**
 * Cloudflare-observed traffic since launch. These are not verified unique human users.
 * Keep this phrasing if the figures are shown at all.
 */
export const ACQUISITION_TRAFFIC_PHRASE =
  'Public beta traffic began in September 2026, with production requests first observed around 16 September 2026.';

export const ACQUISITION_TRAFFIC_LABEL = 'Cloudflare-observed traffic since launch';

export const ACQUISITION_TRAFFIC = {
  requests: '~8.6K',
  visits: '3.52K',
  cacheHit: '88.35%',
  bandwidth: '78.68 MB',
} as const;
