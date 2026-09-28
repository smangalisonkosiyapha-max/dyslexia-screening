// src/services/aiService.ts
import { TestAttempt, AIInsight, RiskBand } from '../constants/types';
import { DYSLEXIA_TESTS, RISK_BAND_INFO } from '../constants/dyslexiaTests';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// NOTE: In production, store your API key securely via environment variables
// and proxy through your backend. Never hardcode keys in a shipped app.
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY ?? 'YOUR_GEMINI_API_KEY_HERE';

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

interface ScreeningContext {
  userName: string;
  recentAttempts: TestAttempt[]; // newest first
  remainingTestCount: number;
}

const FALLBACK_MESSAGES: Record<'none' | 'in-progress' | 'complete' | RiskBand, string> = {
  none: "Ready when you are — each screening test takes just a few minutes, and there's no wrong way to start.",
  'in-progress': "You're making steady progress. Finishing the remaining tests will give you the fullest picture.",
  complete: "You've completed every screening test — nice work seeing that through. Check Progress any time for the full picture.",
  low: 'Your results so far are trending positive. Keep going, and check back in after a bit of practice.',
  moderate: "Some patterns are worth keeping an eye on. The suggested practice exercise is a good place to start.",
  high: "It's worth reaching out to your institution's Disability Unit to talk through a full assessment — you can find contact details in your Profile.",
};

/**
 * A short, warm, personalised message for the Home screen based on the
 * student's actual screening progress — not a generic time-of-day greeting.
 * Falls back to a safe static message if Gemini is unavailable, so the
 * Home screen never breaks or shows nothing.
 */
export const generateScreeningEncouragement = async (ctx: ScreeningContext): Promise<string> => {
  const latest = ctx.recentAttempts[0];
  const fallbackKey: keyof typeof FALLBACK_MESSAGES =
    ctx.recentAttempts.length === 0
      ? 'none'
      : ctx.remainingTestCount > 0
        ? 'in-progress'
        : latest?.riskBand ?? 'complete';

  try {
    const system = `You are a warm, encouraging academic support assistant for a university dyslexia screening app.
Write ONE short message (under 35 words) for the student's home screen, based on their actual progress below.
Be specific to their situation, never generic. Do not diagnose or use clinical language. Do not mention the time of day.
If risk band is "high", gently suggest they reach out to their institution's Disability Unit (details are in their Profile).`;

    const testTitle = latest ? DYSLEXIA_TESTS.find(t => t.type === latest.testType)?.title : null;

    const user = `Student name: ${ctx.userName}
Tests completed: ${ctx.recentAttempts.length}
Tests remaining: ${ctx.remainingTestCount}
Most recent test: ${testTitle ?? 'none yet'}
Most recent accuracy: ${latest ? Math.round(latest.accuracy * 100) + '%' : 'n/a'}
Most recent risk band: ${latest?.riskBand ?? 'n/a'}

Write the home screen message now.`;

    const content = await callGemini(system, user);
    if (!content || !content.trim()) throw new Error('empty AI response');
    return content.trim();
  } catch (e) {
    console.warn('generateScreeningEncouragement failed, using fallback:', e);
    return FALLBACK_MESSAGES[fallbackKey];
  }
};

export const buildInsightObject = (message: string, type: AIInsight['type']): AIInsight => ({
  id: `insight_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type,
  message,
  generatedAt: new Date(),
  dismissed: false,
});
