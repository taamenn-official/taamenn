export type MatchFormat = '5v5' | '7v7';

export function sanitizeMatchFormat(value: unknown): MatchFormat | undefined {
  return value === '5v5' || value === '7v7' ? value : undefined;
}

/** Legacy records omit the field. The product default is 5v5 without rewriting storage. */
export function effectiveMatchFormat(value: unknown): MatchFormat {
  return sanitizeMatchFormat(value) ?? '5v5';
}

export function contributionCapacity(format: MatchFormat): number {
  return format === '7v7' ? 7 : 5;
}

export function contributionsForSave<T>(rows: T[], format: MatchFormat): T[] {
  return rows.slice(0, contributionCapacity(format));
}
