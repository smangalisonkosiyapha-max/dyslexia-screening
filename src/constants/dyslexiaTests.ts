// src/constants/dyslexiaTests.ts
// Static item bank for the five dyslexia screening tests (see Test Design &
// Justification slide). Seeded into the test_items table on first launch so
// every attempt/response can be traced back to a specific item (per the ERD).
//
// These are prototype items for demonstrating the screening pipeline
// end-to-end — content, wording and difficulty have not been clinically
// validated. Swapping in a reviewed item bank later does not require any
// code changes, only new rows here.

import { DyslexiaTestType, TestItem } from './types';

export interface DyslexiaTestMeta {
  type: DyslexiaTestType;
  title: string;
  description: string;
  icon: string;
  color: 'primary' | 'secondary' | 'accent' | 'warning';
  durationMinutes: number;
}

export const DYSLEXIA_TESTS: DyslexiaTestMeta[] = [
  {
    type: 'reading',
    title: 'Reading & Decoding',
    description: 'Short passages and sound-based word questions that test reading fluency.',
    icon: '📖',
    color: 'primary',
    durationMinutes: 4,
  },
  {
    type: 'grammar',
    title: 'Grammar & Spelling',
    description: 'Spot the correct spelling and grammar to check phonological mapping.',
    icon: '✏️',
    color: 'secondary',
    durationMinutes: 3,
  },
  {
    type: 'memory',
    title: 'Working Memory',
    description: 'Briefly memorise a sequence, then recall it. Builds on working memory.',
    icon: '🧠',
    color: 'accent',
    durationMinutes: 3,
  },
  {
    type: 'scenario',
    title: 'Scenario Comprehension',
    description: 'Read a short scenario and answer a question about it under light time pressure.',
    icon: '🧩',
    color: 'primary',
    durationMinutes: 4,
  },
  {
    type: 'maths',
    title: 'Mathematics (comorbidity check)',
    description: 'Quick arithmetic — flags whether a separate dyscalculia referral may help.',
    icon: '🔢',
    color: 'warning',
    durationMinutes: 2,
  },
];

let n = 0;
const id = () => `item_${(++n).toString().padStart(3, '0')}`;

export const TEST_ITEMS: TestItem[] = [
  // ── Reading & Decoding (marker: decoding_fluency) ──────────────────────
  {
    id: id(), testType: 'reading', marker: 'decoding_fluency', orderIndex: 1,
    prompt: 'Which word rhymes with "light"?',
    options: ['Late', 'Sight', 'Lit', 'Lot'],
    correctAnswer: 'Sight',
  },
  {
    id: id(), testType: 'reading', marker: 'decoding_fluency', orderIndex: 2,
    prompt: 'Which word is spelled the way it sounds?',
    options: ['Knight', 'Cat', 'Though', 'Island'],
    correctAnswer: 'Cat',
  },
  {
    id: id(), testType: 'reading', marker: 'decoding_fluency', orderIndex: 3,
    prompt: '"The quick brown fox jumps." What is the action word (verb) in this sentence?',
    options: ['Quick', 'Fox', 'Jumps', 'Brown'],
    correctAnswer: 'Jumps',
  },
  {
    id: id(), testType: 'reading', marker: 'decoding_fluency', orderIndex: 4,
    prompt: 'Which word has the same beginning sound as "photo"?',
    options: ['Pot', 'Fish', 'Toy', 'Hot'],
    correctAnswer: 'Fish',
  },
  {
    id: id(), testType: 'reading', marker: 'decoding_fluency', orderIndex: 5,
    prompt: 'Which of these is NOT a real word?',
    options: ['Brample', 'Bramble', 'Umbrella', 'Table'],
    correctAnswer: 'Brample',
  },

  // ── Grammar & Spelling (marker: phonological_mapping) ──────────────────
  {
    id: id(), testType: 'grammar', marker: 'phonological_mapping', orderIndex: 1,
    prompt: 'Which spelling is correct?',
    options: ['Recieve', 'Receive', 'Receve', 'Receeve'],
    correctAnswer: 'Receive',
  },
  {
    id: id(), testType: 'grammar', marker: 'phonological_mapping', orderIndex: 2,
    prompt: 'Choose the correct sentence.',
    options: [
      'She dont like tea.',
      'She don\u2019t likes tea.',
      'She doesn\u2019t like tea.',
      'She doesn\u2019t likes tea.',
    ],
    correctAnswer: 'She doesn\u2019t like tea.',
  },
  {
    id: id(), testType: 'grammar', marker: 'phonological_mapping', orderIndex: 3,
    prompt: 'Which spelling is correct?',
    options: ['Definately', 'Definitly', 'Definitely', 'Deffinitely'],
    correctAnswer: 'Definitely',
  },
  {
    id: id(), testType: 'grammar', marker: 'phonological_mapping', orderIndex: 4,
    prompt: 'Which word correctly completes: "They ___ going to the shop."',
    options: ['is', 'are', 'be', 'was'],
    correctAnswer: 'are',
  },
  {
    id: id(), testType: 'grammar', marker: 'phonological_mapping', orderIndex: 5,
    prompt: 'Which spelling is correct?',
    options: ['Neccessary', 'Necessary', 'Neccesary', 'Necesary'],
    correctAnswer: 'Necessary',
  },

  // ── Working Memory (marker: working_memory) ─────────────────────────────
  // stimulus is shown for stimulusDisplayMs, then hidden before the question appears.
  {
    id: id(), testType: 'memory', marker: 'working_memory', orderIndex: 1,
    stimulus: '7 - 2 - 9 - 4', stimulusDisplayMs: 3500,
    prompt: 'What was the 2nd number in the sequence?',
    options: ['7', '2', '9', '4'],
    correctAnswer: '2',
  },
  {
    id: id(), testType: 'memory', marker: 'working_memory', orderIndex: 2,
    stimulus: 'CAT - BOAT - LAMP', stimulusDisplayMs: 3500,
    prompt: 'Which word came LAST?',
    options: ['CAT', 'BOAT', 'LAMP', 'None of these'],
    correctAnswer: 'LAMP',
  },
  {
    id: id(), testType: 'memory', marker: 'working_memory', orderIndex: 3,
    stimulus: '5 - 3 - 8 - 1 - 6', stimulusDisplayMs: 4000,
    prompt: 'How many numbers were in the sequence?',
    options: ['3', '4', '5', '6'],
    correctAnswer: '5',
  },
  {
    id: id(), testType: 'memory', marker: 'working_memory', orderIndex: 4,
    stimulus: 'RED - GREEN - BLUE', stimulusDisplayMs: 3000,
    prompt: 'Which colour came FIRST?',
    options: ['RED', 'GREEN', 'BLUE', 'None of these'],
    correctAnswer: 'RED',
  },
  {
    id: id(), testType: 'memory', marker: 'working_memory', orderIndex: 5,
    stimulus: '9 - 4 - 2 - 7', stimulusDisplayMs: 3500,
    prompt: 'What was the 3rd number in the sequence?',
    options: ['9', '4', '2', '7'],
    correctAnswer: '2',
  },

  // ── Scenario Comprehension (marker: applied_comprehension) ─────────────
  {
    id: id(), testType: 'scenario', marker: 'applied_comprehension', orderIndex: 1,
    prompt: 'Sipho has 3 lectures today. He finishes the first at 10am and the second starts 30 minutes later. What time does the second lecture start?',
    options: ['10:00am', '10:15am', '10:30am', '11:00am'],
    correctAnswer: '10:30am',
  },
  {
    id: id(), testType: 'scenario', marker: 'applied_comprehension', orderIndex: 2,
    prompt: 'A notice says: "Submit assignments by Friday, 2 days before the module ends on Sunday." If the module ends on a Sunday, which day is the deadline?',
    options: ['Wednesday', 'Thursday', 'Friday', 'Saturday'],
    correctAnswer: 'Friday',
  },
  {
    id: id(), testType: 'scenario', marker: 'applied_comprehension', orderIndex: 3,
    prompt: 'Thandi reads 4 pages every 10 minutes. At that pace, about how many pages will she read in 30 minutes?',
    options: ['8', '10', '12', '16'],
    correctAnswer: '12',
  },
  {
    id: id(), testType: 'scenario', marker: 'applied_comprehension', orderIndex: 4,
    prompt: 'A group project has 4 members and 8 tasks to split evenly. How many tasks does each member get?',
    options: ['1', '2', '4', '8'],
    correctAnswer: '2',
  },
  {
    id: id(), testType: 'scenario', marker: 'applied_comprehension', orderIndex: 5,
    prompt: 'The library closes at 8pm. It is currently 7:20pm. How many minutes are left until closing?',
    options: ['20', '30', '40', '60'],
    correctAnswer: '40',
  },

  // ── Mathematics / comorbidity check (marker: numeracy_comorbidity) ─────
  {
    id: id(), testType: 'maths', marker: 'numeracy_comorbidity', orderIndex: 1,
    prompt: '12 × 6 = ?',
    options: ['71', '72', '73', '74'],
    correctAnswer: '72',
  },
  {
    id: id(), testType: 'maths', marker: 'numeracy_comorbidity', orderIndex: 2,
    prompt: '45 + 28 = ?',
    options: ['63', '70', '73', '83'],
    correctAnswer: '73',
  },
  {
    id: id(), testType: 'maths', marker: 'numeracy_comorbidity', orderIndex: 3,
    prompt: '90 ÷ 5 = ?',
    options: ['15', '18', '20', '45'],
    correctAnswer: '18',
  },
  {
    id: id(), testType: 'maths', marker: 'numeracy_comorbidity', orderIndex: 4,
    prompt: '100 − 37 = ?',
    options: ['63', '67', '73', '77'],
    correctAnswer: '63',
  },
  {
    id: id(), testType: 'maths', marker: 'numeracy_comorbidity', orderIndex: 5,
    prompt: '8 × 7 = ?',
    options: ['48', '54', '56', '64'],
    correctAnswer: '56',
  },
];

export const getItemsForTest = (type: DyslexiaTestType): TestItem[] =>
  TEST_ITEMS.filter(i => i.testType === type).sort((a, b) => a.orderIndex - b.orderIndex);

export const RISK_BAND_INFO: Record<
  'low' | 'moderate' | 'high',
  { label: string; color: 'success' | 'warning' | 'danger'; description: string }
> = {
  low: {
    label: 'Low risk',
    color: 'success',
    description: 'No strong indicators found on this test. Keep practising to stay sharp.',
  },
  moderate: {
    label: 'Moderate risk',
    color: 'warning',
    description: 'Some patterns worth watching. Try the suggested practice and consider retaking later.',
  },
  high: {
    label: 'High risk',
    color: 'danger',
    description: 'Several strong indicators found. We\u2019d recommend speaking to the Disability Unit for a full assessment.',
  },
};
