/** Official SideProjectors listing for TAAMEN 2.0. Presentation-only — no API or session. */
export const SIDEPROJECTORS_LISTING_URL = 'https://www.sideprojectors.com/project/95526/taamen-20';

/**
 * badge_2_red.png is about 45×115. Drawing it larger pixelates it, and there
 * is no higher-resolution official pennant in this repo. The shell uses a
 * local vector mark that links to the same listing instead of stretching that file.
 */
export const sideprojectorsCopy = {
  ar: {
    label: 'تأمين متاح للاستحواذ. يفتح قائمة SideProjectors الرسمية في تبويب جديد.',
    title: 'تأمين متاح للاستحواذ',
    hint: 'القائمة الرسمية',
  },
  en: {
    label: 'TAAMEN is available for acquisition. Opens the official SideProjectors listing in a new tab.',
    title: 'TAAMEN for acquisition',
    hint: 'Official listing',
  },
} as const;
