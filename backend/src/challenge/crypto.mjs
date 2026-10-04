const text = new TextEncoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function hmacHex(value, secret) {
  const key = await crypto.subtle.importKey('raw', text.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, text.encode(value)));
  return [...sig].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToBase64Url(raw);
}

export function randomDigits(length = 6) {
  const raw = crypto.getRandomValues(new Uint8Array(length));
  return [...raw].map(byte => String(byte % 10)).join('');
}

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function participantPublicId() {
  const raw = crypto.getRandomValues(new Uint8Array(6));
  const body = [...raw].map(byte => ID_ALPHABET[byte % ID_ALPHABET.length]).join('');
  return `TM-${body}`;
}

export function normalizePhone(value) {
  const compact = String(value || '').replace(/[^\d+]/g, '');
  const digits = compact.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  return `+${digits}`;
}

export function maskPhone(phone) {
  if (!phone || phone.length < 6) return '';
  return `${phone.slice(0, 4)} ${'*'.repeat(Math.max(4, phone.length - 6))}${phone.slice(-2)}`;
}

export function clip(value, max) {
  return String(value || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
}
