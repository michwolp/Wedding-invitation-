import { describe, it, expect } from 'vitest';
import { getMessage, getErrorMessage, getGreeting } from '../src/i18n.js';

describe('getMessage', () => {
  it('returns Hebrew message by default', () => {
    expect(getMessage('he', 'sending')).toBe('שולחים…');
  });

  it('returns English message', () => {
    expect(getMessage('en', 'sending')).toBe('Sending…');
  });

  it('returns Russian message', () => {
    expect(getMessage('ru', 'sending')).toBe('Отправляем…');
  });

  it('uses singular male form in Hebrew', () => {
    expect(getMessage('he', 'okYes', 'm')).toBe('התקבל! מחכים לראות אותך 🤍');
  });

  it('uses singular female form in Hebrew', () => {
    expect(getMessage('he', 'okNo', 'f')).toBe('התקבל, תודה שעדכנת 🤍');
  });

  it('ignores gender for non-Hebrew languages', () => {
    expect(getMessage('en', 'okYes', 'f')).toBe("Got it! Can't wait to see you 🤍");
  });

  it('does not apply singular for plural form', () => {
    expect(getMessage('he', 'okYes', 'plural')).toBe('התקבל! מחכים לראות אתכם 🤍');
  });

  it('falls back to Hebrew for unknown language', () => {
    expect(getMessage('jp', 'sending')).toBe('שולחים…');
  });
});

describe('getErrorMessage', () => {
  it('maps known error codes', () => {
    expect(getErrorMessage('en', 'missing name')).toBe('Name is missing or too short');
  });

  it('returns generic message for unknown error code', () => {
    expect(getErrorMessage('en', 'unknown')).toBe('Something went wrong — please try again in a moment');
  });

  it('returns Hebrew for unknown language', () => {
    expect(getErrorMessage('jp', 'missing name')).toBe('שם חסר או קצר מדי — בדקו את שם המלא');
  });

  it('handles empty string error code', () => {
    expect(getErrorMessage('he', '')).toBe('משהו השתבש בשליחה — נסו שוב עוד רגע');
  });
});

describe('getGreeting', () => {
  it('returns Hebrew greeting', () => {
    expect(getGreeting('he', 'אופיר')).toBe('שלום אופיר 🤍');
  });

  it('returns English greeting', () => {
    expect(getGreeting('en', 'Nikol')).toBe('Hello Nikol 🤍');
  });

  it('returns Russian greeting', () => {
    expect(getGreeting('ru', 'Мамик')).toBe('Привет, Мамик 🤍');
  });

  it('falls back to Hebrew for unknown language', () => {
    expect(getGreeting('jp', 'Test')).toBe('שלום Test 🤍');
  });
});
