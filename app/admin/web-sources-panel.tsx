'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface Source {
  id: number;
  label: string;
  domain: string;
  priority: number;
  enabled: boolean;
}

export function WebSourcesPanel() {
  const [sources, setSources] = useState<Source[]>([]);
  const [webEnabled, setWebEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ label: '', domain: '', priority: 1 });
  const [savingToggle, setSavingToggle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/admin/websources');
    if (!res.ok) return;
    const data = await res.json();
    setSources(data.sources || []);
    setWebEnabled(data.webEnabled ?? true);
  };

  useEffect(() => {
    load();
  }, []);

  const addSource = async () => {
    setError(null);
    const cleanDomain = form.domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!cleanDomain) {
      setError('Укажите домен без протокола');
      return;
    }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanDomain)) {
      setError('Неверный формат домена');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/admin/websources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, domain: cleanDomain }),
    });
    setLoading(false);
    if (res.ok) {
      setForm({ label: '', domain: '', priority: 1 });
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Не удалось сохранить');
    }
  };

  const toggleSource = async (id: number, enabled: boolean) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)));
    try {
      const res = await fetch(`/api/admin/websources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('fail');
    } catch (e) {
      // rollback on error
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !enabled } : s)));
      setError('Не удалось сохранить переключатель');
    }
  };

  const deleteSource = async (id: number) => {
    await fetch(`/api/admin/websources/${id}`, { method: 'DELETE' });
    load();
  };

  const toggleWeb = async (enabled: boolean) => {
    setSavingToggle(true);
    try {
      const res = await fetch('/api/admin/webconfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webEnabled: enabled }),
      });
      if (!res.ok) throw new Error('failed');
      setWebEnabled(enabled);
    } catch (e) {
      setError('Не удалось сохранить переключатель');
    } finally {
      setSavingToggle(false);
    }
  };

  const emptyState = useMemo(
    () => (
      <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center text-sm text-slate-500">
        <p className="font-medium text-slate-600">Список пуст</p>
        <p>Добавьте домены, которые можно использовать для web-поиска.</p>
      </div>
    ),
    []
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-[17px] font-semibold leading-tight">Внешние источники</CardTitle>
            <CardDescription className="text-[13px] leading-snug">
              Если включено — используем web-поиск по разрешённым доменам. Приоритет у базы знаний.
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => toggleWeb(!webEnabled)}
            className="group flex items-center gap-2 rounded-full px-1 py-0.5 transition hover:bg-slate-100 focus:outline-none"
          >
            <Badge className={cn(webEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
              {webEnabled ? 'Вкл' : 'Выкл'}
            </Badge>
            <Switch checked={webEnabled} onCheckedChange={(v) => toggleWeb(v)} disabled={savingToggle} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-4">
        <div className="grid grid-cols-[1.6fr,1.6fr,0.7fr,1fr] gap-3 items-end">
          <div className="space-y-1 min-w-0">
            <Label className="sr-only">Название</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Напр. Госуслуги"
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <Label className="sr-only">Домен</Label>
            <Input
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              placeholder="example.com"
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="sr-only">Приоритет</Label>
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end justify-end">
            <Button onClick={addSource} disabled={loading} className="h-10 px-4 text-sm">
              Добавить
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="space-y-2">
          {sources.length === 0 && emptyState}
          {sources.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1.6fr,1.4fr,110px,110px] items-center gap-x-3 bg-slate-50 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="min-w-0 whitespace-nowrap">Название</span>
                  <span className="min-w-0 whitespace-nowrap">Домен</span>
                  <span className="whitespace-nowrap">Приоритет</span>
                  <span className="text-right whitespace-nowrap">Поиск / Удалить</span>
                </div>
                {sources.map((src, idx) => (
                  <div
                    key={src.id}
                    className={cn(
                    'grid grid-cols-[1.6fr,1.4fr,110px,110px] items-center gap-x-3 px-4 py-3 text-sm',
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                  )}
                >
                  <span className="min-w-0 truncate whitespace-nowrap font-medium text-slate-900" title={src.label || 'Источник'}>
                    {src.label || 'Источник'}
                  </span>
                  <span className="min-w-0 truncate whitespace-nowrap text-slate-700" title={src.domain}>
                    {src.domain}
                  </span>
                  <span>
                    <Badge className="bg-slate-100 text-slate-700">P{src.priority}</Badge>
                  </span>
                  <div className="flex items-center justify-end gap-3">
                    <Switch checked={src.enabled} onCheckedChange={(v) => toggleSource(src.id, v)} aria-label="Использовать в поиске" />
                    <Button variant="ghost" size="icon" onClick={() => deleteSource(src.id)} aria-label="Удалить">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
