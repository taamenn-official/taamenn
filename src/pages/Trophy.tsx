import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { TAAMEN_LOGO_ALT, TAAMEN_LOGO_SRC } from '../config/branding';
import { readCampaignSource } from '../config/campaign';
import { INSTAGRAM_URL, WHATSAPP_CHANNEL_URL } from '../config/support';
import { challengeCopy, type ChallengeTaskId } from '../i18n/challenge';
import type { Language } from '../i18n/translations';
import { installService } from '../infrastructure/pwa/installService';
import { api, ApiError, type ChallengeProgress, type ChallengeTaskState } from '../services/apiClient';
import { flushChallengeQueue, pendingChallengeEvents, rememberChallengeEvent } from '../services/challengeQueue';
import '../styles/challenge.css';

type Phase = 'before' | 'active' | 'ended';

function errorText(language: Language, error: unknown) {
  const code = error instanceof ApiError ? error.message : 'challenge_backend_unavailable';
  return challengeCopy(language).errors[code] || challengeCopy(language).errors.challenge_backend_unavailable;
}

export default function Trophy({ language, onLanguage }: { language: Language; onLanguage: () => void }) {
  const copy = challengeCopy(language);
  const source = useMemo(() => readCampaignSource(new URLSearchParams(window.location.search).get('src')), []);
  const [phase, setPhase] = useState<Phase | 'unavailable'>('before');
  const [otpReady, setOtpReady] = useState(false);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [step, setStep] = useState<'intro' | 'join' | 'otp' | 'recover'>('intro');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [help, setHelp] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    api.challengeConfig().then(async config => {
      if (!active) return;
      setPhase(config.phase);
      setOtpReady(config.otpAvailable);
      if (config.phase !== 'active') return;
      try {
        const me = await api.challengeMe();
        if (!active) return;
        await flushChallengeQueue();
        const fresh = await api.challengeMe();
        if (active) setProgress(fresh || me);
      } catch (error) {
        if (active && error instanceof ApiError && error.status === 401) setProgress(null);
        else if (active) setMessage(errorText(language, error));
      }
      if (active) setPending(pendingChallengeEvents());
    }).catch(() => { if (active) setPhase('unavailable'); });
    return () => { active = false; };
  }, [language]);

  const sendCode = async () => {
    setBusy(true);
    setMessage('');
    try {
      await api.requestChallengeOtp({ phone, source });
      setStep('otp');
    } catch (error) {
      setMessage(errorText(language, error));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setMessage('');
    try {
      const next = await api.verifyChallengeOtp({ phone, code, displayName: name, source });
      await flushChallengeQueue();
      setProgress(await api.challengeMe().catch(() => next));
      setPending(pendingChallengeEvents());
    } catch (error) {
      setMessage(errorText(language, error));
    } finally {
      setBusy(false);
    }
  };

  const claim = async (type: 'pwa_install_claimed' | 'instagram_follow_claimed' | 'whatsapp_channel_claimed', key: string) => {
    if (type === 'pwa_install_claimed' && installService.canPromptInstall()) await installService.promptInstall().catch(() => undefined);
    rememberChallengeEvent(type, key);
    await flushChallengeQueue();
    try { setProgress(await api.challengeMe()); } catch { /* the claim stays queued */ }
    setPending(pendingChallengeEvents());
  };

  const label = (id: ChallengeTaskId) => ({
    phone_verified: copy.phoneVerified,
    use_taamenn: copy.useTaamen,
    create_5_matches: copy.createMatches,
    share_3_matches: copy.shareMatches,
    install_pwa: copy.install,
    instagram_follow: copy.instagram,
    whatsapp_join: copy.whatsapp,
  }[id]);

  const hint = (task: ChallengeTaskState) => {
    if (task.evidence === 'server_verified' && task.state === 'complete') return copy.serverVerified;
    if (task.evidence === 'recorded') return task.state === 'complete' ? copy.recorded : `${task.count} / ${task.required}`;
    if (task.id === 'instagram_follow' && task.state === 'complete') return copy.claimed;
    if (task.id === 'whatsapp_join' && task.state === 'complete') return copy.joinedClaim;
    if (task.state === 'complete') return copy.softClaim;
    return `${task.count} / ${task.required}`;
  };

  return (
    <article className="trophy-page">
      <header className="legal-document-top">
        <a className="acquisition-brand" href="/" aria-label={copy.homeLink}>
          <img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT} />
          <span>TAAMEN 2.0</span>
        </a>
        <button type="button" className="language-button" onClick={onLanguage}>{language === 'ar' ? 'English' : 'العربية'}</button>
      </header>
      <section className="trophy-hero">
        <p className="eyebrow">{copy.kicker}</p>
        <h1>{phase === 'ended' ? copy.endedTitle : copy.headline}</h1>
        <p>{phase === 'ended' ? copy.endedBody : phase === 'before' ? copy.notStarted : copy.lead}</p>
        <p className="trophy-dates" dir="ltr">{copy.dates}</p>
        {phase === 'active' && <p>{copy.prize}</p>}
        {phase === 'unavailable' && <p role="alert">{copy.unavailable}</p>}
        {(phase === 'before' || phase === 'ended' || phase === 'unavailable') && <a className="primary-action" href="/#home">{copy.homeLink}</a>}
      </section>

      {phase === 'active' && !progress && (
        <section className="trophy-card">
          {step === 'intro' && <button type="button" className="primary-action" onClick={() => setStep('join')} disabled={!otpReady}>{copy.join}</button>}
          {!otpReady && <p role="status">{copy.errors.otp_provider_unavailable}</p>}
          {(step === 'join' || step === 'recover') && (
            <form className="challenge-form" onSubmit={event => { event.preventDefault(); void sendCode(); }}>
              {step === 'join' && <label>{copy.name}<input value={name} onChange={event => setName(event.target.value)} maxLength={40} required /></label>}
              <label>{copy.phone}<input dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} required /></label>
              <button className="primary-action" type="submit" disabled={busy}>{copy.sendCode}</button>
              {step === 'join' && <button type="button" className="text-button" onClick={() => setStep('recover')}>{copy.recover}</button>}
            </form>
          )}
          {step === 'otp' && (
            <form className="challenge-form" onSubmit={event => { event.preventDefault(); void verify(); }}>
              <label>{copy.code}<input dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value)} maxLength={6} required /></label>
              <button className="primary-action" type="submit" disabled={busy}>{copy.verify}</button>
            </form>
          )}
          {message && <p role="alert">{message}</p>}
        </section>
      )}

      {phase === 'active' && progress && (
        <section className="challenge-dashboard">
          <div className="challenge-id" dir="ltr">
            <strong>{progress.participantId}</strong>
            <button type="button" className="dark-action" onClick={() => { void navigator.clipboard?.writeText(progress.participantId); setCopied(true); }}>{copied ? copy.copied : copy.copyId}<Copy size={14} /></button>
          </div>
          <div className="challenge-progress">
            <div>
              <span>{copy.progress}</span>
              <strong>{progress.completed} / {progress.total} {copy.complete}</strong>
            </div>
            <div className="challenge-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label={copy.progress}>
              <span style={{ width: `${progress.percent}%` }} />
            </div>
            <p>{progress.percent}%</p>
            <p>{copy.remaining(progress.total - progress.completed)}</p>
            {progress.status === 'eligible_pending_review' && <p className="challenge-ready"><Check size={16} />{copy.readyTitle} {copy.readyStatus}</p>}
            {progress.status === 'finalist' && <p>{copy.statusFinalist}</p>}
            {progress.status === 'winner' && <p>{copy.statusWinner}</p>}
            {progress.status === 'disqualified' && <p>{copy.statusDisqualified}</p>}
            {progress.status === 'active' && <p>{copy.statusActive}</p>}
            {pending > 0 && <p>{copy.pendingSync}</p>}
          </div>
          <ol className="challenge-tasks">
            {progress.tasks.map((task, index) => (
              <li key={task.id} className={`challenge-task is-${task.state} evidence-${task.evidence}`}>
                <span className="challenge-task-index" dir="ltr">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{label(task.id as ChallengeTaskId)}</strong>
                  <small>{hint(task)}</small>
                  {task.id === 'instagram_follow' && task.state !== 'complete' && (
                    <div className="challenge-task-actions">
                      <button type="button" className="text-button" aria-expanded={help === task.id} onClick={() => setHelp(help === task.id ? null : task.id)}>{copy.how}</button>
                      {help === task.id && <p>{copy.instagramHint}</p>}
                      <a className="dark-action" href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener">{copy.openInstagram}</a>
                      <button type="button" className="primary-action" onClick={() => void claim('instagram_follow_claimed', 'instagram')}>{copy.followed}</button>
                    </div>
                  )}
                  {task.id === 'whatsapp_join' && task.state !== 'complete' && (
                    <div className="challenge-task-actions">
                      <button type="button" className="text-button" aria-expanded={help === task.id} onClick={() => setHelp(help === task.id ? null : task.id)}>{copy.how}</button>
                      {help === task.id && <p>{copy.whatsappHint}</p>}
                      <a className="dark-action" href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noreferrer noopener">{copy.openChannel}</a>
                      <button type="button" className="primary-action" onClick={() => void claim('whatsapp_channel_claimed', 'whatsapp')}>{copy.joined}</button>
                    </div>
                  )}
                  {task.id === 'install_pwa' && task.state !== 'complete' && (
                    <div className="challenge-task-actions">
                      {help === task.id && <p>{copy.installHint}</p>}
                      <button type="button" className="text-button" aria-expanded={help === task.id} onClick={() => setHelp(help === task.id ? null : task.id)}>{copy.how}</button>
                      <button type="button" className="primary-action" onClick={() => void claim('pwa_install_claimed', 'pwa')}>{copy.installAction}</button>
                    </div>
                  )}
                </div>
                <span className="challenge-check" aria-hidden="true">{task.state === 'complete' ? <Check size={16} /> : null}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
