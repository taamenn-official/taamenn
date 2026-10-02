import { dueJobs, getPushStore, STALE_MS } from './pushStore.mjs';
import { sendWebPush } from './webPush.mjs';

/**
 * Idempotent delivery. A job is claimed before the network call, so a second
 * overlapping run sees `sending` or `sent` and does not send it again.
 */
export async function processDuePushJobs(now = Date.now(), sender = sendWebPush) {
  const store = getPushStore();
  const due = await store.read(doc => dueJobs(doc, now).map(job => job.id));
  let sent = 0;
  let skipped = 0;
  let removed = 0;
  let unconfigured = false;

  for (const id of due) {
    if (unconfigured) break;
    const claim = await store.update(doc => {
      const job = doc.jobs[id];
      if (!job || job.status !== 'pending') return { action: 'skip' };
      if (now - job.deliverAt > STALE_MS) {
        job.status = 'expired';
        return { action: 'expired' };
      }
      const sub = doc.subscriptions[job.subscriptionId];
      if (!sub || !sub.enabled) {
        job.status = 'dropped';
        return { action: 'dropped' };
      }
      job.status = 'sending';
      return {
        action: 'send',
        job: { id: job.id, title: job.title, body: job.body, url: job.url },
        sub: { id: sub.id, endpoint: sub.endpoint, keys: sub.keys },
      };
    });

    if (claim.action === 'skip' || claim.action === 'expired' || claim.action === 'dropped') {
      skipped += 1;
      continue;
    }

    const outcome = await sender(claim.sub, { ...claim.job, tag: claim.job.id });
    if (outcome.unconfigured) {
      unconfigured = true;
      await store.update(doc => {
        const job = doc.jobs[id];
        if (job?.status === 'sending') job.status = 'pending';
      });
      break;
    }
    await store.update(doc => {
      const job = doc.jobs[id];
      if (!job) return;
      if (outcome.gone) {
        job.status = 'dropped';
        const sub = doc.subscriptions[claim.sub.id];
        if (sub) sub.enabled = false;
        removed += 1;
        return;
      }
      if (outcome.ok) {
        job.status = 'sent';
        job.sentAt = now;
        return;
      }
      // Transient push-service errors stay pending so the next cron can retry once.
      job.status = outcome.status >= 400 && outcome.status < 500 ? 'failed' : 'pending';
      if (job.status === 'failed') job.sentAt = now;
    });
    if (outcome.ok) sent += 1;
  }

  return { sent, skipped, removed, unconfigured };
}
