import { describe, it, expect } from 'vitest';
import { GUESTS } from '../src/guests.js';
import { buildRoster, toE164, groupOf, displayCategory } from '../src/roster.js';

// An RSVP row keyed by a real guest code (buildRoster matches on guest_id).
const row = (guest_id, over = {}) => ({
  guest_id, name: '', display_name: '', phone: '',
  attending: 'yes', adults: 2, children: 0, pickup: '', notes: '', updated_at: null,
  ...over,
});

// Flatten the three roster buckets and find a guest by code.
const find = (data, code) =>
  [...data.accepted, ...data.declined, ...data.noResponse].find((g) => g.code === code);

describe('toE164', () => {
  it('converts a local 05x number to 9725x', () => {
    expect(toE164('0501234567')).toBe('972501234567');
  });
  it('strips a leading + but keeps the country code', () => {
    expect(toE164('+972501234567')).toBe('972501234567');
  });
  it('passes an already-E.164 number through', () => {
    expect(toE164('972501234567')).toBe('972501234567');
  });
});

describe('groupOf', () => {
  it('maps work headers to עבודה (before matching "friends")', () => {
    expect(groupOf("Dvir's work")).toBe('עבודה');
    expect(groupOf("Michal's work friends")).toBe('עבודה');
  });
  it('maps family / parents to משפחה', () => {
    expect(groupOf("Michal's family")).toBe('משפחה');
    expect(groupOf("Dvir's parents")).toBe('משפחה');
  });
  it('maps friends / circle to חברים', () => {
    expect(groupOf('Friends')).toBe('חברים');
    expect(groupOf("Michal's wider circle")).toBe('חברים');
  });
  it('falls back to אחר for unknown headers', () => {
    expect(groupOf('Other')).toBe('אחר');
    expect(groupOf('')).toBe('אחר');
  });
});

describe('displayCategory', () => {
  it('splits family and work by side (מיכל / דביר)', () => {
    expect(displayCategory('משפחה', "Michal's family")).toBe('מיכל');
    expect(displayCategory('משפחה', "Dvir's family")).toBe('דביר');
    expect(displayCategory('עבודה', "Michal's work friends")).toBe('מיכל');
    expect(displayCategory('עבודה', "Dvir's work")).toBe('דביר');
  });
  it('collapses friends into a single bucket', () => {
    expect(displayCategory('חברים', "Michal's wider circle")).toBe('Friends');
    expect(displayCategory('חברים', 'Friends')).toBe('Friends');
  });
  it('leaves other groups unchanged', () => {
    expect(displayCategory('אחר', 'Whatever')).toBe('Whatever');
  });
});

describe('buildRoster grouping', () => {
  it('applies per-guest overrides for group and side', () => {
    const data = buildRoster([
      row('LironGrinstein'),
      row('RotemAmazon'),
      row('MayaZborovsky'),
      row('SigalSasson'),
      row('DanielObo'),
    ]);
    expect(find(data, 'LironGrinstein')).toMatchObject({ group: 'עבודה', category: 'דביר' });
    expect(find(data, 'RotemAmazon')).toMatchObject({ group: 'עבודה', category: 'מיכל' });
    expect(find(data, 'MayaZborovsky')).toMatchObject({ group: 'משפחה', category: 'מיכל' });
    expect(find(data, 'SigalSasson')).toMatchObject({ group: 'משפחה', category: 'דביר' });
    expect(find(data, 'DanielObo')).toMatchObject({ group: 'חברים', category: 'Friends' });
  });

  it('groups non-overridden guests from the category map', () => {
    const data = buildRoster([row('MorKariti')], [], { MorKariti: "Michal's family" });
    expect(find(data, 'MorKariti')).toMatchObject({ group: 'משפחה', category: 'מיכל' });
  });

  it('places Michael Yafe in Michal\'s work', () => {
    const data = buildRoster([row('MichaelYafe')]);
    expect(find(data, 'MichaelYafe')).toMatchObject({ group: 'עבודה', category: 'מיכל' });
  });
});

describe('buildRoster counts', () => {
  it('tallies yes / no / no-response and head counts', () => {
    const data = buildRoster([
      row('LironGrinstein', { attending: 'yes', adults: 2, children: 1 }), // heads 3
      row('RotemAmazon', { attending: 'no' }),
      row('MayaZborovsky', { attending: 'yes', adults: 1, children: 0 }),  // heads 1
    ]);
    expect(data.counts.yes).toBe(2);
    expect(data.counts.no).toBe(1);
    expect(data.counts.heads).toBe(4);
    expect(data.counts.children).toBe(1);
    expect(data.counts.noResponse).toBe(data.counts.totalGuests - 3);
  });

  it('computes percentages against the full guest list', () => {
    const data = buildRoster([row('LironGrinstein', { attending: 'yes' })]);
    const expected = Math.round((1 / data.counts.totalGuests) * 1000) / 10;
    expect(data.counts.pct.yes).toBe(expected);
  });
});

describe('buildRoster shuttle', () => {
  it('aggregates heads (not entries) over accepted guests only, by city and leg', () => {
    const data = buildRoster([
      row('LironGrinstein', { attending: 'yes', adults: 2, children: 0, pickup: 'tlv_to,tlv_after' }),
      row('RotemAmazon', { attending: 'yes', adults: 1, children: 0, pickup: 'rhv_noafter' }),
      row('MayaZborovsky', { attending: 'no', adults: 5, children: 0, pickup: 'tlv_to' }), // declined → ignored
    ]);
    const s = data.counts.shuttle;
    expect(s.to).toBe(2);
    expect(s.retAfter).toBe(2);
    expect(s.retNoAfter).toBe(1);
    expect(s.totalHeads).toBe(3);
    expect(s.byCity.tlv).toMatchObject({ to: 2, retAfter: 2, heads: 2 });
    expect(s.byCity.rhv).toMatchObject({ retNoAfter: 1, heads: 1 });
  });
});

describe('buildRoster recent', () => {
  it('returns the 5 newest submissions, newest first', () => {
    const mk = (code, ts) => row(code, { attending: 'yes', updated_at: ts });
    const data = buildRoster([
      mk('LironGrinstein', '2026-08-01T00:00:00Z'),
      mk('RotemAmazon', '2026-08-05T00:00:00Z'),
      mk('MayaZborovsky', '2026-08-03T00:00:00Z'),
      mk('SigalSasson', '2026-08-10T00:00:00Z'),
      mk('DanielObo', '2026-08-02T00:00:00Z'),
      mk('ItayAmazon', '2026-08-09T00:00:00Z'),
    ]);
    expect(data.recent).toHaveLength(5);
    expect(data.recent[0].updatedAt).toBe('2026-08-10T00:00:00Z');
    const ts = data.recent.map((r) => r.updatedAt);
    expect(ts).toEqual([...ts].sort().reverse());
  });
});

describe('buildRoster orphans & replies', () => {
  it('surfaces rows that match no guest as orphans', () => {
    const data = buildRoster([
      { guest_id: 'phone:972500000000', display_name: 'Ghost', phone: '0500000000', attending: 'yes', adults: 2, children: 0, notes: 'plus one?', updated_at: null },
    ]);
    expect(data.orphans).toHaveLength(1);
    expect(data.orphans[0]).toMatchObject({ display_name: 'Ghost', notes: 'plus one?' });
  });

  it('attaches a WhatsApp reply matched by the guest phone', () => {
    const phone = GUESTS.LironGrinstein.phone;
    const data = buildRoster(
      [row('LironGrinstein', { attending: 'yes' })],
      [{ from_phone: toE164(phone), text: 'mazal tov', received_at: '2026-08-10' }],
    );
    expect(find(data, 'LironGrinstein').reply).toMatchObject({ text: 'mazal tov' });
  });
});

describe('buildRoster notes & inbox', () => {
  it('collects notes from accepted, declined, and orphan rows', () => {
    const data = buildRoster([
      row('LironGrinstein', { attending: 'yes', notes: 'צמחוני' }),
      row('RotemAmazon', { attending: 'no', notes: 'לא נגיע, מזל טוב' }),
      row('MayaZborovsky', { attending: 'yes', notes: '' }), // no note → excluded
      { guest_id: 'phone:972500000000', display_name: 'Ghost', phone: '0500000000', attending: 'yes', adults: 1, children: 0, notes: 'plus one?', updated_at: null },
    ]);
    const texts = data.notes.map((n) => n.note);
    expect(texts).toContain('צמחוני');
    expect(texts).toContain('לא נגיע, מזל טוב');
    expect(texts).toContain('plus one?');
    expect(texts).not.toContain('');
  });

  it('exposes inbound WhatsApp messages with text, newest first as queried', () => {
    const data = buildRoster([], [
      { from_name: 'רון', from_phone: '972500000001', text: 'מזל טוב', received_at: '2026-08-10' },
      { from_name: '', from_phone: '972500000002', text: '', received_at: '2026-08-09' }, // empty → excluded
    ]);
    expect(data.inbox).toHaveLength(1);
    expect(data.inbox[0]).toMatchObject({ name: 'רון', text: 'מזל טוב' });
  });
});
