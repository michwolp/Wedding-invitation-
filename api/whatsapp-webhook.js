// /api/whatsapp-webhook — receives WhatsApp Cloud API webhooks from Meta.
//
// GET  → Meta's one-time verification handshake (echoes hub.challenge).
// POST → an event. Two kinds arrive on the same webhook:
//        • incoming guest replies   → stored in `whatsapp_messages` (read what
//          guests typed back in the chat)
//        • delivery-status updates  → stored in `whatsapp_status` (sent /
//          delivered / read / failed + failure reason — did they get it?)
//
// Meta setup (WhatsApp Manager → Configure Webhooks):
//   Callback URL : https://dvichal-wedding.com/api/whatsapp-webhook
//   Verify token : must match VERIFY_TOKEN below (or the WHATSAPP_VERIFY_TOKEN env var)
//   Then subscribe to the "messages" field.
// NOTE: the Meta app must be PUBLISHED (Live) for real guest messages to
// arrive — an unpublished app only receives test webhooks from the dashboard.

import { GUESTS } from '../src/guests.js';

// The token you paste into Meta's "Verify token" box. Override in Vercel with
// WHATSAPP_VERIFY_TOKEN if you want; otherwise this default is used.
const DEFAULT_VERIFY_TOKEN = 'dvichal-wedding-webhook-2026';

// phone (E.164 digits, no +) → guest name, so stored rows carry a readable name.
const NAME_BY_PHONE = {};
for (const g of Object.values(GUESTS)) NAME_BY_PHONE[toE164(g.phone)] = g.name;

// Convert a stored guest phone to E.164 digits (no +), matching what WhatsApp
// puts in `from` / `recipient_id`. Mirrors scripts/send.js toE164().
function toE164(phone) {
  const p = String(phone).trim();
  if (p.startsWith('+')) return p.slice(1).replace(/\D/g, '');
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  return digits;
}

export default async function handler(req, res) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;

  // 1) Verification handshake — Meta calls this once when you save the webhook.
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[wa-webhook] verified');
      return res.status(200).send(challenge);
    }
    console.warn('[wa-webhook] verification failed');
    return res.status(403).json({ error: 'verification failed' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // 2) Event. Extract incoming replies + delivery statuses, store them, and ack
  //    fast (return 200 even on error so Meta doesn't spam retries).
  try {
    const messages = extractMessages(req.body);
    const statuses = extractStatuses(req.body);
    for (const r of messages) {
      console.log('[wa-webhook] reply from', r.from_name || r.from_phone, '→', JSON.stringify(r.text));
    }
    for (const s of statuses) {
      console.log('[wa-webhook] status', s.recipient_phone, '→', s.status, s.error_title ? `(${s.error_code} ${s.error_title})` : '');
    }
    // Replies: dedupe on the WhatsApp message id (Meta re-sends on failure).
    await storeRows('whatsapp_messages?on_conflict=wa_message_id', messages,
      'resolution=ignore-duplicates,return=minimal');
    // Statuses: a message emits several (sent→delivered→read), so keep them all.
    await storeRows('whatsapp_status', statuses, 'return=minimal');
  } catch (err) {
    console.error('[wa-webhook] error:', err.message);
  }
  return res.status(200).json({ received: true });
}

// Insert rows into a Supabase table via PostgREST. No-op if there's nothing to
// write or Supabase isn't configured.
async function storeRows(pathWithQuery, rows, prefer) {
  if (!rows.length || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
  const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body: JSON.stringify(rows),
  });
  if (!resp.ok) console.error('[wa-webhook] db write failed:', pathWithQuery.split('?')[0], resp.status);
}

// Pull incoming text/button/interactive messages out of a webhook payload.
// Status-only events (delivered/read) contain no `messages[]`, so they yield
// nothing. Exported for unit testing without a live webhook.
export function extractMessages(body) {
  const out = [];
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const nameByPhone = {};
      for (const c of value.contacts || []) nameByPhone[c.wa_id] = c.profile?.name || '';
      for (const m of value.messages || []) {
        let text = '';
        if (m.type === 'text') text = m.text?.body || '';
        else if (m.type === 'button') text = m.button?.text || '';
        else if (m.type === 'interactive') {
          text = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
        } else text = `[${m.type}]`;
        out.push({
          wa_message_id: m.id,
          from_phone: m.from,
          from_name: nameByPhone[m.from] || '',
          type: m.type,
          text,
          sent_at: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : null,
        });
      }
    }
  }
  return out;
}

// Pull delivery-status updates (sent/delivered/read/failed) out of a payload.
// `failed` entries carry an errors[] array with the reason. Exported for tests.
export function extractStatuses(body) {
  const out = [];
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      for (const s of change.value?.statuses || []) {
        const err = (s.errors && s.errors[0]) || null;
        out.push({
          wa_message_id: s.id,
          recipient_phone: s.recipient_id,
          recipient_name: NAME_BY_PHONE[s.recipient_id] || null,
          status: s.status,
          error_code: err ? (err.code ?? null) : null,
          error_title: err ? (err.title || err.message || null) : null,
          at: s.timestamp ? new Date(Number(s.timestamp) * 1000).toISOString() : null,
        });
      }
    }
  }
  return out;
}
