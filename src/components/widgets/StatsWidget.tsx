import type { ArchiveSummary } from '../../domain/matches/matchSelectors';
import { homeCopy } from '../../i18n/translations';
import { WidgetShell } from './WidgetShell';

export function StatsWidget({ language, summary }: { language: 'ar' | 'en'; summary: ArchiveSummary }) {
  const copy = homeCopy[language];
  const cells = [
    [copy.archive, summary.total],
    [copy.decided, summary.decided],
    [copy.draws, summary.draws],
    [copy.pending, summary.pending],
  ] as const;
  return (
    <WidgetShell variant="dark" title={copy.stats} titleId="home-stats-title" density="tight" className="home-stats-widget">
      <dl className="stat-strip">
        {cells.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </WidgetShell>
  );
}
