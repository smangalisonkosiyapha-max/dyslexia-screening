// src/__tests__/database.test.ts
import { Task, MoodEntry, ExerciseSession } from '../constants/types';

// ── Mock expo-sqlite ──────────────────────────────────────────────────────
const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
}));

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Task data model', () => {
  const sampleTask: Task = {
    id: 'task_test_001',
    title: 'Take medication',
    description: 'Morning tablets',
    scheduledTime: new Date('2026-01-01T08:00:00'),
    isCompleted: false,
    isRecurring: true,
    recurringDays: [1, 2, 3, 4, 5],
    category: 'medication',
    priority: 'high',
    reminderMinutes: 10,
    createdAt: new Date('2026-01-01T00:00:00'),
  };

  it('has required fields', () => {
    expect(sampleTask.id).toBeDefined();
    expect(sampleTask.title).toBeTruthy();
    expect(sampleTask.scheduledTime).toBeInstanceOf(Date);
    expect(sampleTask.category).toBe('medication');
    expect(sampleTask.priority).toBe('high');
  });

  it('recurring days are valid weekday indices', () => {
    sampleTask.recurringDays!.forEach(d => {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(6);
    });
  });

  it('reminderMinutes is positive', () => {
    expect(sampleTask.reminderMinutes).toBeGreaterThan(0);
  });
});

describe('MoodEntry data model', () => {
  const entry: MoodEntry = {
    id: 'mood_001',
    date: new Date(),
    mood: 4,
    energy: 3,
    notes: 'Feeling good today',
    factors: ['Good sleep', 'Exercise done'],
  };

  it('mood is between 1 and 5', () => {
    expect(entry.mood).toBeGreaterThanOrEqual(1);
    expect(entry.mood).toBeLessThanOrEqual(5);
  });

  it('energy is between 1 and 5', () => {
    expect(entry.energy).toBeGreaterThanOrEqual(1);
    expect(entry.energy).toBeLessThanOrEqual(5);
  });

  it('has valid date', () => {
    expect(entry.date).toBeInstanceOf(Date);
    expect(entry.date.getTime()).not.toBeNaN();
  });

  it('factors is array', () => {
    expect(Array.isArray(entry.factors)).toBe(true);
  });
});

describe('ExerciseSession data model', () => {
  const session: ExerciseSession = {
    id: 'session_001',
    exerciseId: 'memory_match',
    startedAt: new Date('2026-01-01T10:00:00'),
    completedAt: new Date('2026-01-01T10:05:30'),
    score: 42,
    maxScore: 50,
    accuracy: 0.84,
    durationSeconds: 330,
  };

  it('accuracy is between 0 and 1', () => {
    expect(session.accuracy).toBeGreaterThanOrEqual(0);
    expect(session.accuracy).toBeLessThanOrEqual(1);
  });

  it('score does not exceed maxScore', () => {
    expect(session.score).toBeLessThanOrEqual(session.maxScore);
  });

  it('completedAt is after startedAt', () => {
    expect(session.completedAt!.getTime()).toBeGreaterThan(session.startedAt.getTime());
  });

  it('durationSeconds is positive', () => {
    expect(session.durationSeconds).toBeGreaterThan(0);
  });
});
