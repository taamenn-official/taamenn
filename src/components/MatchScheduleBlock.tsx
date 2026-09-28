import type { Match } from '../data/footballData';
import { presentMatch } from '../shared/formatting/matchPresentation';

type Variant = 'card' | 'compact' | 'share';

export default function MatchScheduleBlock({
  match,
  language,
  variant = 'card',
  showVenue = false,
  now,
}: {
  match: Pick<Match, 'dateISO' | 'dateKey' | 'time' | 'durationMinutes' | 'timing' | 'stadium' | 'city'>;
  language: 'ar' | 'en';
  variant?: Variant;
  showVenue?: boolean;
  now?: Date;
}) {
  const view = presentMatch(match, language, now);
  const venue = [match.stadium, match.city].filter(Boolean).join(' · ');
  return (
    <div className={`schedule-block is-${variant}`} aria-label={view.aria}>
      {view.relativeLabel && <span className="schedule-relative">{view.relativeLabel}</span>}
      <span className="schedule-numeric" dir="ltr">{view.numericDate}</span>
      <span className="schedule-written">{view.writtenDate}</span>
      <strong className="schedule-time" dir="ltr">
        {view.timeParts ? (
          view.timeParts.samePeriod ? (
            <>
              <span className="schedule-time-side"><bdi>{view.timeParts.startClock}</bdi><span className="schedule-dash"> – </span><bdi>{view.timeParts.endClock}</bdi></span>
              <span className="schedule-time-period">{view.timeParts.startPeriod}</span>
            </>
          ) : (
            <>
              <span className="schedule-time-side"><bdi>{view.timeParts.startClock}</bdi> {view.timeParts.startPeriod}</span>
              <span className="schedule-dash" aria-hidden="true">–</span>
              <span className="schedule-time-side"><bdi>{view.timeParts.endClock}</bdi> {view.timeParts.endPeriod}</span>
            </>
          )
        ) : view.timeRange}
      </strong>
      <span className="schedule-summary">{view.summary}</span>
      {view.breakLine && <span className="schedule-break">{view.breakLine}</span>}
      {variant === 'share' && view.playingLine && <span className="schedule-playing">{view.playingLine}</span>}
      {showVenue && venue && <span className="schedule-venue">{venue}</span>}
    </div>
  );
}
