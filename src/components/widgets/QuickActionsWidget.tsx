import { Archive, ClipboardList, MapPin, Swords, UserRound } from 'lucide-react';
import type { RouteId } from '../../config/routes';
import { routeRegistry } from '../../config/routes';
import { homeCopy } from '../../i18n/translations';
import { WidgetShell } from './WidgetShell';

const ACTIONS: Array<{ id: RouteId; icon: typeof Archive }> = [
  { id: 'match-center', icon: ClipboardList },
  { id: 'archive', icon: Archive },
  { id: 'tactical', icon: Swords },
  { id: 'profile', icon: UserRound },
];

export function QuickActionsWidget({
  language,
  featured,
  onOpen,
}: {
  language: 'ar' | 'en';
  featured: boolean;
  onOpen: (route: RouteId) => void;
}) {
  const copy = homeCopy[language];
  const actions = featured
    ? [
      { id: 'historical-match-center' as RouteId, icon: ClipboardList },
      { id: 'stadiums' as RouteId, icon: MapPin },
    ]
    : ACTIONS;
  return (
    <WidgetShell variant="interactive" title={copy.quickActions} titleId="home-actions-title">
      <div className="quick-actions">
        {actions.map(action => {
          const meta = routeRegistry.find(route => route.id === action.id);
          const Icon = action.icon;
          return (
            <button type="button" key={action.id} className="quick-action" onClick={() => onOpen(action.id)}>
              <Icon size={16} aria-hidden="true" />
              <span>{meta?.label[language] ?? action.id}</span>
            </button>
          );
        })}
      </div>
    </WidgetShell>
  );
}
