import { useEffect, useRef, useState } from 'react';
import { X, Shield, FileText } from 'lucide-react';
import { POLICY_VERSION } from '../config/consent';
import { POLICY_PUBLISHED, legalSections, type LegalDocumentId } from '../content/legal';
import { uiCopy } from '../i18n/translations';
import { useOverlayPresence } from '../motion/useOverlayPresence';
import { legalSectionIcon } from './legalSectionIcon';

type Language = 'ar' | 'en';
type DocumentType = LegalDocumentId;

interface PrivacyPolicyModalProps {
  language: Language;
  onClose: () => void;
  initialDocument?: DocumentType;
  requireAccept?: boolean;
}

export function getPolicyVersion(): string {
  return POLICY_VERSION;
}

export function hasAcceptedConsent(): boolean {
  const accepted = localStorage.getItem('taamen-consent-version');
  return accepted === POLICY_VERSION;
}

export function recordConsent(): void {
  localStorage.setItem('taamen-consent-version', POLICY_VERSION);
}

export function clearConsent(): void {
  localStorage.removeItem('taamen-consent-version');
}

export default function PrivacyPolicyModal({ language, onClose, initialDocument = 'privacy', requireAccept = false }: PrivacyPolicyModalProps) {
  const copy = uiCopy[language];
  const [documentType, setDocumentType] = useState<DocumentType>(initialDocument);
  const [activeSection, setActiveSection] = useState<string>('intro');
  const dialogRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { backdropRef, panelRef, requestClose } = useOverlayPresence<HTMLButtonElement, HTMLElement>(
    'modal',
    onClose,
    true,
    { closeOnEscape: !requireAccept },
  );

  const accept = () => {
    recordConsent();
    requestClose();
  };

  const sections = legalSections(documentType, language);
  const title = documentType === 'privacy' ? copy.privacyPolicyTitle : copy.termsTitle;
  const published = new Date(`${POLICY_PUBLISHED}T00:00:00`).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB', { dateStyle: 'medium' });

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [initialDocument]);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = contentRef.current?.querySelector(`#section-${sectionId}`);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="overlay legal-overlay" role="presentation">
      <button ref={backdropRef} className="overlay-backdrop" aria-label={copy.closeViewer} onClick={requireAccept ? undefined : requestClose} />
      <aside
        ref={node => { dialogRef.current = node; panelRef.current = node; }}
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        tabIndex={-1}
      >
        <header>
          <div className="legal-header-top">
            <div className="document-switcher">
              <button
                type="button"
                className={`doc-tab ${documentType === 'privacy' ? 'is-active' : ''}`}
                onClick={() => { setDocumentType('privacy'); setActiveSection('intro'); }}
              >
                <Shield size={16} />
                {copy.privacyTab}
              </button>
              <button
                type="button"
                className={`doc-tab ${documentType === 'terms' ? 'is-active' : ''}`}
                onClick={() => { setDocumentType('terms'); setActiveSection('intro'); }}
              >
                <FileText size={16} />
                {copy.termsTab}
              </button>
            </div>
            {!requireAccept && (
              <button type="button" className="icon-button" onClick={requestClose} aria-label={copy.closeViewer}>
                <X size={18} />
              </button>
            )}
          </div>
          <div>
            <h1 id="legal-modal-title">{title}</h1>
            <p className="document-subtitle">
              {copy.lastUpdated} {published}
            </p>
          </div>
        </header>

        <div className="legal-body">
          <nav className="legal-toc" aria-label={title}>
            {sections.map(section => {
              const Icon = legalSectionIcon(section.id);
              return (
                <button
                  type="button"
                  key={section.id}
                  className={`toc-item ${activeSection === section.id ? 'is-active' : ''}`}
                  onClick={() => scrollToSection(section.id)}
                >
                  <Icon size={14} />
                  <span>{section.title}</span>
                </button>
              );
            })}
          </nav>

          <div className="legal-content" ref={contentRef}>
            {sections.map(section => {
              const Icon = legalSectionIcon(section.id);
              return (
                <section key={section.id} id={`section-${section.id}`} className="legal-section">
                  <div className="section-header">
                    <Icon size={20} />
                    <h2>{section.title}</h2>
                  </div>
                  <p>{section.content}</p>
                </section>
              );
            })}
          </div>
        </div>

        <footer>
          <div className="policy-version">
            <Shield size={14} />
            <span>Version {POLICY_VERSION}</span>
          </div>
          <button type="button" className="primary-action" onClick={requireAccept ? accept : requestClose}>
            {requireAccept ? copy.consentAcceptContinue : copy.closeViewer}
          </button>
        </footer>
      </aside>
    </div>
  );
}
