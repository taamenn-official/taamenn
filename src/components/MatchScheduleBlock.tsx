import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Match } from '../data/footballData';
import { scheduleCopy } from '../i18n/translations';
import { presentMatch, type MatchPresentation } from '../shared/formatting/matchPresentation';

type Variant = 'card' | 'compact' | 'share';

function TimeRange({ view }: { view: MatchPresentation }) {
  if (!view.timeParts) return view.timeRange;
  if (view.timeParts.samePeriod) {
    return (
      <>
        <span className="schedule-time-side">
          <bdi>{view.timeParts.startClock}</bdi>
          <span className="schedule-dash"> – </span>
          <bdi>{view.timeParts.endClock}</bdi>
        </span>
        <span className="schedule-time-period">{view.timeParts.startPeriod}</span>
      </>
    );
  }
  return (
    <>
      <span className="schedule-time-side"><bdi>{view.timeParts.startClock}</bdi> {view.timeParts.startPeriod}</span>
      <span className="schedule-dash" aria-hidden="true">–</span>
      <span className="schedule-time-side"><bdi>{view.timeParts.endClock}</bdi> {view.timeParts.endPeriod}</span>
    </>
  );
}

function TimingDetails({ view, language }: { view: MatchPresentation; language: 'ar' | 'en' }) {
  const copy = scheduleCopy[language];
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  if (!view.summary || !view.shortSummary) return null;
  return (
    <div
      className="schedule-structure"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
      }}
    >
      <div className="schedule-structure-head">
        <p className="schedule-summary">
          <span className="summary-full">{view.summary}</span>
          <span className="summary-short">{view.shortSummary}</span>
        </p>
        <button
          type="button"
          className="timing-disclosure"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown size={14} aria-hidden="true" />
          {copy.timingDetails}
        </button>
      </div>
      {open && (
        <div id={detailsId} className="timing-details">
          <ul>
            {view.detailRows.map((row) => (
              <li key={`${row.kind}-${row.label}`}>
                <span>{row.label}</span>
                <b dir="ltr">{row.duration}</b>
              </li>
            ))}
          </ul>
          <p className="timing-total"><span>{copy.totalOccupied}</span><b dir="ltr">{view.occupiedPhrase}</b></p>
        </div>
      )}
    </div>
  );
}

export default function MatchScheduleBlock({
  match,
  language,
  variant = 'card',
  showVenue = false,
  now,
  children,
}: {
  match: Pick<Match, 'dateISO' | 'dateKey' | 'time' | 'durationMinutes' | 'timing' | 'stadium' | 'city'>;
  language: 'ar' | 'en';
  variant?: Variant;
  showVenue?: boolean;
  now?: Date;
  children?: ReactNode;
}) {
  const view = presentMatch(match, language, now);
  const venue = [match.stadium, match.city].filter(Boolean).join(' · ');
  return (
    <div className={`schedule-block is-${variant}`} aria-label={view.aria}>
      {view.relativeLabel && <span className="schedule-relative">{view.relativeLabel}</span>}
      <strong className="schedule-time" dir="ltr">
        <TimeRange view={view} />
      </strong>
      <span className="schedule-date">
        <span className="schedule-numeric" dir="ltr">{view.numericDate}</span>
        <span className="schedule-written">{view.writtenDate}</span>
      </span>
      {children}
      {showVenue && venue && <span className="schedule-venue">{venue}</span>}
      <TimingDetails view={view} language={language} />
    </div>
  );
}
