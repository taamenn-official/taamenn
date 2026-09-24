import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { installService } from '../../infrastructure/pwa/installService';
import { installCopy } from '../../i18n/translations';
import { TAAMEN_LOGO_SRC } from '../../config/branding';

export function InstallBanner({ language }: { language: 'ar' | 'en' }) {
  const copy = installCopy[language];
  const [mode, setMode] = useState(installService.bannerMode());
  useEffect(() => installService.subscribe(() => setMode(installService.bannerMode())), []);
  if (mode === 'hidden') return null;
  const ios = mode === 'ios';
  return (
    <div className="install-banner" role="region" aria-label={ios ? copy.iosTitle : copy.installTitle}>
      <img className="install-banner-mark" src={TAAMEN_LOGO_SRC} alt="" width={28} height={28} decoding="async" />
      <p className="install-banner-line">{ios ? copy.iosTitle : copy.installTitle}</p>
      {ios
        ? <span className="install-hint">{copy.iosHint}</span>
        : <button type="button" className="primary-action" onClick={() => { void installService.promptInstall(); }}><Download size={15} />{copy.installAction}</button>}
      <button type="button" className="icon-button" onClick={() => (ios ? installService.dismissIosGuidance() : installService.dismiss())} aria-label={copy.close}><X size={16} /></button>
    </div>
  );
}
