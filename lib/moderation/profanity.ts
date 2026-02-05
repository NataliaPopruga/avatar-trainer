const letterMap: Record<string, string> = {
  a: 'а',
  e: 'е',
  o: 'о',
  p: 'р',
  c: 'с',
  x: 'х',
  y: 'у',
  k: 'к',
  m: 'м',
  h: 'н',
  t: 'т',
  b: 'в',
  u: 'и',
};

const patterns: { re: RegExp; cat: string; severity: 'critical' | 'major' }[] = [
  { re: /(х|x|k|к|\\*)у(й|е|я|и)/, cat: 'profanity', severity: 'critical' },
  { re: /(п|p)изд/, cat: 'profanity', severity: 'critical' },
  { re: /(бля|blya|бл[яа]д)/, cat: 'profanity', severity: 'critical' },
  { re: /(сука|сук|су4ка)/, cat: 'profanity', severity: 'critical' },
  { re: /(ебан|ёбан|ебл|еба)/, cat: 'profanity', severity: 'critical' },
  { re: /(нах|nax|nah)/, cat: 'profanity', severity: 'critical' },
  { re: /(идиот|дебил|кретин|тупиц|дурак)/, cat: 'insult', severity: 'critical' },
  { re: /(мразь|скотина|тварь)/, cat: 'insult', severity: 'critical' },
  { re: /(убью|прикончу|зарежу|подорву)/, cat: 'hate_or_threat', severity: 'critical' },
  { re: /(ненавижу вас)/, cat: 'insult', severity: 'critical' },
  // rude/abusive (major)
  { re: /пош(ел|ла)[^а-я0-9]*(вон|нах|отсюда)/, cat: 'rude', severity: 'major' },
  { re: /иди[^а-я0-9]*(вон|отсюда|кчерту|кчертям)/, cat: 'rude', severity: 'major' },
  { re: /заткнись/, cat: 'rude', severity: 'major' },
  { re: /(отвали|отстань)/, cat: 'rude', severity: 'major' },
  { re: /фиг[^а-я0-9]*тебе/, cat: 'rude', severity: 'major' },
  { re: /мне[^а-я0-9]*плевать/, cat: 'rude', severity: 'major' },
  { re: /небуду[^а-я0-9]*стобой[^а-я0-9]*говорить/, cat: 'rude', severity: 'major' },
];

function normalize(text: string) {
  const lower = text.toLowerCase();
  const mapped = lower
    .split('')
    .map((ch) => letterMap[ch] ?? ch)
    .join('');
  return mapped.replace(/[\s\.\,\-\_\*\!\?]+/g, '');
}

export function detectAbuse(text: string) {
  const norm = normalize(text);
  const matched: string[] = [];
  const categories = new Set<string>();
  let severity: 'critical' | 'major' | null = null;
  for (const { re, cat, severity: sev } of patterns) {
    if (re.test(norm)) {
      matched.push(re.source);
      categories.add(cat);
      if (severity !== 'critical') severity = sev; // critical overrides
    }
  }
  return { isAbusive: matched.length > 0, severity: severity ?? null, categories: Array.from(categories), matched };
}
