import type { Difficulty, ReviewResult } from '../types';
import { addDays } from './dates';

export const DEFAULT_REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60];

export const firstReviewDate = (difficulty: Difficulty, from = new Date()) => {
  const daysByDifficulty: Record<Difficulty, number> = {
    hard: 1,
    medium: 2,
    easy: 4
  };
  return addDays(from, daysByDifficulty[difficulty]).toISOString();
};

export const getReviewPlan = (
  currentStage: number,
  result: ReviewResult,
  intervals = DEFAULT_REVIEW_INTERVALS,
  from = new Date()
) => {
  const maxStage = intervals.length - 1;
  let nextStage = currentStage;
  let multiplier = 1;

  if (result === 'forgot') {
    nextStage = 0;
    multiplier = 1;
  }

  if (result === 'struggled') {
    nextStage = Math.max(0, currentStage - 1);
    multiplier = 0.75;
  }

  if (result === 'remembered') {
    nextStage = Math.min(maxStage, currentStage + 1);
  }

  if (result === 'mastered') {
    nextStage = Math.min(maxStage, currentStage + 2);
    multiplier = 1.3;
  }

  const baseDays = intervals[nextStage] ?? intervals[maxStage];
  const nextDays = Math.max(1, Math.round(baseDays * multiplier));

  return {
    nextStage,
    nextReviewAt: addDays(from, nextDays).toISOString()
  };
};

export const difficultyLabel: Record<Difficulty, string> = {
  hard: '困难',
  medium: '一般',
  easy: '简单'
};

export const reviewResultLabel: Record<ReviewResult, string> = {
  forgot: '忘了',
  struggled: '吃力',
  remembered: '记住',
  mastered: '很熟'
};
