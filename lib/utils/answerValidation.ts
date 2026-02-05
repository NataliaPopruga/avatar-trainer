/**
 * Утилиты для валидации и анализа качества ответа пользователя
 */

export interface AnswerAnalysis {
  isValid: boolean;
  score: number; // 0-100
  hints: string[];
  warnings: string[];
  suggestions: string[];
  missingElements: string[];
}

const MIN_LENGTH = 40;
const RECOMMENDED_LENGTH = 80;

// Паттерны для проверки полноты ответа
const EMPATHY_PATTERNS = [
  /понимаю|вижу|сожалею|простите|извините/i,
  /понимаю.*ситуацию|вижу.*проблему/i,
];

const ACTION_PATTERNS = [
  /давайте|сейчас|проверю|помогу|решим/i,
  /сделаю|выполню|обработаю/i,
  /шаг|действие|план/i,
];

const TIMEFRAME_PATTERNS = [
  /в течение|через|за|до|в течение.*часов?|в течение.*дней?/i,
  /\d+\s*(минут|час|день|дня|дней)/i,
  /сегодня|завтра|скоро/i,
];

const EVIDENCE_PATTERNS = [
  /регламент|правила|политика|документ|база знаний/i,
  /согласно|в соответствии|по правилам/i,
];

const COMPLIANCE_WARNING_PATTERNS = [
  { pattern: /\b\d{4} \d{4} \d{4} \d{4}\b/, message: 'Не запрашивайте полный номер карты' },
  { pattern: /cvv|код безопасности/i, message: 'Не запрашивайте CVV код' },
  { pattern: /pin|пин/i, message: 'Не запрашивайте PIN код' },
  { pattern: /otp|одноразовый код|смс код/i, message: 'Не запрашивайте OTP/SMS коды' },
  { pattern: /паспорт|серия паспорта/i, message: 'Не запрашивайте паспортные данные' },
  { pattern: /точно\s+(разблокир|откро|сдела)/i, message: 'Избегайте абсолютных обещаний без проверки' },
  { pattern: /гарантирую|обещаю.*точно/i, message: 'Не давайте гарантий без проверки фактов' },
];

export function analyzeAnswer(text: string): AnswerAnalysis {
  const trimmed = text.trim();
  const length = trimmed.length;
  
  const hints: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const missingElements: string[] = [];

  // Проверка длины
  if (length < MIN_LENGTH) {
    hints.push(`Ответ слишком короткий (${length} символов). Рекомендуется минимум ${MIN_LENGTH} символов для полноценного ответа.`);
  } else if (length < RECOMMENDED_LENGTH) {
    suggestions.push(`Можно добавить больше деталей (сейчас ${length} символов, рекомендуется ${RECOMMENDED_LENGTH}+).`);
  }

  // Проверка на запрещенные паттерны
  COMPLIANCE_WARNING_PATTERNS.forEach(({ pattern, message }) => {
    if (pattern.test(trimmed)) {
      warnings.push(message);
    }
  });

  // Проверка элементов полноценного ответа
  const hasEmpathy = EMPATHY_PATTERNS.some(p => p.test(trimmed));
  const hasAction = ACTION_PATTERNS.some(p => p.test(trimmed));
  const hasTimeframe = TIMEFRAME_PATTERNS.some(p => p.test(trimmed));
  const hasEvidence = EVIDENCE_PATTERNS.some(p => p.test(trimmed));

  if (!hasEmpathy) {
    missingElements.push('Признание проблемы клиента (например: "Понимаю вашу ситуацию", "Вижу проблему")');
  }

  if (!hasAction) {
    missingElements.push('Конкретные шаги или действия (например: "Сейчас проверю", "Давайте решим это")');
  }

  if (!hasTimeframe) {
    suggestions.push('Укажите примерные сроки решения (например: "в течение часа", "сегодня")');
  }

  if (!hasEvidence) {
    suggestions.push('Ссылка на регламент или правила сервиса повысит качество ответа');
  }

  // Проверка на неопределенность
  if (/не знаю|затрудняюсь|не уверен/i.test(trimmed)) {
    warnings.push('Избегайте неопределенных формулировок. Предложите конкретный план действий.');
  }

  // Проверка на де-эскалацию
  if (/успокойтесь|тише|не кричите/i.test(trimmed)) {
    warnings.push('Избегайте директивных команд. Используйте более мягкие формулировки.');
  }

  // Подсчет общего балла
  let score = 50; // Базовый балл
  
  if (length >= MIN_LENGTH) score += 10;
  if (length >= RECOMMENDED_LENGTH) score += 5;
  if (hasEmpathy) score += 10;
  if (hasAction) score += 10;
  if (hasTimeframe) score += 5;
  if (hasEvidence) score += 10;
  if (warnings.length === 0) score += 10;
  
  score = Math.min(100, Math.max(0, score));

  const isValid = length >= MIN_LENGTH && warnings.length === 0 && missingElements.length <= 1;

  return {
    isValid,
    score,
    hints,
    warnings,
    suggestions,
    missingElements,
  };
}

export function getAnswerQualityColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-rose-600';
}

export function getAnswerQualityLabel(score: number): string {
  if (score >= 80) return 'Отличный ответ';
  if (score >= 60) return 'Хороший ответ';
  if (score >= 40) return 'Требует улучшения';
  return 'Неполный ответ';
}
