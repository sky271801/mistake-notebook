import { describe, expect, it } from 'vitest';
import { firstReviewDate, getReviewPlan } from './review';

const baseDate = new Date('2026-06-23T09:00:00.000Z');

describe('review scheduling', () => {
  it('sets first review date from initial difficulty', () => {
    expect(firstReviewDate('hard', baseDate)).toContain('2026-06-24');
    expect(firstReviewDate('medium', baseDate)).toContain('2026-06-25');
    expect(firstReviewDate('easy', baseDate)).toContain('2026-06-27');
  });

  it('resets stage when the item is forgotten', () => {
    const plan = getReviewPlan(4, 'forgot', [1, 2, 4, 7, 15], baseDate);
    expect(plan.nextStage).toBe(0);
    expect(plan.nextReviewAt).toContain('2026-06-24');
  });

  it('moves stages according to review result', () => {
    expect(getReviewPlan(2, 'struggled', [1, 2, 4, 7, 15], baseDate).nextStage).toBe(1);
    expect(getReviewPlan(2, 'remembered', [1, 2, 4, 7, 15], baseDate).nextStage).toBe(3);
    expect(getReviewPlan(2, 'mastered', [1, 2, 4, 7, 15], baseDate).nextStage).toBe(4);
  });
});
