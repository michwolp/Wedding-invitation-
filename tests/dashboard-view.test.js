import { describe, it, expect } from 'vitest';
import {
  esc, shuttleText, summaryCardsHtml, recentHtml, shuttleRowsHtml,
  guestCard, groupRoster, rosterHtml, notesHtml, messagesHtml, passesCard,
} from '../src/dashboard-view.js';

describe('esc', () => {
  it('escapes HTML-significant characters', () => {
    expect(esc('<a href="x">&\'')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
  it('renders null / undefined as empty string', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
});

describe('shuttleText', () => {
  it('joins city · to · return into a readable line', () => {
    expect(shuttleText({ city: 'tlv', to: true, ret: 'after' }))
      .toBe('תל אביב · הסעה להגעה · חזרה אחרי האפטר');
  });
  it('is empty for no shuttle', () => {
    expect(shuttleText(null)).toBe('');
  });
});

describe('summaryCardsHtml', () => {
  it('renders five cards from counts', () => {
    const html = summaryCardsHtml({
      heads: 10, adults: 7, children: 3, yes: 5, no: 2, noResponse: 3, totalGuests: 10, responded: 7,
      pct: { yes: 50, no: 20, noResponse: 30, responded: 70 },
    });
    expect((html.match(/class="card/g) || []).length).toBe(5);
    expect(html).toContain('אישרו הגעה');
    expect(html).toContain('7 מבוגרים · 3 ילדים');
  });
});

describe('recentHtml', () => {
  it('lists submissions and marks attendance', () => {
    const html = recentHtml([
      { name: 'דנה', attending: 'yes', heads: 2, updatedAt: '2026-08-10T00:00:00Z' },
      { name: 'רון', attending: 'no', updatedAt: '2026-08-09T00:00:00Z' },
    ]);
    expect(html).toContain('דנה');
    expect(html).toContain('2 אורחים');
    expect(html).toContain('לא מגיע/ה');
  });
  it('is empty when there are none', () => {
    expect(recentHtml([])).toBe('');
  });
});

describe('shuttleRowsHtml', () => {
  it('shows the total and per-city legs', () => {
    const html = shuttleRowsHtml({
      totalHeads: 3, byCity: { tlv: { to: 2, retAfter: 2 }, rhv: { retNoAfter: 1 } },
    });
    expect(html).toContain('סה״כ בהסעות: <b>3</b>');
    expect(html).toContain('תל אביב: <b>2</b>');
    expect(html).toContain('רחובות: <b>1</b>');
  });
});

describe('guestCard', () => {
  it('carries data-ride / data-note flags and escapes fields', () => {
    const html = guestCard(
      { name: 'a<b', fullName: '', phone: '0501234567', heads: 2, shuttle: { city: 'tlv', to: true }, notes: 'hi' },
      'yes',
    );
    expect(html).toContain('data-ride="1"');
    expect(html).toContain('data-note="1"');
    expect(html).toContain('a&lt;b');
  });
  it('has no ride / note flags when absent', () => {
    const html = guestCard({ name: 'x', phone: '0500000000', heads: 1, shuttle: null, notes: '' }, 'yes');
    expect(html).toContain('data-ride="0"');
    expect(html).toContain('data-note="0"');
  });
});

describe('groupRoster', () => {
  it('groups by group→category→status and orders known groups first', () => {
    const { groups, ordered } = groupRoster({
      accepted: [{ group: 'עבודה', category: 'מיכל', heads: 2 }],
      declined: [{ group: 'משפחה', category: 'דביר' }],
      noResponse: [{ group: 'חברים', category: 'Friends' }],
    });
    expect(ordered).toEqual(['משפחה', 'חברים', 'עבודה']);
    expect(groups['עבודה']['מיכל'].yes).toHaveLength(1);
    expect(groups['משפחה']['דביר'].no).toHaveLength(1);
  });
});

describe('rosterHtml', () => {
  const data = {
    accepted: [
      { name: 'A', phone: '1', group: 'עבודה', category: 'מיכל', heads: 2, shuttle: null, notes: '' },
      { name: 'B', phone: '2', group: 'חברים', category: 'Friends', heads: 1, shuttle: null, notes: '' },
    ],
    declined: [], noResponse: [], orphans: [],
  };

  it('renders every group and all dropdowns closed by default (no open attribute)', () => {
    const html = rosterHtml(data);
    expect(html).toContain('עבודה');
    expect(html).toContain('חברים');
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });

  it('collapses the category layer for single-category groups (e.g. חברים)', () => {
    const html = rosterHtml(data);
    // חברים has one category → no nested details.cat, just the buckets
    const friendsBlock = html.slice(html.indexOf('חברים'));
    expect(friendsBlock).not.toContain('details class="cat"');
  });

  it('surfaces orphan rows', () => {
    const html = rosterHtml({ accepted: [], declined: [], noResponse: [], orphans: [{ display_name: 'Ghost', phone: '9', attending: 'yes' }] });
    expect(html).toContain('אישורים ללא התאמה לרשימה');
    expect(html).toContain('Ghost');
  });
});

describe('notesHtml', () => {
  it('lists each note with attendance mark and phone', () => {
    const html = notesHtml([{ name: 'דנה', phone: '0501234567', note: 'צמחונית', attending: 'yes' }]);
    expect(html).toContain('note-item');
    expect(html).toContain('דנה');
    expect(html).toContain('צמחונית');
    expect(html).toContain('✓');
  });
  it('is empty with no notes', () => {
    expect(notesHtml([])).toBe('');
  });
});

describe('messagesHtml', () => {
  it('lists inbound messages with sender and text', () => {
    const html = messagesHtml([{ name: 'רון', phone: '0500000000', text: 'מזל טוב', at: '2026-08-10' }]);
    expect(html).toContain('msg-item');
    expect(html).toContain('רון');
    expect(html).toContain('מזל טוב');
  });
  it('falls back to phone when the name is missing', () => {
    const html = messagesHtml([{ name: '', phone: '0500000000', text: 'hi', at: null }]);
    expect(html).toContain('0500000000');
  });
  it('is empty with no messages', () => {
    expect(messagesHtml([])).toBe('');
  });
});

describe('passesCard', () => {
  const card = { status: 'yes', ride: true, note: false, s: 'dana 0501234567' };

  it('passes with no active filters', () => {
    expect(passesCard(card, { status: 'all', ride: false, note: false, q: '' })).toBe(true);
  });
  it('filters by status', () => {
    expect(passesCard(card, { status: 'no' })).toBe(false);
    expect(passesCard(card, { status: 'yes' })).toBe(true);
  });
  it('lets status-less orphan cards through any status filter', () => {
    expect(passesCard({ status: '', ride: false, note: false, s: '' }, { status: 'yes' })).toBe(true);
  });
  it('filters by ride and note flags', () => {
    expect(passesCard(card, { ride: true })).toBe(true);
    expect(passesCard(card, { note: true })).toBe(false);
  });
  it('filters by search text against the searchable string', () => {
    expect(passesCard(card, { q: 'dana' })).toBe(true);
    expect(passesCard(card, { q: 'zzz' })).toBe(false);
  });
});
