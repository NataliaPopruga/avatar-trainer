'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TraineeForm() {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'training' | 'exam'>('training');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const start = async () => {
    if (!name.trim()) return alert('Введите имя');
    setLoading(true);
    const res = await fetch('/api/trainee/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), mode }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Ошибка запуска сессии');
      return;
    }
    const data = await res.json();
    router.push(`/session/${data.sessionId}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Имя сотрудника</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Анна" />
        </div>
        <div className="space-y-2">
          <Label>Режим</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'training', label: 'Тренировка', desc: 'Мягкий тон, 8 шагов' },
              { value: 'exam', label: 'Экзамен', desc: 'Более сложные клиенты, 10 шагов' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value as any)}
                className={cn(
                  'rounded-2xl border p-4 text-left shadow-sm transition',
                  mode === opt.value ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                  <Radio className={cn('h-4 w-4', mode === opt.value ? 'text-brand-600' : 'text-slate-400')} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={start} disabled={loading} size="lg">
          {loading ? 'Запуск...' : 'Начать тест'}
        </Button>
        <p className="text-sm text-slate-500">Сценарий и аватар выбираются случайно каждый раз.</p>
      </div>
    </div>
  );
}
