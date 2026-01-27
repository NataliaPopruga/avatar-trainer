import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TraineeForm } from './trainee-form';

export const dynamic = 'force-dynamic';

export default function TraineePage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 pb-20 pt-14">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-brand-700">Шаг 1</p>
        <h1 className="text-3xl font-semibold text-slate-900">Запустите тренировку или экзамен</h1>
        <p className="text-slate-600">
          Введите имя, выберите режим. Система подберёт случайный сценарий и создаст аватара с нужным тоном.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Профиль участника</CardTitle>
          <CardDescription>Имя нужно для отчёта и списка результатов.</CardDescription>
        </CardHeader>
        <CardContent>
          <TraineeForm />
        </CardContent>
      </Card>
    </main>
  );
}
