import { useMemo } from 'react';
import { TAAMEN_LOGO_ALT, TAAMEN_LOGO_SRC } from '../config/branding';
import { CAMPAIGN_PATH, campaignPhase, readCampaignSource } from '../config/campaign';
import type { Language } from '../i18n/translations';

export default function Trophy({ language, onLanguage }: { language: Language; onLanguage: () => void }) {
  const ar = language === 'ar';
  const phase = campaignPhase();
  const source = useMemo(() => readCampaignSource(new URLSearchParams(window.location.search).get('src')), []);
  return (
    <article className="legal-document trophy-page" data-campaign-source={source || undefined}>
      <header className="legal-document-top">
        <a className="acquisition-brand" href="/" aria-label={ar ? 'العودة إلى TAAMEN' : 'Back to TAAMEN'}>
          <img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT} />
          <span>TAAMEN 2.0</span>
        </a>
        <button type="button" className="language-button" onClick={onLanguage}>{ar ? 'English' : 'العربية'}</button>
      </header>
      {phase === 'ended' ? (
        <section className="trophy-card">
          <p className="eyebrow">TAAMEN / {CAMPAIGN_PATH}</p>
          <h1>{ar ? 'انتهت الفعالية' : 'This campaign has ended'}</h1>
          <p>{ar ? 'فعالية 31 أكتوبر — 15 نوفمبر 2026 لم تعد مفتوحة. يمكنك متابعة TAAMEN من الرئيسية.' : 'The 31 October — 15 November 2026 campaign is no longer open. You can continue in TAAMEN from Home.'}</p>
          <a className="primary-action" href="/#home">{ar ? 'الرئيسية' : 'Home'}</a>
        </section>
      ) : (
        <section className="trophy-card">
          <p className="eyebrow">TAAMEN / CAMPAIGN</p>
          <h1>{ar ? 'فعالية TAAMEN' : 'TAAMEN campaign'}</h1>
          <p>{ar ? 'شارك في فعالية TAAMEN واربح فرصة لعب مباراة مع فريقك في ملعب شريك.' : 'Join the TAAMEN campaign and earn a chance to play a match with your team at a partner ground.'}</p>
          <p className="trophy-dates" dir="ltr">31 October — 15 November 2026</p>
          {phase === 'before' && <p>{ar ? 'التسجيل العام لهذه الفعالية يفتح في 31 أكتوبر 2026.' : 'Public entry for this campaign opens on 31 October 2026.'}</p>}
          {phase === 'active' && <p>{ar ? 'الفعالية مفتوحة الآن. التحقق من المشاركين يأتي في مرحلة لاحقة، وهذه الصفحة هي المدخل فقط.' : 'The campaign is open. Participant verification comes in a later phase. This page is the entry point.'}</p>}
        </section>
      )}
    </article>
  );
}
