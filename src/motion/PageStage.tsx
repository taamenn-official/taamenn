import type { CSSProperties, ReactNode } from 'react';
import { isCompactViewport } from './prefersReduced';
import type { RouteId } from '../config/routes';

type StageProfile = { travel: number; duration: number };

/**
 * Motion per route purpose, in pixels and milliseconds. Data-heavy pages stay
 * short. Home skips the wrapper because it choreographs its own groups, and
 * the tactical board only fades so no transform can fight the drag logic.
 */
const STAGE: Record<RouteId | 'default', StageProfile> = {
  default: { travel: 12, duration: 320 },
  home: { travel: 0, duration: 0 },
  archive: { travel: 12, duration: 320 },
  'match-center': { travel: 12, duration: 320 },
  'historical-match-center': { travel: 12, duration: 320 },
  stadiums: { travel: 12, duration: 320 },
  profile: { travel: 14, duration: 340 },
  support: { travel: 14, duration: 340 },
  settings: { travel: 0, duration: 200 },
  tactical: { travel: 0, duration: 200 },
};

/**
 * Plays the incoming half of a route change. The route has already switched by
 * the time this renders, so navigation never waits for motion.
 */
export default function PageStage({ page, children }: { page: RouteId; children: ReactNode }) {
  const profile = STAGE[page] ?? STAGE.default;
  if (profile.duration === 0) return <div className="page-stage">{children}</div>;

  const compact = isCompactViewport();
  const travel = profile.travel === 0 ? 0 : (compact ? 6 : Math.min(8, profile.travel));
  const duration = compact ? Math.min(180, profile.duration) : Math.min(280, profile.duration);
  const style = {
    '--ta-page-travel': `${travel}px`,
    '--ta-page-ms': `${duration}ms`,
  } as CSSProperties;

  return <div key={page} className="page-stage is-entering" style={style}>{children}</div>;
}
