/**
 * OTP delivery stays behind this adapter. The HTTP API never returns the code.
 * `dev` is for tests only. Production needs CHALLENGE_OTP_PROVIDER plus server credentials.
 */
const devCodes = new Map();

export function providerStatus(env = process.env) {
  const name = String(env.CHALLENGE_OTP_PROVIDER || '').trim();
  if (name === 'dev') return { available: true, kind: 'dev' };
  if (name && env.CHALLENGE_OTP_API_KEY && env.CHALLENGE_OTP_BASE_URL) return { available: true, kind: 'http' };
  return { available: false, kind: 'unconfigured' };
}

export async function sendOtp({ phone, code, phoneHash, env = process.env }) {
  const status = providerStatus(env);
  if (!status.available) return { ok: false };
  if (status.kind === 'dev') {
    devCodes.set(phoneHash, code);
    return { ok: true };
  }
  const response = await fetch(env.CHALLENGE_OTP_BASE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.CHALLENGE_OTP_API_KEY}`,
    },
    body: JSON.stringify({
      to: phone,
      sender: env.CHALLENGE_OTP_SENDER || 'TAAMEN',
      template: env.CHALLENGE_OTP_TEMPLATE || 'challenge-otp',
      code,
    }),
  });
  return { ok: response.ok };
}

/** Test-only read. Production HTTP handlers must not call this. */
export function takeDevOtp(phoneHash) {
  const code = devCodes.get(phoneHash) || '';
  devCodes.delete(phoneHash);
  return code;
}
