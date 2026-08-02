import type { ReactNode } from 'react';
import { AXIOM } from '@/styles/axiom-tokens';
import { cn } from '../ui/utils';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Secondary pill (e.g. LIVE) — kept visually calm */
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * One primary title row + optional description and actions.
 * Title uses AXIOM gradient text; responsive stack on narrow viewports.
 */
export function PageHeader({ title, description, badge, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(AXIOM.layout.headerRow, className)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className={AXIOM.typography.pageTitle} style={AXIOM.text.titleStyle as React.CSSProperties}>
            {title}
          </h1>
          {badge}
        </div>
        {description != null && description !== '' && (
          <p className={cn(AXIOM.typography.monoMuted, 'mt-1 max-w-2xl')}>{description}</p>
        )}
      </div>
      {actions != null ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
