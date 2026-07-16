import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../api/rsvp-status.js';

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

describe('API: /api/rsvp-status', () => {
  let originalEnv;
  let fetchSpy;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-key-123';
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('validation', () => {
    it('rejects non-GET methods', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { guest_id: 'x' }), res);
      expect(res.statusCode).toBe(405);
    });

    it('rejects missing guest_id', async () => {
      const res = mockRes();
      await handler(mockReq('GET', {}), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('missing guest_id');
    });

    it('rejects missing env vars', async () => {
      delete process.env.SUPABASE_URL;
      const res = mockRes();
      await handler(mockReq('GET', { guest_id: 'TestGuest' }), res);
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('server not configured');
    });
  });

  describe('guest has already submitted RSVP', () => {
    it('returns exists:true with attending data', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => [{ attending: 'yes', adults: 2, children: 1, pickup: 'tlv_after' }],
      });
      const res = mockRes();
      await handler(mockReq('GET', { guest_id: 'OfirLevin' }), res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ exists: true, attending: 'yes', adults: 2, children: 1, pickup: 'tlv_after' });
    });

    it('returns attending:no when guest declined', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => [{ attending: 'no', adults: 0, children: 0, pickup: '' }],
      });
      const res = mockRes();
      await handler(mockReq('GET', { guest_id: 'DanKedmi' }), res);
      expect(res.statusCode).toBe(200);
      expect(res.body.exists).toBe(true);
      expect(res.body.attending).toBe('no');
    });
  });

  describe('guest has not submitted RSVP', () => {
    it('returns exists:false', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => [],
      });
      const res = mockRes();
      await handler(mockReq('GET', { guest_id: 'NewGuest' }), res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ exists: false });
    });
  });

  describe('queries Supabase correctly', () => {
    it('passes guest_id as filter in URL', async () => {
      fetchSpy.mockResolvedValue({ ok: true, json: async () => [] });
      const res = mockRes();
      await handler(mockReq('GET', { guest_id: 'TestGuest' }), res);

      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain('guest_id=eq.TestGuest');
      expect(url).toContain('select=attending,adults,children,pickup');
      expect(opts.headers.apikey).toBe('test-key-123');
      expect(opts.headers.Authorization).toBe('Bearer test-key-123');
    });

    it('URL-encodes special characters in guest_id', async () => {
      fetchSpy.mockResolvedValue({ ok: true, json: async () => [] });
      const res = mockRes();
      await handler(mockReq('GET', { guest_id: 'phone:0501234567' }), res);

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('guest_id=eq.phone%3A0501234567');
    });
  });

  describe('error handling', () => {
    it('returns 502 when Supabase is unreachable', async () => {
      fetchSpy.mockRejectedValue(new Error('network error'));
      const res = mockRes();
      await handler(mockReq('GET', { guest_id: 'x' }), res);
      expect(res.statusCode).toBe(502);
      expect(res.body.error).toBe('db unreachable');
    });

    it('returns 502 when Supabase returns an error status', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 });
      const res = mockRes();
      await handler(mockReq('GET', { guest_id: 'x' }), res);
      expect(res.statusCode).toBe(502);
      expect(res.body.error).toBe('db error');
    });
  });
});
