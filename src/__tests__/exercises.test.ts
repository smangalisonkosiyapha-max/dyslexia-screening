// src/__tests__/exercises.test.ts
import { EXERCISES, CATEGORY_INFO, MOOD_LABELS } from '../constants/exercises';
import { Colors, Spacing, Radii } from '../constants/theme';

describe('Exercise definitions', () => {
  it('all exercises have required fields', () => {
    EXERCISES.forEach(ex => {
      expect(ex.id).toBeDefined();
      expect(ex.title).toBeTruthy();
      expect(ex.description).toBeTruthy();
      expect(['memory', 'attention', 'language', 'math', 'pattern', 'sequencing']).toContain(ex.type);
      expect(['easy', 'medium', 'hard']).toContain(ex.difficulty);
      expect(ex.durationMinutes).toBeGreaterThan(0);
      expect(ex.points).toBeGreaterThan(0);
      expect(ex.icon).toBeTruthy();
    });
  });

  it('exercise IDs are unique', () => {
    const ids = EXERCISES.map(e => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all difficulties are represented', () => {
    const diffs = new Set(EXERCISES.map(e => e.difficulty));
    expect(diffs.has('easy')).toBe(true);
    expect(diffs.has('medium')).toBe(true);
    expect(diffs.has('hard')).toBe(true);
  });
});

describe('Category info', () => {
  const expectedCategories = ['medication', 'appointment', 'exercise', 'meal', 'hygiene', 'social', 'therapy', 'other'];

  it('all required categories exist', () => {
    expectedCategories.forEach(cat => {
      expect(CATEGORY_INFO).toHaveProperty(cat);
    });
  });

  it('each category has label, icon, and color', () => {
    Object.values(CATEGORY_INFO).forEach(info => {
      expect(info.label).toBeTruthy();
      expect(info.icon).toBeTruthy();
      expect(info.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('Mood labels', () => {
  it('all 5 mood levels are defined', () => {
    [1, 2, 3, 4, 5].forEach(m => {
      expect(MOOD_LABELS).toHaveProperty(String(m));
      expect(MOOD_LABELS[m].label).toBeTruthy();
      expect(MOOD_LABELS[m].emoji).toBeTruthy();
      expect(MOOD_LABELS[m].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('mood labels are ordered from negative to positive', () => {
    expect(MOOD_LABELS[1].label).toBe('Very Low');
    expect(MOOD_LABELS[5].label).toBe('Excellent');
  });
});

describe('Theme constants', () => {
  it('Colors has required keys', () => {
    expect(Colors.primary).toBeDefined();
    expect(Colors.background).toBeDefined();
    expect(Colors.text).toBeDefined();
    expect(Colors.surface).toBeDefined();
  });

  it('all Color values are valid hex', () => {
    Object.entries(Colors).forEach(([key, val]) => {
      if (typeof val === 'string' && val.startsWith('#')) {
        expect(val).toMatch(/^#[0-9A-Fa-f]{3,8}$/, `Color ${key} is invalid`);
      }
    });
  });

  it('Spacing values are positive numbers', () => {
    Object.values(Spacing).forEach(v => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    });
  });

  it('Radii values are non-negative numbers', () => {
    Object.values(Radii).forEach(v => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
    });
  });
});
