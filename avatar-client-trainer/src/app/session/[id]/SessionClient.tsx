"use client";

import { useState } from "react";

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
          <div className="mt-6 flex gap-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-purple-200 px-3 py-2 text-sm"
              placeholder="Ответ менеджера..."
            />
            <button
              onClick={handleSend}
              className="h-fit rounded-full bg-purple-700 px-4 py-2 text-sm text-white"
            >
              Отправить
            </button>
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
