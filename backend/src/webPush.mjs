import { config } from './config.mjs';

const text = new TextEncoder();
const textDecoder = new TextDecoder();

export function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBytes(value) {
  const padded = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concat(...parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

export function vapidConfigured() {
  return Boolean(config.vapid?.publicKey && config.vapid?.privateKey && config.vapid?.subject);
}

async function vapidKey() {
  const pub = base64UrlToBytes(config.vapid.publicKey);
  const d = base64UrlToBytes(config.vapid.privateKey);
  if (pub.length !== 65 || pub[0] !== 4 || d.length !== 32) {
    throw new Error('VAPID key material is not a P-256 key.');
  }
  return crypto.subtle.importKey('jwk', {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(pub.slice(1, 33)),
    y: bytesToBase64Url(pub.slice(33, 65)),
    d: bytesToBase64Url(d),
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

export async function signVapidJwt(audience, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = bytesToBase64Url(text.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bytesToBase64Url(text.encode(JSON.stringify({
    aud: audience,
    exp: nowSeconds + 12 * 60 * 60,
    sub: config.vapid.subject,
  })));
  const key = await vapidKey();
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    text.encode(`${header}.${payload}`),
  ));
  return `${header}.${payload}.${bytesToBase64Url(signature)}`;
}

export async function encryptWebPush(userPublicKey, userAuth, payloadBytes) {
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const subscriber = await crypto.subtle.importKey('raw', userPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: subscriber }, local.privateKey, 256));
  const ikm = await hkdf(userAuth, shared, concat(text.encode('WebPush: info\0'), userPublicKey, localPublic), 32);
  const cek = await hkdf(salt, ikm, text.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, text.encode('Content-Encoding: nonce\0'), 12);
  const padded = concat(payloadBytes, new Uint8Array([2]));
  const key = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, padded));
  const header = new Uint8Array(21 + localPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, padded.length + 16);
  header[20] = localPublic.length;
  header.set(localPublic, 21);
  return concat(header, encrypted);
}

/** Test helper. Production sending does not decrypt. */
export async function decryptWebPush(body, recipientPrivateKey, recipientPublicKey, userAuth) {
  const salt = body.slice(0, 16);
  const idLen = body[20];
  const localPublic = body.slice(21, 21 + idLen);
  const encrypted = body.slice(21 + idLen);
  const senderPublic = await crypto.subtle.importKey('raw', localPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: senderPublic },
    recipientPrivateKey,
    256,
  ));
  const ikm = await hkdf(userAuth, shared, concat(text.encode('WebPush: info\0'), recipientPublicKey, localPublic), 32);
  const cek = await hkdf(salt, ikm, text.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, text.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['decrypt']);
  const padded = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, encrypted));
  const delimiter = padded.lastIndexOf(2);
  return textDecoder.decode(padded.slice(0, delimiter < 0 ? padded.length : delimiter));
}

export async function sendWebPush(subscription, message) {
  if (!vapidConfigured()) return { ok: false, unconfigured: true, gone: false, status: 0 };
  let endpoint;
  try {
    endpoint = new URL(subscription.endpoint);
  } catch {
    return { ok: false, unconfigured: false, gone: true, status: 0 };
  }
  try {
    const payload = text.encode(JSON.stringify({
      title: message.title,
      body: message.body,
      url: message.url,
      tag: message.tag,
    }));
    const body = await encryptWebPush(
      base64UrlToBytes(subscription.keys.p256dh),
      base64UrlToBytes(subscription.keys.auth),
      payload,
    );
    const jwt = await signVapidJwt(endpoint.origin);
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        TTL: '120',
        Urgency: 'normal',
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        Authorization: `vapid t=${jwt}, k=${config.vapid.publicKey}`,
      },
      body,
    });
    return {
      ok: response.status >= 200 && response.status < 300,
      unconfigured: false,
      gone: response.status === 404 || response.status === 410,
      status: response.status,
    };
  } catch {
    return { ok: false, unconfigured: false, gone: false, status: 0 };
  }
}
