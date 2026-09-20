import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Globe2, LifeBuoy, Lock, Mail, Send, ShieldCheck, Smartphone } from 'lucide-react';
import { TAAMEN_LOGO_ALT, TAAMEN_LOGO_SRC } from '../config/branding';
import { WHATSAPP_CHANNEL_URL, WHATSAPP_URL } from '../config/support';
import { api, ApiError } from '../services/apiClient';
import { uiCopy, type Language } from '../i18n/translations';
import TaamenAmbientBackground from '../components/ui/taamen-ambient-background';
import { SideProjectorsBadge } from '../components/SideProjectorsBadge';
import { prefersReducedMotion } from '../motion/prefersReduced';

const copy = {
  ar: {
    title: 'TAAMEN 2.0 — فرصة الاستحواذ',
    description: 'مساحة كرة قدم محلية أولاً، حيّة على taamenn.com، قبل الإيرادات. الكود والنطاق والهوية جاهزة للنقل.',
    eyebrow: 'TAAMEN ACQUISITION',
    heading: 'فرصة استحواذ TAAMEN',
    lede: 'منتج كرة قدم محلي أولاً، يعمل اليوم، بلا اشتراكات وبلا ادعاءات وهمية. المشتري يحصل على الأصل كما هو.',
    demo: 'جرّب التجربة الحيّة',
    contact: 'تواصل مع TAAMEN',
    highlights: 'أبرز ما في المنتج',
    highlightItems: [
      'تجربة عامة بلا حساب: الملف، المباريات، السجل، التكتيك، الإعدادات، الدعم.',
      'أعضاء مميزون بجلسة خادم للقراءة فقط على السجل التاريخي.',
      'مشاركة عامة للملف والمباراة من الرابط نفسه دون اختراع تشفير.',
      'PWA محلي أولاً مع عامل خدمة لا يخزّن /api/*.',
    ],
    technology: 'التقنية',
    techItems: [
      'واجهة React/Vite مع تجربة عربية RTL وإنجليزية LTR.',
      'واجهة Cloudflare Worker على نفس الأصل لـ /api/* مع KV للجلسات والسجل التاريخي.',
      'تواصل الدعم عبر الخادم (EmailJS)، والمستلم لا يُختار من المتصفح.',
      'لا حسابات للمستخدم العادي. التعرف على الأعضاء المميزين يتم في الخادم فقط.',
    ],
    state: 'الوضع الحالي',
    stateItems: [
      { label: 'وظيفي', text: 'المسارات الأساسية تعمل محلياً وعلى نفس أصل الإنتاج بعد النشر.' },
      { label: 'حيّ', text: 'النطاق المقصود https://taamenn.com — النشر منفصل عن هذا العرض.' },
      { label: 'قبل الإيرادات', text: 'لا يوجد MRR، ولا عملاء مدفوعون، ولا اشتراكات.' },
      { label: 'محلي أولاً', text: 'بيانات المستخدم العادي تبقى في المتصفح (IndexedDB).' },
    ],
    receives: 'ماذا يستلم المشتري',
    receiveItems: [
      'مصدر الكود الكامل كما في المستودع.',
      'النطاق والعلامة بعد النقل المتفق عليه — بلا أسرار في git.',
      'إعدادات النشر (Wrangler / Cloudflare) بدون مفاتيح خاصة.',
      'وثائق التشغيل والمشاركة والبريد والدعم.',
    ],
    growth: 'فرص النمو (مستقبلية)',
    growthNote: 'هذه أفكار لاحقة، ليست ميزات موجودة ولا التزامات.',
    growthItems: [
      'التحقق الفعلي من البريد (مجمّد حالياً).',
      'توزيع أوسع بعد استقرار النطاق والتشغيل.',
      'شراكات محلية لكرة القدم — ليست سوق SaaS جاهزة.',
    ],
    ctaTitle: 'تحدث مع مالك المنتج',
    ctaBody: 'نفس قناة الدعم الحالية. لا يوجد دفع وهمي ولا تسجيل خروج.',
    openApp: 'افتح TAAMEN',
  },
  en: {
    title: 'TAAMEN 2.0 — Acquisition Opportunity',
    description: 'A local-first football workspace, live at taamenn.com, pre-revenue. Code, domain, and brand are ready to transfer.',
    eyebrow: 'TAAMEN ACQUISITION',
    heading: 'TAAMEN Acquisition Opportunity',
    lede: 'A local-first football product that already runs. No subscriptions and no invented metrics. A buyer receives the asset as it is.',
    demo: 'Try the live demo',
    contact: 'Contact TAAMEN',
    highlights: 'Product highlights',
    highlightItems: [
      'General-user experience with no account: profile, matches, archive, tactical board, settings, support.',
      'Featured Members use a server session for read-only historical records.',
      'Public profile and match sharing from the URL itself — encoding, not encryption.',
      'Local-first PWA whose service worker never caches /api/*.',
    ],
    technology: 'Technology',
    techItems: [
      'React/Vite UI with Arabic RTL and English LTR.',
      'Same-origin Cloudflare Worker for /api/*, with KV for sessions and historical records.',
      'Support mail is sent by the server (EmailJS); the browser never chooses the recipient.',
      'No normal-user accounts. Featured recognition stays on the server.',
    ],
    state: 'Current state',
    stateItems: [
      { label: 'Functional', text: 'Core paths work locally and on the same production origin after deploy.' },
      { label: 'Live', text: 'Intended origin https://taamenn.com — deploy is a separate operator step.' },
      { label: 'Pre-revenue', text: 'No MRR, no paying customers, no subscriptions.' },
      { label: 'Local-first', text: 'Ordinary user data stays in the browser (IndexedDB).' },
    ],
    receives: 'What a buyer receives',
    receiveItems: [
      'The full source repository.',
      'Domain and brand after an agreed transfer — no secrets in git.',
      'Deploy configuration (Wrangler / Cloudflare) without private keys.',
      'Operator docs for deploy, sharing, mail, and support.',
    ],
    growth: 'Growth opportunities (future)',
    growthNote: 'Later ideas only. Not shipped features and not commitments.',
    growthItems: [
      'Real email verification (currently frozen).',
      'Wider distribution after the domain and runtime are stable.',
      'Local football partnerships — this is not a packaged SaaS marketplace.',
    ],
    ctaTitle: 'Talk to the product owner',
    ctaBody: 'The same Support contact channel. No fake checkout.',
    openApp: 'Open TAAMEN',
  },
} as const;

export default function Acquisition({ language, onLanguage }: { language: Language; onLanguage: () => void }) {
  const ar = language === 'ar';
  const text = copy[language];
  const support = uiCopy[language];
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState(false);
  const lastSent = useRef('');

  useEffect(() => {
    document.title = text.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', text.description);
    else {
      const created = document.createElement('meta');
      created.name = 'description';
      created.content = text.description;
      document.head.appendChild(created);
    }
  }, [text.description, text.title]);

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
    <div className="acquisition-shell">
      <TaamenAmbientBackground key="atmosphere" variant="home" active={!prefersReducedMotion()} />
      <header className="acquisition-top">
        <a className="acquisition-brand" href="/">
          <img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT} />
          <span>TAAMEN 2.0</span>
        </a>
        <div className="acquisition-top-actions">
          <button type="button" className="language-button" onClick={onLanguage}>
            <Globe2 size={14} />
            {ar ? 'English' : 'العربية'}
          </button>
          <a className="dark-action" href="/">{text.openApp}</a>
        </div>
      </header>

      <main className="acquisition-main">
        <section className="acquisition-hero panel">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.heading}</h1>
          <p className="subtitle">{text.lede}</p>
          <SideProjectorsBadge language={language} variant="inline" />
          <div className="acquisition-hero-actions">
            <a className="primary-action" href="/">
              {text.demo}
              <ArrowUpRight size={16} />
            </a>
            <a className="dark-action" href="#acquisition-contact">
              <LifeBuoy size={16} />
              {text.contact}
            </a>
          </div>
        </section>

        <section className="acquisition-grid">
          <article className="panel">
            <h2>{text.highlights}</h2>
            <ul>{text.highlightItems.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="panel">
            <h2>{text.technology}</h2>
            <ul>{text.techItems.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </section>

        <section className="panel acquisition-state">
          <h2>{text.state}</h2>
          <div className="acquisition-state-grid">
            {text.stateItems.map((item) => (
              <div key={item.label}>
                <span className="status-chip">{item.label}</span>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="acquisition-grid">
          <article className="panel">
            <div className="panel-heading">
              <h2>{text.receives}</h2>
              <Lock size={18} />
            </div>
            <ul>{text.receiveItems.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="panel">
            <div className="panel-heading">
              <h2>{text.growth}</h2>
              <Smartphone size={18} />
            </div>
            <p className="settings-note">{text.growthNote}</p>
            <ul>{text.growthItems.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
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
          {status && <div className={`${failed ? 'error-banner' : sent ? 'success-banner contact-sent' : 'contact-status'}`} role={failed ? 'alert' : 'status'} aria-live="polite">{status}</div>}
          <form className="support-contact-form" onSubmit={submit} noValidate>
            <label>{support.contactEmailLabel}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" maxLength={254} autoComplete="email" disabled={busy} /></label>
            <label>{support.contactMessageLabel}<textarea rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={support.contactMessagePlaceholder} maxLength={2000} disabled={busy} /></label>
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
        </section>
      </main>
    </div>
  );
}
