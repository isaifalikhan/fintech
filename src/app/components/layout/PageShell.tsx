import type { ReactNode } from 'react';
import { AXIOM } from '@/styles/axiom-tokens';
import { cn } from '../ui/utils';

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

/** Standard employee / org view: AXIOM background + padding + vertical rhythm */
export function PageShell({ children, className }: PageShellProps) {
  return (
    <div
      className={cn(AXIOM.layout.page, AXIOM.layout.pageStack, className)}
      style={{ background: AXIOM.backgrounds.main }}
    >
      {children}
    </div>
  );
}
