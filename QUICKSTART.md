# Быстрый старт Avatar Trainer

1. Подготовка
   - Скопируйте `.env.example` → `.env`, задайте `ADMIN_PIN`.
   - Установите зависимости: `npm install`.
   - Примените Prisma схему: `npm run db:push`.
   - Засидьте данные: `npm run seed`.

2. Запуск
   - `npm run dev` → http://localhost:3000

3. Демо флоу
   - Админ: `/admin` → введите PIN → `/admin/knowledge` загрузите `seed/sample_kb.md`, Reindex.
   - Сотрудник: `/trainee` → имя → Exam → начать → пройти 8–10 ходов с аватаром (голос/текст).
   - Итог: `/result/[id]` отчёт с метриками и evidence; `/admin/reports` список всех сессий.

4. Провайдеры
   - Mock режим работает без ключей (SpeechSynthesis/SpeechRecognition).
   - Включение web search: `USE_WEB=true` + `TAVILY_API_KEY`.
   - TTS/STT: `TTS_PROVIDER`, `STT_PROVIDER` (OpenAI/ElevenLabs/Azure за ключами).

5. Утилиты
   - Чанкинг KB: ~1000 символов, overlap 120.
   - Важные команды: `npm run db:push`, `npm run seed`, `npm run dev`.
