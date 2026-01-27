export default function Home() {
  return (
    <section className="space-y-12">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[32px] p-10">
          <p className="text-xs uppercase tracking-[0.4em] text-purple-600">
            MVP Sandbox
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">
            Тренажёр клиента-аватара
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            Генерируйте сценарии из частых вопросов, ведите диалог с аватаром,
            оценивайте ответы по RAG и правилам и показывайте отчёты руководителю.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              className="rounded-full bg-purple-700 px-5 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(108,54,255,0.35)] hover:bg-purple-800"
              href="/start"
            >
              Начать сессию
            </a>
            <a
              className="rounded-full border border-purple-300 px-5 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
              href="/admin/knowledge"
            >
              Загрузить знания
            </a>
          </div>
        </div>

        <div className="glass-panel flex flex-col justify-between rounded-[32px] p-10">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-purple-600">
              Шаг 2
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              Генерация сессии
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Выберите режим Тренировка или Экзамен, аватар начнёт диалог, а оценки появятся после каждого ответа.
            </p>
          </div>
          <div className="mt-8">
            <div className="rounded-2xl border border-dashed border-purple-200 bg-white/70 p-6 text-center text-sm text-slate-500">
              Здесь будут сценарии и выдержки из базы знаний.
            </div>
            <a
              className="mt-6 inline-flex rounded-full bg-emerald-300 px-6 py-2 text-sm font-semibold text-slate-900 shadow-[0_10px_24px_rgba(50,240,166,0.35)]"
              href="/start"
            >
              Запустить
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Knowledge Base",
            text: "Импорт документов, нарезка на чанки, быстрый lexical RAG.",
            href: "/admin/knowledge",
          },
          {
            title: "Intent Mining",
            text: "Импорт вопросов, авто-кластер интентов, генерация пула сценариев.",
            href: "/admin/questions",
          },
          {
            title: "Reports",
            text: "Баллы, ошибки, источники, экспорт CSV для ревью.",
            href: "/reports",
          },
        ].map((card) => (
          <a
            key={card.title}
            href={card.href}
            className="soft-card rounded-2xl p-6 transition hover:-translate-y-1"
          >
            <h3 className="text-lg font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{card.text}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
