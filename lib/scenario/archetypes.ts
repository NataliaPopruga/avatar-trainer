import fs from 'fs';
import path from 'path';
import { ScenarioArchetype } from '@/lib/types';

let cache: ScenarioArchetype[] | null = null;

export function loadArchetypes(): ScenarioArchetype[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'seed', 'archetypes.json');
  try {
    const raw = fs.readFileSync(file, 'utf8');
    cache = JSON.parse(raw) as ScenarioArchetype[];
    return cache;
  } catch (err) {
    console.error('Failed to load archetypes', err);
    cache = [];
    return cache;
  }
}
