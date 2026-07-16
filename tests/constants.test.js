import { describe, it, expect } from 'vitest';
import { WEDDING_DATE_MS, VENUE, BIT_LINKS, CALENDAR } from '../src/constants.js';

describe('constants', () => {
  it('WEDDING_DATE_MS is a valid timestamp in October 2026', () => {
    const date = new Date(WEDDING_DATE_MS);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9); // October is 0-indexed
    expect(date.getDate()).toBe(16);
  });

  it('VENUE has required fields', () => {
    expect(VENUE.name).toBeDefined();
    expect(VENUE.city).toBe('כרמי יוסף');
    expect(VENUE.date).toBe('16.10.26');
    expect(VENUE.wazeUrl).toContain('waze.com');
    expect(VENUE.mapsUrl).toContain('maps.google.com');
  });

  it('BIT_LINKS has at least one URL', () => {
    expect(BIT_LINKS.length).toBeGreaterThan(0);
    BIT_LINKS.forEach(link => {
      expect(link).toContain('bitpay.co.il');
    });
  });

  it('CALENDAR has valid ICS timestamps', () => {
    expect(CALENDAR.start).toMatch(/^\d{8}T\d{6}Z$/);
    expect(CALENDAR.end).toMatch(/^\d{8}T\d{6}Z$/);
    expect(CALENDAR.title).toBeDefined();
    expect(CALENDAR.location).toBeDefined();
  });
});
