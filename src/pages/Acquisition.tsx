import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LifeBuoy, Mail, Send, ShieldCheck } from 'lucide-react';
import { TAAMEN_LOGO_ALT, TAAMEN_LOGO_SRC } from '../config/branding';
import {
  ACQUISITION_ASSETS_BASE,
  ACQUISITION_OG_IMAGE,
  ACQUISITION_PRODUCT_SHOTS,
  ACQUISITION_URL,
  type AcquisitionProductShotId,
} from '../config/acquisition';
import { WHATSAPP_CHANNEL_URL, WHATSAPP_URL } from '../config/support';
import { api, ApiError } from '../services/apiClient';
import { uiCopy, type Language } from '../i18n/translations';
import { LanguageSwitch, ThemeToggle } from '../components/ShellControls';
import type { TaamenTheme } from '../theme/theme';
import { acquisitionCopy } from '../i18n/acquisition';
import TaamenAmbientBackground from '../components/ui/taamen-ambient-background';
import { SideProjectorsBadge } from '../components/SideProjectorsBadge';
import { isCompactViewport, prefersReducedMotion } from '../motion/prefersReduced';
import { gsap, useGSAP } from '../motion/gsapRuntime';
import { EASE, MOTION, TRAVEL, compact } from '../motion/tokens';
import { formations, genericTacticalPlayers } from '../data/tacticalPresets';

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
}

function AcquisitionProductShot({
  shotId,
  alt,
  caption,
  variant = 'wide',
}: {
  shotId: AcquisitionProductShotId;
  alt: string;
  caption: string;
  variant?: 'wide' | 'narrow';
}) {
  const shot = ACQUISITION_PRODUCT_SHOTS[shotId];
  const [failed, setFailed] = useState(false);
  const webp = `${ACQUISITION_ASSETS_BASE}/${shot.file}.webp`;
  const png = `${ACQUISITION_ASSETS_BASE}/${shot.file}.png`;
  const sizes = variant === 'narrow' ? '280px' : '(max-width: 1080px) calc(100vw - 32px), 1080px';
  return (
    <figure className={`acquisition-shot acquisition-shot--${variant}`}>
      <div className="acquisition-shot-frame" style={{ aspectRatio: `${shot.width} / ${shot.height}` }}>
        {failed ? (
          <p className="acquisition-shot-fallback">{alt}</p>
        ) : (
          <picture>
            <source srcSet={webp} type="image/webp" />
            <img
              src={png}
              srcSet={`${png} ${shot.width}w`}
              sizes={sizes}
              width={shot.width}
              height={shot.height}
              alt={alt}
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
            />
          </picture>
        )}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function AcquisitionPitchPreview() {
  const formation = formations[0];
  const tokens = genericTacticalPlayers.map((player, index) => {
    const slot = player.team === 'home' ? formation.positions.home[index] : formation.positions.away[index - 5];
    return { id: player.id, team: player.team, x: slot.x, y: slot.y, initial: player.team === 'home' ? 'H' : 'A' };
  });
  return (
    <div className="acquisition-pitch-frame" aria-hidden="true">
      <div className="pitch acquisition-pitch">
        <div className="pitch-midline" />
        <div className="pitch-circle" />
        <div className="pitch-center-spot" />
        <div className="penalty-box penalty-home" />
        <div className="penalty-box penalty-away" />
        <div className="goal-box goal-home" />
        <div className="goal-box goal-away" />
        <div className="goal-area goal-area-home" />
        <div className="goal-area goal-area-away" />
        <div className="penalty-spot penalty-spot-home" />
        <div className="penalty-spot penalty-spot-away" />
        <span className="corner-arc corner-tl" />
        <span className="corner-arc corner-tr" />
        <span className="corner-arc corner-bl" />
        <span className="corner-arc corner-br" />
        {tokens.map((player) => (
          <span
            key={player.id}
            className={`player-token ${player.team}`}
            style={{ left: `${player.x}%`, top: `${player.y}%` }}
          >
            <span>{player.initial}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Acquisition({ language, onLanguage, theme, onTheme }: { language: Language; onLanguage: () => void; theme: TaamenTheme; onTheme: () => void }) {
  const ar = language === 'ar';
  const text = acquisitionCopy[language];
  const support = uiCopy[language];
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState(false);
  const lastSent = useRef('');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = text.title;
    upsertMeta('meta[name="description"]', { name: 'description', content: text.description });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: text.ogTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: text.description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: ACQUISITION_URL });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: ACQUISITION_OG_IMAGE });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: ACQUISITION_OG_IMAGE });
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = ACQUISITION_URL;
  }, [text.description, text.ogTitle, text.title]);

  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    const hero = el.querySelectorAll<HTMLElement>('[data-acq-motion="hero"]');
    const cards = el.querySelectorAll<HTMLElement>('[data-acq-motion="card"]');
    if (prefersReducedMotion()) {
      gsap.set([...hero, ...cards], { clearProps: 'opacity,transform' });
      return;
    }
    const travel = isCompactViewport() ? compact(TRAVEL.card) : TRAVEL.card;
    const tl = gsap.timeline({ defaults: { ease: EASE.entrance } });
    if (hero.length) {
      tl.from(hero, { opacity: 0, y: travel, duration: MOTION.entrance, stagger: 0.06, clearProps: 'opacity,transform' }, 0);
    }
    if (cards.length) {
      tl.from(cards, { opacity: 0, y: Math.round(travel * 0.7), duration: MOTION.panel, stagger: 0.04, clearProps: 'opacity,transform' }, 0.12);
    }
  }, { scope: root, dependencies: [language] });

  const submit = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!email.includes('@') || trimmed.length < 3) {
      setFailed(true);
      setSent(false);
      setStatus(support.contactInvalid);
      return;
    }
    const fingerprint = `${email.trim().toLowerCase()}\n${trimmed}`;
    if (fingerprint === lastSent.current) {
      setFailed(false);
      setSent(true);
      setStatus(support.contactDuplicate);
      return;
    }
    if (busy) return;
    setBusy(true);
    setFailed(false);
    setSent(false);
    setStatus(support.contactSending);
    try {
      const result = await api.sendContactMessage({ email: email.trim(), message: trimmed, name: 'Acquisition' });
      if (!result.contactSent) throw new ApiError(502, 'The message could not be delivered.');
      lastSent.current = fingerprint;
      setSent(true);
      setStatus(result.autoReplySent === false ? support.contactPartial : support.contactSent);
      setMessage('');
    } catch (error) {
      setFailed(true);
      setSent(false);
      const statusCode = error instanceof ApiError ? error.status : -1;
      if (statusCode === 0) setStatus(support.contactOffline);
      else if (statusCode === 400) setStatus(support.contactInvalid);
      else if (statusCode === 429) setStatus(support.contactRateLimited);
      else if (statusCode === 503) setStatus(support.contactUnconfigured);
      else if (statusCode >= 500) setStatus(support.contactEmailUnavailable);
      else setStatus(support.contactFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="acquisition-shell" ref={root}>
      <TaamenAmbientBackground key="atmosphere" variant="home" active={!prefersReducedMotion()} />
      <a className="acquisition-skip" href="#acquisition-main">{text.skip}</a>
      <header className="acquisition-top">
        <a className="acquisition-brand" href="/" aria-label={text.brandHome}>
          <img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT} />
          <span>TAAMEN 2.0</span>
        </a>
        <div className="acquisition-top-actions">
          <LanguageSwitch language={language} onLanguage={onLanguage} />
          <ThemeToggle theme={theme} onTheme={onTheme} language={language} />
          <a className="dark-action" href="/">{text.openApp}</a>
        </div>
      </header>

      <main id="acquisition-main" className="acquisition-main">
        <section className="acquisition-hero panel" data-acq-motion="hero">
          <p className="eyebrow">{text.eyebrow}</p>
          <ul className="acquisition-status" aria-label={text.statusLive}>
            <li><span className="status-chip">{text.statusLive}</span></li>
            <li><span className="status-chip">{text.statusVersion}</span></li>
            <li><span className="status-chip muted">{text.statusPreRevenue}</span></li>
            <li><span className="status-chip muted">{text.statusLocalFirst}</span></li>
          </ul>
          <h1>{text.heading}</h1>
          <p className="subtitle">{text.lede}</p>
          <SideProjectorsBadge language={language} variant="inline" />
          <div className="acquisition-hero-actions">
            <a className="primary-action" href="#acquisition-snapshot">
              {text.explore}
              <ArrowUpRight size={16} />
            </a>
            <a className="dark-action" href="/">{text.openApp}</a>
            <a className="text-button acquisition-quiet-link" href="#acquisition-architecture">{text.technical}</a>
          </div>
        </section>

        <section id="acquisition-snapshot" className="panel" data-acq-motion="card">
          <p className="eyebrow">SNAPSHOT</p>
          <h2>{text.snapshotTitle}</h2>
          <p className="subtitle">{text.snapshotIntro}</p>
          <dl className="acquisition-snapshot">
            {text.snapshot.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav className="acquisition-toc panel" aria-label={text.tocLabel} data-acq-motion="card">
          <p className="eyebrow">DOSSIER</p>
          <h2>{text.tocLabel}</h2>
          <ol>
            {text.toc.map((item) => (
              <li key={item.href}><a href={item.href}>{item.label}</a></li>
            ))}
          </ol>
        </nav>

        <section id="acquisition-what" className="panel">
          <p className="eyebrow">PRODUCT</p>
          <h2>{text.whatTitle}</h2>
          <p>{text.whatBody}</p>
          <p className="settings-note">{text.audiencesLabel}</p>
          <ul className="acquisition-pills">
            {text.audiences.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <AcquisitionProductShot shotId="home" alt={text.shots.home.alt} caption={text.shots.home.caption} />
        </section>

        <section id="acquisition-thesis" className="panel">
          <p className="eyebrow">THESIS</p>
          <h2>{text.thesisTitle}</h2>
          <p>{text.thesisBody}</p>
          <p className="settings-note">{text.flowLabel}</p>
          <ol className="acquisition-flow">
            {text.flow.map((item) => (
              <li key={item.step}>
                <strong>{item.step}</strong>
                <span>{item.maps}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="acquisition-ecosystem" className="panel">
          <p className="eyebrow">ECOSYSTEM</p>
          <h2>{text.ecosystemTitle}</h2>
          <p className="subtitle">{text.ecosystemIntro}</p>
          <div className="acquisition-card-grid">
            {text.ecosystem.map((item) => (
              <article key={item.title} className="acquisition-mini">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <AcquisitionProductShot shotId="matchCenter" alt={text.shots.matchCenter.alt} caption={text.shots.matchCenter.caption} />
          <p className="acquisition-footnote">{text.shotArchiveNote}</p>
          <p className="settings-note">{text.lifecycleTitle}</p>
          <ol className="acquisition-timeline">
            {text.lifecycle.map((item) => <li key={item}>{item}</li>)}
          </ol>
          <p className="acquisition-footnote">{text.analyticsNote}</p>
        </section>

        <section id="acquisition-how" className="panel">
          <p className="eyebrow">WORKSPACE</p>
          <h2>{text.howTitle}</h2>
          <p>{text.howBody}</p>
          <AcquisitionProductShot shotId="login" alt={text.shots.login.alt} caption={text.shots.login.caption} />
          <AcquisitionProductShot shotId="profile" alt={text.shots.profile.alt} caption={text.shots.profile.caption} />
        </section>

        <section className="panel acquisition-tactical">
          <p className="eyebrow">TACTICAL</p>
          <h2>{text.tacticalTitle}</h2>
          <p>{text.tacticalBody}</p>
          <AcquisitionProductShot shotId="tactical" alt={text.shots.tactical.alt} caption={text.shots.tactical.caption} />
          <AcquisitionPitchPreview />
          <p className="acquisition-caption">{text.tacticalCaption}</p>
        </section>

        <section id="acquisition-architecture" className="panel">
          <p className="eyebrow">ARCHITECTURE</p>
          <h2>{text.architectureTitle}</h2>
          <p className="subtitle">{text.architectureIntro}</p>
          <ul className="acquisition-list">{text.architectureCurrent.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section id="acquisition-local" className="acquisition-grid">
          <article className="panel">
            <h2>{text.localTitle}</h2>
            <h3>{text.localBenefitsTitle}</h3>
            <ul className="acquisition-list">{text.localBenefits.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="panel">
            <h3>{text.localTradeoffsTitle}</h3>
            <ul className="acquisition-list">{text.localTradeoffs.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </section>

        <section id="acquisition-implemented" className="panel">
          <p className="eyebrow">CURRENT</p>
          <h2>{text.implementedTitle}</h2>
          <ul className="acquisition-list">{text.implemented.map((item) => <li key={item}>{item}</li>)}</ul>
          <AcquisitionProductShot shotId="mobile" variant="narrow" alt={text.shots.mobile.alt} caption={text.shots.mobile.caption} />
          <AcquisitionProductShot shotId="stadiums" alt={text.shots.stadiums.alt} caption={text.shots.stadiums.caption} />
        </section>

        <section id="acquisition-evolution" className="panel">
          <p className="eyebrow">CURRENT / FUTURE</p>
          <h2>{text.evolutionTitle}</h2>
          <p className="subtitle">{text.evolutionIntro}</p>
          <div className="acquisition-compare">
            <div>
              <span className="status-chip">{text.architectureNow}</span>
              <ul className="acquisition-list">{text.evolutionCurrent.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <span className="status-chip muted">{text.architectureFuture}</span>
              <ul className="acquisition-list">{text.evolutionFuture.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </section>

        <section id="acquisition-stack" className="acquisition-grid">
          <article className="panel">
            <h2>{text.stackTitle}</h2>
            <dl className="acquisition-snapshot">
              {text.stackItems.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </article>
          <article className="panel">
            <h2>{text.infraTitle}</h2>
            <p>{text.infraBody}</p>
            <h3>{text.securityTitle}</h3>
            <p className="subtitle">{text.securityIntro}</p>
            <ul className="acquisition-list">{text.security.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </section>

        <section id="acquisition-maturity" className="panel acquisition-maturity">
          <p className="eyebrow">LAUNCH</p>
          <h2>{text.maturityTitle}</h2>
          <p>{text.maturityBody}</p>
          <aside className="acquisition-traffic" aria-labelledby="acquisition-traffic-title">
            <h3 id="acquisition-traffic-title">{text.trafficTitle}</h3>
            <p>{text.trafficPhrase}</p>
            <dl className="acquisition-traffic-metrics">
              {text.trafficMetrics.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="acquisition-footnote">{text.trafficFootnote}</p>
          </aside>
        </section>

        <section id="acquisition-included" className="acquisition-grid">
          <article className="panel">
            <h2>{text.includedTitle}</h2>
            <ul className="acquisition-list">{text.included.map((item) => <li key={item}>{item}</li>)}</ul>
            <div className="acquisition-price">
              <span className="eyebrow">{text.priceTitle}</span>
              <strong>{text.priceValue}</strong>
              <p>{text.priceNote}</p>
            </div>
          </article>
          <article className="panel">
            <h2>{text.excludedTitle}</h2>
            <ul className="acquisition-list">{text.excluded.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>{text.whyNotZeroTitle}</h3>
            <p>{text.whyNotZero}</p>
          </article>
        </section>

        <section id="acquisition-commercial" className="panel">
          <p className="eyebrow">FUTURE</p>
          <h2>{text.commercialTitle}</h2>
          <p className="subtitle">{text.commercialIntro}</p>
          <div className="acquisition-card-grid acquisition-commercial">
            {text.commercial.map((item) => (
              <article key={item.n} className="acquisition-mini">
                <span className="acquisition-index">{item.n}</span>
                <h3>{item.title}</h3>
                <p>{item.need}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="acquisition-buyer" className="panel">
          <p className="eyebrow">ACQUIRER</p>
          <h2>{text.buyerTitle}</h2>
          <p className="subtitle">{text.buyerIntro}</p>
          <div className="acquisition-card-grid">
            {text.buyers.map((item) => (
              <article key={item.title} className="acquisition-mini">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="acquisition-process" className="panel">
          <p className="eyebrow">PROCESS</p>
          <h2>{text.processTitle}</h2>
          <p className="subtitle">{text.processIntro}</p>
          <ol className="acquisition-steps">
            {text.process.map((item) => (
              <li key={item.n}>
                <span className="acquisition-index">{item.n}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="acquisition-disclaimer">{text.legalDisclaimer}</p>
        </section>

        <section id="acquisition-faq" className="panel">
          <p className="eyebrow">DUE DILIGENCE</p>
          <h2>{text.faqTitle}</h2>
          <div className="acquisition-faq">
            {text.faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="acquisition-contact" className="panel support-contact">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CONTACT TAAMEN</p>
              <h2>{text.ctaTitle}</h2>
            </div>
            <Mail size={18} />
          </div>
          <p className="subtitle">{text.ctaBody}</p>
          <div className="acquisition-hero-actions">
            <a className="dark-action" href="/">{text.ctaOpen}</a>
            <a className="text-button acquisition-quiet-link" href="#acquisition-architecture">{text.ctaTechnical}</a>
          </div>
          {status && (
            <div className={`${failed ? 'error-banner' : sent ? 'success-banner contact-sent' : 'contact-status'}`} role={failed ? 'alert' : 'status'} aria-live="polite">
              {status}
            </div>
          )}
          <form className="support-contact-form" onSubmit={submit} noValidate>
            <label>
              {support.contactEmailLabel}
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" maxLength={254} autoComplete="email" disabled={busy} />
            </label>
            <label>
              {support.contactMessageLabel}
              <textarea rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={support.contactMessagePlaceholder} maxLength={2000} disabled={busy} />
            </label>
            <button className="primary-action" type="submit" disabled={busy} aria-busy={busy}>
              <Send size={15} />
              {busy ? support.contactSending : failed ? support.contactRetry : support.contactSend}
            </button>
          </form>
          <div className="acquisition-alt-contact">
            {WHATSAPP_URL && <a className="support-action whatsapp-action" href={WHATSAPP_URL} target="_blank" rel="noreferrer noopener">{support.openWhatsApp}</a>}
            <a className="support-action whatsapp-action" href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noreferrer noopener">{support.openWhatsAppChannel}</a>
          </div>
          <p className="settings-note"><ShieldCheck size={14} /> {ar ? 'لا أسرار في الواجهة. المستلم يحدده الخادم.' : 'No secrets in the browser. The server owns the recipient.'}</p>
          <p className="acquisition-footnote">{text.listingNote}</p>
          <p className="acquisition-footnote">
            <LifeBuoy size={14} /> {text.priceValue} · {text.priceNote}
          </p>
        </section>
      </main>
    </div>
  );
}
