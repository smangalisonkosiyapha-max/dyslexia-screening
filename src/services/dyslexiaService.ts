// src/services/dyslexiaService.ts
//
// Scoring and risk classification are deliberately rule-based, not ML —
// see the Development Baseline & Feasibility slides: the marking scheme
// needs to stay transparent and explainable. Gemini is only ever used for
// the remedial exercise text, never for scoring or risk classification.
//
// Risk thresholds below are prototype values informed by the literature
// reviewed, not yet clinically validated (flagged as an open risk in the
// Feasibility & Risk Analysis slide) — treat them as a starting point.

import { CognitiveMarker, MarkerBreakdown, RiskBand } from '../constants/types';
import { callGemini } from './aiService';

const RISK_THRESHOLDS = { low: 0.8, moderate: 0.5 } as const;

export const classifyRisk = (accuracy: number): RiskBand => {
  if (accuracy >= RISK_THRESHOLDS.low) return 'low';
  if (accuracy >= RISK_THRESHOLDS.moderate) return 'moderate';
  return 'high';
};

/** Picks the marker the student struggled with most, to target remediation. */
export const weakestMarker = (breakdown: MarkerBreakdown[]): MarkerBreakdown | null => {
  if (breakdown.length === 0) return null;
  return [...breakdown].sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
};

const MARKER_LABELS: Record<CognitiveMarker, string> = {
  decoding_fluency: 'reading decoding and fluency',
  phonological_mapping: 'spelling and phonological (sound-to-letter) mapping',
  working_memory: 'short-term working memory',
  applied_comprehension: 'applied reading comprehension',
  numeracy_comorbidity: 'basic numeracy',
};

const FALLBACK_EXERCISES: Record<CognitiveMarker, string> = {
  decoding_fluency:
    'Practice: read one short paragraph aloud each day, then reread it a second time faster. Notice which words slow you down and circle them.',
  phonological_mapping:
    'Practice: pick 5 tricky words, say each one aloud slowly by sound, then write it from memory. Check and repeat any you missed.',
  working_memory:
    'Practice: have someone read you a list of 4 random numbers. Repeat them back immediately, then try after a 5-second pause.',
  applied_comprehension:
    'Practice: read a short news snippet, then summarise it in one sentence without looking back at the text.',
  numeracy_comorbidity:
    'Practice: do 10 quick mental-maths sums (add/subtract two-digit numbers) with a timer, aiming to beat your time each day.',
};

/**
 * Generates a short, personalised remedial exercise for a weak marker.
 * Falls back to a static exercise if Gemini is unavailable — the assessment
 * result itself is always saved before this is ever called (see NFR8 and
 * the "Handle Exercise Generation Failure" use case).
 */
export const generateRemedialExercise = async (
  marker: CognitiveMarker,
  accuracy: number
): Promise<{ content: string; source: 'ai' | 'fallback' }> => {
  const system = `You are a supportive academic skills coach helping a university student who may have dyslexia.
Write ONE short, concrete practice exercise (under 60 words) targeting the specific skill named below.
Be encouraging, not clinical. Do not mention "dyslexia" or make any diagnosis. Give a specific, doable activity, not general advice.`;

  const user = `Skill to target: ${MARKER_LABELS[marker]}
Recent accuracy on this skill: ${Math.round(accuracy * 100)}%

Write the practice exercise now.`;

  try {
    const content = await callGemini(system, user);
    if (!content || !content.trim()) throw new Error('empty AI response');
    return { content: content.trim(), source: 'ai' };
  } catch (e) {
    console.warn('Remedial exercise generation failed, using fallback:', e);
    return { content: FALLBACK_EXERCISES[marker], source: 'fallback' };
  }
};
