import { useState } from 'react';
import {
  SIDEPROJECTORS_BADGE_HEIGHT,
  SIDEPROJECTORS_BADGE_SRC,
  SIDEPROJECTORS_BADGE_WIDTH,
  SIDEPROJECTORS_LISTING_URL,
  sideprojectorsCopy,
} from '../config/sideprojectors';
import type { Language } from '../i18n/translations';

type BadgeVariant = 'float' | 'inline';

/**
 * Official SideProjectors listing badge. Same component in MainShell (fixed) and
 * on /acquisition (inline). External image is not required for boot.
 */
export function SideProjectorsBadge({
  language,
  variant,
}: {
  language: Language;
  variant: BadgeVariant;
}) {
  const text = sideprojectorsCopy[language];
  const [imageFailed, setImageFailed] = useState(false);
  const showLabel = variant === 'inline' || imageFailed;

  return (
    <a
      className={`sideprojectors-badge sideprojectors-badge--${variant}`}
      href={SIDEPROJECTORS_LISTING_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={text.label}
    >
      {!imageFailed && (
        <img
          src={SIDEPROJECTORS_BADGE_SRC}
          alt={text.alt}
          width={SIDEPROJECTORS_BADGE_WIDTH}
          height={SIDEPROJECTORS_BADGE_HEIGHT}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      )}
      {showLabel && <span className="sideprojectors-badge-label">{text.label}</span>}
    </a>
  );
}
