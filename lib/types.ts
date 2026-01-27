export type Persona =
  | 'calm'
  | 'anxious'
  | 'aggressive'
  | 'slangy'
  | 'elderly'
  | 'corporate'
  | 'impatient'
  | 'zoomer';
export type Difficulty = 'simple' | 'hard' | 'intolerant';

export interface ScenarioArchetype {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  sampleQuestions: string[];
  gotchas: string[];
  outcomes: string[];
  warmup?: string;
}

export interface ScenarioPlan {
  archetypeId: string;
  persona: Persona;
  difficulty: Difficulty;
  facts: string[];
  opener: string;
  goal: string;
  escalationTriggers: string[];
  pitfalls: string[];
}

export interface RetrievalItem {
  docId: number;
  chunkId: number;
  text: string;
  score: number;
  title?: string;
  source?: string;
}

export interface EvaluationScores {
  correctness: number;
  compliance: number;
  softSkills: number;
  deEscalation: number;
}

export interface TurnDTO {
  id: number;
  role: 'client' | 'trainee';
  text: string;
  createdAt: string;
}

export interface SessionDTO {
  id: number;
  traineeName: string;
  mode: string;
  startedAt: string;
  finishedAt?: string;
  scenarioMeta: any;
  totalScore?: number;
  passFail?: string;
  turns: TurnDTO[];
}
