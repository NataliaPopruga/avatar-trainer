'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Doc {
  id: number;
  title: string;
  createdAt: string;
  _count: { chunks: number };
}

export function KnowledgeManager({ initialDocs }: { initialDocs: Doc[] }) {
  const [docs, setDocs] = useState(initialDocs);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) return alert('Выберите файл');
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    const res = await fetch('/api/admin/knowledge', { method: 'POST', body: form });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Ошибка загрузки');
      return;
    }
    const refreshed = await fetch('/api/admin/knowledge');
    const list = await refreshed.json();
    setDocs(list);
    setFile(null);
    setTitle('');
  };

  const reindex = async () => {
    setLoading(true);
    await fetch('/api/admin/knowledge/reindex', { method: 'POST' });
    const refreshed = await fetch('/api/admin/knowledge');
    const list = await refreshed.json();
    setDocs(list);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-4">
          <p className="text-sm font-semibold text-slate-900">Выберите файл</p>
          <Input type="file" accept=".md,.txt,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Input placeholder="Название (опционально)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-3">
            <Button onClick={upload} disabled={loading}>Загрузить</Button>
            <Button variant="outline" onClick={reindex} disabled={loading}>Reindex all</Button>
          </div>
          <p className="text-xs text-slate-500">Чанки: ~1000 символов, overlap 120. KB имеет приоритет над web.</p>
        </div>
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="text-sm font-semibold text-slate-900">Документы</div>
            {docs.length === 0 && <p className="text-sm text-slate-500">Пока нет файлов</p>}
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{doc.title}</p>
                    <p className="text-xs text-slate-500">{format(new Date(doc.createdAt), 'd MMM, HH:mm', { locale: ru })}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{doc._count.chunks} chunks</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
