import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Avatar Client Trainer",
  description: "MVP for bank client training scenarios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sora.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f5ff,_#f2f1ff_45%,_#efe9ff)] text-slate-900">
          <header className="sticky top-0 z-20">
            <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-full border border-purple-200/70 bg-white/80 px-6 py-3 shadow-[0_10px_30px_rgba(55,25,95,0.08)] backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-purple-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
                  Avatar
                </span>
                <div className="text-sm font-semibold tracking-tight text-slate-800">
                  Тренажёр клиентов
                </div>
              </div>
              <nav className="hidden gap-5 text-sm text-slate-500 md:flex">
                <a className="hover:text-slate-900" href="/admin/knowledge">
                  База знаний
                </a>
                <a className="hover:text-slate-900" href="/admin/questions">
                  Вопросы/интенты
                </a>
                <a className="hover:text-slate-900" href="/start">
                  Начать
                </a>
                <a className="hover:text-slate-900" href="/reports">
                  Отчёты
                </a>
              </nav>
              <div className="flex items-center gap-2">
                <a
                  className="rounded-full border border-purple-300 px-4 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50"
                  href="/admin/knowledge"
                >
                  Загрузить
                </a>
                <a
                  className="rounded-full bg-emerald-300 px-4 py-2 text-xs font-semibold text-slate-900 shadow-[0_6px_20px_rgba(50,240,166,0.4)]"
                  href="/start"
                >
                  Старт
                </a>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
