import { X, Share2, Trophy, Calendar, MapPin, Shield } from 'lucide-react';
import type { Match, PlayerContribution } from '../data/footballData';
import { matchUiCopy } from '../i18n/translations';
import { hasRecordedResult } from '../services/matchLifecycle';
import MatchScheduleBlock from './MatchScheduleBlock';
import { useOverlayPresence } from '../motion/useOverlayPresence';

type Language = 'ar' | 'en';

interface ArchiveDetailModalProps {
  match: Match;
  language: Language;
  featured?: boolean;
  onClose: () => void;
  onShare?: () => void;
}

function calculateTotal(contribution: PlayerContribution): number {
  return contribution.goals + contribution.assists;
}

export default function ArchiveDetailModal({ match, language, featured = false, onClose, onShare }: ArchiveDetailModalProps) {
  const copy = matchUiCopy[language];
  const recorded = hasRecordedResult(match);
  const winner = recorded && match.score1 > match.score2 ? 'team1' : recorded && match.score2 > match.score1 ? 'team2' : null;
  const isDraw = recorded && match.score1 === match.score2;
  const hasContributions = match.playerContributions &&
    (match.playerContributions.team1.length > 0 || match.playerContributions.team2.length > 0);
  const shareable = !featured && match.visibility !== 'PRIVATE' && Boolean(onShare);
  const { backdropRef, panelRef, requestClose } = useOverlayPresence<HTMLButtonElement, HTMLElement>('modal', onClose);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={copy.detailsTitle}>
      <button ref={backdropRef} className="overlay-backdrop" aria-label={copy.closeDetails} onClick={requestClose} />
      <aside ref={panelRef} className="archive-detail-modal">
        <header>
          <div>
            <span className="eyebrow">ARCHIVE / DETAIL</span>
            <h2>{copy.detailsTitle}</h2>
          </div>
          <button className="icon-button" onClick={requestClose} aria-label={copy.closeDetails}>
            <X />
          </button>
        </header>

        <div className="archive-detail-content">
          <div className="match-header">
            <div className="match-scoreboard">
              <div className={`team-score ${winner === 'team1' ? 'winner' : ''}`}>
                <span className="team-name">{match.team1}</span>
                <span className="score">{recorded ? match.score1 : '—'}</span>
              </div>
              <div className="match-divider">
                {isDraw ? <Shield size={20} /> : <Trophy size={20} />}
              </div>
              <div className={`team-score ${winner === 'team2' ? 'winner' : ''}`}>
                <span className="team-name">{match.team2}</span>
                <span className="score">{recorded ? match.score2 : '—'}</span>
              </div>
            </div>

            {!recorded && (
              <div className="winner-banner">
                <span>{copy.resultPending}</span>
              </div>
            )}
            {winner && (
              <div className="winner-banner">
                <Trophy size={16} />
                <span>{copy.winnerLabel}: {winner === 'team1' ? match.team1 : match.team2}</span>
              </div>
            )}
          </div>

          <div className="match-meta">
            <div className="meta-item schedule-meta">
              <Calendar size={16} />
              <MatchScheduleBlock match={match} language={language} variant="compact" />
            </div>
            {match.stadium && (
              <div className="meta-item">
                <MapPin size={16} />
                <span>{match.stadium}</span>
              </div>
            )}
            {match.city && (
              <div className="meta-item">
                <span>{match.city}</span>
              </div>
            )}
            <div className="meta-item">
              <span className="match-type">{match.type}</span>
            </div>
          </div>

          {match.story && (
            <div className="match-story">
              <p>{match.story}</p>
            </div>
          )}

          {hasContributions && (
            <div className="contributions-section">
              <h3>{copy.contributions}</h3>

              {match.playerContributions!.team1.length > 0 && (
                <div className="team-contributions">
                  <h4>{match.team1}</h4>
                  <table className="contributions-table">
                    <thead>
                      <tr>
                        <th>{copy.player}</th>
                        <th>{copy.goals}</th>
                        <th>{copy.assists}</th>
                        <th>{copy.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.playerContributions!.team1.map((contrib, idx) => (
                        <tr key={idx}>
                          <td>{contrib.playerName}</td>
                          <td>{contrib.goals}</td>
                          <td>{contrib.assists}</td>
                          <td className="total-cell">{calculateTotal(contrib)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {match.playerContributions!.team2.length > 0 && (
                <div className="team-contributions">
                  <h4>{match.team2}</h4>
                  <table className="contributions-table">
                    <thead>
                      <tr>
                        <th>{copy.player}</th>
                        <th>{copy.goals}</th>
                        <th>{copy.assists}</th>
                        <th>{copy.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.playerContributions!.team2.map((contrib, idx) => (
                        <tr key={idx}>
                          <td>{contrib.playerName}</td>
                          <td>{contrib.goals}</td>
                          <td>{contrib.assists}</td>
                          <td className="total-cell">{calculateTotal(contrib)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button className="dark-action" onClick={requestClose}>
              {copy.closeDetails}
            </button>
            {shareable && (
              <button className="primary-action" onClick={onShare}>
                <Share2 size={16} />
                {copy.share}
              </button>
            )}
          </div>

          {featured && <p className="settings-note">{copy.historicalReadOnlyNote}</p>}
          {!featured && match.visibility === 'PRIVATE' && (
            <p className="settings-note">{copy.privateShareNote}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
