import { useEffect, useRef, useState } from 'react';
import type { RouteId } from '../config/routes';
import type { Session } from '../services/apiClient';
import { api } from '../services/apiClient';
import { listMatches } from '../services/matchRepository';
import { homeCopy } from '../i18n/translations';
import { summarizeHome, type HomeSummary } from '../domain/matches/matchSelectors';
import { useHomeEntrance } from '../motion/useHomeEntrance';
import AdSlot from '../components/monetization/AdSlot';
import { NextMatchWidget } from '../components/widgets/NextMatchWidget';
import { QuickActionsWidget } from '../components/widgets/QuickActionsWidget';
import { StatsWidget } from '../components/widgets/StatsWidget';
import { RecentMatchWidget } from '../components/widgets/RecentMatchWidget';
import { ArchiveSummaryWidget } from '../components/widgets/ArchiveSummaryWidget';
import { UpcomingMatchesWidget } from '../components/widgets/UpcomingMatchesWidget';
import { VenueWidget } from '../components/widgets/VenueWidget';

export default function Home({ language, go, profile, session = null }: { language: 'ar' | 'en'; go: (p: RouteId) => void; profile?: { firstName: string }; session?: Session | null }) {
  const ar = language === 'ar';
  const copy = homeCopy[language];
  const featured = session?.authMethod === 'code';
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [error, setError] = useState('');
  const root = useRef<HTMLElement>(null);
  const name = featured
    ? (ar ? session?.member.arabicName || session?.member.displayName : session?.member.displayName)
    : profile?.firstName;

  useEffect(() => {
    let active = true;
    const refresh = () => {
      const load = featured
        ? api.historicalMatches().then(matches => summarizeHome(matches, 'featured'))
        : listMatches().then(matches => summarizeHome(matches, 'local'));
      load.then(next => { if (active) { setSummary(next); setError(''); } }).catch(() => {
        if (!active) return;
        setError(ar ? 'تعذر تحميل السجل.' : 'The archive could not be loaded.');
      });
    };
    refresh();
    window.addEventListener('taamen-matches-changed', refresh);
    return () => { active = false; window.removeEventListener('taamen-matches-changed', refresh); };
  }, [featured, ar]);

  useHomeEntrance(root);

  const matchRoute: RouteId = featured ? 'historical-match-center' : 'match-center';
  const archiveRoute: RouteId = featured ? 'historical-match-center' : 'archive';
  const hero = summary?.activeMatch ?? summary?.nextMatch ?? summary?.pendingMatch ?? null;
  const heroPending = Boolean(summary && !summary.activeMatch && !summary.nextMatch && summary.pendingMatch);
  const upcoming = (summary?.upcoming ?? []).filter(match => match.id !== summary?.nextMatch?.id);

  return (
    <section className="page-content home-page" ref={root}>
      <header className="home-greeting" data-ta-motion="greeting">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{ar ? `أهلًا ${name || ''}` : `Welcome ${name || ''}`}</h1>
        <p>{featured ? (ar ? 'استكشف حضورك التاريخي في TAAMEN.' : 'Explore your historical TAAMEN presence.') : copy.calm}</p>
      </header>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {!summary ? (
        <div className="home-dashboard" aria-busy="true">
          <div className="skeleton-block is-next" />
          <div className="skeleton-grid">
            <div className="skeleton-block" />
            <div className="skeleton-block" />
          </div>
        </div>
      ) : (
        <div className="home-dashboard" data-ta-motion="widgets">
          <div data-ta-motion="next">
            <NextMatchWidget language={language} match={hero} pending={heroPending} route={matchRoute} onOpen={go} />
          </div>
          <QuickActionsWidget language={language} featured={featured} onOpen={go} />
          <div className="home-pair">
            <StatsWidget language={language} summary={summary.archive} />
            <RecentMatchWidget language={language} match={summary.recent} route={archiveRoute} onOpen={go} />
          </div>
          <div className="home-pair">
            <ArchiveSummaryWidget language={language} summary={summary.archive} route={archiveRoute} onOpen={go} />
            <UpcomingMatchesWidget language={language} matches={upcoming} route={matchRoute} onOpen={go} />
          </div>
          <VenueWidget language={language} onOpen={go} />
          <AdSlot placement="home" />
        </div>
      )}
    </section>
  );
}
