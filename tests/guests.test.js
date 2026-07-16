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
