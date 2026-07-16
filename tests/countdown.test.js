import { describe, it, expect } from 'vitest';
import { computeCountdown } from '../src/countdown.js';

describe('computeCountdown', () => {
  const target = new Date('2026-10-16T16:30:00+03:00').getTime();

  it('returns zeros when past the target', () => {
    const result = computeCountdown(target + 1000, target);
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it('returns zeros at exact target time', () => {
    const result = computeCountdown(target, target);
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it('computes exactly 1 day before', () => {
    const oneDayBefore = target - 86400000;
    const result = computeCountdown(oneDayBefore, target);
    expect(result).toEqual({ days: 1, hours: 0, minutes: 0, seconds: 0 });
  });

  it('computes a complex difference', () => {
    const diff = 2 * 86400000 + 5 * 3600000 + 30 * 60000 + 15 * 1000;
    const result = computeCountdown(target - diff, target);
    expect(result).toEqual({ days: 2, hours: 5, minutes: 30, seconds: 15 });
  });

  it('computes exactly 1 second before', () => {
    const result = computeCountdown(target - 1000, target);
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1 });
  });

  it('handles large differences', () => {
    const hundredDays = target - 100 * 86400000;
    const result = computeCountdown(hundredDays, target);
    expect(result.days).toBe(100);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
  });
});
