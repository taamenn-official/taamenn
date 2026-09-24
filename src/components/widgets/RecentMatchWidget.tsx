import type { Match } from '../../data/footballData';
import type { RouteId } from '../../config/routes';
import { homeCopy } from '../../i18n/translations';
import { formatMatchDate } from '../../shared/formatting/dateTime';
import { WidgetShell } from './WidgetShell';

export function RecentMatchWidget({
  language,
  match,
  route,
  onOpen,
}: {
  language: 'ar' | 'en';
  match: Match | null;
  route: RouteId;
  onOpen: (route: RouteId) => void;
}) {
  const copy = homeCopy[language];
  return (
    <WidgetShell variant="compact" title={copy.recent} titleId="home-recent-title" className="home-recent">
      {match
        ? <button type="button" className="widget-row" onClick={() => onOpen(route)}>
          <strong>{match.team1} {match.score1}–{match.score2} {match.team2}</strong>
          <span>{formatMatchDate(match.dateISO, match.dateKey, language).compact}</span>
        </button>
        : <p className="ta-widget-empty">{copy.emptyRecent}</p>}
    </WidgetShell>
  );
}
