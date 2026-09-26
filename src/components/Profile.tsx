import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, Save, Share2, Trash2 } from 'lucide-react';
import type { LocalProfile } from '../services/profileRepository';
import { saveProfile } from '../services/profileRepository';
import { isProfileDraftDirty } from '../services/profileDraft';
import { ImageCropOverlay } from './ImageCropOverlay';
import { shareProfile } from '../services/profileShareService';
import type { Session } from '../services/apiClient';
import { uiCopy } from '../i18n/translations';
import { ImageActionSheet, ImageViewer } from './ImageActionOverlay';

export default function Profile({
  language,
  profile,
  onProfile,
  session = null,
  registerLeaveGuard,
}: {
  language: 'ar' | 'en';
  profile: LocalProfile;
  onProfile: (p: LocalProfile) => void;
  session?: Session | null;
  registerLeaveGuard?: (guard: (() => boolean) | null) => void;
}) {
  const copy = uiCopy[language];
  const ar = language === 'ar';
  const [draft, setDraft] = useState(profile);
  const [status, setStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [nudge, setNudge] = useState(0);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const [imageSheet, setImageSheet] = useState<'avatar' | 'banner' | null>(null);
  const [imageViewer, setImageViewer] = useState<'avatar' | 'banner' | null>(null);
  const [crop, setCrop] = useState<{ file: File; kind: 'avatar' | 'banner' } | null>(null);
  const reminderRef = useRef<HTMLButtonElement>(null);
  const dirtyRef = useRef(false);

  const dirty = useMemo(() => isProfileDraftDirty(profile, draft), [profile, draft]);
  dirtyRef.current = dirty;
  const photoPending = (draft.avatarData || '') !== (profile.avatarData || '');
  const bannerPending = (draft.bannerData || '') !== (profile.bannerData || '');

  useEffect(() => {
    setDraft(profile);
    setReminderOpen(false);
    setAttempts(0);
  }, [profile]);

  useEffect(() => {
    if (!dirty) {
      setReminderOpen(false);
      setAttempts(0);
    }
  }, [dirty]);

  useEffect(() => {
    if (!registerLeaveGuard) return;
    registerLeaveGuard(() => {
      if (!dirtyRef.current) return true;
      setReminderOpen(true);
      setAttempts((count) => count + 1);
      setNudge((count) => count + 1);
      return false;
    });
    return () => registerLeaveGuard(null);
  }, [registerLeaveGuard]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (reminderOpen && dirty) reminderRef.current?.focus();
  }, [reminderOpen]);

  const update = (key: keyof LocalProfile, value: string | boolean | number | undefined) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!draft.firstName.trim()) {
      setFailed(true);
      setStatus(copy.profileFirstNameRequired);
      saveRef.current?.focus();
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const next = await saveProfile({ ...draft, firstName: draft.firstName.trim(), lastName: draft.lastName.trim() });
      setDraft(next);
      onProfile(next);
      setReminderOpen(false);
      setAttempts(0);
      setStatus(copy.profileSaved);
      window.setTimeout(() => setStatus(''), 2500);
    } catch {
      setFailed(true);
      setStatus(copy.profileSaveFailed);
    } finally {
      setBusy(false);
    }
  };

  const onReminderActivate = () => {
    saveRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    saveRef.current?.focus();
    void save();
  };

  const queueCrop = (file: File | undefined, kind: 'avatar' | 'banner') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFailed(true);
      setStatus(copy.imageProcessFailed);
      return;
    }
    setFailed(false);
    setCrop({ file, kind });
  };

  const share = async () => {
    try {
      const result = await shareProfile(draft);
      if (result.method === 'cancelled') return;
      setFailed(false);
      setShareUrl(result.url);
      setStatus(result.method === 'copied' ? copy.profileShareCopied : result.method === 'shared' ? copy.profileShareReady : copy.profileShareLinkReady);
    } catch {
      setFailed(true);
      setStatus(copy.profileShareFailed);
    }
  };

  const reminderLevel = Math.min(Math.max(attempts, 1), 3);
  const reminderText = attempts >= 3 ? copy.forgotSaveProfileStrong : attempts === 2 ? copy.forgotSaveProfileAgain : copy.forgotSaveProfile;

  return (
    <section className="page-content profile-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TAAMEN 2.0 / PROFILE</p>
          <h1>{ar ? 'الملف الشخصي' : 'Profile'}</h1>
          <p className="subtitle">{ar ? 'هويتك الشخصية المحلية في TAAMEN.' : 'Your local identity inside TAAMEN.'}</p>
        </div>
        <div className="setting-actions">
          <button className="dark-action" type="button" onClick={share}>
            <Share2 size={15} />
            {ar ? 'مشاركة عامة' : 'Public share'}
          </button>
          <button
            ref={saveRef}
            id="profile-save-button"
            type="button"
            className={`primary-action${dirty ? ' is-dirty-save' : ''}`}
            onClick={save}
            disabled={!dirty || busy}
            aria-disabled={!dirty || busy}
            title={dirty ? copy.saveProfile : copy.noUnsavedChanges}
            aria-live="polite"
          >
            <Save size={15} />
            {busy ? copy.savingProfile : copy.saveProfile}
          </button>
        </div>
      </div>
      {status && <div className={failed ? 'error-banner' : 'success-banner'} role={failed ? 'alert' : undefined}>{status}</div>}
      {shareUrl && !failed && <label className="share-link-field">{copy.profileShareLinkReady}<input readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} /></label>}
      {dirty && <p className="profile-dirty-hint">{copy.unsavedChanges}</p>}

      <section className="panel profile-hero-card">
        <div
          className={`profile-banner${bannerPending ? ' is-pending' : ''}`}
          style={draft.bannerData ? { backgroundImage: `url(${draft.bannerData})` } : undefined}
        >
          <button type="button" className="profile-banner-hit" onClick={() => setImageSheet('banner')} aria-label={copy.changeCover} />
          <button type="button" className="banner-action" onClick={(event) => { event.stopPropagation(); setImageSheet('banner'); }} aria-label={copy.changeCover}>
            <ImagePlus size={15} />
            {copy.changeCover}
          </button>
          {bannerPending && <span className="pending-chip">{copy.bannerPending}</span>}
          <input
            ref={bannerRef}
            hidden
            type="file"
            accept="image/*"
            onChange={(event) => {
              queueCrop(event.target.files?.[0], 'banner');
              event.target.value = '';
            }}
          />
        </div>
        <div className="profile-hero-body">
          <div className={`profile-avatar-wrap${photoPending ? ' is-pending' : ''}`}>
            <button type="button" className="profile-avatar-button" onClick={() => setImageSheet('avatar')} aria-label={copy.changePhoto}>
              {draft.avatarData ? <img src={draft.avatarData} alt={ar ? 'الصورة الشخصية' : 'Profile avatar'} /> : <span>{draft.firstName.slice(0, 1).toUpperCase() || '?'}</span>}
            </button>
            <button type="button" className="profile-avatar-edit" onClick={() => setImageSheet('avatar')} aria-label={copy.changePhoto}>
              <Camera size={14} />
            </button>
            <input
              ref={avatarRef}
              hidden
              type="file"
              accept="image/*"
              onChange={(event) => {
                queueCrop(event.target.files?.[0], 'avatar');
                event.target.value = '';
              }}
            />
          </div>
          <div className="profile-hero-copy">
            {session && <span className="status-chip featured-identity-chip">{ar ? session.member.arabicName || session.member.displayName : session.member.displayName}</span>}
            <span className="status-chip">{draft.emailVerified ? (ar ? 'البريد مؤكد' : 'Email verified') : (ar ? 'ملف محلي' : 'Local profile')}</span>
            {photoPending && <span className="status-chip pending-chip">{copy.photoPending}</span>}
            <h2>{draft.firstName} {draft.lastName}</h2>
            <p>{ar ? 'بياناتك الشخصية محفوظة محليًا ويمكنك مشاركة نسخة عامة آمنة.' : 'Your personal data stays local; you can share a safe public profile.'}</p>
          </div>
        </div>
      </section>

      <section className="panel profile-edit-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{ar ? 'معلومات الملف' : 'PROFILE INFORMATION'}</p>
            <h2>{ar ? 'تحرير الملف' : 'Edit profile'}</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>{ar ? 'الاسم الأول' : 'First name'} *<input value={draft.firstName} onChange={(event) => update('firstName', event.target.value)} /></label>
          <label>{ar ? 'اسم العائلة' : 'Family / last name'} <span className="optional">{ar ? 'اختياري' : 'Optional'}</span><input value={draft.lastName} onChange={(event) => update('lastName', event.target.value)} /></label>
          <label>{ar ? 'الهاتف' : 'Phone'} <span className="optional">{ar ? 'اختياري' : 'Optional'}</span><input value={draft.phone} onChange={(event) => update('phone', event.target.value)} placeholder={ar ? 'غير مضاف' : 'Not added'} /></label>
          <label>{ar ? 'البريد الإلكتروني' : 'Email'} <span className="optional">{ar ? 'اختياري' : 'Optional'}</span><input value={draft.email} type="email" onChange={(event) => update('email', event.target.value)} placeholder={ar ? 'غير مضاف' : 'Not added'} /></label>
        </div>
        <div className="profile-tools">
          <button className="text-button" type="button" onClick={() => update('avatarData', '')} disabled={!draft.avatarData}><Trash2 size={14} />{copy.removePhoto}</button>
          <button className="text-button" type="button" onClick={() => update('bannerData', '')} disabled={!draft.bannerData}><Trash2 size={14} />{copy.removeCover}</button>
          {photoPending && <button className="text-button" type="button" onClick={() => update('avatarData', profile.avatarData || '')}>{copy.revertPhoto}</button>}
          {bannerPending && <button className="text-button" type="button" onClick={() => update('bannerData', profile.bannerData || '')}>{copy.revertCover}</button>}
          {busy && <span className="settings-note">{copy.processingImage}</span>}
          <button type="button" className={`primary-action profile-inline-save${dirty ? ' is-dirty-save' : ''}`} onClick={save} disabled={!dirty || busy} aria-disabled={!dirty || busy} title={dirty ? copy.saveProfile : copy.noUnsavedChanges}>
            <Save size={15} />
            {busy ? copy.savingProfile : copy.saveProfile}
          </button>
        </div>
      </section>

      {crop && (
        <ImageCropOverlay
          file={crop.file}
          kind={crop.kind}
          language={language}
          onCancel={() => setCrop(null)}
          onConfirm={(dataUrl) => {
            update(crop.kind === 'avatar' ? 'avatarData' : 'bannerData', dataUrl);
            setCrop(null);
          }}
        />
      )}
      {imageSheet && (
        <ImageActionSheet
          language={language}
          canView={imageSheet === 'avatar' ? Boolean(draft.avatarData) : Boolean(draft.bannerData)}
          onView={() => {
            const kind = imageSheet;
            setImageSheet(null);
            setImageViewer(kind);
          }}
          onEdit={() => (imageSheet === 'avatar' ? avatarRef : bannerRef).current?.click()}
          onClose={() => setImageSheet(null)}
        />
      )}
      {imageViewer === 'avatar' && draft.avatarData && (
        <ImageViewer src={draft.avatarData} alt={ar ? 'الصورة الشخصية' : 'Profile photo'} language={language} onClose={() => setImageViewer(null)} />
      )}
      {imageViewer === 'banner' && draft.bannerData && (
        <ImageViewer src={draft.bannerData} alt={copy.changeCover} language={language} onClose={() => setImageViewer(null)} />
      )}
      {reminderOpen && dirty && (
        <button
          ref={reminderRef}
          type="button"
          key={nudge}
          className={`profile-save-reminder is-level-${reminderLevel} is-nudging`}
          onClick={onReminderActivate}
          aria-label={reminderText}
        >
          <Save size={14} aria-hidden="true" />
          <span>{reminderText}</span>
        </button>
      )}
    </section>
  );
}
