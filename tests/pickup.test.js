import { describe, it, expect } from 'vitest';
import { parsePickup, encodePickup, sanitizePickup, PICKUP_TOKENS } from '../src/pickup.js';

describe('parsePickup', () => {
  it('parses empty as no shuttle', () => {
    expect(parsePickup('')).toEqual({ city: '', to: false, ret: '' });
    expect(parsePickup(null)).toEqual({ city: '', to: false, ret: '' });
    expect(parsePickup(undefined)).toEqual({ city: '', to: false, ret: '' });
  });

  // backward-compatibility with the original single-value scheme
  it('parses legacy tlv_after as Tel Aviv + return after', () => {
    expect(parsePickup('tlv_after')).toEqual({ city: 'tlv', to: false, ret: 'after' });
  });

  it('parses legacy tlv_noafter as Tel Aviv + return before', () => {
    expect(parsePickup('tlv_noafter')).toEqual({ city: 'tlv', to: false, ret: 'noafter' });
  });

  it('parses legacy rhv_after / rhv_noafter', () => {
    expect(parsePickup('rhv_after')).toEqual({ city: 'rhv', to: false, ret: 'after' });
    expect(parsePickup('rhv_noafter')).toEqual({ city: 'rhv', to: false, ret: 'noafter' });
  });

  it('parses a combined to + return', () => {
    expect(parsePickup('tlv_to,tlv_after')).toEqual({ city: 'tlv', to: true, ret: 'after' });
  });

  it('parses to-only (no return)', () => {
    expect(parsePickup('rhv_to')).toEqual({ city: 'rhv', to: true, ret: '' });
  });

  it('ignores tokens from a second city (first city wins)', () => {
    expect(parsePickup('tlv_to,rhv_after')).toEqual({ city: 'tlv', to: true, ret: '' });
  });

  it('ignores garbage tokens', () => {
    expect(parsePickup('hacked,tlv_after,,junk_x')).toEqual({ city: 'tlv', to: false, ret: 'after' });
  });
});

describe('encodePickup', () => {
  it('returns empty when no city', () => {
    expect(encodePickup({ city: '', to: true, ret: 'after' })).toBe('');
  });

  it('encodes to + return', () => {
    expect(encodePickup({ city: 'tlv', to: true, ret: 'after' })).toBe('tlv_to,tlv_after');
  });

  it('encodes return only (legacy shape preserved)', () => {
    expect(encodePickup({ city: 'tlv', to: false, ret: 'after' })).toBe('tlv_after');
    expect(encodePickup({ city: 'rhv', to: false, ret: 'noafter' })).toBe('rhv_noafter');
  });

  it('encodes to only', () => {
    expect(encodePickup({ city: 'rhv', to: true, ret: '' })).toBe('rhv_to');
  });

  it('rejects invalid city', () => {
    expect(encodePickup({ city: 'nyc', to: true, ret: 'after' })).toBe('');
  });
});

describe('round-trip', () => {
  it('every legacy value survives parse→encode unchanged', () => {
    for (const v of ['', 'tlv_after', 'tlv_noafter', 'rhv_after', 'rhv_noafter']) {
      expect(encodePickup(parsePickup(v))).toBe(v);
    }
  });
});

describe('sanitizePickup', () => {
  it('passes valid values through', () => {
    expect(sanitizePickup('tlv_after')).toBe('tlv_after');
    expect(sanitizePickup('tlv_to,tlv_after')).toBe('tlv_to,tlv_after');
  });

  it('strips malformed input to empty', () => {
    expect(sanitizePickup('hacked')).toBe('');
    expect(sanitizePickup('<script>')).toBe('');
  });

  it('normalizes token order', () => {
    expect(sanitizePickup('tlv_after,tlv_to')).toBe('tlv_to,tlv_after');
  });

  it('drops a cross-city token', () => {
    expect(sanitizePickup('tlv_after,rhv_to')).toBe('tlv_after');
  });
});

describe('PICKUP_TOKENS', () => {
  it('lists every valid token', () => {
    expect(PICKUP_TOKENS.sort()).toEqual(
      ['tlv_to', 'rhv_to', 'tlv_after', 'tlv_noafter', 'rhv_after', 'rhv_noafter'].sort(),
    );
  });
});
