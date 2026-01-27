import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700',
        className
      )}
    >
      {children}
    </span>
  );
}
