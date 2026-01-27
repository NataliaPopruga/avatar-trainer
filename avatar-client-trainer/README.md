# Avatar Client Trainer MVP

Local MVP for a bank client training simulator: auto-generated scenarios from frequent questions, an avatar client dialog, rule + RAG scoring, and supervisor reports.

## Stack
- Next.js 16 (App Router) + TypeScript
- TailwindCSS
- Prisma + SQLite
- Lexical retrieval (mock RAG, no embeddings required)

## Quickstart
```bash
npm install
npm run db:push
npm run seed
npm run dev
```

Open http://localhost:3000

## Environment variables
Create `.env` (already provided):
```bash
DATABASE_URL="file:./dev.db"
USE_LLM=false
USE_EMBEDDINGS=false
OPENAI_API_KEY=""
```

## Demo flow (what to click)
1) `Admin > Knowledge` upload a markdown file or reindex.
2) `Admin > Questions` import `seed/questions.csv`, mine intents, generate scenario pool.
3) `Start` choose Training or Exam, start a session.
4) Chat with the avatar, see scoring after each manager turn.
5) Finish session and open `Reports` for the supervisor view.

## Seed data
- `seed/docs/sample_kb.md` sample knowledge base
- `seed/questions.csv` frequent questions

Run:
```bash
npm run seed
```
This will populate docs, chunks, intents, and ~30 scenarios.

## Scripts
- `npm run dev` - run the app
- `npm run db:push` - push Prisma schema to SQLite
- `npm run seed` - seed demo data
- `npm run db:studio` - open Prisma Studio

## Requirements
- Node.js 20+
