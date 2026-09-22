// src/screens/ExercisesScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { Colors, Fonts, Spacing, Radii, Shadows } from '../constants/theme';
import { SCROLL_BOTTOM_PADDING } from '../constants/layout';
import { CognitiveExercise, ExerciseSession } from '../constants/types';
import { EXERCISES } from '../constants/exercises';
import { Card, SectionHeader, Button, ProgressBar, StatCard } from '../components/UIComponents';
import { insertExerciseSession, getExerciseSessions } from '../services/database';
import { generateCognitiveInsights } from '../services/aiService';

const ExercisesScreen: React.FC = () => {
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [activeExercise, setActiveExercise] = useState<CognitiveExercise | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [aiInsight, setAiInsight] = useState('');
  const [weeklyScore, setWeeklyScore] = useState(0);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const s = await getExerciseSessions(7);
    setSessions(s);
    const total = s.reduce((a, x) => a + x.score, 0);
    setWeeklyScore(total);

    const insight = await generateCognitiveInsights({
      userName: 'User',
      recentTasks: [],
      moodEntries: [],
      exerciseSessions: s,
      stats: { totalExercisesCompleted: s.length },
    }).catch(() => '');
    setAiInsight(insight);
  };

  const startExercise = (ex: CognitiveExercise) => {
    setActiveExercise(ex);
    setGameState('playing');
    Speech.speak(`Starting ${ex.title}. ${ex.description}`, { rate: 0.85, pitch: 1.0 });
  };

  const onExerciseComplete = async (session: Omit<ExerciseSession, 'id'>) => {
    const full: ExerciseSession = {
      ...session,
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    await insertExerciseSession(full);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGameState('finished');
    loadSessions();
  };

  const difficultyColor = { easy: Colors.success, medium: Colors.warning, hard: Colors.danger };
  const completedIds = new Set(sessions.map(s => s.exerciseId));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Brain Exercises</Text>
          <Text style={styles.subtitle}>Strengthen your mind daily</Text>
        </View>

        {/* Weekly Stats */}
        <View style={styles.statsRow}>
          <StatCard
            label="This Week"
            value={sessions.length}
            icon="🏋️"
            color={Colors.primary}
            subtitle="sessions"
          />
          <StatCard
            label="Total Points"
            value={weeklyScore}
            icon="⭐"
            color={Colors.warning}
            subtitle="earned"
          />
          <StatCard
            label="Avg Accuracy"
            value={
              sessions.length
                ? `${Math.round((sessions.reduce((a, s) => a + s.accuracy, 0) / sessions.length) * 100)}%`
                : '—'
            }
            icon="🎯"
            color={Colors.accent}
          />
        </View>

        {/* AI Insight */}
        {aiInsight ? (
          <Card style={styles.insightCard}>
            <Text style={styles.insightLabel}>🧠 AI Performance Insight</Text>
            <Text style={styles.insightText}>{aiInsight}</Text>
          </Card>
        ) : null}

        {/* Exercise List */}
        <SectionHeader title="Choose an Exercise" subtitle="Tap to start" />

        {EXERCISES.map(ex => (
          <TouchableOpacity
            key={ex.id}
            style={styles.exerciseCard}
            onPress={() => startExercise(ex)}
            activeOpacity={0.85}
          >
            <View style={styles.exIcon}>
              <Text style={{ fontSize: 28 }}>{ex.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.exTitleRow}>
                <Text style={styles.exTitle}>{ex.title}</Text>
                {completedIds.has(ex.id) && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                )}
              </View>
              <Text style={styles.exDesc}>{ex.description}</Text>
              <View style={styles.exMeta}>
                <View
                  style={[
                    styles.diffBadge,
                    { backgroundColor: difficultyColor[ex.difficulty] + '20' },
                  ]}
                >
                  <Text style={[styles.diffText, { color: difficultyColor[ex.difficulty] }]}>
                    {ex.difficulty}
                  </Text>
                </View>
                <Text style={styles.exTime}>⏱ {ex.durationMinutes} min</Text>
                <Text style={styles.exPoints}>⭐ {ex.points} pts</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exercise Modal */}
      <Modal visible={!!activeExercise && gameState !== 'idle'} animationType="slide">
        {activeExercise && (
          <ExerciseGame
            exercise={activeExercise}
            onComplete={onExerciseComplete}
            onClose={() => {
              setActiveExercise(null);
              setGameState('idle');
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
};

// ── Memory Match Game ─────────────────────────────────────────────────────

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];

interface ExerciseGameProps {
  exercise: CognitiveExercise;
  onComplete: (s: Omit<ExerciseSession, 'id'>) => void;
  onClose: () => void;
}

const ExerciseGame: React.FC<ExerciseGameProps> = ({ exercise, onComplete, onClose }) => {
  const startTime = useRef(Date.now());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<{ score: number; accuracy: number } | null>(null);

  // Route to the correct game
  const renderGame = () => {
    switch (exercise.id) {
      case 'memory_match':
        return <MemoryMatchGame onFinish={handleFinish} />;
      case 'number_sequence':
        return <NumberSequenceGame onFinish={handleFinish} />;
      case 'colour_word':
        return <ColourWordGame onFinish={handleFinish} />;
      case 'math_mental':
        return <MathGame onFinish={handleFinish} />;
      case 'word_recall':
        return <WordRecallGame onFinish={handleFinish} />;
      case 'pattern_recognition':
        return <PatternGame onFinish={handleFinish} />;
      case 'word_association':
        return <WordAssociationGame onFinish={handleFinish} />;
      case 'spatial_rotation':
        return <SpatialRotationGame onFinish={handleFinish} />;
      default:
        return <WordRecallGame onFinish={handleFinish} />;
    }
  };

  const handleFinish = (sc: number, acc: number) => {
    setResult({ score: sc, accuracy: acc });
    setGameOver(true);
    onComplete({
      exerciseId: exercise.id,
      startedAt: new Date(startTime.current),
      completedAt: new Date(),
      score: sc,
      maxScore: exercise.points,
      accuracy: acc,
      durationSeconds: Math.round((Date.now() - startTime.current) / 1000),
    });
  };

  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>
          {exercise.icon} {exercise.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {gameOver && result ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{result.accuracy > 0.7 ? '🎉' : '💪'}</Text>
          <Text style={styles.resultTitle}>
            {result.accuracy > 0.7 ? 'Well done!' : 'Keep practising!'}
          </Text>
          <Text style={styles.resultScore}>
            Score: {result.score} / {exercise.points}
          </Text>
          <Text style={styles.resultAccuracy}>Accuracy: {Math.round(result.accuracy * 100)}%</Text>
          <Button title="Back to Exercises" onPress={onClose} style={{ marginTop: 24 }} />
        </View>
      ) : (
        renderGame()
      )}
    </SafeAreaView>
  );
};

// ── Memory Match ──────────────────────────────────────────────────────────

const MemoryMatchGame: React.FC<{ onFinish: (score: number, acc: number) => void }> = ({
  onFinish,
}) => {
  const cards = [...EMOJIS, ...EMOJIS].map((e, i) => ({
    id: i,
    emoji: e,
    flipped: false,
    matched: false,
  }));
  const [board, setBoard] = useState(cards.sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);

  useEffect(() => {
    if (selected.length === 2) {
      const [a, b] = selected;
      if (board[a].emoji === board[b].emoji) {
        setBoard(prev => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
        setMatches(m => m + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (matches + 1 === EMOJIS.length) {
          const acc = Math.max(0, 1 - (moves - EMOJIS.length) / (EMOJIS.length * 2));
          onFinish(Math.round(acc * 50), acc);
        }
      } else {
        setTimeout(() => {
          setBoard(prev => prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
        }, 800);
      }
      setTimeout(() => setSelected([]), 900);
      setMoves(m => m + 1);
    }
  }, [selected]);

  const flip = (i: number) => {
    if (selected.length >= 2 || board[i].flipped || board[i].matched) return;
    setBoard(prev => prev.map((c, idx) => (idx === i ? { ...c, flipped: true } : c)));
    setSelected(prev => [...prev, i]);
  };

  return (
    <View style={{ flex: 1, padding: Spacing.lg }}>
      <Text style={styles.gameInstruction}>Match all the pairs! Tap two cards at a time.</Text>
      <Text style={styles.gameStats}>
        Moves: {moves} | Matches: {matches}/{EMOJIS.length}
      </Text>
      <View style={styles.memoryGrid}>
        {board.map((card, i) => (
          <TouchableOpacity
            key={card.id}
            style={[styles.memCard, card.matched && styles.memCardMatched]}
            onPress={() => flip(i)}
            activeOpacity={0.8}
          >
            <Text style={styles.memCardText}>
              {card.flipped || card.matched ? card.emoji : '❓'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ── Number Sequence ───────────────────────────────────────────────────────

const NumberSequenceGame: React.FC<{ onFinish: (score: number, acc: number) => void }> = ({
  onFinish,
}) => {
  const [phase, setPhase] = useState<'show' | 'input'>('show');
  const [sequence, setSequence] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [correct, setCorrect] = useState(0);
  const maxRounds = 5;

  useEffect(() => {
    generateSequence();
  }, [round]);

  const generateSequence = () => {
    const len = round + 2;
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 9) + 1);
    setSequence(seq);
    setInput([]);
    setPhase('show');
    Speech.speak(seq.join(', '), { rate: 0.7 });
    setTimeout(() => setPhase('input'), len * 1200 + 500);
  };

  const pressNum = (n: number) => {
    const next = [...input, n];
    setInput(next);
    if (next.length === sequence.length) {
      const isCorrect = next.every((v, i) => v === sequence[i]);
      if (isCorrect) {
        setCorrect(c => c + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      if (round >= maxRounds) {
        const acc = (correct + (isCorrect ? 1 : 0)) / maxRounds;
        onFinish(Math.round(acc * 60), acc);
      } else {
        setTimeout(() => setRound(r => r + 1), 800);
      }
    }
  };

  return (
    <View style={{ flex: 1, padding: Spacing.lg, alignItems: 'center' }}>
      <Text style={styles.gameInstruction}>
        Remember the sequence, then tap the numbers in order.
      </Text>
      <Text style={styles.gameStats}>
        Round {round}/{maxRounds} | Correct: {correct}
      </Text>
      <View style={styles.sequenceDisplay}>
        {phase === 'show' ? (
          <Text style={styles.sequenceText}>{sequence.join('  ')}</Text>
        ) : (
          <Text style={styles.sequenceText}>{input.join('  ') || '?'}</Text>
        )}
      </View>
      {phase === 'input' && (
        <View style={styles.numPad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <TouchableOpacity key={n} style={styles.numBtn} onPress={() => pressNum(n)}>
              <Text style={styles.numText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ── Colour Word Game ──────────────────────────────────────────────────────

const COLOUR_WORDS = [
  { word: 'RED', color: '#4CAF50' },
  { word: 'BLUE', color: '#FF5252' },
  { word: 'GREEN', color: '#6C63FF' },
  { word: 'YELLOW', color: '#2196F3' },
];

const ColourWordGame: React.FC<{ onFinish: (score: number, acc: number) => void }> = ({
  onFinish,
}) => {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [total] = useState(10);
  const [item, setItem] = useState(COLOUR_WORDS[Math.floor(Math.random() * COLOUR_WORDS.length)]);
  const [colorName] = useState(
    () => COLOUR_WORDS[Math.floor(Math.random() * COLOUR_WORDS.length)].word
  );

  const next = () => {
    if (current + 1 >= total) {
      onFinish(score, score / total);
      return;
    }
    setCurrent(c => c + 1);
    setItem(COLOUR_WORDS[Math.floor(Math.random() * COLOUR_WORDS.length)]);
  };

  const answer = (wordName: string) => {
    const colorNameOfText = COLOUR_WORDS.find(c => c.color === item.color)?.word;
    if (wordName === colorNameOfText) {
      setScore(s => s + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    next();
  };

  return (
    <View style={{ flex: 1, padding: Spacing.lg, alignItems: 'center' }}>
      <Text style={styles.gameInstruction}>
        Tap the COLOUR of the text, NOT what the word says.
      </Text>
      <Text style={styles.gameStats}>
        {current + 1}/{total} | Score: {score}
      </Text>
      <View style={styles.colourWordBox}>
        <Text style={[styles.colourWord, { color: item.color }]}>{item.word}</Text>
      </View>
      <View style={styles.colourAnswers}>
        {COLOUR_WORDS.map(c => (
          <TouchableOpacity
            key={c.word}
            style={[styles.colourBtn, { backgroundColor: c.color + '20', borderColor: c.color }]}
            onPress={() => answer(c.word)}
          >
            <Text style={[styles.colourBtnText, { color: c.color }]}>{c.word}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ── Math Game ─────────────────────────────────────────────────────────────

const MathGame: React.FC<{ onFinish: (score: number, acc: number) => void }> = ({ onFinish }) => {
  const [q, setQ] = useState(generateQ());
  const [round, setRound] = useState(1);
  const [correct, setCorrect] = useState(0);
  const total = 8;

  function generateQ() {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const a = Math.floor(Math.random() * 12) + 1;
    const b = Math.floor(Math.random() * 12) + 1;
    const ans = op === '+' ? a + b : op === '-' ? Math.abs(a - b) : a * b;
    const wrong = [ans + 1, ans - 1, ans + 2, ans - 2].filter(n => n !== ans && n > 0);
    const opts = [ans, ...wrong.slice(0, 3)].sort(() => Math.random() - 0.5);
    return {
      text: `${op === '-' ? Math.max(a, b) : a} ${op} ${op === '-' ? Math.min(a, b) : b} = ?`,
      answer: ans,
      options: opts,
    };
  }

  const choose = (n: number) => {
    if (n === q.answer) {
      setCorrect(c => c + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (round >= total) {
      const acc = (correct + (n === q.answer ? 1 : 0)) / total;
      onFinish(Math.round(acc * 65), acc);
      return;
    }
    setRound(r => r + 1);
    setQ(generateQ());
  };

  return (
    <View style={{ flex: 1, padding: Spacing.lg, alignItems: 'center' }}>
      <Text style={styles.gameInstruction}>Solve the maths problem as quickly as you can.</Text>
      <Text style={styles.gameStats}>
        {round}/{total} | Correct: {correct}
      </Text>
      <View style={styles.mathBox}>
        <Text style={styles.mathQuestion}>{q.text}</Text>
      </View>
      <View style={styles.mathOptions}>
        {q.options.map((o, i) => (
          <TouchableOpacity key={i} style={styles.mathBtn} onPress={() => choose(o)}>
            <Text style={styles.mathBtnText}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ── Word Recall Game ──────────────────────────────────────────────────────

const WORD_LISTS = [
  ['Apple', 'Chair', 'River', 'Candle', 'Storm', 'Pencil', 'Bridge', 'Garden'],
  ['Tiger', 'Piano', 'Cloud', 'Bottle', 'Forest', 'Mirror', 'Basket', 'Carpet'],
  ['Ocean', 'Flower', 'Castle', 'Pillow', 'Rocket', 'Banana', 'Window', 'Cactus'],
];

const WordRecallGame: React.FC<{ onFinish: (score: number, acc: number) => void }> = ({
  onFinish,
}) => {
  const [phase, setPhase] = useState<'study' | 'recall' | 'result'>('study');
  const [words] = useState(() => WORD_LISTS[Math.floor(Math.random() * WORD_LISTS.length)]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [input, setInput] = useState('');
  const [recalled, setRecalled] = useState<string[]>([]);
  const [attempted, setAttempted] = useState<string[]>([]);

  useEffect(() => {
    if (phase !== 'study') return;
    Speech.speak('Study these words carefully. ' + words.join('. '), { rate: 0.75 });
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          clearInterval(t);
          setPhase('recall');
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const submitWord = () => {
    const w = input.trim().toLowerCase();
    if (!w) return;
    setInput('');
    if (attempted.includes(w)) return;
    setAttempted(p => [...p, w]);
    const match = words.find(wd => wd.toLowerCase() === w);
    if (match) {
      setRecalled(p => [...p, match]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const finish = () => {
    const acc = recalled.length / words.length;
    onFinish(Math.round(acc * 70), acc);
  };

  if (phase === 'study') {
    return (
      <View style={{ flex: 1, padding: Spacing.lg }}>
        <Text style={styles.gameInstruction}>
          Study these words carefully! You have {timeLeft}s.
        </Text>
        <View
          style={[
            styles.sequenceDisplay,
            { flexWrap: 'wrap', flexDirection: 'row', gap: 10, padding: Spacing.lg },
          ]}
        >
          {words.map(w => (
            <View key={w} style={[styles.wordChip]}>
              <Text style={styles.wordChipText}>{w}</Text>
            </View>
          ))}
        </View>
        <View style={styles.timerBar}>
          <View style={[styles.timerFill, { width: `${(timeLeft / 15) * 100}%` as any }]} />
        </View>
        <Text style={[styles.gameStats, { marginTop: 8 }]}>{timeLeft} seconds remaining</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: Spacing.lg }}>
      <Text style={styles.gameInstruction}>Type the words you remember, one at a time.</Text>
      <Text style={styles.gameStats}>
        {recalled.length} / {words.length} recalled
      </Text>
      <View style={styles.recallInputRow}>
        <TextInputField
          value={input}
          onChangeText={setInput}
          placeholder="Type a word..."
          onSubmitEditing={submitWord}
          autoFocus
        />
        <TouchableOpacity style={styles.submitBtn} onPress={submitWord}>
          <Text style={styles.submitBtnText}>✓</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {recalled.map(w => (
          <View
            key={w}
            style={[
              styles.wordChip,
              { backgroundColor: Colors.successLight, borderColor: Colors.success },
            ]}
          >
            <Text style={[styles.wordChipText, { color: Colors.success }]}>✓ {w}</Text>
          </View>
        ))}
      </View>
      <View
        style={{ position: 'absolute', bottom: Spacing.xl, left: Spacing.lg, right: Spacing.lg }}
      >
        <Button title="I'm done — see results" onPress={finish} variant="outline" />
      </View>
    </View>
  );
};

// ── Pattern Recognition Game ───────────────────────────────────────────────

const SHAPES = ['●', '■', '▲', '◆', '★'];
const COLOURS_P = [Colors.primary, Colors.secondary, Colors.accent, Colors.warning, Colors.danger];

const PatternGame: React.FC<{ onFinish: (score: number, acc: number) => void }> = ({
  onFinish,
}) => {
  const [round, setRound] = useState(1);
  const [correct, setCorrect] = useState(0);
  const total = 8;
  const [q, setQ] = useState(() => generatePattern());

  function generatePattern() {
    // Pattern: alternating shape, size, or colour
    const patternType = Math.floor(Math.random() * 3);
    let seq: { shape: string; color: string; size: number }[] = [];
    if (patternType === 0) {
      // Alternating shapes
      const s1 = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      let s2 = s1;
      while (s2 === s1) s2 = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const col = COLOURS_P[Math.floor(Math.random() * COLOURS_P.length)];
      seq = [s1, s2, s1, s2, s1].map(sh => ({ shape: sh, color: col, size: 32 }));
      const answer = s2;
      const wrong = SHAPES.filter(s => s !== answer)
        .slice(0, 3)
        .map(shape => ({ shape, color: col, size: 32 }));
      return {
        seq: seq.slice(0, 4),
        answer: { shape: answer, color: col, size: 32 },
        options: [...wrong, { shape: answer, color: col, size: 32 }].sort(
          () => Math.random() - 0.5
        ),
      };
    } else if (patternType === 1) {
      // Alternating colours
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const c1 = COLOURS_P[Math.floor(Math.random() * COLOURS_P.length)];
      let c2 = c1;
      while (c2 === c1) c2 = COLOURS_P[Math.floor(Math.random() * COLOURS_P.length)];
      seq = [c1, c2, c1, c2, c1].map(col => ({ shape, color: col, size: 32 }));
      const answer = { shape, color: c2, size: 32 };
      const wrongs = COLOURS_P.filter(c => c !== c2)
        .slice(0, 3)
        .map(color => ({ shape, color, size: 32 }));
      return {
        seq: seq.slice(0, 4),
        answer,
        options: [...wrongs, answer].sort(() => Math.random() - 0.5),
      };
    } else {
      // Growing sizes
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const col = COLOURS_P[Math.floor(Math.random() * COLOURS_P.length)];
      const sizes = [18, 24, 30, 36, 42];
      seq = sizes.slice(0, 5).map(size => ({ shape, color: col, size }));
      const answer = { shape, color: col, size: 42 };
      const wrongs = [12, 16, 20, 48].map(size => ({ shape, color: col, size }));
      return {
        seq: seq.slice(0, 4),
        answer,
        options: [...wrongs.slice(0, 3), answer].sort(() => Math.random() - 0.5),
      };
    }
  }

  const choose = (opt: { shape: string; color: string; size: number }) => {
    const isCorrect =
      opt.shape === q.answer.shape && opt.color === q.answer.color && opt.size === q.answer.size;
    if (isCorrect) {
      setCorrect(c => c + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    if (round >= total) {
      const acc = (correct + (isCorrect ? 1 : 0)) / total;
      onFinish(Math.round(acc * 55), acc);
    } else {
      setRound(r => r + 1);
      setQ(generatePattern());
    }
  };

  return (
    <View style={{ flex: 1, padding: Spacing.lg, alignItems: 'center' }}>
      <Text style={styles.gameInstruction}>What comes next in the pattern?</Text>
      <Text style={styles.gameStats}>
        {round}/{total} | Correct: {correct}
      </Text>
      <View
        style={[
          styles.sequenceDisplay,
          { flexDirection: 'row', gap: 16, justifyContent: 'center', paddingVertical: 24 },
        ]}
      >
        {q.seq.map((item, i) => (
          <Text key={i} style={{ fontSize: item.size, color: item.color }}>
            {item.shape}
          </Text>
        ))}
        <View style={styles.patternBlank}>
          <Text style={{ color: Colors.textMuted, fontSize: 24 }}>?</Text>
        </View>
      </View>
      <Text style={[styles.gameInstruction, { marginBottom: 16 }]}>Tap the answer:</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {q.options.map((opt, i) => (
          <TouchableOpacity key={i} style={styles.patternOption} onPress={() => choose(opt)}>
            <Text style={{ fontSize: opt.size, color: opt.color }}>{opt.shape}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ── Word Association Game ─────────────────────────────────────────────────

const ASSOCIATION_QS = [
  {
    category: 'Animals',
    examples: ['Dog', 'Cat'],
    words: ['Lion', 'Rose', 'Table', 'Eagle', 'Chair', 'Tiger', 'Lamp', 'Wolf'],
  },
  {
    category: 'Fruits',
    examples: ['Apple', 'Mango'],
    words: ['Banana', 'Pencil', 'Orange', 'Cloud', 'Grape', 'Stone', 'Lemon', 'Kiwi'],
  },
  {
    category: 'Colours',
    examples: ['Red', 'Blue'],
    words: ['Green', 'Piano', 'Purple', 'Rocket', 'Yellow', 'Spoon', 'Orange', 'Pink'],
  },
  {
    category: 'Transport',
    examples: ['Car', 'Bus'],
    words: ['Train', 'Flower', 'Bicycle', 'Candle', 'Boat', 'Mirror', 'Plane', 'Ship'],
  },
  {
    category: 'Kitchen items',
    examples: ['Fork', 'Knife'],
    words: ['Spoon', 'Tiger', 'Bowl', 'River', 'Cup', 'Eagle', 'Plate', 'Kettle'],
  },
];

const WordAssociationGame: React.FC<{ onFinish: (score: number, acc: number) => void }> = ({
  onFinish,
}) => {
  const [qIdx, setQIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState<Record<string, 'correct' | 'wrong' | null>>({});
  const total = ASSOCIATION_QS.length;
  const q = ASSOCIATION_QS[qIdx];

  const CORRECT_WORDS: Record<string, string[]> = {
    Animals: ['Lion', 'Eagle', 'Tiger', 'Wolf'],
    Fruits: ['Banana', 'Orange', 'Grape', 'Lemon', 'Kiwi'],
    Colours: ['Green', 'Purple', 'Yellow', 'Orange', 'Pink'],
    Transport: ['Train', 'Bicycle', 'Boat', 'Plane', 'Ship'],
    'Kitchen items': ['Spoon', 'Bowl', 'Cup', 'Plate', 'Kettle'],
  };

  const tap = (word: string) => {
    if (answered[word]) return;
    const isCorrect = (CORRECT_WORDS[q.category] ?? []).includes(word);
    setAnswered(p => ({ ...p, [word]: isCorrect ? 'correct' : 'wrong' }));
    if (isCorrect) {
      setCorrect(c => c + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const next = () => {
    if (qIdx + 1 >= total) {
      const acc = correct / (total * 4);
      onFinish(Math.round(acc * 50), Math.min(1, acc));
    } else {
      setQIdx(i => i + 1);
      setAnswered({});
    }
  };

  return (
    <View style={{ flex: 1, padding: Spacing.lg }}>
      <Text style={styles.gameInstruction}>
        Tap all words that belong to:{' '}
        <Text style={{ color: Colors.primary, fontWeight: '700' }}>{q.category}</Text>
      </Text>
      <Text style={styles.gameStats}>
        {qIdx + 1}/{total} | Score: {correct}
      </Text>
      <View
        style={[
          styles.sequenceDisplay,
          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
        ]}
      >
        {q.examples.map(e => (
          <View
            key={e}
            style={[
              styles.wordChip,
              { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
            ]}
          >
            <Text style={[styles.wordChipText, { color: Colors.primary }]}>e.g. {e}</Text>
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'center',
          marginTop: 16,
        }}
      >
        {q.words.map(word => {
          const state = answered[word];
          const bg =
            state === 'correct'
              ? Colors.successLight
              : state === 'wrong'
                ? Colors.dangerLight
                : Colors.surface;
          const border =
            state === 'correct'
              ? Colors.success
              : state === 'wrong'
                ? Colors.danger
                : Colors.border;
          return (
            <TouchableOpacity
              key={word}
              style={[styles.assocWordBtn, { backgroundColor: bg, borderColor: border }]}
              onPress={() => tap(word)}
              disabled={!!state}
            >
              <Text
                style={[
                  styles.assocWordText,
                  state === 'correct' && { color: Colors.success },
                  state === 'wrong' && { color: Colors.danger },
                ]}
              >
                {state === 'correct' ? '✓ ' : state === 'wrong' ? '✗ ' : ''}
                {word}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View
        style={{ position: 'absolute', bottom: Spacing.xl, left: Spacing.lg, right: Spacing.lg }}
      >
        <Button title={qIdx + 1 >= total ? 'Finish' : 'Next category →'} onPress={next} />
      </View>
    </View>
  );
};

// ── Spatial Rotation Game ─────────────────────────────────────────────────

const SPATIAL_QS = [
  { shape: '▲', original: 0, options: [0, 90, 45, 180], answer: 0 },
  { shape: '◆', original: 45, options: [0, 45, 90, 135], answer: 45 },
  { shape: '■', original: 90, options: [45, 90, 0, 135], answer: 90 },
  { shape: '▲', original: 180, options: [90, 45, 180, 270], answer: 180 },
  { shape: '◆', original: 270, options: [90, 270, 180, 45], answer: 270 },
  { shape: '★', original: 36, options: [0, 36, 72, 90], answer: 36 },
];

const SpatialRotationGame: React.FC<{ onFinish: (score: number, acc: number) => void }> = ({
  onFinish,
}) => {
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = SPATIAL_QS.length;
  const q = SPATIAL_QS[idx];

  const choose = (deg: number) => {
    const isCorrect = deg === q.answer;
    if (isCorrect) {
      setCorrect(c => c + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    if (idx + 1 >= total) {
      const acc = (correct + (isCorrect ? 1 : 0)) / total;
      onFinish(Math.round(acc * 90), acc);
    } else {
      setIdx(i => i + 1);
    }
  };

  return (
    <View style={{ flex: 1, padding: Spacing.lg, alignItems: 'center' }}>
      <Text style={styles.gameInstruction}>Which rotation matches the original shape?</Text>
      <Text style={styles.gameStats}>
        {idx + 1}/{total} | Correct: {correct}
      </Text>
      <View style={styles.spatialTarget}>
        <Text style={[styles.spatialShape, { transform: [{ rotate: `${q.original}deg` }] }]}>
          {q.shape}
        </Text>
      </View>
      <Text style={[styles.gameInstruction, { marginBottom: 16 }]}>
        This shape is rotated {q.original}°. Which option below matches?
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
        {q.options.map((deg, i) => (
          <TouchableOpacity key={i} style={styles.spatialOption} onPress={() => choose(deg)}>
            <Text
              style={[styles.spatialShape, { fontSize: 36, transform: [{ rotate: `${deg}deg` }] }]}
            >
              {q.shape}
            </Text>
            <Text style={{ fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 6 }}>
              {deg}°
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ── TextInput wrapper ─────────────────────────────────────────────────────
const TextInputField: React.FC<{
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
}> = props => (
  <RNTextInput
    style={styles.wordInput}
    value={props.value}
    onChangeText={props.onChangeText}
    placeholder={props.placeholder}
    placeholderTextColor={Colors.textMuted}
    onSubmitEditing={props.onSubmitEditing}
    autoFocus={props.autoFocus}
    autoCapitalize="none"
    returnKeyType="done"
  />
);

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: Fonts.sizes.md, color: Colors.textSecondary, marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: Spacing.lg,
  },
  insightCard: { marginHorizontal: Spacing.lg, backgroundColor: Colors.primaryLight },
  insightLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
  },
  insightText: { fontSize: Fonts.sizes.sm, color: Colors.text, lineHeight: 20 },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: 10,
    gap: 12,
    ...Shadows.sm,
  },
  exIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  exTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text },
  exDesc: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: 6 },
  exMeta: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full },
  diffText: { fontSize: Fonts.sizes.xs, fontWeight: '600', textTransform: 'capitalize' },
  exTime: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  exPoints: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary },
  gameContainer: { flex: 1, backgroundColor: Colors.background },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: { padding: 4 },
  gameTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.text },
  gameInstruction: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  gameStats: {
    fontSize: Fonts.sizes.sm,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 10,
  },
  memCard: {
    width: 70,
    height: 70,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  memCardMatched: { borderColor: Colors.success, backgroundColor: Colors.successLight },
  memCardText: { fontSize: 32 },
  sequenceDisplay: {
    width: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginVertical: 24,
  },
  sequenceText: {
    fontSize: Fonts.sizes.xxxl,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 8,
  },
  numPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    gap: 12,
    justifyContent: 'center',
    marginTop: 16,
  },
  numBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  numText: { fontSize: Fonts.sizes.xl, fontWeight: '700', color: Colors.text },
  colourWordBox: { marginVertical: 32, padding: 24 },
  colourWord: { fontSize: 52, fontWeight: '900', letterSpacing: 4 },
  colourAnswers: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  colourBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 2,
    minWidth: 120,
    alignItems: 'center',
  },
  colourBtnText: { fontSize: Fonts.sizes.md, fontWeight: '800' },
  mathBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    marginVertical: 24,
    width: '100%',
    alignItems: 'center',
  },
  mathQuestion: { fontSize: Fonts.sizes.xxxl, fontWeight: '900', color: Colors.primary },
  mathOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  mathBtn: {
    width: 90,
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  mathBtnText: { fontSize: Fonts.sizes.xl, fontWeight: '700', color: Colors.text },
  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  resultEmoji: { fontSize: 72, marginBottom: Spacing.lg },
  resultTitle: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  resultScore: { fontSize: Fonts.sizes.xl, color: Colors.primary, fontWeight: '700' },
  resultAccuracy: { fontSize: Fonts.sizes.lg, color: Colors.textSecondary, marginTop: 4 },
  // Word Recall
  wordChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  wordChipText: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.primary },
  timerBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 16,
  },
  timerFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  recallInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 16 },
  wordInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: Fonts.sizes.md,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  submitBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: Fonts.sizes.lg, color: '#fff', fontWeight: '700' },
  // Pattern Recognition
  patternBlank: {
    width: 52,
    height: 52,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternOption: {
    width: 80,
    height: 80,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  // Word Association
  assocWordBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minWidth: 100,
    alignItems: 'center',
    ...Shadows.sm,
  },
  assocWordText: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  // Spatial Rotation
  spatialTarget: {
    width: 120,
    height: 120,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  spatialShape: { fontSize: 56, color: Colors.primary },
  spatialOption: {
    width: 100,
    height: 100,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
});

export default ExercisesScreen;
