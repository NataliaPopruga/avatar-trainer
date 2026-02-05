import { ScenarioPlan } from '@/lib/types';

export type EmotionTag = 'irritated' | 'impatient' | 'angry' | 'neutral';

export interface ClientCue {
  text: string;
  emotionTag: EmotionTag;
  intensity: number; // 0..1
}

export const CARD_BLOCKED_PLAN: ScenarioPlan = {
  archetypeId: 'card_blocked_call_v1',
  persona: 'gopnik',
  difficulty: 'hard',
  facts: [
    'Карта могла уйти в антифрод из‑за нетипичной суммы или повторной попытки.',
    'Разблокировка проводится после идентификации клиента через приложение или проверенный звонок.',
    'Нельзя обещать немедленную разблокировку без проверки безопасности.',
  ],
  opener: 'Клиент звонит с кассы: оплата картой не проходит.',
  goal: 'Разобраться с блокировкой и предложить безопасные шаги разблокировки.',
  escalationTriggers: ['отсутствие конкретных шагов', 'обещание результата без проверки', 'запрос лишних данных'],
  pitfalls: ['обещание «точно разблокируем»', 'запрос CVV или кода из СМС'],
};

export const CARD_BLOCKED_SCRIPT: ClientCue[] = [
  { text: 'Здравствуйте. Мою карту заблокировали на кассе, платеж не прошел.', emotionTag: 'neutral', intensity: 0.4 },
  { text: 'Я сейчас в магазине, очередь стоит. Что вы будете делать?', emotionTag: 'impatient', intensity: 0.9 },
  { text: 'Почему карта могла заблокироваться? Там обычная сумма.', emotionTag: 'irritated', intensity: 0.75 },
  { text: 'Мне нужно купить сейчас, сколько ждать проверки?', emotionTag: 'impatient', intensity: 0.95 },
  { text: 'Если нужно, я могу подтвердить через приложение.', emotionTag: 'neutral', intensity: 0.5 },
  { text: 'Какие шаги прямо сейчас? Готов ждать минуту, но не больше.', emotionTag: 'impatient', intensity: 0.9 },
  { text: 'Можете открыть хотя бы один платеж? Остальное потом.', emotionTag: 'angry', intensity: 0.9 },
  { text: 'По безопасному каналу — что я должен нажать в приложении?', emotionTag: 'neutral', intensity: 0.55 },
  { text: 'Вы точно разблокируете? Нужна гарантия, иначе ухожу платить наличными.', emotionTag: 'angry', intensity: 1.0 },
];
