import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import { createJsonFile } from './jsonFile.mjs';
import { setStores, resetStores } from './runtime.mjs';
import { createMemoryDocument, setPushStore } from './pushStore.mjs';
import { createMemoryChallengeStore, setChallengeStore } from './challenge/store.mjs';
import { validateData, store } from './store.mjs';
import { validateSessions } from './sessions.mjs';
import { inspectCanonicalSource, normalizeMatch } from './kvMigration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let initialized = false;

export function applyNodeFileDefaults() {
  config.dataFile = config.dataFile || path.join(ROOT, 'data.json');
  config.exampleDataFile = config.exampleDataFile || path.join(ROOT, 'data.example.json');
  config.sessionFile = config.sessionFile || path.join(ROOT, 'sessions.json');
  config.legacyFile = config.legacyFile || path.join(ROOT, 'legacy-private-matches.json');
}

async function createFallback() {
  const example = JSON.parse(await fs.readFile(config.exampleDataFile, 'utf8'));
  console.warn('[taamen] data.json is missing; seeding from data.example.json (development fixtures).');
  return example;
}

export function initNodeRuntime() {
  if (initialized) return;
  applyNodeFileDefaults();
  setStores({
    data: createJsonFile({
      file: config.dataFile,
      validate: validateData,
      createFallback,
    }),
    sessions: createJsonFile({
      file: config.sessionFile,
      validate: validateSessions,
      createFallback: async () => ({ records: {} }),
    }),
  });
  setPushStore(createMemoryDocument());
  setChallengeStore(createMemoryChallengeStore());
  initialized = true;
}

/** Simulate a process restart: drop in-memory stores and reopen the JSON files. */
export function resetNodeRuntime() {
  initialized = false;
  resetStores();
  initNodeRuntime();
}

/**
 * Merge canonical historical matches into the Node dataset by ID.
 * Existing records are not overwritten. Missing snapshot is a no-op.
 */
export async function seedLegacyMatchesIfEmpty() {
  await store.update(async data => {
    let legacy;
    try {
      legacy = JSON.parse(await fs.readFile(config.legacyFile, 'utf8'));
    } catch {
      return;
    }
    const inspected = inspectCanonicalSource(legacy);
    if (inspected.error === 'not-array' || inspected.error === 'missing') return;
    const existing = new Set(data.matches.map(match => match.id));
    for (const match of inspected.matches) {
      if (existing.has(match.id)) continue;
      const normalized = normalizeMatch(match);
      if (!normalized) continue;
      data.matches.push(normalized);
      existing.add(normalized.id);
    }
  });
}
