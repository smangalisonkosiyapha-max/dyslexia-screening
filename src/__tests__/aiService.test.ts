// src/__tests__/aiService.test.ts
import { buildInsightObject } from '../services/aiService';
import { AIInsight } from '../constants/types';

// Mock fetch for API calls
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    content: [{ type: 'text', text: 'You are doing great! Keep up the good work.' }],
  }),
}) as any;

describe('buildInsightObject', () => {
  it('creates an AIInsight with correct structure', () => {
    const msg = 'Try to exercise at 10am when your energy is highest.';
    const insight = buildInsightObject(msg, 'suggestion');

    expect(insight.id).toBeDefined();
    expect(insight.id).toMatch(/^insight_/);
    expect(insight.message).toBe(msg);
    expect(insight.type).toBe('suggestion');
    expect(insight.dismissed).toBe(false);
    expect(insight.generatedAt).toBeInstanceOf(Date);
  });

  it('generates unique IDs for each call', () => {
    const a = buildInsightObject('msg a', 'reminder');
    const b = buildInsightObject('msg b', 'reminder');
    expect(a.id).not.toBe(b.id);
  });

  it('supports all insight types', () => {
    const types: AIInsight['type'][] = ['reminder', 'suggestion', 'encouragement', 'pattern', 'alert'];
    types.forEach(type => {
      const i = buildInsightObject('test', type);
      expect(i.type).toBe(type);
    });
  });

  it('sets generatedAt close to now', () => {
    const before = Date.now();
    const insight = buildInsightObject('test', 'alert');
    const after = Date.now();
    expect(insight.generatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(insight.generatedAt.getTime()).toBeLessThanOrEqual(after);
  });
});

describe('Progress calculation helpers', () => {
  const mockSessions = [
    { accuracy: 0.9, score: 45, maxScore: 50 },
    { accuracy: 0.75, score: 38, maxScore: 50 },
    { accuracy: 0.85, score: 42, maxScore: 50 },
  ];

  it('calculates average accuracy correctly', () => {
    const avg = mockSessions.reduce((a, s) => a + s.accuracy, 0) / mockSessions.length;
    expect(avg).toBeCloseTo(0.8333, 3);
  });

  it('calculates total score correctly', () => {
    const total = mockSessions.reduce((a, s) => a + s.score, 0);
    expect(total).toBe(125);
  });

  it('accuracy clamped between 0 and 1', () => {
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    expect(clamp(-0.5)).toBe(0);
    expect(clamp(1.5)).toBe(1);
    expect(clamp(0.75)).toBe(0.75);
  });
});

describe('Streak calculation', () => {
  it('counts consecutive days correctly', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);

    const dates = [now, yesterday, twoDaysAgo];
    // Simple streak: count how many days in a row there is an entry
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      const diff = Math.round((now.getTime() - dates[i].getTime()) / 86400000);
      if (diff === i) streak++;
      else break;
    }
    expect(streak).toBe(3);
  });

  it('streak resets on missed day', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);

    // Gap on day 1 — streak should be 1 (only today)
    const dates = [now, twoDaysAgo];
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      const diff = Math.round((now.getTime() - dates[i].getTime()) / 86400000);
      if (diff === i) streak++;
      else break;
    }
    expect(streak).toBe(1);
  });
});
