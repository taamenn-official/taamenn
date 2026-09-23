export type TaamenTheme = 'dark' | 'light';

const STORAGE_KEY = 'taamen-theme';

export function readTheme(): TaamenTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** Dark stays the default so an empty store keeps the current product. */
export function applyTheme(theme: TaamenTheme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
}

export function nextTheme(theme: TaamenTheme): TaamenTheme {
  return theme === 'dark' ? 'light' : 'dark';
}
