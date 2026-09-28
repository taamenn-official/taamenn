import { useId } from 'react';
import { scheduleCopy } from '../i18n/translations';
import {
  blankTimingDraft,
  timingFromDraft,
  timingIssues,
  type TimingDraft,
} from '../domain/matches/matchTiming';
import { formatClockPoint, presentMatch } from '../shared/formatting/matchPresentation';

const PRESETS: Array<{ id: string; label: 'preset60' | 'preset2305' | 'preset23010' | 'preset30' | 'preset2155'; draft: TimingDraft }> = [
  { id: 'c60', label: 'preset60', draft: { ...blankTimingDraft(), mode: 'continuous', duration: '60' } },
  { id: 'p2305', label: 'preset2305', draft: { ...blankTimingDraft(), mode: 'periods', periodCount: '2', periodMinutes: '30', breakMinutes: '5' } },
  { id: 'p23010', label: 'preset23010', draft: { ...blankTimingDraft(), mode: 'periods', periodCount: '2', periodMinutes: '30', breakMinutes: '10' } },
  { id: 'c30', label: 'preset30', draft: { ...blankTimingDraft(), mode: 'continuous', duration: '30' } },
  { id: 'p2155', label: 'preset2155', draft: { ...blankTimingDraft(), mode: 'periods', periodCount: '2', periodMinutes: '15', breakMinutes: '5' } },
];

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
  const invalid = issues.length > 0;
  const preview = parsed
    ? presentMatch({
      dateISO: date,
      dateKey: Number(date.replaceAll('-', '')) || 0,
      time,
      timing: parsed.timing,
      durationMinutes: parsed.schedule.scheduledMinutes,
    }, language)
    : null;
  const previewKey = preview
    ? `${preview.timeRange}|${preview.summary}|${preview.breakLine || ''}|${preview.rows.map((row) => row.range).join('|')}`
    : 'invalid';

  const setMode = (mode: TimingDraft['mode']) => {
    if (mode === draft.mode) return;
    if (mode === 'continuous') {
      const playing = parsed?.schedule.playingMinutes;
      onChange({ ...draft, mode, duration: playing ? String(playing) : draft.duration || '60' });
      return;
    }
    onChange({ ...draft, mode });
  };

  return (
    <fieldset className="timing-fields">
      <legend>{copy.timingSystem}</legend>
      <div className="timing-mode" role="radiogroup" aria-label={copy.splitQuestion}>
        <button type="button" role="radio" aria-checked={draft.mode === 'continuous'} className={draft.mode === 'continuous' ? 'is-selected' : ''} onClick={() => setMode('continuous')}>{copy.continuous}</button>
        <button type="button" role="radio" aria-checked={draft.mode === 'periods'} className={draft.mode === 'periods' ? 'is-selected' : ''} onClick={() => setMode('periods')}>{copy.periods}</button>
      </div>
      <div className="timing-presets" role="group" aria-label={copy.timingSystem}>
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={sameDraft(draft, preset.draft) ? 'is-selected' : ''}
            onClick={() => onChange(preset.draft)}
          >
            {copy[preset.label]}
          </button>
        ))}
      </div>
      {draft.mode === 'continuous' ? (
        <label className={issues.includes('duration') ? 'is-invalid' : ''}>
          {copy.duration}
          <span className="timing-input">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              value={draft.duration}
              aria-invalid={issues.includes('duration')}
              aria-describedby={invalid ? errorId : undefined}
              onChange={(event) => onChange({ ...draft, duration: event.target.value })}
            />
            <small>{copy.minutes}</small>
          </span>
        </label>
      ) : (
        <div className="timing-panel">
          <label className={issues.includes('periodCount') ? 'is-invalid' : ''}>
            {copy.periodCount}
            <input type="number" inputMode="numeric" min={1} max={6} value={draft.periodCount} aria-invalid={issues.includes('periodCount')} onChange={(event) => onChange({ ...draft, periodCount: event.target.value })} />
          </label>
          <label className={issues.includes('periodMinutes') ? 'is-invalid' : ''}>
            {copy.periodLength}
            <span className="timing-input">
              <input type="number" inputMode="numeric" min={1} max={180} value={draft.periodMinutes} aria-invalid={issues.includes('periodMinutes')} onChange={(event) => onChange({ ...draft, periodMinutes: event.target.value })} />
              <small>{copy.minutes}</small>
            </span>
          </label>
          <label className={issues.includes('breakMinutes') ? 'is-invalid' : ''}>
            {copy.breakLength}
            <span className="timing-input">
              <input type="number" inputMode="numeric" min={0} max={60} value={draft.breakMinutes} aria-invalid={issues.includes('breakMinutes')} onChange={(event) => onChange({ ...draft, breakMinutes: event.target.value })} />
              <small>{copy.minutes}</small>
            </span>
          </label>
        </div>
      )}
      {invalid && <p className="timing-error" id={errorId} role="alert">{copy.invalidTiming}</p>}
      {preview && (
        <div className="timing-preview" aria-live="polite">
          <span className="timing-preview-label">{copy.preview}</span>
          <div key={previewKey} className="timing-preview-live">
            <strong dir="ltr">{time ? formatClockPoint(time, language) : '—'}</strong>
            {preview.rows.map((row) => (
              <p key={`${row.kind}-${row.label}-${row.range}`}>
                <b>{row.label}</b>
                <span dir="ltr">{row.range}</span>
              </p>
            ))}
            <p className="timing-finish">
              <b>{preview.finishLabel}</b>
              <span dir="ltr">{preview.finishTime}</span>
            </p>
            <small>{preview.summary}{preview.breakLine ? ` · ${preview.breakLine}` : ''}</small>
          </div>
        </div>
      )}
    </fieldset>
  );
}

function sameDraft(current: TimingDraft, preset: TimingDraft): boolean {
  if (current.mode !== preset.mode) return false;
  if (preset.mode === 'continuous') return current.duration === preset.duration;
  return current.periodCount === preset.periodCount
    && current.periodMinutes === preset.periodMinutes
    && current.breakMinutes === preset.breakMinutes;
}
