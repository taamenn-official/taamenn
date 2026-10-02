import { ArrowUpRight, Briefcase } from 'lucide-react';
import { SIDEPROJECTORS_LISTING_URL, sideprojectorsCopy } from '../config/sideprojectors';
import type { Language } from '../i18n/translations';

type BadgeVariant = 'float' | 'inline';

/**
 * Native TAAMEN link to the official SideProjectors listing.
 * Vector only — the listing pennant is too small to scale.
 */
export function SideProjectorsBadge({
  language,
  variant,
}: {
  language: Language;
  variant: BadgeVariant;
}) {
  const text = sideprojectorsCopy[language];

  return (
    <a
      className={`sideprojectors-badge sideprojectors-badge--${variant}`}
      href={SIDEPROJECTORS_LISTING_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={text.label}
    >
      <Briefcase size={16} aria-hidden="true" />
      <span className="sideprojectors-mark">
        <span className="sideprojectors-mark-name">{text.title}</span>
        <span className="sideprojectors-mark-kicker">{text.hint}</span>
      </span>
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
}
