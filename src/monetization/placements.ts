/**
 * Monetization boundary.
 *
 * Sponsored products (cards, venues, matches, partners, billing) stay off.
 * Website ad slots are a separate, fail-closed path: nothing renders unless
 * preview is explicitly on or a real AdSense publisher id and slot id are set.
 * This module does not call the network.
 */
export const PHASE1_MONETIZATION_ENABLED = false;

export type FuturePlacement =
  | 'AdSlot'
  | 'SponsoredCard'
  | 'SponsoredVenue'
  | 'SponsoredMatch'
  | 'PartnerCard';

export function placementEnabled(_placement: FuturePlacement): boolean {
  return PHASE1_MONETIZATION_ENABLED;
}

export const AD_PLACEMENTS = ['home', 'home-follow', 'stadiums', 'stadiums-follow', 'archive', 'archive-follow'] as const;
const PREVIEW_PLACEMENTS = new Set<AdPlacement>(['home', 'stadiums', 'archive']);
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/** Surfaces that must never mount an ad slot. */
export const RESTRICTED_AD_SURFACES = [
  'profile',
  'profile-setup',
  'login',
  'auth',
  'match-center',
  'historical-match-center',
  'match-creation',
  'result-entry',
  'match-editing',
  'tactical',
  'settings',
  'security',
  'privacy',
  'notifications',
  'confirmation',
  'share',
  'acquisition',
  'support',
  'trophy',
] as const;

export type AdConfig = {
  enabled: boolean;
  clientId?: string;
  slots?: Partial<Record<AdPlacement, string>>;
};

export type AdEnv = {
  VITE_ADS_PREVIEW?: string;
  VITE_ADSENSE_ENABLED?: string;
  VITE_ADSENSE_CLIENT_ID?: string;
  VITE_ADSENSE_HOME_SLOT?: string;
  VITE_ADSENSE_HOME_FOLLOW_SLOT?: string;
  VITE_ADSENSE_STADIUMS_SLOT?: string;
  VITE_ADSENSE_STADIUMS_FOLLOW_SLOT?: string;
  VITE_ADSENSE_ARCHIVE_SLOT?: string;
  VITE_ADSENSE_ARCHIVE_FOLLOW_SLOT?: string;
};

const SLOT_ENV: Record<AdPlacement, keyof AdEnv> = {
  home: 'VITE_ADSENSE_HOME_SLOT',
  'home-follow': 'VITE_ADSENSE_HOME_FOLLOW_SLOT',
  stadiums: 'VITE_ADSENSE_STADIUMS_SLOT',
  'stadiums-follow': 'VITE_ADSENSE_STADIUMS_FOLLOW_SLOT',
  archive: 'VITE_ADSENSE_ARCHIVE_SLOT',
  'archive-follow': 'VITE_ADSENSE_ARCHIVE_FOLLOW_SLOT',
};

/** Google publisher ids look like ca-pub- followed by digits. No value is stored here. */
export function isPublisherId(value: string | undefined): value is string {
  return typeof value === 'string' && /^ca-pub-\d{10,20}$/.test(value.trim());
}

export function isSlotId(value: string | undefined): value is string {
  return typeof value === 'string' && /^\d{6,20}$/.test(value.trim());
}

export function isAdPlacement(value: string): value is AdPlacement {
  return (AD_PLACEMENTS as readonly string[]).includes(value);
}

export function surfaceAllowsAd(surface: string): boolean {
  return isAdPlacement(surface);
}

export function readAdConfig(env: AdEnv): AdConfig {
  const clientId = env.VITE_ADSENSE_CLIENT_ID?.trim();
  const enabled = env.VITE_ADSENSE_ENABLED === 'true' && isPublisherId(clientId);
  const slots: Partial<Record<AdPlacement, string>> = {};
  for (const placement of AD_PLACEMENTS) {
    const raw = env[SLOT_ENV[placement]]?.trim();
    if (isSlotId(raw)) slots[placement] = raw;
  }
  return {
    enabled,
    clientId: enabled ? clientId : undefined,
    slots,
  };
}

export function adsPreviewRequested(env: AdEnv): boolean {
  return env.VITE_ADS_PREVIEW === 'true';
}

export type ResolvedAd =
  | { mode: 'none' }
  | { mode: 'preview' }
  | { mode: 'adsense'; clientId: string; slotId: string };

/**
 * Fail closed. Preview never implies a network ad. AdSense markup is returned
 * only when that placement has a real publisher id and a real slot id.
 */
export function resolvePlacement(placement: string, env: AdEnv): ResolvedAd {
  if (!isAdPlacement(placement)) return { mode: 'none' };
  const config = readAdConfig(env);
  const slotId = config.slots?.[placement];
  if (config.enabled && config.clientId && slotId) {
    return { mode: 'adsense', clientId: config.clientId, slotId };
  }
  if (PREVIEW_PLACEMENTS.has(placement) && adsPreviewRequested(env)) return { mode: 'preview' };
  return { mode: 'none' };
}

export function adEnvFromImportMeta(env: ImportMetaEnv): AdEnv {
  return {
    VITE_ADS_PREVIEW: env.VITE_ADS_PREVIEW,
    VITE_ADSENSE_ENABLED: env.VITE_ADSENSE_ENABLED,
    VITE_ADSENSE_CLIENT_ID: env.VITE_ADSENSE_CLIENT_ID,
    VITE_ADSENSE_HOME_SLOT: env.VITE_ADSENSE_HOME_SLOT,
    VITE_ADSENSE_HOME_FOLLOW_SLOT: env.VITE_ADSENSE_HOME_FOLLOW_SLOT,
    VITE_ADSENSE_STADIUMS_SLOT: env.VITE_ADSENSE_STADIUMS_SLOT,
    VITE_ADSENSE_STADIUMS_FOLLOW_SLOT: env.VITE_ADSENSE_STADIUMS_FOLLOW_SLOT,
    VITE_ADSENSE_ARCHIVE_SLOT: env.VITE_ADSENSE_ARCHIVE_SLOT,
    VITE_ADSENSE_ARCHIVE_FOLLOW_SLOT: env.VITE_ADSENSE_ARCHIVE_FOLLOW_SLOT,
  };
}
