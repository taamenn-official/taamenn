import { useEffect, useRef, useSyncExternalStore } from 'react';
import { ensureAdSenseScript, pushAdSenseUnit } from '../../monetization/adsense';
import { adEnvFromImportMeta, resolvePlacement, type AdPlacement } from '../../monetization/placements';

const COPY = {
  en: { label: 'Advertisement' },
  ar: { label: 'إعلان' },
} as const;

function subscribeLanguage(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  return () => observer.disconnect();
}

function readLanguage(): 'ar' | 'en' {
  return document.documentElement.lang === 'en' ? 'en' : 'ar';
}

function AdSenseUnit({ clientId, slotId }: { clientId: string; slotId: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    ensureAdSenseScript(clientId);
    if (pushed.current) return;
    pushed.current = true;
    pushAdSenseUnit();
  }, [clientId, slotId]);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

/**
 * One slot. Renders nothing unless preview is explicit or AdSense is configured
 * for this placement. No sponsor, campaign, or contract props.
 */
export default function AdSlot({ placement }: { placement: AdPlacement }) {
  const language = useSyncExternalStore(subscribeLanguage, readLanguage, () => 'ar' as const);
  const resolved = resolvePlacement(placement, adEnvFromImportMeta(import.meta.env));
  if (resolved.mode === 'none') return null;

  if (resolved.mode === 'adsense') {
    return (
      <div className="ad-slot">
        <AdSenseUnit clientId={resolved.clientId} slotId={resolved.slotId} />
      </div>
    );
  }

  const copy = COPY[language];
  return (
    <section className="ad-slot ad-slot-preview" aria-label={copy.label}>
      <p className="ad-slot-kicker">{copy.label}</p>
      <div className="ad-slot-area" />
    </section>
  );
}
