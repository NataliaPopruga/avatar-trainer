# Avatar Trainer (Next.js)

Современный тренажёр для сотрудников клиентского центра: адаптивные сценарии, говорящие аватары и отчёты с RAG‑evidence. Mock-режим работает без ключей; флаги включают внешние провайдеры TTS/STT/Web Search.

## Стек
- Next.js 14 (App Router) + TypeScript
- TailwindCSS + кастомные shadcn-like компоненты
- Prisma + SQLite
- RAG с лексическим retrieval + web snippets (Tavily) за флагом
- Browser SpeechSynthesis/SpeechRecognition как fallback

## Как запустить
1) Скопируйте `.env.example` → `.env` и при необходимости поменяйте `ADMIN_PIN`.
2) Установите зависимости: `npm install` (при необходимости удалите старые `node_modules`).
3) Примените схему БД: `npm run db:push`.
4) Загрузите сиды: `npm run seed`.
5) Старт dev-сервера: `npm run dev` (http://localhost:3000).

## ENV
- `DATABASE_URL` — SQLite файл (по умолчанию `file:./dev.db`).
- `ADMIN_PIN` — PIN для входа в админку (cookie на 7 дней).
- `AVATAR_PROVIDER=mock|heygen|tavus|did` (mock в MVP).
- `TTS_PROVIDER=browser|openai|elevenlabs|azure` (browser по умолчанию).
- `STT_PROVIDER=browser|openai|azure`.
- `USE_WEB=true|false` + `TAVILY_API_KEY` — web search провайдер (при конфликте доверяем KB).
- `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` — опционально для будущих адаптеров.

## Демо-сценарий
1. Войти как админ (`/admin`, PIN из ENV) → загрузить KB файл (`/admin/knowledge`) → нажать Reindex all.
2. Запустить экзамен как сотрудник: `/trainee` → ввести имя → выбрать режим Exam → Start.
3. Пройти 8–10 ходов с аватаром (голос или текст). При желании завершить сразу кнопкой.
4. Посмотреть отчёт: `/result/[id]` — карточки метрик, ошибки, evidence, PASS/FAIL.
5. Админ → `/admin/reports` — список всех сессий, переход в детализацию.

## Функциональность
- **Сценарии**: 20 archetypes (fees, фрод, chargeback, подписки, пожилые клиенты и др.), случайный persona/difficulty. План хранится в `scenarioMetaJson`.
- **Диалог**: клиентские реплики генерируются правилом (persona tone + факты из KB). 8 шагов в тренировке, 10 в экзамене.
- **RAG**: загрузка .md/.txt/.docx, чанки 1000 символов (overlap 120), lexical retrieval. KB важнее web.
- **Web search**: Tavily adapter за `USE_WEB=true`, в mock-режиме возвращаются статичные сниппеты.
- **Оценка**: correctness/compliance/softSkills/deEscalation, взвешенный итог + PASS/FAIL правила. Zod валидирует структуру judge.
- **Голос/аватар**: MockAvatar через SpeechSynthesis + статичные PNG (`/public/avatars`). Архитектура с провайдерами для будущих HeyGen/Tavus/D-ID.
- **Safety**: auto-flag на запрос PIN/CVV/OTP/номер карты, советы без ПДн.

## Структура
- `app/` — страницы (role select, trainee, session, result, admin, knowledge, reports) + API route handlers.
- `lib/providers` — avatar, tts/stt config, web search, retrieval.
- `lib/scenario` — archetypes loader, generator, engine.
- `lib/scoring` — judge с правилами и zod-валидацией.
- `prisma/` — schema + `seed.js` (sample KB, демо-сессия).
- `seed/` — `sample_kb.md` (>2KB), `archetypes.json`.
- `public/avatars` — 8 цветных пресетов по персонам.

## Полезные ссылки
- OpenAI TTS: https://platform.openai.com/docs/guides/text-to-speech
- OpenAI Audio: https://platform.openai.com/docs/guides/audio
- ElevenLabs: https://elevenlabs.io/docs/overview/capabilities/text-to-speech
- HeyGen Streaming Avatar SDK: https://docs.heygen.com/docs/streaming-avatar-sdk
- HeyGen Create Video: https://docs.heygen.com/reference/create-an-avatar-video-v2
- Tavus API: https://docs.tavus.io/api-reference/overview
- D-ID API: https://www.d-id.com/api/
- Tavily Web Search: https://docs.tavily.com/documentation/api-reference/introduction
