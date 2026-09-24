import { MapPin } from 'lucide-react';
import type { RouteId } from '../../config/routes';
import { uiCopy } from '../../i18n/translations';
import { WidgetShell } from './WidgetShell';

export function VenueWidget({ language, onOpen }: { language: 'ar' | 'en'; onOpen: (route: RouteId) => void }) {
  const copy = uiCopy[language];
  return (
    <WidgetShell variant="compact" className="home-venues">
      <button type="button" className="venue-widget-button" onClick={() => onOpen('stadiums')}>
        <MapPin size={16} aria-hidden="true" />
        <span>
          <strong>{copy.venuesTitle}</strong>
          <small>{copy.venuesBeta}</small>
        </span>
        <em>{copy.openVenues}</em>
      </button>
    </WidgetShell>
  );
}
