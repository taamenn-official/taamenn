/**
 * Public support destinations the browser is allowed to open.
 *
 * The EmailJS / contact-form recipient is server-side and is never configured here.
 * Phone and chat URL may be overridden with VITE_TAAMEN_* env vars; empty env
 * keeps the official TAAMEN defaults so Support / Venues CTAs stay available.
 */

export const OFFICIAL_SUPPORT_PHONE = '+970594054750';
export const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbDL3R2I1rcpDnMnlQ09';
export const INSTAGRAM_URL = 'https://www.instagram.com/taamenn.official/';

export function whatsAppUrlFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

const envPhone = import.meta.env?.VITE_TAAMEN_SUPPORT_PHONE?.trim();
const envWhatsApp = import.meta.env?.VITE_TAAMEN_WHATSAPP_URL?.trim();

export const SUPPORT_PHONE = envPhone || OFFICIAL_SUPPORT_PHONE;
export const WHATSAPP_URL = envWhatsApp || whatsAppUrlFromPhone(SUPPORT_PHONE);
