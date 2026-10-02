import exampleData from '../backend/data.example.json';
import { handleFetch } from '../backend/src/routes.mjs';
import { initWorkerRuntime } from '../backend/src/workerAdapter.mjs';
import { processDuePushJobs } from '../backend/src/pushDispatch.mjs';

/**
 * Cloudflare Worker adapter.
 *
 * Static SPA assets are served by the Vite/Workers assets pipeline.
 * `run_worker_first` sends `/api/*` here so health/session/contact never
 * fall through to index.html.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api')) {
      return new Response(JSON.stringify({ error: 'Not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    try {
      await initWorkerRuntime(env, exampleData);
    } catch {
      console.error('[taamen] worker init failed');
      return new Response(JSON.stringify({ error: 'TAAMEN server is unavailable.' }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const forwarded = String(request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const ip = request.headers.get('CF-Connecting-IP')
      || (env.TRUST_PROXY === 'true' && forwarded ? forwarded : '')
      || 'unknown';

    return handleFetch(request, {
      ip,
      encrypted: url.protocol === 'https:',
    });
  },

  /**
   * Match reminders. The page does not stay open. A cron tick sends due Web
   * Push jobs and skips anything already marked sent.
   */
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      await initWorkerRuntime(env, exampleData);
      await processDuePushJobs(Date.now());
    })());
  },
};
