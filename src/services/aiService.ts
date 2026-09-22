// src/services/aiService.ts
import { Task, MoodEntry, ExerciseSession, AIInsight, ProgressStats } from '../constants/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// NOTE: In production, store your API key securely via environment variables
// and proxy through your backend. Never hardcode keys in a shipped app.
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY ?? 'YOUR_GEMINI_API_KEY_HERE';

interface AIContext {
  userName: string;
  recentTasks: Task[];
  moodEntries: MoodEntry[];
  exerciseSessions: ExerciseSession[];
  stats: Partial<ProgressStats>;
}

export const callGemini = async (systemPrompt: string, userMessage: string): Promise<string> => {
  const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userMessage}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
};

export const generatePersonalizedReminder = async (ctx: AIContext): Promise<string> => {
  const system = `You are a compassionate cognitive assistant for people with cognitive disabilities.
You provide short, clear, encouraging reminders. Keep responses under 60 words.
Use simple language. Be warm and supportive. Never be condescending.`;

  const pendingTasks = ctx.recentTasks.filter(t => !t.isCompleted).slice(0, 3);
  const avgMood = ctx.moodEntries.length
    ? (ctx.moodEntries.reduce((a, m) => a + m.mood, 0) / ctx.moodEntries.length).toFixed(1)
    : null;

  const user = `User: ${ctx.userName}
Pending tasks: ${pendingTasks.map(t => t.title).join(', ') || 'none'}
Recent average mood: ${avgMood ?? 'unknown'}/5
Completed tasks today: ${ctx.recentTasks.filter(t => t.isCompleted).length}

Generate an encouraging, personalised reminder for their day.`;

  return callGemini(system, user);
};

export const generateCognitiveInsights = async (ctx: AIContext): Promise<string> => {
  const system = `You are a cognitive wellness AI coach for people with cognitive disabilities.
Analyse the user's exercise performance data and provide 1-2 specific, actionable suggestions.
Keep response under 80 words. Use simple, clear language. Be encouraging.`;

  const recent = ctx.exerciseSessions.slice(0, 10);
  const avgAccuracy = recent.length
    ? (recent.reduce((a, s) => a + s.accuracy, 0) / recent.length * 100).toFixed(0)
    : null;
  const streak = ctx.stats.streakDays ?? 0;

  const user = `Recent exercise sessions: ${recent.length}
Average accuracy: ${avgAccuracy ?? 'N/A'}%
Current streak: ${streak} days
Task completion rate: ${ctx.stats.weeklyAccuracy ?? 'N/A'}%

Provide cognitive performance feedback and suggestions.`;

  return callGemini(system, user);
};

export const detectBehaviouralPatterns = async (ctx: AIContext): Promise<string | null> => {
  const system = `You are a cognitive wellness monitor. Detect any concerning patterns in the user data.
If everything looks fine, respond with exactly: "OK"
If you detect a concerning pattern (missed tasks 3+ days, mood declining, no exercise), write a brief alert under 50 words.
Use gentle, non-alarming language.`;

  const last7Moods = ctx.moodEntries.slice(0, 7).map(m => m.mood);
  const missedTasks = ctx.recentTasks.filter(
    t => !t.isCompleted && new Date(t.scheduledTime) < new Date()
  ).length;

  const user = `Last 7 mood scores: ${last7Moods.join(', ') || 'no data'}
Overdue tasks: ${missedTasks}
Exercise sessions this week: ${ctx.exerciseSessions.filter(s => {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    return new Date(s.startedAt) > weekAgo;
  }).length}

Analyse for concerning patterns.`;

  const result = await callGemini(system, user);
  return result.trim() === 'OK' ? null : result;
};

export const generateMotivationalMessage = async (
  userName: string,
  completedCount: number,
  totalCount: number,
  streak: number
): Promise<string> => {
  const system = `You are an encouraging cognitive wellness companion.
Write a warm, brief motivational message (under 40 words).
Celebrate even small wins. Be specific, not generic.`;

  const user = `User: ${userName}
Tasks completed today: ${completedCount}/${totalCount}
Current streak: ${streak} days

Write an encouraging message about their progress.`;

  return callGemini(system, user);
};

export const suggestOptimalTaskTimes = async (moodEntries: MoodEntry[]): Promise<string> => {
  const system = `You are a cognitive scheduling assistant.
Based on mood and energy patterns, suggest the best times of day for different types of tasks.
Keep response under 60 words. Give 2-3 specific time recommendations.`;

  const patterns = moodEntries.slice(0, 14).map(m => ({
    time: new Date(m.date).getHours(),
    mood: m.mood,
    energy: m.energy,
  }));

  const user = `Mood/energy data points: ${JSON.stringify(patterns)}
Suggest optimal scheduling times for: medication, cognitive exercises, and social tasks.`;

  return callGemini(system, user);
};

export const buildInsightObject = (message: string, type: AIInsight['type']): AIInsight => ({
  id: `insight_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type,
  message,
  generatedAt: new Date(),
  dismissed: false,
});
