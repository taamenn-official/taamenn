import { useEffect } from 'react';
import { Globe2 } from 'lucide-react';
import { TAAMEN_LOGO_ALT, TAAMEN_LOGO_SRC } from '../config/branding';
import { PUBLIC_ORIGIN, publicPageUrl } from '../config/publicRoutes';
import { POLICY_PUBLISHED, legalSections, type LegalDocumentId } from '../content/legal';
import { uiCopy, type Language } from '../i18n/translations';
import { legalSectionIcon } from '../components/legalSectionIcon';
import { POLICY_VERSION } from '../config/consent';

const HOME_TITLE = 'TAAMEN 2.0';
const HOME_DESCRIPTION = 'TAAMEN 2.0 — football archive and local profile experience';

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
}

/**
 * Public, reloadable legal document. Copy comes from the same table as the consent modal.
 */
export default function LegalDocument({
  language,
  onLanguage,
  documentId,
}: {
  language: Language;
  onLanguage: () => void;
  documentId: LegalDocumentId;
}) {
  const copy = uiCopy[language];
  const ar = language === 'ar';
  const sections = legalSections(documentId, language);
  const title = documentId === 'privacy' ? copy.privacyPolicyTitle : copy.termsTitle;
  const description = sections[0]?.content ?? HOME_DESCRIPTION;
  const canonical = publicPageUrl(documentId === 'privacy' ? '/privacy' : '/terms');
  const published = new Date(`${POLICY_PUBLISHED}T00:00:00`).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', { dateStyle: 'medium' });

  useEffect(() => {
    document.title = `${title} — TAAMEN 2.0`;
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: `${title} — TAAMEN 2.0` });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    const link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const created = !link;
    const canonicalLink = link ?? document.createElement('link');
    if (created) {
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;
    return () => {
      document.title = HOME_TITLE;
      upsertMeta('meta[name="description"]', { name: 'description', content: HOME_DESCRIPTION });
      upsertMeta('meta[property="og:title"]', { property: 'og:title', content: HOME_TITLE });
      upsertMeta('meta[property="og:description"]', { property: 'og:description', content: HOME_DESCRIPTION });
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: `${PUBLIC_ORIGIN}/` });
      const current = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (current) current.href = `${PUBLIC_ORIGIN}/`;
    };
  }, [canonical, description, title]);

  return (
    <article className="legal-document">
      <header className="legal-document-top">
        <a className="acquisition-brand" href="/" aria-label={ar ? 'العودة إلى TAAMEN' : 'Back to TAAMEN'}>
          <img src={TAAMEN_LOGO_SRC} alt={TAAMEN_LOGO_ALT} />
          <span>TAAMEN 2.0</span>
        </a>
        <button type="button" className="language-button" onClick={onLanguage}>
          <Globe2 size={14} />
          {ar ? 'English' : 'العربية'}
        </button>
      </header>
      <div className="legal-document-switch">
        <a className={documentId === 'privacy' ? 'is-active' : ''} href="/privacy">{copy.privacyPolicyTitle}</a>
        <a className={documentId === 'terms' ? 'is-active' : ''} href="/terms">{copy.termsTitle}</a>
      </div>
      <h1>{title}</h1>
      <p className="document-subtitle">{copy.lastUpdated} {published}</p>
      {sections.map((section) => {
        const Icon = legalSectionIcon(section.id);
        return (
          <section key={section.id} id={`section-${section.id}`} className="legal-section">
            <div className="section-header">
              <Icon size={20} aria-hidden="true" />
              <h2>{section.title}</h2>
            </div>
            <p>{section.content}</p>
          </section>
        );
      })}
      <footer className="legal-document-foot">
        <span className="policy-version">Version {POLICY_VERSION}</span>
        <a className="text-button" href="/">{ar ? 'العودة إلى التطبيق' : 'Back to the app'}</a>
      </footer>
    </article>
  );
}
