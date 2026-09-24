import { useEffect, useState } from 'react';

export type DisplayMode = 'browser' | 'standalone';

export function displayModeFromSignals(standaloneMedia: boolean, iosStandalone = false): DisplayMode {
  return standaloneMedia || iosStandalone ? 'standalone' : 'browser';
}

export function readDisplayMode(): DisplayMode {
  if (typeof window === 'undefined') return 'browser';
  const media = window.matchMedia?.('(display-mode: standalone)').matches === true;
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayModeFromSignals(media, ios);
}

/** Browser chrome versus an installed standalone window. */
export function useDisplayMode(): DisplayMode {
  const [mode, setMode] = useState<DisplayMode>(readDisplayMode);
  useEffect(() => {
    const query = window.matchMedia?.('(display-mode: standalone)');
    const sync = () => setMode(readDisplayMode());
    sync();
    query?.addEventListener?.('change', sync);
    return () => query?.removeEventListener?.('change', sync);
  }, []);
  return mode;
}
