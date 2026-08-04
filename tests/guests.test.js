import { describe, it, expect } from 'vitest';
import { resolveGuest, GUESTS } from '../src/guests.js';

describe('resolveGuest', () => {
  it('resolves a known guest code', () => {
    const result = resolveGuest('?g=OfirLevin');
    expect(result.code).toBe('OfirLevin');
    expect(result.name).toBe('אופיר');
    expect(result.fullName).toBe('אופיר לוין');
    expect(result.phone).toBe('0546644905');
    expect(result.lang).toBe('he');
    expect(result.form).toBe('f');
  });

  it('uses fullName from guest when present', () => {
    const result = resolveGuest('?g=NikolAndJulian');
    expect(result.name).toBe('Nikol & Julian');
    expect(result.fullName).toBe('Nikol Wolpert');
  });

  it('falls back to name when fullName is missing', () => {
    const originalGuest = { ...GUESTS.OfirLevin };
    delete GUESTS.OfirLevin.fullName;
    const result = resolveGuest('?g=OfirLevin');
    expect(result.fullName).toBe('אופיר');
    GUESTS.OfirLevin.fullName = originalGuest.fullName;
  });

  it('returns empty guest for unknown code', () => {
    const result = resolveGuest('?g=UnknownPerson');
    expect(result.code).toBeNull();
    expect(result.name).toBeUndefined();
  });

  it('handles legacy ?to=&lang= format', () => {
    const result = resolveGuest('?to=John&lang=en&id=abc');
    expect(result.code).toBe('abc');
    expect(result.name).toBe('John');
    expect(result.fullName).toBe('John');
    expect(result.lang).toBe('en');
  });

  it('rejects invalid language in legacy format', () => {
    const result = resolveGuest('?to=John&lang=xx');
    expect(result.lang).toBeUndefined();
  });

  it('handles empty search string', () => {
    const result = resolveGuest('');
    expect(result.code).toBeNull();
    expect(result.name).toBeUndefined();
  });
});

// Integrity guards — these protect the mass-send. A duplicate phone means two
// people share one link/row; a bad form breaks the Hebrew gender rendering.
describe('GUESTS list integrity', () => {
  const entries = Object.entries(GUESTS);
  const VALID_LANGS = ['he', 'en', 'ru'];
  const VALID_FORMS = ['m', 'f', 'plural', 'plural_f'];

  // normalize IL/intl phone to comparable digits (972... => 0...)
  function normPhone(p) {
    let d = String(p || '').replace(/[^0-9]/g, '');
    if (d.startsWith('972')) d = '0' + d.slice(3);
    return d;
  }

  it('has no duplicate phone numbers', () => {
    const seen = new Map();
    const dups = [];
    for (const [code, g] of entries) {
      const n = normPhone(g.phone);
      if (seen.has(n)) dups.push(`${code} & ${seen.get(n)} share ${n}`);
      else seen.set(n, code);
    }
    expect(dups).toEqual([]);
  });

  it('every guest has name, fullName, phone, lang, form', () => {
    const bad = entries.filter(([, g]) => !g.name || !g.fullName || !g.phone || !g.lang || !g.form);
    expect(bad.map(([c]) => c)).toEqual([]);
  });

  it('every phone has at least 9 digits (API accepts it)', () => {
    const bad = entries.filter(([, g]) => normPhone(g.phone).length < 9);
    expect(bad.map(([c]) => c)).toEqual([]);
  });

  it('every display name is at least 2 chars (API accepts it)', () => {
    const bad = entries.filter(([, g]) => String(g.fullName).trim().length < 2);
    expect(bad.map(([c]) => c)).toEqual([]);
  });

  it('every lang is valid', () => {
    const bad = entries.filter(([, g]) => !VALID_LANGS.includes(g.lang));
    expect(bad.map(([c]) => c)).toEqual([]);
  });

  it('every form is valid', () => {
    const bad = entries.filter(([, g]) => !VALID_FORMS.includes(g.form));
    expect(bad.map(([c]) => c)).toEqual([]);
  });

  it('plural_f is only used for Hebrew (other langs are gender-neutral plural)', () => {
    const bad = entries.filter(([, g]) => g.form === 'plural_f' && g.lang !== 'he');
    expect(bad.map(([c]) => c)).toEqual([]);
  });
});
