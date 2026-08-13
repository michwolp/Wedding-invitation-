// /api/messages — read-only view of the WhatsApp replies guests sent to the
// business number (captured by /api/whatsapp-webhook into `whatsapp_messages`).
//
// GET /api/messages?key=<SUMMARY_KEY>  → newest-first list of replies.
// Gated by the same SUMMARY_KEY as /api/rsvp-summary so it isn't world-readable.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'server not configured' });
  }
  const gate = process.env.SUMMARY_KEY;
  if (!gate || req.query.key !== gate) {
    return res.status(404).json({ error: 'not found' });
  }

  const url = `${process.env.SUPABASE_URL}/rest/v1/whatsapp_messages`
    + `?select=from_name,from_phone,type,text,sent_at,received_at`
    + `&order=received_at.desc&limit=200`;
  try {
    const resp = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });
    if (!resp.ok) return res.status(502).json({ error: 'db error' });
    const rows = await resp.json();
    return res.status(200).json({ count: rows.length, messages: rows });
  } catch (err) {
    return res.status(502).json({ error: 'db unreachable' });
  }
}
