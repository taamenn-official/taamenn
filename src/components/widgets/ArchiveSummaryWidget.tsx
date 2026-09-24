import { ChevronRight } from 'lucide-react';
import type { RouteId } from '../../config/routes';
import type { ArchiveSummary } from '../../domain/matches/matchSelectors';
import { homeCopy } from '../../i18n/translations';
import { WidgetShell } from './WidgetShell';

export function ArchiveSummaryWidget({
  language,
  summary,
  route,
  onOpen,
}: {
  language: 'ar' | 'en';
  summary: ArchiveSummary;
  route: RouteId;
  onOpen: (route: RouteId) => void;
}) {
  const copy = homeCopy[language];
  return (
    <WidgetShell
      variant="accent"
      title={copy.archiveSummary}
      titleId="home-archive-title"
      className="home-archive"
      action={<button type="button" className="text-button" onClick={() => onOpen(route)}>{copy.viewAll}<ChevronRight className="widget-chevron" size={15} /></button>}
    >
      <p className="archive-summary-line">
        <b>{summary.total}</b> {copy.archive}
        <span>{summary.decided} {copy.decided}</span>
        <span>{summary.draws} {copy.draws}</span>
        <span>{summary.pending} {copy.pending}</span>
      </p>
    </WidgetShell>
  );
}
