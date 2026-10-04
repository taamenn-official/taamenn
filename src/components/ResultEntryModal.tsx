import { useState, type Dispatch, type SetStateAction } from 'react';
import { Minus, Plus, Trophy, X } from 'lucide-react';
import type { Match, MatchFormat, PlayerContribution } from '../data/footballData';
import { contributionCapacity, contributionsForSave, effectiveMatchFormat } from '../domain/matches/matchFormat';
import { matchUiCopy, type Language } from '../i18n/translations';
import { useOverlayPresence } from '../motion/useOverlayPresence';
import { recordMatchResult } from '../services/matchRepository';

function emptyContribution(): PlayerContribution { return { playerName: '', goals: 0, assists: 0 }; }

export default function ResultEntryModal({ match, language, onClose, onSaved }: { match: Match; language: Language; onClose: () => void; onSaved: () => void }) {
  const copy = matchUiCopy[language];
  const ar = language === 'ar';
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [story, setStory] = useState(match.story || '');
  const [format, setFormat] = useState<MatchFormat>(effectiveMatchFormat(match.matchFormat));
  const [team1, setTeam1] = useState<PlayerContribution[]>(() => [...(match.playerContributions?.team1 || [])]);
  const [team2, setTeam2] = useState<PlayerContribution[]>(() => [...(match.playerContributions?.team2 || [])]);
  const [whyOpen, setWhyOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { backdropRef, panelRef, requestClose } = useOverlayPresence<HTMLButtonElement, HTMLElement>('modal', onClose);
  const why = useOverlayPresence<HTMLButtonElement, HTMLElement>('modal', () => setWhyOpen(false), whyOpen);
  const capacity = contributionCapacity(format);
  const update = (team: 'team1' | 'team2', index: number, field: keyof PlayerContribution, value: string) => {
    const rows = [...(team === 'team1' ? team1 : team2)];
    rows[index] = { ...rows[index], [field]: field === 'playerName' ? value : Math.max(0, Number(value) || 0) };
    (team === 'team1' ? setTeam1 : setTeam2)(rows);
  };
  const remove = (team: 'team1' | 'team2', index: number) => (team === 'team1' ? setTeam1 : setTeam2)(rows => rows.filter((_, row) => row !== index));
  const save = async () => {
    const left = Number(score1), right = Number(score2);
    if (!Number.isInteger(left) || !Number.isInteger(right) || left < 0 || right < 0 || left > 99 || right > 99) { setError(copy.invalidScore); return; }
    setSaving(true); setError('');
    try {
      const clean = (rows: PlayerContribution[]) => contributionsForSave(rows, format).filter(row => row.playerName.trim()).map(row => ({ ...row, playerName: row.playerName.trim(), goals: Math.max(0, Math.trunc(Number(row.goals) || 0)), assists: Math.max(0, Math.trunc(Number(row.assists) || 0)) }));
      const contributions = { team1: clean(team1), team2: clean(team2) };
      await recordMatchResult(match.id, left, right, story.trim(), contributions.team1.length || contributions.team2.length ? contributions : undefined, format);
      onSaved();
      onClose();
    } catch { setError(copy.resultFailed); } finally { setSaving(false); }
  };
  const contributions = (name: string, team: 'team1' | 'team2', rows: PlayerContribution[], setRows: Dispatch<SetStateAction<PlayerContribution[]>>) => {
    const visible = rows.slice(0, capacity);
    return <div className="result-contributions-team">
      <div className="contributions-team-header">
        <strong>{name}</strong>
        <span className="contribution-capacity" dir="ltr">{Math.min(visible.length, capacity)} / {capacity}</span>
        {rows.length < capacity && <button type="button" className="icon-button small" onClick={() => setRows(value => [...value, emptyContribution()])} aria-label={copy.player}><Plus size={14} /></button>}
      </div>
      {visible.map((row, index) => <div className="contribution-row" key={`${team}-${index}`}>
        <input value={row.playerName} onChange={event => update(team, index, 'playerName', event.target.value)} placeholder={copy.player} />
        <input type="number" min="0" value={row.goals || ''} onChange={event => update(team, index, 'goals', event.target.value)} placeholder={copy.goals} />
        <input type="number" min="0" value={row.assists || ''} onChange={event => update(team, index, 'assists', event.target.value)} placeholder={copy.assists} />
        <button type="button" className="icon-button small danger" onClick={() => remove(team, index)} aria-label={copy.delete}><Minus size={14} /></button>
      </div>)}
    </div>;
  };
  return <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-modal-title">
    <button ref={backdropRef} className="overlay-backdrop" onClick={requestClose} aria-label={copy.cancel} />
    <aside ref={panelRef} className="modal-card result-entry-modal">
      <header className="panel-heading"><div><p className="eyebrow">TAAMEN / RESULT</p><h2 id="result-modal-title">{copy.resultTitle}</h2></div><button className="icon-button" onClick={requestClose} aria-label={copy.cancel}><X /></button></header>
      <div className="result-match-preview"><strong>{match.team1}</strong><Trophy /><strong>{match.team2}</strong></div>
      <div className="result-score-grid">
        <label>{copy.team1Score}<input type="number" inputMode="numeric" min="0" max="99" value={score1} onChange={event => setScore1(event.target.value)} /></label>
        <label>{copy.team2Score}<input type="number" inputMode="numeric" min="0" max="99" value={score2} onChange={event => setScore2(event.target.value)} /></label>
      </div>
      <fieldset className="match-format-field">
        <legend>{ar ? 'نوع المباراة' : 'Match format'}</legend>
        <div className="match-format-row">
          <div className="match-format-choice" role="radiogroup" aria-label={ar ? 'نوع المباراة' : 'Match format'}>
            {(['5v5', '7v7'] as MatchFormat[]).map(option => (
              <button key={option} type="button" role="radio" aria-checked={format === option} className={format === option ? 'is-selected' : ''} onClick={() => setFormat(option)}>{option}</button>
            ))}
          </div>
          <button type="button" className="text-button" onClick={() => setWhyOpen(true)}>{ar ? 'لماذا؟' : 'Why?'}</button>
        </div>
      </fieldset>
      <label>{copy.note}<textarea rows={3} value={story} onChange={event => setStory(event.target.value)} /></label>
      <section className="result-contributions"><div><strong>{copy.contributions}</strong><small>{copy.contributionsHelp}</small></div>{contributions(match.team1, 'team1', team1, setTeam1)}{contributions(match.team2, 'team2', team2, setTeam2)}</section>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="modal-actions"><button className="dark-action" onClick={requestClose}>{copy.cancel}</button><button className="primary-action" onClick={save} disabled={saving}>{saving ? copy.saving : copy.saveResult}</button></div>
    </aside>
    {whyOpen && <div className="overlay format-why-overlay" role="dialog" aria-modal="true" aria-labelledby="format-why-title">
      <button ref={why.backdropRef} className="overlay-backdrop" aria-label={copy.cancel} onClick={why.requestClose} />
      <aside ref={why.panelRef} className="modal-card format-why-modal">
        <header className="panel-heading"><h2 id="format-why-title">{ar ? 'لماذا يسأل نظام TAAMEN عن نوع اللعبة؟' : 'Why does TAAMEN ask for the match format?'}</h2><button className="icon-button" onClick={why.requestClose} aria-label={copy.cancel}><X /></button></header>
        <p>{ar
          ? 'لأن عدد اللاعبين يختلف حسب نوع المباراة. يساعد هذا الاختيار TAAMEN على معرفة عدد اللاعبين الذين تريد إضافتهم إلى منطقة اللاعبين المساهمين، حتى تكون قائمة المساهمين مناسبة لعدد لاعبي المباراة.'
          : 'Because the number of players differs by match format. This helps TAAMEN know how many player-contribution slots to provide, so the contribution list matches the number of players in the game.'}</p>
        <button type="button" className="primary-action" onClick={why.requestClose}>{ar ? 'حسنًا' : 'OK'}</button>
      </aside>
    </div>}
  </div>;
}
