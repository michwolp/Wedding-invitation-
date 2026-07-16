import { describe, it, expect } from 'vitest';
import { buildGoogleCalendarUrl, buildIcsDataUrl } from '../src/calendar.js';

const testCal = {
  start: '20261016T133000Z',
  end: '20261016T205900Z',
  title: 'Test Wedding',
  location: 'Test Venue',
  details: 'Test details',
};

describe('buildGoogleCalendarUrl', () => {
  it('includes the action=TEMPLATE parameter', () => {
    const url = buildGoogleCalendarUrl(testCal);
    expect(url).toContain('action=TEMPLATE');
  });

  it('encodes the title', () => {
    const url = buildGoogleCalendarUrl(testCal);
    expect(url).toContain('text=Test%20Wedding');
  });

  it('includes start and end dates', () => {
    const url = buildGoogleCalendarUrl(testCal);
    expect(url).toContain('dates=20261016T133000Z/20261016T205900Z');
  });

  it('encodes the location', () => {
    const url = buildGoogleCalendarUrl(testCal);
    expect(url).toContain('location=Test%20Venue');
  });
});

describe('buildIcsDataUrl', () => {
  it('starts with data:text/calendar scheme', () => {
    const url = buildIcsDataUrl(testCal);
    expect(url).toMatch(/^data:text\/calendar;charset=utf-8,/);
  });

  it('contains VCALENDAR block', () => {
    const url = buildIcsDataUrl(testCal);
    const decoded = decodeURIComponent(url.replace('data:text/calendar;charset=utf-8,', ''));
    expect(decoded).toContain('BEGIN:VCALENDAR');
    expect(decoded).toContain('END:VCALENDAR');
  });

  it('contains VEVENT with correct dates', () => {
    const url = buildIcsDataUrl(testCal);
    const decoded = decodeURIComponent(url.replace('data:text/calendar;charset=utf-8,', ''));
    expect(decoded).toContain('DTSTART:20261016T133000Z');
    expect(decoded).toContain('DTEND:20261016T205900Z');
  });

  it('contains the title as SUMMARY', () => {
    const url = buildIcsDataUrl(testCal);
    const decoded = decodeURIComponent(url.replace('data:text/calendar;charset=utf-8,', ''));
    expect(decoded).toContain('SUMMARY:Test Wedding');
  });
});
