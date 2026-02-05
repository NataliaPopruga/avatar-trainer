"use client";

import { useState, useMemo } from "react";

type Turn = {
  id: string;
  role: string;
  content: string;
};

type Evaluation = {
  scores: {
    correctness: number;
    compliance: number;
    softSkills: number;
    deEscalation: number;
  };
  flags: Array<{ code: string; severity: string; message: string }>;
  positives: string[];
  improvements: string[];
  suggestedAnswer: string;
  evidence: Array<{ docTitle: string; snippet: string }>;
};

// Простая валидация ответа (можно импортировать из общей библиотеки)
function analyzeAnswer(text: string) {
  const trimmed = text.trim();
  const length = trimmed.length;
  const hints: string[] = [];
  const warnings: string[] = [];
  const missingElements: string[] = [];

  if (length < 40) {
    hints.push(`Ответ слишком короткий (${length} символов). Рекомендуется минимум 40 символов.`);
  }

  // Проверка на запрещенные паттерны
  if (/\b\d{4} \d{4} \d{4} \d{4}\b/.test(trimmed)) {
    warnings.push('Не запрашивайте полный номер карты');
  }
  if (/cvv|код безопасности/i.test(trimmed)) {
    warnings.push('Не запрашивайте CVV код');
  }
  if (/pin|пин/i.test(trimmed)) {
    warnings.push('Не запрашивайте PIN код');
  }
  if (/точно\s+(разблокир|откро|сдела)/i.test(trimmed)) {
    warnings.push('Избегайте абсолютных обещаний без проверки');
  }

  // Проверка элементов
  const hasEmpathy = /понимаю|вижу|сожалею|простите/i.test(trimmed);
  const hasAction = /давайте|сейчас|проверю|помогу|решим/i.test(trimmed);
  const hasTimeframe = /в течение|через|за|до|сегодня|завтра/i.test(trimmed);

  if (!hasEmpathy) {
    missingElements.push('Признание проблемы клиента');
  }
  if (!hasAction) {
    missingElements.push('Конкретные шаги или действия');
  }
  if (!hasTimeframe) {
    missingElements.push('Указание сроков решения');
  }

  const score = Math.min(100, Math.max(0, 
    50 + 
    (length >= 40 ? 10 : 0) +
    (length >= 80 ? 5 : 0) +
    (hasEmpathy ? 10 : 0) +
    (hasAction ? 10 : 0) +
    (hasTimeframe ? 5 : 0) +
    (warnings.length === 0 ? 10 : 0)
  ));

  return { hints, warnings, missingElements, score, isValid: length >= 40 && warnings.length === 0 };
}

export default function SessionClient({
  sessionId,
  initialTurns,
  mode,
}: {
  sessionId: string;
  initialTurns: Turn[];
  mode: "exam" | "training";
}) {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [answer, setAnswer] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState("");
  const [csat, setCsat] = useState(5);
  const [comment, setComment] = useState("");
  const [showHints, setShowHints] = useState(true);

  const analysis = useMemo(() => {
    if (!answer.trim() || answer.trim().length < 10) return null;
    return analyzeAnswer(answer);
  }, [answer]);

  const readJsonSafe = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      const text = await res.text();
      return { error: text || "Ошибка сервера" };
    }
  };

  const handleSend = async () => {
    if (!answer.trim()) return;
    
    // Предупреждение при наличии критических ошибок
    if (analysis && analysis.warnings.length > 0) {
      const proceed = confirm(
        `Внимание! В ответе обнаружены проблемы:\n\n${analysis.warnings.join('\n')}\n\nВсе равно отправить?`
      );
      if (!proceed) return;
    }
    
    setStatus("Идёт оценка...");
    const managerTurn: Turn = {
      id: `local-${Date.now()}`,
      role: "manager",
      content: answer,
    };
    setTurns((prev) => [...prev, managerTurn]);
    setAnswer("");

    const res = await fetch(`/api/session/${sessionId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: managerTurn.content }),
    });
    const json = await readJsonSafe(res);
    if (json.evaluation) {
      setEvaluations((prev) => [...prev, json.evaluation as Evaluation]);
    }
    if (json.clientReply) {
      setTurns((prev) => [
        ...prev,
        { id: `client-${Date.now()}`, role: "client", content: json.clientReply },
      ]);
    }
    setDone(Boolean(json.done));
    setStatus(json.error || "");
  };

  const handleFeedback = async () => {
    await fetch(`/api/session/${sessionId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csat, comment }),
    });
    setStatus("Фидбэк сохранён");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="soft-card rounded-3xl p-6">
        <div className="space-y-4">
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`flex ${turn.role === "manager" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-lg rounded-2xl px-4 py-3 text-sm ${
                  turn.role === "manager"
                    ? "bg-purple-700 text-white"
                    : "bg-purple-50 text-slate-800"
                }`}
              >
                <div className="text-xs opacity-70">
                  {turn.role === "manager" ? "Менеджер" : "Клиент"}
                </div>
                <div>{turn.content}</div>
              </div>
            </div>
          ))}
        </div>

        {!done && (
          <div className="mt-6 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  className={`w-full rounded-xl border px-3 py-2 text-sm ${
                    analysis && analysis.warnings.length > 0
                      ? 'border-rose-300 focus:border-rose-500'
                      : analysis && analysis.score >= 80
                      ? 'border-emerald-300 focus:border-emerald-500'
                      : 'border-purple-200 focus:border-purple-400'
                  }`}
                  placeholder="Ответ менеджера: признайте проблему клиента, предложите конкретные шаги решения и укажите сроки..."
                />
                {analysis && answer.trim().length >= 10 && (
                  <div className="absolute right-3 top-2">
                    <span className={`text-xs font-medium ${
                      analysis.score >= 80 ? 'text-emerald-600' :
                      analysis.score >= 60 ? 'text-amber-600' :
                      'text-rose-600'
                    }`}>
                      {analysis.score}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!answer.trim()}
                className={`h-fit rounded-full px-4 py-2 text-sm text-white ${
                  analysis && analysis.warnings.length > 0
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-purple-700 hover:bg-purple-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Отправить
              </button>
            </div>
            
            {analysis && answer.trim().length >= 10 && showHints && (
              <div className="space-y-2 rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      analysis.score >= 80 ? 'text-emerald-700' :
                      analysis.score >= 60 ? 'text-amber-700' :
                      'text-rose-700'
                    }`}>
                      {analysis.score >= 80 ? 'Отличный ответ' :
                       analysis.score >= 60 ? 'Хороший ответ' :
                       'Требует улучшения'} ({answer.trim().length} символов)
                    </span>
                  </div>
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    Скрыть
                  </button>
                </div>
                
                {analysis.warnings.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {analysis.warnings.map((warning, idx) => (
                      <div key={idx} className="text-rose-700">
                        ⚠️ {warning}
                      </div>
                    ))}
                  </div>
                )}
                
                {analysis.missingElements.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <div className="font-medium text-purple-800 mb-1">Отсутствует:</div>
                    {analysis.missingElements.map((element, idx) => (
                      <div key={idx} className="text-amber-700">
                        ℹ️ {element}
                      </div>
                    ))}
                  </div>
                )}
                
                {analysis.hints.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {analysis.hints.map((hint, idx) => (
                      <div key={idx} className="text-purple-700">
                        💡 {hint}
                      </div>
                    ))}
                  </div>
                )}
                
                {analysis.score >= 80 && analysis.warnings.length === 0 && (
                  <div className="text-emerald-700 mt-2">
                    ✓ Ответ выглядит полноценным и готов к отправке
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {done && (
          <div className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
            Сессия завершена. Оставьте короткий фидбэк.
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-xs text-purple-800">
                CSAT (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={csat}
                  onChange={(e) => setCsat(Number(e.target.value))}
                  className="ml-2 w-16 rounded border border-purple-200 px-2 py-1 text-xs"
                />
              </label>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Комментарий"
                className="flex-1 rounded border border-purple-200 px-2 py-1 text-xs"
              />
              <button
                onClick={handleFeedback}
                className="rounded-full bg-purple-700 px-3 py-2 text-xs text-white"
              >
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="soft-card rounded-3xl p-5">
          <h3 className="text-lg font-semibold">Оценка шага</h3>
          {evaluations.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              Отправьте ответ менеджера, чтобы увидеть оценку.
            </p>
          )}
          {evaluations.map((evaluation, idx) => (
            <div key={idx} className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  корректность {evaluation.scores.correctness}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  комплаенс {evaluation.scores.compliance}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  soft {evaluation.scores.softSkills}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  де-эскалация {evaluation.scores.deEscalation}
                </span>
              </div>
              {evaluation.flags.length > 0 && (
                <div>
                  <div className="font-medium text-slate-700">Флаги</div>
                  <ul className="mt-1 list-disc pl-4">
                    {evaluation.flags.map((flag, i) => (
                      <li key={i}>
                        {flag.code}: {flag.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {mode === "training" && (
                <div>
                  <div className="font-medium text-slate-700">Подсказки</div>
                  <p>{evaluation.suggestedAnswer || "Подсказок нет."}</p>
                  {evaluation.improvements.length > 0 && (
                    <ul className="mt-1 list-disc pl-4">
                      {evaluation.improvements.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {evaluation.evidence.length > 0 && (
                <div>
                  <div className="font-medium text-slate-700">Источники</div>
                  <ul className="mt-1 list-disc pl-4">
                    {evaluation.evidence.map((item, i) => (
                      <li key={i}>
                        {item.docTitle}: {item.snippet}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {status && <p className="text-xs text-slate-500">{status}</p>}
      </div>
    </div>
  );
}
