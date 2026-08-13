import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { extractMessages, extractStatuses } from '../api/whatsapp-webhook.js';

function mockReq(method, { query = {}, body = {} } = {}) {
  return { method, query, body };
}
function mockRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = vi.fn(code => { res.statusCode = code; return res; });
  res.json = vi.fn(data => { res.body = data; return res; });
  res.send = vi.fn(data => { res.body = data; return res; });
  return res;
}

// A realistic incoming-text webhook payload.
const textPayload = {
  entry: [{
    changes: [{
      value: {
        contacts: [{ wa_id: '972501234567', profile: { name: 'רוני' } }],
        messages: [{
          id: 'wamid.ABC', from: '972501234567', type: 'text',
          timestamp: '1700000000', text: { body: 'מגיעים!' },
        }],
      },
    }],
  }],
};

describe('extractMessages', () => {
  it('pulls text replies with sender name and phone', () => {
    const rows = extractMessages(textPayload);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      wa_message_id: 'wamid.ABC',
      from_phone: '972501234567',
      from_name: 'רוני',
      type: 'text',
      text: 'מגיעים!',
    });
    expect(rows[0].sent_at).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('reads button and interactive reply titles', () => {
    const rows = extractMessages({
      entry: [{ changes: [{ value: { messages: [
        { id: 'b1', from: '111', type: 'button', button: { text: 'כן' } },
        { id: 'i1', from: '222', type: 'interactive', interactive: { button_reply: { title: 'לא' } } },
      ] } }] }],
    });
    expect(rows.map(r => r.text)).toEqual(['כן', 'לא']);
  });

  it('yields nothing for status-only events (delivered/read)', () => {
    const rows = extractMessages({
      entry: [{ changes: [{ value: { statuses: [{ id: 'x', status: 'delivered' }] } }] }],
    });
    expect(rows).toEqual([]);
  });

  it('is safe on empty/garbage payloads', () => {
    expect(extractMessages({})).toEqual([]);
    expect(extractMessages(null)).toEqual([]);
  });
});

describe('extractStatuses', () => {
  it('pulls delivery statuses with recipient and timestamp', () => {
    const rows = extractStatuses({
      entry: [{ changes: [{ value: { statuses: [
        { id: 'w1', recipient_id: '972501234567', status: 'delivered', timestamp: '1700000000' },
        { id: 'w1', recipient_id: '972501234567', status: 'read', timestamp: '1700000100' },
      ] } }] }],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ recipient_phone: '972501234567', status: 'delivered' });
    expect(rows[1].status).toBe('read');
  });

  it('captures the failure reason on failed status', () => {
    const rows = extractStatuses({
      entry: [{ changes: [{ value: { statuses: [
        { id: 'w2', recipient_id: '972500000000', status: 'failed',
          errors: [{ code: 131049, title: 'Not delivered to maintain healthy ecosystem engagement' }] },
      ] } }] }],
    });
    expect(rows[0]).toMatchObject({ status: 'failed', error_code: 131049 });
    expect(rows[0].error_title).toContain('healthy ecosystem');
  });

  it('yields nothing for message-only events', () => {
    expect(extractStatuses(textPayload)).toEqual([]);
    expect(extractStatuses({})).toEqual([]);
  });
});

describe('API: /api/whatsapp-webhook', () => {
  let originalEnv, fetchSpy;
  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.WHATSAPP_VERIFY_TOKEN = 'tok';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'k';
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('echoes the challenge when verify token matches', async () => {
    const res = mockRes();
    await handler(mockReq('GET', { query: {
      'hub.mode': 'subscribe', 'hub.verify_token': 'tok', 'hub.challenge': '12345',
    } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('12345');
  });

  it('rejects a bad verify token', async () => {
    const res = mockRes();
    await handler(mockReq('GET', { query: {
      'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '12345',
    } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('stores incoming messages and acks 200', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { body: textPayload }), res);
    expect(res.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toContain('/rest/v1/whatsapp_messages');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)[0].text).toBe('מגיעים!');
  });

  it('still acks 200 when the DB write fails (no Meta retry storm)', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500 });
    const res = mockRes();
    await handler(mockReq('POST', { body: textPayload }), res);
    expect(res.statusCode).toBe(200);
  });

  it('writes status-only events to whatsapp_status', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { body: {
      entry: [{ changes: [{ value: { statuses: [
        { id: 'w9', recipient_id: '972500000000', status: 'failed', timestamp: '1700000000',
          errors: [{ code: 131026, title: 'Message undeliverable' }] },
      ] } }] }],
    } }), res);
    expect(res.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toContain('/rest/v1/whatsapp_status');
    expect(JSON.parse(opts.body)[0].error_code).toBe(131026);
  });

  it('ignores events with neither messages nor statuses', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { body: { entry: [{ changes: [{ value: {} }] }] } }), res);
    expect(res.statusCode).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
