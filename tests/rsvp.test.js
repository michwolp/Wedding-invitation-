import { describe, it, expect } from 'vitest';
import { buildPayload, validateForm } from '../src/rsvp.js';

describe('validateForm', () => {
  it('returns null for valid input', () => {
    expect(validateForm('John Doe', '0501234567')).toBeNull();
  });

  it('rejects empty name', () => {
    expect(validateForm('', '0501234567')).toBe('need');
  });

  it('rejects name with only one character', () => {
    expect(validateForm('A', '0501234567')).toBe('need');
  });

  it('rejects empty phone', () => {
    expect(validateForm('John', '')).toBe('need');
  });

  it('rejects phone shorter than 7 chars', () => {
    expect(validateForm('John', '123456')).toBe('need');
  });

  it('accepts phone with exactly 7 chars', () => {
    expect(validateForm('John', '1234567')).toBeNull();
  });

  it('rejects null name', () => {
    expect(validateForm(null, '0501234567')).toBe('need');
  });

  it('rejects undefined phone', () => {
    expect(validateForm('John', undefined)).toBe('need');
  });
});

describe('buildPayload', () => {
  const guest = { code: 'OfirLevin', name: 'אופיר', fullName: 'אופיר לוין' };
  const counts = { adults: 2, children: 1 };

  it('uses guest fullName when guest has a code', () => {
    const payload = buildPayload(
      { name: 'typed name', phone: '0501234567', attending: 'yes', pickup: 'tlv_after', notes: '' },
      guest,
      counts,
    );
    expect(payload.name).toBe('אופיר לוין');
    expect(payload.display_name).toBe('אופיר');
  });

  it('uses typed name when no guest code', () => {
    const payload = buildPayload(
      { name: 'Random Person', phone: '0501234567', attending: 'yes', pickup: '', notes: 'hi' },
      { code: null, name: null, fullName: null },
      counts,
    );
    expect(payload.name).toBe('Random Person');
    expect(payload.display_name).toBe('Random Person');
  });

  it('zeroes headcount when not attending', () => {
    const payload = buildPayload(
      { name: 'X', phone: '0501234567', attending: 'no', pickup: 'tlv_after', notes: '' },
      guest,
      { adults: 3, children: 2 },
    );
    expect(payload.adults).toBe(0);
    expect(payload.children).toBe(0);
    expect(payload.pickup).toBe('');
  });

  it('includes headcount when attending', () => {
    const payload = buildPayload(
      { name: 'X', phone: '0501234567', attending: 'yes', pickup: 'tlv_noafter', notes: 'note' },
      guest,
      { adults: 4, children: 3 },
    );
    expect(payload.adults).toBe(4);
    expect(payload.children).toBe(3);
    expect(payload.pickup).toBe('tlv_noafter');
    expect(payload.notes).toBe('note');
  });

  it('sets guest_id from guest code', () => {
    const payload = buildPayload(
      { name: 'X', phone: '05', attending: 'yes', pickup: '', notes: '' },
      guest,
      counts,
    );
    expect(payload.guest_id).toBe('OfirLevin');
  });
});
