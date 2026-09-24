import { useEffect, useState } from 'react';
import type { Match } from '../../data/footballData';
import type { RouteId } from '../../config/routes';
import { homeCopy } from '../../i18n/translations';
import { formatMatchDate, formatMatchTime } from '../../shared/formatting/dateTime';
import { getNextMatchCountdownState } from '../../domain/matches/matchSelectors';
import { WidgetShell } from './WidgetShell';

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return { days, hours, minutes };
}

export function NextMatchWidget({
  language,
  match,
  pending = false,
  route,
  onOpen,
}: {
  language: 'ar' | 'en';
  match: Match | null;
  pending?: boolean;
  route: RouteId;
  onOpen: (route: RouteId) => void;
}) {
  const copy = homeCopy[language];
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!match) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [match]);

  if (!match) {
    return (
      <WidgetShell variant="prominent" title={copy.nextMatch} titleId="home-next-title" className="home-next">
        <p className="ta-widget-empty">{copy.emptyNext}</p>
        <p className="ta-widget-note">{copy.emptyNextBody}</p>
      </WidgetShell>
    );
  }

  const state = getNextMatchCountdownState(match, now);
  const phase = pending && state.phase === 'none' ? 'pending' : state.phase;
  const date = formatMatchDate(match.dateISO, match.dateKey, language);
  const clock = parts(state.remainingMs);
  const label = phase === 'live' ? copy.live : phase === 'pending' ? copy.resultPending : copy.nextMatch;

  return (
    <WidgetShell
      variant="prominent"
      title={label}
      titleId="home-next-title"
      className="home-next"
      action={<button type="button" className="text-button" onClick={() => onOpen(route)}>{copy.openMatch}</button>}
    >
      <div className="next-widget-teams">
        <strong>{match.team1}</strong>
        {phase === 'live' || phase === 'pending'
          ? <b className="next-widget-score">{match.score1}<span>–</span>{match.score2}</b>
          : <b className="next-widget-vs">×</b>}
        <strong>{match.team2}</strong>
      </div>
      <p className="next-widget-meta">
        <span>{date.date}</span>
        <span>{formatMatchTime(match.time)}</span>
        {match.stadium && <span>{match.stadium}</span>}
        {match.city && <span>{match.city}</span>}
        {phase === 'live' && state.minute != null && <span>{state.minute}{copy.minute}</span>}
      </p>
      {phase === 'upcoming' && (
        <p className="next-widget-count" aria-live="off">
          <span><b>{clock.days}</b></span>
          <span><b>{clock.hours}</b></span>
          <span><b>{clock.minutes}</b></span>
        </p>
      )}
    </WidgetShell>
  );
}
