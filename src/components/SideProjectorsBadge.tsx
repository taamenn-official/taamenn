import { SIDEPROJECTORS_LISTING_URL, sideprojectorsCopy } from '../config/sideprojectors';
import type { Language } from '../i18n/translations';

type BadgeVariant = 'float' | 'inline';

/**
 * Local listing mark for the official SideProjectors page.
 * The official PNG is too small to scale, so this is vector text, not a pennant image.
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
      <span className="sideprojectors-mark">
        <span className="sideprojectors-mark-kicker">{text.kicker}</span>
        <span className="sideprojectors-mark-name">{text.name}</span>
      </span>
    </a>
  );
}
