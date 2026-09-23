import { useId } from 'react';
import { Moon, Sun } from 'lucide-react';
import { shellCopy } from '../i18n/translations';
import type { TaamenTheme } from '../theme/theme';

type Language = 'ar' | 'en';

function FlagEn() {
  const raw = useId().replace(/:/g, '');
  const clip = `flag-en-${raw}`;
  return (
    <svg className="language-flag" viewBox="0 0 60 30" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}><rect width="60" height="30" /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0 0 L60 30 M60 0 L0 30" stroke="#fff" strokeWidth="6" />
        <path d="M0 0 L60 30 M60 0 L0 30" stroke="#C8102E" strokeWidth="4" />
        <path d="M30 0 V30 M0 15 H60" stroke="#fff" strokeWidth="10" />
        <path d="M30 0 V30 M0 15 H60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

/** Arabic language marker. Matches the product's Asia/Jerusalem + ar-PS locale, not a second label. */
function FlagAr() {
  return (
    <svg className="language-flag" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="5.34" fill="#000" />
      <rect y="10.66" width="24" height="5.34" fill="#007A3D" />
      <path d="M0 0 L10 8 L0 16 Z" fill="#CE1126" />
    </svg>
  );
}

export function LanguageSwitch({
  language,
  onLanguage,
  className = '',
}: {
  language: Language;
  onLanguage: () => void;
  className?: string;
}) {
  const copy = shellCopy[language];
  const targetIsEnglish = language === 'ar';
  return (
    <button
      type="button"
      className={`language-switch language-button ${className}`.trim()}
      onClick={onLanguage}
      aria-label={copy.languageSwitch}
    >
      <span className="language-switch-flag">{targetIsEnglish ? <FlagEn /> : <FlagAr />}</span>
      <span className="language-switch-label">{targetIsEnglish ? 'English' : 'العربية'}</span>
    </button>
  );
}

export function ThemeToggle({
  theme,
  onTheme,
  language,
  className = '',
}: {
  theme: TaamenTheme;
  onTheme: () => void;
  language: Language;
  className?: string;
}) {
  const copy = shellCopy[language];
  const toLight = theme === 'dark';
  const Icon = toLight ? Sun : Moon;
  return (
    <button
      type="button"
      className={`theme-toggle icon-button ${className}`.trim()}
      onClick={onTheme}
      aria-pressed={!toLight}
      aria-label={toLight ? copy.themeToLight : copy.themeToDark}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
