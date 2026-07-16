import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../api/rsvp.js';

function mockReq(method, body = {}) {
  return { method, body };
}

function mockRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = vi.fn(code => { res.statusCode = code; return res; });
  res.json = vi.fn(data => { res.body = data; return res; });
  return res;
}

const VALID_BODY = {
  guest_id: 'TestGuest',
  name: 'Test Person',
  display_name: 'Testy',
  phone: '0501234567',
  attending: 'yes',
  adults: 2,
  children: 1,
  pickup: 'tlv_after',
  notes: 'Vegetarian',
};

describe('API: /api/rsvp', () => {
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
    it('rejects non-POST methods', async () => {
      const res = mockRes();
      await handler(mockReq('GET'), res);
      expect(res.statusCode).toBe(405);
    });

    it('rejects missing env vars', async () => {
      delete process.env.SUPABASE_URL;
      const res = mockRes();
      await handler(mockReq('POST', VALID_BODY), res);
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe('server not configured');
    });

    it('rejects empty name', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { ...VALID_BODY, name: '' }), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('missing name');
    });

    it('rejects name shorter than 2 chars', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { ...VALID_BODY, name: 'X' }), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('missing name');
    });

    it('rejects phone with less than 9 digits', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { ...VALID_BODY, phone: '12345678' }), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('missing phone');
    });

    it('rejects invalid attending value', async () => {
      const res = mockRes();
      await handler(mockReq('POST', { ...VALID_BODY, attending: 'maybe' }), res);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('bad attending value');
    });
  });

  describe('successful RSVP (first submit)', () => {
    it('returns ok:true on success', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 201 });
      const res = mockRes();
      await handler(mockReq('POST', VALID_BODY), res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('sends correct payload to Supabase', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 201 });
      const res = mockRes();
      await handler(mockReq('POST', VALID_BODY), res);

      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain('supabase.co/rest/v1/rsvps');
      expect(url).toContain('on_conflict=guest_id');

      const sent = JSON.parse(opts.body);
      expect(sent.guest_id).toBe('TestGuest');
      expect(sent.name).toBe('Test Person');
      expect(sent.display_name).toBe('Testy');
      expect(sent.phone).toBe('0501234567');
      expect(sent.attending).toBe('yes');
      expect(sent.adults).toBe(2);
      expect(sent.children).toBe(1);
      expect(sent.pickup).toBe('tlv_after');
      expect(sent.notes).toBe('Vegetarian');
      expect(sent.updated_at).toBeDefined();
    });

    it('uses merge-duplicates for upsert', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 201 });
      const res = mockRes();
      await handler(mockReq('POST', VALID_BODY), res);

      const [, opts] = fetchSpy.mock.calls[0];
      expect(opts.headers.Prefer).toContain('resolution=merge-duplicates');
    });
  });

  describe('edit (re-submit updates existing)', () => {
    it('updates the same guest_id on re-submit', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 201 });
      const res1 = mockRes();
      await handler(mockReq('POST', { ...VALID_BODY, notes: 'First submit' }), res1);
      expect(res1.statusCode).toBe(200);

      const res2 = mockRes();
      await handler(mockReq('POST', { ...VALID_BODY, attending: 'no', notes: 'Changed my mind' }), res2);
      expect(res2.statusCode).toBe(200);

      const [, opts] = fetchSpy.mock.calls[1];
      const sent = JSON.parse(opts.body);
      expect(sent.guest_id).toBe('TestGuest');
      expect(sent.attending).toBe('no');
      expect(sent.notes).toBe('Changed my mind');
    });

    it('derives conflict key from phone when no guest_id', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 201 });
      const res = mockRes();
      await handler(mockReq('POST', { ...VALID_BODY, guest_id: null, phone: '050-123-4567' }), res);

      const [, opts] = fetchSpy.mock.calls[0];
      const sent = JSON.parse(opts.body);
      expect(sent.guest_id).toBe('phone:0501234567');
    });
  });

  describe('RSVP across guest forms (m/f/plural)', () => {
    const guests = [
      { guest_id: 'DanKedmi', name: 'דן קדמי', display_name: 'דן', phone: '0509878804', form: 'm' },
      { guest_id: 'OfirLevin', name: 'אופיר לוין', display_name: 'אופיר', phone: '0546644905', form: 'f' },
      { guest_id: 'YotamSuliman', name: 'יותם סולימן', display_name: 'יות וגיל', phone: '0504600888', form: 'plural' },
    ];

    guests.forEach(({ guest_id, name, display_name, phone, form }) => {
      it(`accepts RSVP from ${form} guest (${guest_id})`, async () => {
        fetchSpy.mockResolvedValue({ ok: true, status: 201 });
        const res = mockRes();
        await handler(mockReq('POST', { guest_id, name, display_name, phone, attending: 'yes', adults: 1, children: 0, pickup: '', notes: '' }), res);
        expect(res.statusCode).toBe(200);

        const [, opts] = fetchSpy.mock.calls[0];
        const sent = JSON.parse(opts.body);
        expect(sent.guest_id).toBe(guest_id);
        expect(sent.name).toBe(name);
        expect(sent.display_name).toBe(display_name);
      });
    });
  });

  describe('RSVP across languages', () => {
    const langGuests = [
      { guest_id: 'DanKedmi', name: 'דן קדמי', phone: '0509878804', lang: 'he' },
      { guest_id: 'NikolAndJulian', name: 'Nikol Wolpert', phone: '+19296225141', lang: 'en' },
      { guest_id: 'ViktoriaSharay', name: 'Viktoria Sharay', phone: '0504247004', lang: 'ru' },
    ];

    langGuests.forEach(({ guest_id, name, phone, lang }) => {
      it(`accepts RSVP from ${lang} guest (${guest_id})`, async () => {
        fetchSpy.mockResolvedValue({ ok: true, status: 201 });
        const res = mockRes();
        await handler(mockReq('POST', { guest_id, name, display_name: name, phone, attending: 'yes', adults: 1, children: 0, pickup: '', notes: '' }), res);
        expect(res.statusCode).toBe(200);

        const [, opts] = fetchSpy.mock.calls[0];
        const sent = JSON.parse(opts.body);
        expect(sent.guest_id).toBe(guest_id);
        expect(sent.name).toBe(name);
      });

      it(`accepts edit from ${lang} guest (${guest_id})`, async () => {
        fetchSpy.mockResolvedValue({ ok: true, status: 201 });
        const res = mockRes();
        await handler(mockReq('POST', { guest_id, name, display_name: name, phone, attending: 'no', adults: 0, children: 0, pickup: '', notes: 'Sorry!' }), res);
        expect(res.statusCode).toBe(200);

        const [, opts] = fetchSpy.mock.calls[0];
        const sent = JSON.parse(opts.body);
        expect(sent.attending).toBe('no');
        expect(sent.notes).toBe('Sorry!');
      });
    });
  });

  describe('error handling', () => {
    it('returns 502 when Supabase is unreachable', async () => {
      fetchSpy.mockRejectedValue(new Error('network timeout'));
      const res = mockRes();
      await handler(mockReq('POST', VALID_BODY), res);
      expect(res.statusCode).toBe(502);
      expect(res.body.error).toBe('db unreachable');
    });

    it('returns 502 when Supabase rejects the insert', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 403, text: async () => 'RLS violation' });
      const res = mockRes();
      await handler(mockReq('POST', VALID_BODY), res);
      expect(res.statusCode).toBe(502);
      expect(res.body.error).toBe('db insert failed');
    });
  });

  describe('input sanitization', () => {
    it('trims and caps name at 100 chars', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 201 });
      const res = mockRes();
      const longName = 'A'.repeat(200);
      await handler(mockReq('POST', { ...VALID_BODY, name: '  ' + longName + '  ' }), res);
      const [, opts] = fetchSpy.mock.calls[0];
      const sent = JSON.parse(opts.body);
      expect(sent.name.length).toBe(100);
    });

    it('caps notes at 500 chars', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 201 });
      const res = mockRes();
      await handler(mockReq('POST', { ...VALID_BODY, notes: 'N'.repeat(1000) }), res);
      const [, opts] = fetchSpy.mock.calls[0];
      const sent = JSON.parse(opts.body);
      expect(sent.notes.length).toBe(500);
    });

    it('clamps adults/children to 0-15 range', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 201 });
      const res = mockRes();
      await handler(mockReq('POST', { ...VALID_BODY, adults: 99, children: -5 }), res);
      const [, opts] = fetchSpy.mock.calls[0];
      const sent = JSON.parse(opts.body);
      expect(sent.adults).toBe(15);
      expect(sent.children).toBe(0);
    });

    it('rejects invalid pickup value', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 201 });
      const res = mockRes();
      await handler(mockReq('POST', { ...VALID_BODY, pickup: 'hacked' }), res);
      const [, opts] = fetchSpy.mock.calls[0];
      const sent = JSON.parse(opts.body);
      expect(sent.pickup).toBe('');
    });
  });
});
