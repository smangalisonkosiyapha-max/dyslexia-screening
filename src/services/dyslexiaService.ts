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

// Two alternate 3-step programs per marker — each step names CONCRETE words
// or numbers to use, not just an abstract instruction, so a student never
// has to guess what "tricky words" or "random numbers" actually means for
// them. Two variants per marker exist so that even the offline fallback
// (used whenever Gemini is unreachable) doesn't show the identical program
// every time a student regenerates.
const FALLBACK_PROGRAM_VARIANTS: Record<CognitiveMarker, string[][]> = {
  decoding_fluency: [
    [
      'Read this sentence aloud once: "The chemistry laboratory required careful measurement of each ingredient." Circle any word that slowed you down.',
      'Reread that same sentence a second time, aiming to read it smoother and faster than your first try.',
      'Now read this longer one aloud, timing yourself: "Despite the unfamiliar vocabulary, the determined researcher persevered through the complicated instructions." Try to match your earlier pace.',
    ],
    [
      'Read this sentence aloud once: "The government announced significant changes to the university curriculum this semester." Circle any word that slowed you down.',
      'Reread that same sentence again, this time smoother and a little faster.',
      'Now read this one aloud, timing yourself: "Although the negotiations were initially unsuccessful, both parties eventually reached a satisfactory agreement." Try to beat your earlier pace.',
    ],
  ],
  phonological_mapping: [
    [
      'Say each of these words aloud slowly, sound by sound, then write it from memory: "definitely", "separate", "necessary".',
      'Cover those 3 words, add "rhythm" and "occasionally", then write all 5 from memory. Check and correct any mistakes.',
      'Without looking anything up, spell these 5 from memory first, then check: "conscience", "embarrass", "privilege", "parallel", "recommend". Aim for at least 3 correct.',
    ],
    [
      'Say each of these words aloud slowly, sound by sound, then write it from memory: "February", "restaurant", "vehicle".',
      'Cover those 3 words, add "temperature" and "beautiful", then write all 5 from memory. Check and correct any mistakes.',
      'Without looking anything up, spell these 5 from memory first, then check: "achieve", "colleague", "guarantee", "questionnaire", "surprise". Aim for at least 3 correct.',
    ],
  ],
  working_memory: [
    [
      'Have someone read you these 3 numbers, then repeat them back immediately: 7, 2, 9.',
      'Same idea with 4 numbers — 5, 8, 1, 6 — but wait 5 seconds before repeating them back.',
      'Try these 5 numbers — 3, 9, 4, 7, 2 — with a 10-second pause first. Try grouping them (e.g. "39, 47, 2") to help.',
    ],
    [
      'Have someone read you these 3 numbers, then repeat them back immediately: 4, 6, 1.',
      'Same idea with 4 numbers — 2, 9, 5, 3 — but wait 5 seconds before repeating them back.',
      'Try these 5 numbers — 8, 1, 6, 4, 9 — with a 10-second pause first. Try grouping them (e.g. "81, 64, 9") to help.',
    ],
  ],
  applied_comprehension: [
    [
      'Read this: "The university library will extend its opening hours during the exam period to support student revision." Summarise it in one sentence without looking back.',
      'Read this paragraph: "Researchers found that students who took short breaks during study sessions retained more information than those who studied continuously for long periods without pausing." Explain the main point out loud in your own words.',
      'Read both: (1) "The council approved funding for a new campus health centre." (2) "Student wellbeing services have seen rising demand this year." Explain in 2-3 sentences how they connect.',
    ],
    [
      'Read this: "Local businesses near campus are offering student discounts to encourage foot traffic during the week." Summarise it in one sentence without looking back.',
      'Read this paragraph: "A recent study showed that students who reviewed lecture notes within 24 hours remembered significantly more than those who waited a week before reviewing." Explain the main point out loud in your own words.',
      'Read both: (1) "The Disability Unit expanded its support team this year." (2) "More students are registering for academic accommodations than ever before." Explain in 2-3 sentences how they connect.',
    ],
  ],
  numeracy_comorbidity: [
    [
      'Time yourself doing these 5 sums, no pressure — just get a baseline: 24+19, 37-15, 46+28, 52-17, 33+29.',
      'Do these 10 sums, aiming to beat your baseline time: 18+27, 44-16, 39+21, 63-28, 17+35, 48-19, 26+37, 55-23, 19+42, 61-34.',
      'Do these, mixing in one multiplication, for speed and accuracy: 23+18, 47-19, 6\u00d77, 31+26, 52-24, 9\u00d74, 38+17, 45-16, 7\u00d76, 29+33.',
    ],
    [
      'Time yourself doing these 5 sums, no pressure — just get a baseline: 31+16, 42-18, 27+35, 58-24, 19+37.',
      'Do these 10 sums, aiming to beat your baseline time: 22+34, 51-19, 16+28, 47-15, 33+26, 62-37, 14+29, 53-18, 25+41, 36-17.',
      'Do these, mixing in one multiplication, for speed and accuracy: 27+15, 41-23, 8\u00d76, 34+19, 56-28, 5\u00d79, 22+37, 49-16, 4\u00d78, 31+24.',
    ],
  ],
};

let fallbackVariantCounter = 0;

/**
 * Generates a 3-step progressive practice program for a weak marker (easy →
 * hardest), with concrete example words/numbers in every step so the
 * student never has to guess what to actually use. Falls back to a static
 * 3-step program if Gemini is unavailable or returns something unparsable —
 * the assessment result itself is always saved before this is ever called
 * (see NFR8 and the "Handle Exercise Generation Failure" use case).
 *
 * Parsing note: earlier versions asked Gemini for strict JSON, which failed
 * to parse often enough that the app was silently falling back on every
 * single call. Plain "STEP 1: ... / STEP 2: ... / STEP 3: ..." lines are far
 * more reliably produced by the model and far more forgiving to parse than
 * JSON with quoting/escaping edge cases.
 */
export const generateRemedialProgram = async (
  marker: CognitiveMarker,
  accuracy: number
): Promise<{ content: string; source: 'ai' | 'fallback' }[]> => {
  const system = `You are a supportive academic skills coach helping a university student who may have dyslexia.
Write a 3-STEP practice program targeting the specific skill named below. Step 1 is the easiest, step 3 the hardest — each should build on the one before it.
CRITICAL: every step MUST include concrete, specific example content (actual words to spell, actual numbers to use, an actual sentence to read) — never a vague instruction like "pick some words" or "use some numbers" that leaves the student unsure what to do.
Be encouraging, not clinical. Do not mention "dyslexia" or make any diagnosis. Each step under 40 words.
Respond with EXACTLY 3 lines and nothing else — no intro, no markdown, no numbering other than what's shown:
STEP 1: <text>
STEP 2: <text>
STEP 3: <text>`;

  const user = `Skill to target: ${MARKER_LABELS[marker]}
Recent accuracy on this skill: ${Math.round(accuracy * 100)}%

Write the 3 lines now.`;

  try {
    const raw = await callGemini(system, user);
    const steps = parseStepLines(raw);
    if (steps.length !== 3) {
      console.warn('Remedial program: unexpected AI response shape, raw output was:', raw);
      throw new Error('unexpected AI response shape');
    }
    return steps.map(content => ({ content, source: 'ai' as const }));
  } catch (e) {
    console.warn('Remedial program generation failed, using fallback:', e);
    const variants = FALLBACK_PROGRAM_VARIANTS[marker];
    const variant = variants[fallbackVariantCounter % variants.length];
    fallbackVariantCounter++;
    return variant.map(content => ({ content, source: 'fallback' as const }));
  }
};

/**
 * Pulls 3 "STEP n: ..." lines out of a raw AI response. Deliberately
 * forgiving: tolerates markdown bullets/bold, extra blank lines, and
 * "Step 1 -" or "Step 1)" instead of "STEP 1:", since small formatting
 * drift from the model shouldn't force a fallback.
 */
const parseStepLines = (raw: string): string[] => {
  const lines = raw
    .split('\n')
    .map(l => l.trim().replace(/\*\*/g, '')) // strip markdown bold, which otherwise leaks into the captured text
    .filter(Boolean);

  const steps: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const re = new RegExp(`^[*\\-\\s]*step\\s*${i}\\s*[:.\\-)]\\s*(.+)$`, 'i');
    const line = lines.find(l => re.test(l));
    const match = line?.match(re);
    if (match?.[1]) steps.push(match[1].trim());
  }
  return steps;
};

/** @deprecated superseded by generateRemedialProgram — kept only in case older code paths reference it. */
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
