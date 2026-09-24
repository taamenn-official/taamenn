import type { ReactNode } from 'react';

export type WidgetVariant = 'default' | 'prominent' | 'compact' | 'accent' | 'dark' | 'interactive';

export function WidgetShell({
  variant = 'default',
  title,
  titleId,
  action,
  density = 'regular',
  children,
  className = '',
}: {
  variant?: WidgetVariant;
  title?: string;
  titleId?: string;
  action?: ReactNode;
  density?: 'regular' | 'tight';
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ta-widget ta-widget-${variant} ta-widget-${density} ${className}`.trim()} aria-labelledby={titleId}>
      {(title || action) && (
        <header className="ta-widget-head">
          {title ? <h2 className="ta-widget-title" id={titleId}>{title}</h2> : <span />}
          {action}
        </header>
      )}
      <div className="ta-widget-body">{children}</div>
    </section>
  );
}
