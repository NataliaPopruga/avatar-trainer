import { cn } from '@/lib/utils';

export function ChatBubble({ role, text }: { role: 'client' | 'trainee'; text: string }) {
  const isClient = role === 'client';
  return (
    <div className={cn('flex w-full', isClient ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft',
          isClient ? 'bg-white text-slate-900' : 'bg-brand-600 text-white'
        )}
      >
        <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">{isClient ? 'Клиент' : 'Вы'}</div>
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
