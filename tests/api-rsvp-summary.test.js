import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { summarize } from '../api/rsvp-summary.js';

function mockReq(method, query = {}) {
  return { method, query };
}
function mockRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = vi.fn(code => { res.statusCode = code; return res; });
  res.json = vi.fn(data => { res.body = data; return res; });
  return res;
}

describe('summarize', () => {
  it('counts yes/no and headcount', () => {
    const s = summarize([
      { attending: 'yes', adults: 2, children: 1, pickup: '', notes: '' },
      { attending: 'no', adults: 0, children: 0, pickup: '', notes: '' },
      { attending: 'yes', adults: 1, children: 0, pickup: '', notes: 'x' },
    ]);
    expect(s.responded).toBe(3);
    expect(s.yes).toBe(2);
    expect(s.no).toBe(1);
    expect(s.adults).toBe(3);
    expect(s.children).toBe(1);
    expect(s.guestsAttending).toBe(4);
    expect(s.withNotes).toBe(1);
  });

  it('breaks shuttle down by city and leg', () => {
    const s = summarize([
      { attending: 'yes', adults: 2, children: 0, pickup: 'tlv_after', notes: '' },   // TLV, return after
      { attending: 'yes', adults: 1, children: 0, pickup: 'tlv_noafter', notes: '' },  // TLV, return before
      { attending: 'yes', adults: 2, children: 0, pickup: 'rhv_to,rhv_after', notes: '' }, // RHV, to + after
      { attending: 'yes', adults: 1, children: 0, pickup: '', notes: '' },             // no shuttle
      { attending: 'no', adults: 0, children: 0, pickup: 'tlv_after', notes: '' },      // declined: ignored for shuttle
    ]);
    expect(s.shuttle.tlv).toEqual({ to: 0, retBefore: 1, retAfter: 1 });
    expect(s.shuttle.rhv).toEqual({ to: 1, retBefore: 0, retAfter: 1 });
    expect(s.shuttle.none).toBe(1);
  });

  it('does not count declined guests toward shuttle or heads', () => {
    const s = summarize([{ attending: 'no', adults: 5, children: 5, pickup: 'tlv_after', notes: '' }]);
    expect(s.guestsAttending).toBe(0);
    expect(s.shuttle.none).toBe(0);
    expect(s.shuttle.tlv.retAfter).toBe(0);
  });
});

describe('API: /api/rsvp-summary', () => {
  let originalEnv, fetchSpy;
  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-key-123';
    process.env.SUMMARY_KEY = 'secret';
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('rejects non-GET', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { key: 'secret' }), res);
    expect(res.statusCode).toBe(405);
  });

  it('returns 404 when key is wrong', async () => {
    const res = mockRes();
    await handler(mockReq('GET', { key: 'nope' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when SUMMARY_KEY is not configured', async () => {
    delete process.env.SUMMARY_KEY;
    const res = mockRes();
    await handler(mockReq('GET', { key: 'secret' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns aggregated summary with the right key', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => [
        { attending: 'yes', adults: 2, children: 0, pickup: 'tlv_after', notes: '' },
      ],
    });
    const res = mockRes();
    await handler(mockReq('GET', { key: 'secret' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.yes).toBe(1);
    expect(res.body.shuttle.tlv.retAfter).toBe(1);
  });

  it('returns 502 when the DB errors', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500 });
    const res = mockRes();
    await handler(mockReq('GET', { key: 'secret' }), res);
    expect(res.statusCode).toBe(502);
  });
});
