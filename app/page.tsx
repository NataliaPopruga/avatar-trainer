import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles, Mic, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const highlights = [
  {
    title: 'Живые сценарии',
    desc: 'Каждый запуск — новый клиент с разным настроением и сложностью.',
    icon: <Sparkles className="h-5 w-5 text-brand-600" />,
  },
  {
    title: 'Голос + чат',
    desc: 'Отвечайте голосом или текстом, аватар говорит обратно.',
    icon: <Mic className="h-5 w-5 text-brand-600" />,
  },
  {
    title: 'Отчёт 360°',
    desc: 'Оценка корректности, комплаенса, эмпатии и деэскалации.',
    icon: <BarChart className="h-5 w-5 text-brand-600" />,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20 pt-12">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-6">
          <div className="w-max rounded-full bg-brand-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
            Avatar Trainer · CX экзаменатор
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Тренажёр для сложных клиентов: адаптивный аватар, голос и RAG-отчёт за 10 минут.
          </h1>
          <p className="text-lg text-slate-600">
            Запускайте экзамен или тренировку, получайте отчёт с цитатами из базы знаний и web-сниппетов.
            Макеты готовы к демо: попробуйте сами или зайдите как админ.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/trainee" className="flex items-center gap-2">
                Я сотрудник <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/admin" className="flex items-center gap-2">
                Я управляю <ShieldCheck className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-soft">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Mock режим готов из коробки
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-soft">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Поддержка TTS/STT провайдеров за флагами
            </div>
          </div>
        </div>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-emerald-50" />
          <CardContent className="relative flex h-full flex-col justify-between p-8">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Демо прогресса</p>
              <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-soft">
                <div>
                  <p className="text-sm text-slate-500">Текущий раунд</p>
                  <p className="text-2xl font-semibold text-slate-900">Деэскалация</p>
                </div>
                <div className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">Шаг 3 из 8</div>
              </div>
              <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
                <p className="text-xs uppercase tracking-wide text-slate-300">Аватар (молодёжный)</p>
                <p className="mt-3 text-lg">&quot;Эй, давай по-быстрому разрулим комиссию, только без запросов кодов&quot;</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-6">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-soft backdrop-blur">
                  <div className="mb-2 inline-flex rounded-full bg-brand-50 p-2">{item.icon}</div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
