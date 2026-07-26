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
  describe('Hebrew', () => {
    it('greets a man: היקר', () => {
      expect(getGreeting('he', 'דן', 'm')).toBe('דן היקר 🤍');
    });
    it('greets a woman: היקרה', () => {
      expect(getGreeting('he', 'אופיר', 'f')).toBe('אופיר היקרה 🤍');
    });
    it('greets a group: היקרים', () => {
      expect(getGreeting('he', 'רוני וגיא', 'plural')).toBe('רוני וגיא היקרים 🤍');
    });
  });

  describe('English', () => {
    it('greets everyone with Dear (gender-neutral)', () => {
      expect(getGreeting('en', 'Dan', 'm')).toBe('Dear Dan 🤍');
      expect(getGreeting('en', 'Nikol', 'f')).toBe('Dear Nikol 🤍');
      expect(getGreeting('en', 'Nikol & Julian', 'plural')).toBe('Dear Nikol & Julian 🤍');
    });
  });

  describe('Russian', () => {
    it('greets a man: Дорогой', () => {
      expect(getGreeting('ru', 'Олешака', 'm')).toBe('Дорогой Олешака 🤍');
    });
    it('greets a woman: Дорогая', () => {
      expect(getGreeting('ru', 'Мамик', 'f')).toBe('Дорогая Мамик 🤍');
    });
    it('greets a group: Дорогие', () => {
      expect(getGreeting('ru', 'Olga', 'plural')).toBe('Дорогие Olga 🤍');
    });
  });

  it('defaults to plural when form is omitted', () => {
    expect(getGreeting('he', 'חברים')).toBe('חברים היקרים 🤍');
    expect(getGreeting('ru', 'семья')).toBe('Дорогие семья 🤍');
  });

  it('falls back to Hebrew for unknown language', () => {
    expect(getGreeting('jp', 'Test', 'f')).toBe('Test היקרה 🤍');
  });
});
