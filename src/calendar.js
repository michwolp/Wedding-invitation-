import { CALENDAR } from './constants.js';

export function buildGoogleCalendarUrl(cal = CALENDAR) {
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(cal.title) +
    '&dates=' + cal.start + '/' + cal.end +
    '&location=' + encodeURIComponent(cal.location) +
    '&details=' + encodeURIComponent(cal.details)
  );
}

export function buildIcsDataUrl(cal = CALENDAR) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//michal-dvir//wedding//HE',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:michal-dvir-2026@wedding',
    'DTSTAMP:' + cal.start,
    'DTSTART:' + cal.start,
    'DTEND:' + cal.end,
    'SUMMARY:' + cal.title,
    'LOCATION:' + cal.location,
    'DESCRIPTION:' + cal.details,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
}

export function initCalendarLinks(document) {
  const google = document.getElementById('calGoogle');
  if (google) google.href = buildGoogleCalendarUrl();

  const ics = document.getElementById('calIcs');
  if (ics) ics.href = buildIcsDataUrl();
}
