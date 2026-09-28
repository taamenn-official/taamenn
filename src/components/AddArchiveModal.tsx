import { useState } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import type { MatchType } from '../data/footballData';
import { createArchivedMatch } from '../services/matchRepository';
import { archiveCopy, matchUiCopy } from '../i18n/translations';
import { todayInTimeZone, zonedDateTimeToEpoch } from '../shared/formatting/dateTime';
import TaamenDatePicker from './TaamenDatePicker';
import { useOverlayPresence } from '../motion/useOverlayPresence';
import MatchTimingFields from './MatchTimingFields';
import { blankTimingDraft, timingFromDraft, type TimingDraft } from '../domain/matches/matchTiming';
import { scheduleCopy } from '../i18n/translations';

type Language = 'ar' | 'en';

interface AddArchiveModalProps {
  language: Language;
  onClose: () => void;
}

export default function AddArchiveModal({ language, onClose }: AddArchiveModalProps) {
  const ar = language === 'ar';
  const copy=matchUiCopy[language];
  const { backdropRef, panelRef, requestClose } = useOverlayPresence<HTMLButtonElement, HTMLElement>('modal', onClose);
  
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [stadium, setStadium] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState<MatchType>('friendly');
  const [timing, setTiming] = useState<TimingDraft>(blankTimingDraft);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const types=archiveCopy[language];
  const typeLabel = (v: string) => ({
    friendly: types.friendly,
    normal: types.normal,
    competitive: types.competitive,
    tournament: types.tournament,
    strong: types.strong
  } as Record<string, string>)[v] || v;

  const validateTimestamp = (): boolean => {
    if (!date || !time) {
      setError(copy.addArchiveRequired);
      return false;
    }

    const matchDateTime = zonedDateTimeToEpoch(date,time);
    if (!Number.isFinite(matchDateTime)||matchDateTime > Date.now()) {
      setError(copy.futureArchive);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!team1.trim() || !team2.trim()) {
      setError(copy.addArchiveRequired);
      return;
    }

    if (!validateTimestamp()) {
      return;
    }

    const parsedTiming = timingFromDraft(timing);
    if (!parsedTiming) {
      setError(scheduleCopy[language].invalidTiming);
      return;
    }

    setIsSubmitting(true);

    try {
      await createArchivedMatch({
        team1: team1.trim(),
        team2: team2.trim(),
        score1: parseInt(score1) || 0,
        score2: parseInt(score2) || 0,
        date,
        time,
        stadium: stadium.trim() || undefined,
        city: city.trim() || undefined,
        type,
        timing: parsedTiming.timing,
      });
      onClose();
    } catch (err) {
      setError(copy.archiveFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <button ref={backdropRef} className="overlay-backdrop" onClick={requestClose} />
      <aside ref={panelRef} className="modal-card archive-modal">
        <header>
          <div>
            <span className="eyebrow">TAAMEN / ARCHIVE</span>
            <h2>{ar ? 'إضافة مباراة مؤرشفة' : 'Add Archived Match'}</h2>
          </div>
          <button className="icon-button" onClick={requestClose}>
            <X />
          </button>
        </header>

        <form className="archive-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              {ar ? 'الفريق الأول' : 'Team 1'} <span className="required">*</span>
              <input
                required
                value={team1}
                onChange={(e) => setTeam1(e.target.value)}
                placeholder={ar ? 'اسم الفريق' : 'Team name'}
              />
            </label>
            <label>
              {ar ? 'الفريق الثاني' : 'Team 2'} <span className="required">*</span>
              <input
                required
                value={team2}
                onChange={(e) => setTeam2(e.target.value)}
                placeholder={ar ? 'اسم الفريق' : 'Team name'}
              />
            </label>
            <label>
              {ar ? 'نتيجة الفريق الأول' : 'Team 1 Score'}
              <input
                type="number"
                min="0"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              {ar ? 'نتيجة الفريق الثاني' : 'Team 2 Score'}
              <input
                type="number"
                min="0"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              {ar ? 'التاريخ' : 'Date'} <span className="required">*</span>
              <TaamenDatePicker value={date} onChange={setDate} language={language} max={todayInTimeZone()} required/>
            </label>
            <label>
              {ar ? 'الوقت' : 'Time'} <span className="required">*</span>
              <div className="date-time-input">
                <Clock size={16} />
                <input
                  required
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </label>
          </div>

          <MatchTimingFields language={language} date={date} time={time || '19:00'} draft={timing} onChange={setTiming} />

          <div className="form-grid">
            <label>
              {ar ? 'الملعب' : 'Stadium'}
              <input
                value={stadium}
                onChange={(e) => setStadium(e.target.value)}
                placeholder={ar ? 'اسم الملعب' : 'Stadium name'}
              />
            </label>
            <label>
              {ar ? 'المدينة' : 'City'}
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={ar ? 'اسم المدينة' : 'City name'}
              />
            </label>
          </div>

          <label>
            {ar ? 'نوع المباراة' : 'Match Type'}
            <select value={type} onChange={(e) => setType(e.target.value as MatchType)}>
              <option value="friendly">{typeLabel('friendly')}</option>
              <option value="normal">{typeLabel('normal')}</option>
              <option value="competitive">{typeLabel('competitive')}</option>
              <option value="tournament">{typeLabel('tournament')}</option>
              <option value="strong">{typeLabel('strong')}</option>
            </select>
          </label>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="dark-action" onClick={requestClose}>
              {ar ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="primary-action" disabled={isSubmitting}>
              {isSubmitting ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ المباراة' : 'Save Match')}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
