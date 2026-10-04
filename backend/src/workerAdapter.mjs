import { emptyProductionDataset } from './kvMigration.mjs';
import { applyEnv } from './config.mjs';
import { createKvJsonFile } from './kvStore.mjs';
import { setStores } from './runtime.mjs';
import { emptyPushDocument, setPushStore, validatePushDocument } from './pushStore.mjs';
import { createD1ChallengeStore } from './challenge/d1Store.mjs';
import { setChallengeStore } from './challenge/store.mjs';
import { setChallengeEnv } from './challenge/service.mjs';
import { validateData, store } from './store.mjs';
import { validateSessions } from './sessions.mjs';
import { syncFeaturedMembers } from './featuredMembers.mjs';

let ready = null;

/**
 * Bind KV persistence and overlay Worker env onto shared config.
 * Safe to call on every request; initialization runs once per isolate.
 * A failed boot is not sticky: the next request may retry.
 */
export function initWorkerRuntime(env, exampleData) {
  if (ready) return ready;
  ready = (async () => {
    applyEnv(env);
    setChallengeEnv(env);
    const kv = env.TAAMEN_KV;
    if (!kv || typeof kv.get !== 'function') {
      throw new Error('TAAMEN_KV binding is missing.');
    }
    setStores({
      data: createKvJsonFile({
        kv,
        key: 'data',
        validate: validateData,
        createFallback: async () => {
          // Production must not silently seed DEV-001/DEV-002. Local preview may opt in.
          if (env.TAAMEN_SEED_EXAMPLE === 'true') return exampleData || emptyProductionDataset();
          return emptyProductionDataset();
        },
      }),
      sessions: createKvJsonFile({
        kv,
        key: 'sessions',
        validate: validateSessions,
        createFallback: async () => ({ records: {} }),
      }),
    });
    setPushStore(createKvJsonFile({
      kv,
      key: 'push',
      validate: validatePushDocument,
      createFallback: async () => emptyPushDocument(),
    }));
    if (env.TAAMEN_CHALLENGE_DB && typeof env.TAAMEN_CHALLENGE_DB.prepare === 'function') {
      setChallengeStore(createD1ChallengeStore(env.TAAMEN_CHALLENGE_DB));
    }
    await store.load();
    await store.update(data => { syncFeaturedMembers(data); });
  })();
  ready.catch(() => { ready = null; });
  return ready;
}
