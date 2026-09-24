import { ChevronRight } from 'lucide-react';
import type { Match } from '../../data/footballData';
import type { RouteId } from '../../config/routes';
import { homeCopy } from '../../i18n/translations';
import { formatMatchDate, formatMatchTime } from '../../shared/formatting/dateTime';
import { WidgetShell } from './WidgetShell';

export function UpcomingMatchesWidget({
  language,
  matches,
  route,
  onOpen,
}: {
  language: 'ar' | 'en';
  matches: Match[];
  route: RouteId;
  onOpen: (route: RouteId) => void;
}) {
  const copy = homeCopy[language];
  const rows = matches.slice(0, 3);
  return (
    <WidgetShell
      variant="default"
      title={copy.upcoming}
      titleId="home-upcoming-title"
      action={<button type="button" className="text-button" onClick={() => onOpen(route)}>{copy.viewAll}<ChevronRight className="widget-chevron" size={15} /></button>}
    >
      {rows.length === 0
        ? <p className="ta-widget-empty">{copy.emptyUpcoming}</p>
        : <ul className="widget-rows">
          {rows.map(match => {
            const date = formatMatchDate(match.dateISO, match.dateKey, language);
            return (
              <li key={match.id}>
                <button type="button" className="widget-row" onClick={() => onOpen(route)}>
                  <strong>{match.team1} × {match.team2}</strong>
                  <span>{date.compact} · {formatMatchTime(match.time)}</span>
                </button>
              </li>
            );
          })}
        </ul>}
    </WidgetShell>
  );
}
