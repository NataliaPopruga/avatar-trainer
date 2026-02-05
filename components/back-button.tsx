'use client';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  hideOnPaths?: string[];
}

export function BackButton({ className, hideOnPaths = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  if (hideOnPaths.includes(pathname || '')) return null;

  // храним стек экранов в sessionStorage, чтобы уходить именно на предыдущий экран, а не на предыдущее состояние history
  const updateStack = () => {
    if (typeof window === 'undefined' || !pathname) return;
    try {
      const raw = sessionStorage.getItem('navStack');
      const stack = Array.isArray(raw ? JSON.parse(raw) : []) ? (JSON.parse(raw || '[]') as string[]) : [];
      if (stack[stack.length - 1] !== pathname) {
        stack.push(pathname);
        sessionStorage.setItem('navStack', JSON.stringify(stack.slice(-50))); // не разрастается бесконечно
      }
    } catch {
      /* ignore */
    }
  };
  updateStack();

  const goBack = () => {
    // стартовая страница тренировки должна возвращать на главную
    const fallback = '/';
    if (typeof window === 'undefined') {
      router.push(fallback);
      return;
    }
    try {
      const raw = sessionStorage.getItem('navStack');
      const stack = Array.isArray(raw ? JSON.parse(raw) : []) ? (JSON.parse(raw || '[]') as string[]) : [];
      // убираем текущий
      if (stack[stack.length - 1] === pathname) stack.pop();
      const prev = stack.pop();
      sessionStorage.setItem('navStack', JSON.stringify(stack));
      router.push(prev || fallback);
    } catch {
      router.push(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        'group fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:-translate-x-0.5 hover:border-slate-300 hover:shadow-md',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4 text-slate-500 transition group-hover:-translate-x-0.5" />
      <span className="hidden sm:inline">Назад</span>
    </button>
  );
}
