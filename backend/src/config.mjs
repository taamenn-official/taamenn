const MINUTE = 60_000;

const ENV_KEYS = [
  'PORT',
  'NODE_ENV',
  'SESSION_TTL_MS',
  'CORS_ORIGIN',
  'REQUIRE_HTTPS',
  'TRUST_PROXY',
  'TAAMEN_SUPPORT_RECIPIENT',
  'EMAILJS_SERVICE_ID',
  'EMAILJS_CONTACT_TEMPLATE_ID',
  'EMAILJS_AUTOREPLY_TEMPLATE_ID',
  'EMAILJS_PUBLIC_KEY',
  'EMAILJS_PRIVATE_KEY',
  'EMAILJS_ORIGIN',
  'TAAMEN_DATA_FILE',
  'TAAMEN_EXAMPLE_DATA_FILE',
  'TAAMEN_SESSION_FILE',
  'TAAMEN_LEGACY_FILE',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
];

function parseOrigins(raw) {
  if (raw === undefined) {
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }
  return String(raw)
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

function read(source, key) {
  const value = source?.[key];
  return value === undefined || value === null ? undefined : String(value);
}

/**
 * Deployment topology is configuration, not an assumption. `CORS_ORIGIN` is only
 * consulted when the API is served from a different origin than the app; a
 * same-origin deployment needs no CORS at all.
 */
export function buildConfig(source = {}) {
  const env = key => {
    const fromSource = read(source, key);
    if (fromSource !== undefined) return fromSource;
    return read(process.env, key);
  };

  return {
    port: Number(env('PORT') || 8787),
    nodeEnv: env('NODE_ENV') || 'development',
    isProduction: env('NODE_ENV') === 'production',

    // File locations are overridable so tests can run against a temporary dataset.
    // Node fills empty defaults with paths under backend/; Workers ignore them.
    dataFile: env('TAAMEN_DATA_FILE') || '',
    exampleDataFile: env('TAAMEN_EXAMPLE_DATA_FILE') || '',
    sessionFile: env('TAAMEN_SESSION_FILE') || '',
    legacyFile: env('TAAMEN_LEGACY_FILE') || '',

    sessionTtlMs: Math.max(15 * MINUTE, Number(env('SESSION_TTL_MS') || 8 * 60 * MINUTE)),
    sessionCookieName: 'taamen_session',

    /**
     * Explicit allow-list. Unset → localhost Vite origins (Node `npm run dev`).
     * Empty string → same-origin only (production `https://taamenn.com` and Worker preview).
     */
    allowedOrigins: parseOrigins(env('CORS_ORIGIN')),

    requireHttps: bool(env('REQUIRE_HTTPS')),

    /**
     * Only honour forwarded client-IP headers when the process genuinely sits
     * behind a proxy that overwrites them. Otherwise any client could spoof one.
     */
    trustProxy: bool(env('TRUST_PROXY')),

    csrfHeader: 'x-taamen-requested',

    rateLimit: {
      windowMs: MINUTE,
      maxAttempts: 8,
      cooldownMs: 5 * MINUTE,
      maxEntries: 5000,
    },

    contact: {
      /** The browser can never choose the recipient. */
      recipient: env('TAAMEN_SUPPORT_RECIPIENT') || '',
      emailjsServiceId: env('EMAILJS_SERVICE_ID') || '',
      emailjsContactTemplateId: env('EMAILJS_CONTACT_TEMPLATE_ID') || '',
      emailjsAutoReplyTemplateId: env('EMAILJS_AUTOREPLY_TEMPLATE_ID') || '',
      emailjsPublicKey: env('EMAILJS_PUBLIC_KEY') || '',
      emailjsPrivateKey: env('EMAILJS_PRIVATE_KEY') || '',
      /**
       * Origin sent to EmailJS for the non-browser API compatibility header.
       * Production Worker: https://taamenn.com. Local Node default: http://localhost.
       * Never http://localhost:5173.
       */
      emailjsOrigin: env('EMAILJS_ORIGIN') || (env('NODE_ENV') === 'production' ? 'https://taamenn.com' : 'http://localhost'),
      maxMessageLength: 2000,
      maxNameLength: 80,
      maxEmailLength: 254,
    },

    maxBodyBytes: 64 * 1024,

    /**
     * Web Push. The private key is a Worker secret and must never be returned
     * to the browser. Absent keys mean push delivery is not configured.
     */
    vapid: {
      publicKey: env('VAPID_PUBLIC_KEY') || '',
      privateKey: env('VAPID_PRIVATE_KEY') || '',
      subject: env('VAPID_SUBJECT') || 'mailto:support@taamenn.com',
    },
  };
}

export const config = buildConfig(process.env);

/** Overlay Worker bindings (or another env map) onto the shared config object. */
export function applyEnv(source) {
  const merged = { ...process.env };
  if (source && typeof source === 'object') {
    for (const key of ENV_KEYS) {
      const value = source[key];
      if (typeof value === 'string') merged[key] = value;
    }
  }
  Object.assign(config, buildConfig(merged));
  return config;
}
