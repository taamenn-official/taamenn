import { useRef, useState } from 'react';
import { ChevronLeft, ImagePlus, Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import { LanguageSwitch, ThemeToggle } from './ShellControls';
import type { TaamenTheme } from '../theme/theme';
import type { LocalProfile } from '../services/profileRepository';
import { ImageCropOverlay } from './ImageCropOverlay';
import { TAAMEN_LOGO_ALT, TAAMEN_LOGO_SRC } from '../config/branding';
import PrivacyPolicyModal, { recordConsent } from './PrivacyPolicyModal';
import { gsap, useGSAP } from '../motion/gsapRuntime';
import { EASE, MOTION, TRAVEL } from '../motion/tokens';
import { isCompactViewport, prefersReducedMotion } from '../motion/prefersReduced';
import { armCinematicHomeReveal } from '../motion/revealState';
import { ImageActionSheet, ImageViewer } from './ImageActionOverlay';

type Draft = Omit<LocalProfile, 'id' | 'updatedAt' | 'bannerData'>;
const empty: Draft = { firstName: '', lastName: '', email: '', phone: '', avatarData: '', emailVerified: false };

export function ProfileSetup({ language, onSave, onLanguage, theme, onTheme }: { language: 'ar' | 'en'; onSave: (p: Draft) => void; onLanguage: () => void; theme: TaamenTheme; onTheme: () => void }) {
  const ar = language === 'ar';
  const [p, setP] = useState<Draft>(empty);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms'>('privacy');
  const [consentError, setConsentError] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [imageSheet, setImageSheet] = useState(false);
  const [imageViewer, setImageViewer] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);

  // Entrance: the card settles, then branding, avatar, fields, consent and the
  // submit button follow. Nothing overshoots, nothing blocks typing.
  useGSAP(() => {
    const content = contentRef.current;
    if (!content) return;
    if (prefersReducedMotion()) {
      gsap.fromTo(content, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: 'none', clearProps: 'opacity' });
      return;
    }
    const rows = content.querySelectorAll<HTMLElement>('.mobile-branding, .avatar-section, .form-label, .consent-row, .mobile-submit');
    const compactViewport = isCompactViewport();
    const travel = compactViewport ? 4 : TRAVEL.auth;
    const tl = gsap.timeline();
    if (compactViewport) {
      tl.from(content, {
        opacity: 0,
        y: 4,
        duration: 0.2,
        ease: EASE.entrance,
        clearProps: 'opacity,transform',
      }, 0);
      return;
    }
    tl.from(content, {
      opacity: 0,
      y: travel,
      scale: 0.98,
      duration: MOTION.entrance,
      ease: EASE.entrance,
      clearProps: 'opacity,transform',
    }, 0);
    if (rows.length) {
      tl.from(rows, {
        opacity: 0,
        y: Math.round(travel * 0.7),
        duration: MOTION.panel,
        ease: EASE.entrance,
        stagger: 0.05,
        clearProps: 'opacity,transform',
      }, 0.12);
    }
  }, { scope: contentRef });

  const update = (k: keyof Draft, v: string | boolean) => setP(x => ({ ...x, [k]: v }));
  
  const image = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setCropFile(file);
  };
  
  const initials = `${p.firstName.slice(0, 1)}${p.lastName.slice(0, 1)}`.trim().toUpperCase() || '?';
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.firstName.trim()) return;
    if (!consentChecked) {
      setConsentError(true);
      return;
    }
    if (leaving.current) return;
    recordConsent();
    const draft = { ...p, firstName: p.firstName.trim(), lastName: p.lastName.trim(), email: p.email.trim(), phone: p.phone.trim() };
    // Home plays its full reveal once, straight after setup.
    const handOver = () => { armCinematicHomeReveal(); onSave(draft); };

    const content = contentRef.current;
    if (!content || prefersReducedMotion()) {
      handOver();
      return;
    }
    leaving.current = true;
    // Deliberately outside the GSAP context: the hand-over must not be cancellable.
    gsap.to(content, { opacity: 0, y: -12, scale: 0.99, duration: 0.3, ease: EASE.exit, onComplete: handOver });
  };
  
  const handleConsentChange = (checked: boolean) => {
    setConsentChecked(checked);
    if (checked) setConsentError(false);
  };

  return (
    <main className="profile-entry">
      {showPolicy && <PrivacyPolicyModal language={language} initialDocument={legalDoc} onClose={() => setShowPolicy(false)} />}
      {imageSheet && (
        <ImageActionSheet
          language={language}
          canView={Boolean(p.avatarData)}
          onView={() => { setImageSheet(false); setImageViewer(true); }}
          onEdit={() => avatarRef.current?.click()}
          onClose={() => setImageSheet(false)}
        />
      )}
      {imageViewer && p.avatarData && (
        <ImageViewer src={p.avatarData} alt={ar ? 'الصورة الشخصية' : 'Profile photo'} language={language} onClose={() => setImageViewer(false)} />
      )}
      {cropFile && (
        <ImageCropOverlay
          file={cropFile}
          kind="avatar"
          language={language}
          onCancel={() => setCropFile(null)}
          onConfirm={(dataUrl) => { update('avatarData', dataUrl); setCropFile(null); }}
        />
      )}
      <div className="entry-container">
        <div className="entry-controls">
          <ThemeToggle theme={theme} onTheme={onTheme} language={language} />
          <LanguageSwitch language={language} onLanguage={onLanguage} className="mobile-language" />
        </div>
        <div className="entry-content" ref={contentRef}>
          <div className="mobile-branding">
            <div className="mobile-logo">
              <img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT} />
            </div>
            <div className="mobile-brand-text">
              <span className="brand-name">TAAMEN</span>
              <span className="brand-version">2.0</span>
            </div>
          </div>
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="avatar-section">
              <button type="button" className="avatar-circle" onClick={() => p.avatarData ? setImageSheet(true) : avatarRef.current?.click()}>
                {p.avatarData ? <img src={p.avatarData} alt="" /> : initials}
              </button>
              <div className="avatar-desktop-controls">
                <strong>{ar ? 'الصورة الشخصية' : 'Profile photo'}</strong>
                <small>{ar ? 'اختيارية ومحفوظة محليًا' : 'Optional and stored locally'}</small>
                <div className="photo-actions">
                  <button type="button" className="mini-action" onClick={() => p.avatarData ? setImageSheet(true) : avatarRef.current?.click()}>
                    <ImagePlus size={14} />
                    {ar ? 'تغيير' : 'Change'}
                  </button>
                  {p.avatarData && (
                    <button type="button" className="mini-action" onClick={() => update('avatarData', '')}>
                      <Trash2 size={14} />
                      {ar ? 'حذف' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
              <button type="button" className="avatar-change mobile-only" onClick={() => p.avatarData ? setImageSheet(true) : avatarRef.current?.click()}>
                <ImagePlus size={16} />
              </button>
              {p.avatarData && (
                <button type="button" className="avatar-remove mobile-only" onClick={() => update('avatarData', '')}>
                  <Trash2 size={14} />
                </button>
              )}
              <input ref={avatarRef} hidden type="file" accept="image/*" onChange={e => image(e.target.files?.[0])} />
            </div>
            <label className="form-label">
              {ar ? 'الاسم الأول' : 'First name'}
              <input 
                type="text" 
                required 
                value={p.firstName} 
                onChange={e => update('firstName', e.target.value)} 
                placeholder={ar ? 'أدخل الاسم الأول' : 'Enter first name'}
              />
            </label>
            <label className="form-label">
              {ar ? 'اسم العائلة (اختياري)' : 'Family name (optional)'}
              <input 
                type="text" 
                value={p.lastName} 
                onChange={e => update('lastName', e.target.value)} 
                placeholder={ar ? 'أدخل اسم العائلة' : 'Enter family name'}
              />
            </label>
            <label className="form-label">
              {ar ? 'البريد الإلكتروني (اختياري)' : 'Email (optional)'}
              <input 
                type="email" 
                value={p.email} 
                onChange={e => update('email', e.target.value)} 
                placeholder="name@example.com"
              />
            </label>
            <label className="form-label">
              {ar ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'}
              <input 
                type="tel" 
                value={p.phone} 
                onChange={e => update('phone', e.target.value)} 
                placeholder="+970 5XX XXX XXXX"
              />
            </label>
            <div className={`consent-row ${consentError ? 'consent-error' : ''}`}>
              <input
                type="checkbox"
                checked={consentChecked}
                id="consent-checkbox"
                onChange={(e) => handleConsentChange(e.target.checked)}
              />
              <span className="consent-text">
                <label htmlFor="consent-checkbox" className="consent-label-text">
                  {ar ? 'أوافق على ' : 'I agree to the '}
                </label>
                <button
                  type="button"
                  className="policy-link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLegalDoc('privacy');
                    setShowPolicy(true);
                  }}
                >
                  {ar ? 'سياسة الخصوصية' : 'Privacy Policy'}
                </button>
                <label htmlFor="consent-checkbox" className="consent-label-text">
                  {ar ? ' و ' : ' and '}
                </label>
                <button
                  type="button"
                  className="policy-link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLegalDoc('terms');
                    setShowPolicy(true);
                  }}
                >
                  {ar ? 'الشروط والأحكام' : 'Terms & Conditions'}
                </button>
              </span>
              {consentError && (
                <div className="consent-error-text">
                  <AlertCircle size={12} />
                  {ar ? 'مطلوب الموافقة' : 'Required'}
                </div>
              )}
            </div>
            <button type="submit" className="primary-action mobile-submit" disabled={!p.firstName.trim() || !consentChecked}>
              {ar ? 'متابعة' : 'Continue'}
              <ChevronLeft size={16} />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
