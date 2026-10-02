const ILLEGAL = /[\\/:*?"<>|]/g;

/** Filesystem-safe account token. Arabic and Latin letters stay. Empty becomes Profile. */
export function sanitizeAccountName(name: string): string {
  const cleaned = String(name || '')
    .replace(ILLEGAL, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return cleaned || 'Profile';
}

/** Local device time, sortable, independent of locale month names. */
export function formatExportStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export function exportFilename(accountName: string, when = new Date(), extension = 'json'): string {
  const ext = String(extension || 'json').replace(/^\./, '').replace(/[^a-z0-9]/gi, '') || 'json';
  return `TAAMEN_${sanitizeAccountName(accountName)}_${formatExportStamp(when)}.${ext}`;
}

export function profileExportName(profile: { firstName?: string; lastName?: string }): string {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
}
