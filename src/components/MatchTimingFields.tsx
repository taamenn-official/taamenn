import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { scheduleCopy } from '../i18n/translations';
import {
  TIMING_LIMITS,
  blankTimingDraft,
  timingFromDraft,
  timingIssues,
  type TimingDraft,
} from '../domain/matches/matchTiming';
import { presentMatch } from '../shared/formatting/matchPresentation';

const PERIOD_PRESETS = [
  { id: '230', label: 'preset230', periodCount: '2', periodMinutes: '30' },
  { id: '225', label: 'preset225', periodCount: '2', periodMinutes: '25' },
  { id: '220', label: 'preset220', periodCount: '2', periodMinutes: '20' },
] as const;

function activePreset(draft: TimingDraft): string {
  if (draft.mode !== 'periods') return 'custom';
  return PERIOD_PRESETS.find((preset) => preset.periodCount === draft.periodCount && preset.periodMinutes === draft.periodMinutes)?.id ?? 'custom';
}

export default function MatchTimingFields({
  language,
  date,
  time,
  draft,
  onChange,
}: {
  language: 'ar' | 'en';
  date: string;
  time: string;
  draft: TimingDraft;
  onChange: (next: TimingDraft) => void;
}) {
  const copy = scheduleCopy[language];
  const issues = timingIssues(draft);
  const parsed = timingFromDraft(draft);
  const errorId = useId();
  const panelId = useId();
  const invalid = issues.length > 0;
  const [advanced, setAdvanced] = useState(draft.mode === 'periods');
  const preview = parsed
    ? presentMatch({
      dateISO: date,
      dateKey: Number(date.replaceAll('-', '')) || 0,
      time,
      timing: parsed.timing,
      durationMinutes: parsed.schedule.scheduledMinutes,
    }, language)
    : null;
  const chosen = activePreset(draft);

  const setMode = (mode: TimingDraft['mode']) => {
    if (mode === draft.mode) return;
    if (mode === 'continuous') {
      const playing = parsed?.schedule.playingMinutes;
      onChange({ ...draft, mode, duration: playing ? String(playing) : draft.duration || '60' });
      return;
    }
    onChange({ ...blankTimingDraft(), ...draft, mode: 'periods' });
  };

  return (
    <fieldset className="timing-fields">
      <legend className="sr-only">{copy.timingStructure}</legend>
      {draft.mode === 'continuous' && (
        <label className={issues.includes('duration') ? 'is-invalid' : ''}>
          {copy.duration}
          <span className="timing-input">
            <input
              type="number"
              inputMode="numeric"
              min={TIMING_LIMITS.continuousMinutes.min}
              max={TIMING_LIMITS.continuousMinutes.max}
              value={draft.duration}
              aria-invalid={issues.includes('duration')}
              aria-describedby={invalid ? errorId : undefined}
              onChange={(event) => onChange({ ...draft, duration: event.target.value })}
            />
            <small>{copy.minutes}</small>
          </span>
        </label>
      )}
      {draft.mode === 'periods' && !advanced && preview?.shortSummary && (
        <p className="schedule-summary timing-collapsed-summary">{preview.shortSummary}</p>
      )}
      <button
        type="button"
        className="timing-disclosure"
        aria-expanded={advanced}
        aria-controls={panelId}
        onClick={() => setAdvanced((value) => !value)}
      >
        <ChevronDown size={14} aria-hidden="true" />
        {copy.configurePeriods}
      </button>
      {advanced && (
        <div id={panelId} className="timing-advanced">
          <div className="timing-mode" role="radiogroup" aria-label={copy.timingStructure}>
            <button type="button" role="radio" aria-checked={draft.mode === 'continuous'} className={draft.mode === 'continuous' ? 'is-selected' : ''} onClick={() => setMode('continuous')}>{copy.continuous}</button>
            <button type="button" role="radio" aria-checked={draft.mode === 'periods'} className={draft.mode === 'periods' ? 'is-selected' : ''} onClick={() => setMode('periods')}>{copy.periods}</button>
          </div>
          {draft.mode === 'periods' && (
            <>
              <div className="timing-presets" role="group" aria-label={copy.timingStructure}>
                {PERIOD_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={chosen === preset.id}
                    className={chosen === preset.id ? 'is-selected' : ''}
                    onClick={() => onChange({ ...draft, mode: 'periods', periodCount: preset.periodCount, periodMinutes: preset.periodMinutes })}
                  >
                    {copy[preset.label]}
                  </button>
                ))}
                <button type="button" aria-pressed={chosen === 'custom'} className={chosen === 'custom' ? 'is-selected' : ''} onClick={() => undefined}>
                  {copy.custom}
                </button>
              </div>
              <div className="timing-panel">
                <label className={issues.includes('periodCount') ? 'is-invalid' : ''}>
                  {copy.periodCount}
                  <input type="number" inputMode="numeric" min={TIMING_LIMITS.periodCount.min} max={TIMING_LIMITS.periodCount.max} value={draft.periodCount} aria-invalid={issues.includes('periodCount')} onChange={(event) => onChange({ ...draft, periodCount: event.target.value })} />
                </label>
                <label className={issues.includes('periodMinutes') ? 'is-invalid' : ''}>
                  {copy.periodLength}
                  <span className="timing-input">
                    <input type="number" inputMode="numeric" min={TIMING_LIMITS.periodMinutes.min} max={TIMING_LIMITS.periodMinutes.max} value={draft.periodMinutes} aria-invalid={issues.includes('periodMinutes')} onChange={(event) => onChange({ ...draft, periodMinutes: event.target.value })} />
                    <small>{copy.minutes}</small>
                  </span>
                </label>
                <label className={issues.includes('breakMinutes') ? 'is-invalid' : ''}>
                  {copy.breakLength}
                  <span className="timing-input">
                    <input type="number" inputMode="numeric" min={TIMING_LIMITS.breakMinutes.min} max={TIMING_LIMITS.breakMinutes.max} value={draft.breakMinutes} aria-invalid={issues.includes('breakMinutes')} onChange={(event) => onChange({ ...draft, breakMinutes: event.target.value })} />
                    <small>{copy.minutes}</small>
                  </span>
                </label>
              </div>
              {preview?.equation && (
                <div className="timing-preview" aria-live="polite">
                  <span className="timing-preview-label">{copy.matchWindow}</span>
                  <strong dir="ltr">{preview.timeRange}</strong>
                  <p className="timing-equation" dir="ltr">{preview.equation} = {preview.schedule.scheduledMinutes}</p>
                  <p dir="ltr">{preview.structureLine}</p>
                  <small>{copy.totalOccupied} · <bdi dir="ltr">{preview.occupiedPhrase}</bdi></small>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {invalid && <p className="timing-error" id={errorId} role="alert">{copy.invalidTiming}</p>}
    </fieldset>
  );
}
