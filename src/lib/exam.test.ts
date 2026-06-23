import { describe, expect, it } from 'vitest';
import { getDefaultExamYear, getGaokaoCountdown } from './exam';

describe('gaokao countdown', () => {
  it('uses current year before June 7 09:00', () => {
    expect(getDefaultExamYear(new Date(2027, 5, 7, 8, 59))).toBe(2027);
  });

  it('uses next year after the exam start', () => {
    expect(getDefaultExamYear(new Date(2026, 5, 23))).toBe(2027);
  });

  it('counts down to June 7 09:00', () => {
    const countdown = getGaokaoCountdown(2027, new Date(2027, 5, 6, 9, 30));
    expect(countdown.days).toBe(0);
    expect(countdown.hours).toBe(23);
    expect(countdown.minutes).toBe(30);
  });
});
