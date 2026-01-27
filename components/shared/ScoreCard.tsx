import { cn } from '@/lib/utils';

export function ScoreCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const color = accent || (value >= 80 ? 'bg-emerald-100 text-emerald-700' : value >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700');
  return (
    <div className={cn('flex flex-col gap-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft', color.includes('bg-') ? '' : '')}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn('w-max rounded-full px-3 py-1 text-sm font-semibold', color)}>{value}%</div>
    </div>
  );
}
