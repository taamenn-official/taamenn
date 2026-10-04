/** Temporary public campaign. Dates are calendar days in Asia/Hebron, inclusive. */
export const CAMPAIGN_ID = 'taamen-venue-2026';
export const CAMPAIGN_TIME_ZONE = 'Asia/Hebron';
export const CAMPAIGN_START = '2026-10-31';
export const CAMPAIGN_END = '2026-11-15';
export const CAMPAIGN_PATH = '/trophy';

export const CAMPAIGN_SOURCES = ['venue', 'instagram', 'whatsapp', 'poster', 'paid'] as const;
export type CampaignSource = (typeof CAMPAIGN_SOURCES)[number];

export type CampaignPhase = 'before' | 'active' | 'ended';

export function campaignDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPAIGN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function campaignPhase(now: Date = new Date()): CampaignPhase {
  const key = campaignDateKey(now);
  if (key < CAMPAIGN_START) return 'before';
  if (key > CAMPAIGN_END) return 'ended';
  return 'active';
}

export function isCampaignActive(now: Date = new Date()): boolean {
  return campaignPhase(now) === 'active';
}

/** Keep only known campaign sources. Anything else is ignored, not rendered. */
export function readCampaignSource(value: string | null | undefined): CampaignSource | null {
  const source = String(value || '').trim().toLowerCase();
  return (CAMPAIGN_SOURCES as readonly string[]).includes(source) ? source as CampaignSource : null;
}
