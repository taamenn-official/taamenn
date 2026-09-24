import { config } from './config.mjs';

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

/**
 * Template parameters for template_jsugxta / template_4pj4xlm.
 *
 * SMTP From is the EmailJS service identity (dashboard), never the user's address.
 * `email` / `reply_to` carry the user's address for Reply-To and body fields.
 * `to_email` is the server-owned destination when the template To field is dynamic.
 */
export const CONTACT_TEMPLATE_PARAMS = [
  'to_email', 'to_name', 'from_name', 'user_name', 'name', 'email', 'reply_to', 'message', 'title',
];

export function contactConfigured() {
  const { emailjsServiceId, emailjsContactTemplateId, emailjsPublicKey } = config.contact;
  return Boolean(emailjsServiceId && emailjsContactTemplateId && emailjsPublicKey);
}

function compactParams(params) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const text = String(value);
    if (!text.trim()) continue;
    out[key] = text;
  }
  return out;
}

async function send(templateId, params) {
  const payload = {
    service_id: config.contact.emailjsServiceId,
    template_id: templateId,
    user_id: config.contact.emailjsPublicKey,
    template_params: compactParams(params),
  };
  if (config.contact.emailjsPrivateKey) payload.accessToken = config.contact.emailjsPrivateKey;

  try {
    const response = await fetch(EMAILJS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: config.contact.emailjsOrigin || 'http://localhost',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      console.error('[taamen] EmailJS request failed', response.status);
      return false;
    }
    return true;
  } catch {
    console.error('[taamen] EmailJS request failed');
    return false;
  }
}

/**
 * The recipient comes from server configuration only. The caller supplies the
 * reply address and message body, never the destination, template, or service.
 */
export async function sendContactMessage({ email, message, name }) {
  const userName = name || 'TAAMEN user';
  const contactSent = await send(config.contact.emailjsContactTemplateId, {
    to_email: config.contact.recipient,
    to_name: 'TAAMEN Support',
    from_name: 'TAAMEN',
    user_name: userName,
    name: userName,
    email,
    reply_to: email,
    message,
    title: 'TAAMEN Contact',
  });
  if (!contactSent) return { contactSent: false, autoReplySent: false };

  if (!config.contact.emailjsAutoReplyTemplateId) {
    return { contactSent: true, autoReplySent: false };
  }

  try {
    const autoReplySent = await send(config.contact.emailjsAutoReplyTemplateId, {
      to_email: email,
      to_name: userName,
      from_name: 'TAAMEN',
      user_name: userName,
      name: userName,
      email,
      reply_to: config.contact.recipient,
      message: 'We received your message and will review it and reply as soon as possible.',
      title: 'TAAMEN Support',
    });
    return { contactSent: true, autoReplySent };
  } catch {
    console.error('[taamen] EmailJS auto-reply failed');
    return { contactSent: true, autoReplySent: false };
  }
}
