import { useEffect, useRef, useState } from "react";
import { BOOKS, UNITS as DATA_UNITS, words as WORD_DATA, type Word } from "../data/words";
import {
  Volume2, Star, ArrowLeft, Home, RefreshCw, Trash2,
  BookOpen, Check, X, ChevronRight, BookMarked,
} from "lucide-react";

// ── Brand palette ─────────────────────────────────────────────────
const C = {
  yellow: "#FFEA6F",
  yellowLight: "#FFFDF0",
  yellowText: "#4a3800",
  pink: "#FFC9EF",
  pinkLight: "#FFF9FD",
  pinkText: "#68003f",
  green: "#C9F100",
  greenLight: "#F9FEE5",
  greenText: "#2b3e00",
  blue: "#ABD7FA",
  blueLight: "#F6FBFE",
  blueText: "#003d5c",
  navy: "#1a2535",
  primary: "#1668a0",
  primaryDark: "#0e4f7a",
};

const UNIT_PALETTE = [
  { bg: C.yellow, light: C.yellowLight, text: C.yellowText },
  { bg: C.pink,   light: C.pinkLight,   text: C.pinkText   },
  { bg: C.green,  light: C.greenLight,  text: C.greenText  },
  { bg: C.blue,   light: C.blueLight,   text: C.blueText   },
];

// ── Types ─────────────────────────────────────────────────────────
type Page = "home" | "study" | "results" | "mistakes";
type StudyMode = "en-zh" | "zh-en";
type Mode = StudyMode | "mistakes";
type RewardKind = "correct" | "streak3" | "streak5" | "streak7" | "streak10" | "perfect";

type RewardStar = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  rotate: number;
  color: string;
};

type RewardState = {
  id: number;
  kind: RewardKind;
  streak: number;
  title: string;
  subtitle: string;
  duration: number;
  stars: RewardStar[];
};

const MODE_LABEL: Record<StudyMode, string> = {
  "en-zh": "英文 → 中文",
  "zh-en": "中文 → 英文",
};

const MISTAKE_STORAGE_KEY = "wordflash.mistakeIdsByMode.v1";
const STAR_COLORS = ["#FFEA6F", "#FFC9EF", "#C9F100", "#ABD7FA", "#FFE08A"];
const VICTORY_SOUND_URL = "/sounds/victory.mp3";
let audioContext: AudioContext | null = null;

// ── Data ──────────────────────────────────────────────────────────
const TEXTBOOKS = [...BOOKS];
const UNITS = [...DATA_UNITS];

// ── Utils ─────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  window.speechSynthesis.speak(u);
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext ??= new AudioContextCtor();
  void audioContext.resume();
  return audioContext;
}

function playTone(ctx: AudioContext, start: number, frequency: number, duration: number, gain = 0.05) {
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume);
  volume.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playRewardSound(kind: RewardKind | "skip" | "miss") {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes: Record<typeof kind, Array<[number, number, number, number?]>> = {
    correct: [[0, 660, 0.08, 0.035], [0.08, 880, 0.1, 0.04]],
    streak3: [[0, 660, 0.08], [0.08, 880, 0.1], [0.18, 1108, 0.12]],
    streak5: [[0, 740, 0.07], [0.07, 932, 0.08], [0.15, 1174, 0.12], [0.27, 1480, 0.14]],
    streak7: [[0, 587, 0.08], [0.08, 784, 0.1], [0.18, 988, 0.12], [0.3, 1318, 0.18, 0.06]],
    streak10: [[0, 660, 0.07], [0.07, 880, 0.08], [0.15, 1108, 0.09], [0.24, 1320, 0.12], [0.38, 1760, 0.18, 0.06]],
    perfect: [[0, 523, 0.09], [0.08, 659, 0.09], [0.16, 784, 0.1], [0.26, 1046, 0.12], [0.42, 1318, 0.22, 0.065]],
    skip: [[0, 420, 0.05, 0.025]],
    miss: [[0, 260, 0.08, 0.02]],
  };
  notes[kind].forEach(([offset, frequency, duration, gain]) => {
    playTone(ctx, now + offset, frequency, duration, gain);
  });
}

function playVictorySound() {
  if (typeof window === "undefined") return;
  const audio = new Audio(VICTORY_SOUND_URL);
  audio.volume = 0.72;
  void audio.play().catch(() => {
    playRewardSound("perfect");
  });
}

function makeStars(count: number): RewardStar[] {
  const isMega = count >= 180;
  const isLarge = count >= 80;
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * (isMega ? 2600 : isLarge ? 1500 : 900),
    duration: (isMega ? 3000 : isLarge ? 2400 : 1900) + Math.random() * (isMega ? 2300 : 1300),
    size: 14 + Math.random() * (isMega ? 34 : 24),
    drift: (isMega ? -180 : -110) + Math.random() * (isMega ? 360 : 220),
    rotate: -180 + Math.random() * 360,
    color: STAR_COLORS[id % STAR_COLORS.length],
  }));
}

function createReward(streak: number): RewardState | null {
  if (streak === 1) {
    return {
      id: Date.now(),
      kind: "correct",
      streak,
      title: "答对",
      subtitle: "继续",
      duration: 950,
      stars: makeStars(0),
    };
  }
  if (streak === 3) {
    return {
      id: Date.now(),
      kind: "streak3",
      streak,
      title: "连对 3 题",
      subtitle: "手感来了",
      duration: 1600,
      stars: makeStars(14),
    };
  }
  if (streak === 5) {
    return {
      id: Date.now(),
      kind: "streak5",
      streak,
      title: "连对 5 题",
      subtitle: "星星掉落",
      duration: 2200,
      stars: makeStars(34),
    };
  }
  if (streak === 7) {
    return {
      id: Date.now(),
      kind: "streak7",
      streak,
      title: "状态不错",
      subtitle: `已经连对 ${streak} 题`,
      duration: 2600,
      stars: makeStars(42),
    };
  }
  if (streak > 0 && streak % 10 === 0) {
    return {
      id: Date.now(),
      kind: "streak10",
      streak,
      title: `连对 ${streak} 题`,
      subtitle: "一大波星星来了",
      duration: 3200,
      stars: makeStars(92),
    };
  }
  return null;
}

function createPerfectReward(): RewardState {
  return {
    id: Date.now(),
    kind: "perfect",
    streak: 0,
    title: "全对通关！",
    subtitle: "这一轮彻底拿下",
    duration: 6200,
    stars: makeStars(220),
  };
}

function getUnitPalette(unit: string) {
  const idx = UNITS.indexOf(unit);
  return UNIT_PALETTE[Math.max(idx, 0) % UNIT_PALETTE.length];
}

function emptyMistakeIdsByMode(): Record<StudyMode, Set<number>> {
  return {
    "en-zh": new Set(),
    "zh-en": new Set(),
  };
}

function readMistakeIdsByMode(): Record<StudyMode, Set<number>> {
  if (typeof window === "undefined") return emptyMistakeIdsByMode();

  try {
    const raw = window.localStorage.getItem(MISTAKE_STORAGE_KEY);
    if (!raw) return emptyMistakeIdsByMode();

    const parsed = JSON.parse(raw) as Partial<Record<StudyMode, unknown>>;
    return {
      "en-zh": new Set(Array.isArray(parsed["en-zh"]) ? parsed["en-zh"].filter(Number.isFinite) : []),
      "zh-en": new Set(Array.isArray(parsed["zh-en"]) ? parsed["zh-en"].filter(Number.isFinite) : []),
    };
  } catch {
    return emptyMistakeIdsByMode();
  }
}

function saveMistakeIdsByMode(mistakes: Record<StudyMode, Set<number>>) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      MISTAKE_STORAGE_KEY,
      JSON.stringify({
        "en-zh": [...mistakes["en-zh"]],
        "zh-en": [...mistakes["zh-en"]],
      }),
    );
  } catch {
    // Storage can fail in private browsing; studying should still work in memory.
  }
}

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [textbook, setTextbook] = useState(0);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("en-zh");
  const [sessionMode, setSessionMode] = useState<StudyMode>("en-zh");
  const [mistakeReviewMode, setMistakeReviewMode] = useState<StudyMode>("en-zh");

  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showExampleTranslation, setShowExampleTranslation] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [reward, setReward] = useState<RewardState | null>(null);
  const [isRewarding, setIsRewarding] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());
  const [unknownIds, setUnknownIds] = useState<Set<number>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [mistakeIdsByMode, setMistakeIdsByMode] = useState<Record<StudyMode, Set<number>>>(
    readMistakeIdsByMode,
  );

  const currentWord = sessionWords[currentIndex];
  const total = sessionWords.length;
  const isPerfectSession =
    page === "results" && total > 0 && knownIds.size === total && unknownIds.size === 0;
  const rewardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (page === "study" && sessionMode !== "zh-en" && currentWord) {
      speak(currentWord.word);
    }
  }, [page, sessionMode, currentWord?.id]);

  useEffect(() => {
    setShowExampleTranslation(false);
  }, [currentWord?.id, page]);

  useEffect(() => {
    saveMistakeIdsByMode(mistakeIdsByMode);
  }, [mistakeIdsByMode]);

  useEffect(() => {
    if (page !== "results") return;
    playVictorySound();
    if (!isPerfectSession) return;
    const perfectReward = createPerfectReward();
    setReward(perfectReward);
    const timer = window.setTimeout(() => setReward(null), perfectReward.duration);
    return () => window.clearTimeout(timer);
  }, [page, isPerfectSession]);

  useEffect(() => {
    return () => {
      if (rewardTimerRef.current) window.clearTimeout(rewardTimerRef.current);
    };
  }, []);

  function clearRewardTimer() {
    if (rewardTimerRef.current) {
      window.clearTimeout(rewardTimerRef.current);
      rewardTimerRef.current = null;
    }
  }

  function resetRewardState() {
    clearRewardTimer();
    setReward(null);
    setIsRewarding(false);
  }

  function startSession(targetMode?: Mode, targetStudyMode?: StudyMode) {
    resetRewardState();
    const m = targetMode ?? mode;
    const studyMode: StudyMode =
      m === "mistakes" ? targetStudyMode ?? mistakeReviewMode : m;
    let words: Word[];
    if (m === "mistakes") {
      words = WORD_DATA.filter((w) => mistakeIdsByMode[studyMode].has(w.id));
    } else {
      words = WORD_DATA.filter((w) => selectedUnits.has(w.unit));
    }
    if (words.length === 0) return;
    setSessionWords(shuffle(words));
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowExampleTranslation(false);
    setCorrectStreak(0);
    setKnownIds(new Set());
    setUnknownIds(new Set());
    setMode(m);
    setSessionMode(studyMode);
    setMistakeReviewMode(studyMode);
    setPage("study");
  }

  function handleKnow() {
    if (isRewarding) return;
    if (!currentWord || unknownIds.has(currentWord.id)) {
      goNext();
      return;
    }
    const nextStreak = correctStreak + 1;
    const isLastWord = currentIndex + 1 >= total;
    const willBePerfect = isLastWord && unknownIds.size === 0 && knownIds.size + 1 === total;
    const nextReward = createReward(nextStreak);
    setCorrectStreak(nextStreak);
    setKnownIds((prev) => {
      return new Set([...prev, currentWord.id]);
    });
    if (willBePerfect) {
      setIsRewarding(true);
      clearRewardTimer();
      rewardTimerRef.current = window.setTimeout(() => {
        setIsRewarding(false);
        goNext();
      }, 180);
      return;
    }
    playRewardSound(nextReward?.kind ?? "correct");
    if (!nextReward) {
      clearRewardTimer();
      setIsRewarding(true);
      rewardTimerRef.current = window.setTimeout(() => {
        setIsRewarding(false);
        goNext();
      }, 120);
      return;
    }
    setReward(nextReward);
    setIsRewarding(true);
    clearRewardTimer();
    rewardTimerRef.current = window.setTimeout(() => {
      setReward(null);
      setIsRewarding(false);
      goNext();
    }, nextReward.duration);
  }

  function handleDontKnow() {
    if (isRewarding) return;
    setCorrectStreak(0);
    playRewardSound("miss");
    setUnknownIds((prev) => new Set([...prev, currentWord.id]));
    setKnownIds((prev) => {
      const next = new Set(prev);
      next.delete(currentWord.id);
      return next;
    });
    setMistakeIdsByMode((prev) => ({
      ...prev,
      [sessionMode]: new Set([...prev[sessionMode], currentWord.id]),
    }));
    setIsFlipped(true);
  }

  function goNext() {
    resetRewardState();
    if (currentIndex + 1 >= total) {
      setPage("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
      setShowExampleTranslation(false);
    }
  }

  function handleSkip() {
    if (isRewarding) return;
    setCorrectStreak(0);
    playRewardSound("skip");
    goNext();
  }

  function toggleUnit(unit: string) {
    setSelectedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unit)) next.delete(unit);
      else next.add(unit);
      return next;
    });
  }

  function toggleBookmark(id: number) {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeMistake(id: number) {
    setMistakeIdsByMode((prev) => {
      const nextForMode = new Set(prev[mistakeReviewMode]);
      nextForMode.delete(id);
      return { ...prev, [mistakeReviewMode]: nextForMode };
    });
  }

  // ── HOME ──────────────────────────────────────────────────────────
  if (page === "home") {
    const enZhMistakeCount = mistakeIdsByMode["en-zh"].size;
    const zhEnMistakeCount = mistakeIdsByMode["zh-en"].size;
    const mistakeCount = enZhMistakeCount + zhEnMistakeCount;
    const activeMistakeCount = mistakeIdsByMode[mistakeReviewMode].size;
    const hasMistakes = mistakeCount > 0;
    const wordCount = WORD_DATA.filter((w) => selectedUnits.has(w.unit)).length;
    const canStart =
      (mode !== "mistakes" && selectedUnits.size > 0) ||
      (mode === "mistakes" && activeMistakeCount > 0);

    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header
          className="sticky top-0 z-20 bg-white border-b"
          style={{ borderColor: "rgba(171,215,250,0.45)" }}
        >
          <div className="max-w-3xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm"
                style={{ background: C.blue, color: C.blueText }}
              >
                W
              </div>
              <span className="font-extrabold text-lg tracking-tight" style={{ color: C.navy }}>
                WordFlash
              </span>
              <span className="hidden sm:block text-sm text-gray-400">· 初中英语单词</span>
            </div>
            <button
              onClick={() => setPage("mistakes")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
              style={{ background: C.yellowLight, color: C.yellowText }}
            >
              <BookMarked size={14} />
              错题集{hasMistakes ? ` (${mistakeCount})` : ""}
            </button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-5 sm:px-8 py-8 space-y-9">
          {/* Textbook */}
          <section>
            <SectionLabel>选择教材</SectionLabel>
            <div className="flex flex-wrap gap-2 mt-3">
              {TEXTBOOKS.map((tb, i) => (
                <button
                  key={tb}
                  onClick={() => setTextbook(i)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:shadow-sm"
                  style={{
                    background: textbook === i ? C.primary : "white",
                    color: textbook === i ? "white" : C.navy,
                    borderColor: textbook === i ? C.primary : "rgba(171,215,250,0.6)",
                  }}
                >
                  {tb}
                </button>
              ))}
            </div>
          </section>

          {/* Units */}
          <section>
            <div className="flex items-center justify-between">
              <SectionLabel>选择单元</SectionLabel>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSelectedUnits(new Set(UNITS))}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: C.blueLight, color: C.primary }}
                >
                  全选
                </button>
                <button
                  onClick={() => setSelectedUnits(new Set())}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors text-gray-400 hover:bg-gray-100"
                >
                  清除
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {UNITS.map((unit) => {
                const pal = getUnitPalette(unit);
                const selected = selectedUnits.has(unit);
                const count = WORD_DATA.filter((w) => w.unit === unit).length;
                return (
                  <button
                    key={unit}
                    onClick={() => toggleUnit(unit)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:shadow-sm"
                    style={{
                      background: selected ? pal.bg : "white",
                      color: selected ? pal.text : "#6b7280",
                      borderColor: selected ? pal.bg : "rgba(0,0,0,0.08)",
                    }}
                  >
                    {unit}
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md"
                      style={{
                        background: selected ? "rgba(0,0,0,0.12)" : "#f3f4f6",
                        color: selected ? pal.text : "#9ca3af",
                      }}
                    >
                      {count}项
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedUnits.size > 0 && (
              <p className="mt-2.5 text-sm text-gray-400">
                已选 {selectedUnits.size} 个单元 · 共{" "}
                <span className="font-semibold" style={{ color: C.primary }}>
                  {wordCount}
                </span>{" "}
                项内容
              </p>
            )}
          </section>

          {/* Mode */}
          <section>
            <SectionLabel>学习模式</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {(
                [
                  {
                    value: "en-zh" as Mode,
                    label: "英文 → 中文",
                    desc: "看英文，想中文释义",
                    icon: "🔤",
                    pal: { bg: C.blue, light: C.blueLight, text: C.blueText },
                  },
                  {
                    value: "zh-en" as Mode,
                    label: "中文 → 英文",
                    desc: "看中文，想英文单词",
                    icon: "🔡",
                    pal: { bg: C.green, light: C.greenLight, text: C.greenText },
                  },
                  {
                    value: "mistakes" as Mode,
                    label: "错题复习",
                    desc: hasMistakes
                      ? `英→中 ${enZhMistakeCount} · 中→英 ${zhEnMistakeCount}`
                      : "暂无错题",
                    icon: "📌",
                    pal: { bg: C.pink, light: C.pinkLight, text: C.pinkText },
                  },
                ] as const
              ).map((m) => {
                const active = mode === m.value;
                const disabled = m.value === "mistakes" && !hasMistakes;
                return (
                  <button
                    key={m.value}
                    onClick={() => {
                      if (disabled) return;
                      setMode(m.value);
                      if (m.value === "en-zh" || m.value === "zh-en") {
                        setMistakeReviewMode(m.value);
                      }
                    }}
                    disabled={disabled}
                    className="p-4 rounded-2xl border text-left transition-all hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: active ? m.pal.light : "white",
                      borderColor: active ? m.pal.bg : "rgba(0,0,0,0.08)",
                      borderWidth: active ? "2px" : "1px",
                    }}
                  >
                    <div className="text-2xl mb-2">{m.icon}</div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: active ? m.pal.text : C.navy }}
                    >
                      {m.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                  </button>
                );
              })}
            </div>
            {mode === "mistakes" && hasMistakes && (
              <div className="flex flex-wrap gap-2 mt-3">
                {(["en-zh", "zh-en"] as StudyMode[]).map((value) => {
                  const active = mistakeReviewMode === value;
                  const count = mistakeIdsByMode[value].size;
                  return (
                    <button
                      key={value}
                      onClick={() => setMistakeReviewMode(value)}
                      disabled={count === 0}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: active ? C.primary : "white",
                        color: active ? "white" : C.navy,
                        borderColor: active ? C.primary : "rgba(171,215,250,0.65)",
                      }}
                    >
                      {MODE_LABEL[value]}错题 · {count}项
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* CTA */}
          <div className="pb-10">
            <button
              onClick={() => startSession()}
              disabled={!canStart}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed"
              style={{ background: C.primary, color: "white" }}
            >
              <BookOpen size={18} />
              开始学习
              {mode !== "mistakes" && wordCount > 0 && (
                <span className="font-normal opacity-75 text-sm">· {wordCount} 项内容</span>
              )}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── STUDY ─────────────────────────────────────────────────────────
  if (page === "study" && currentWord) {
    const pal = getUnitPalette(currentWord.unit);
    const isBookmarked = bookmarkedIds.has(currentWord.id);
    const isCurrentMarkedWrong = unknownIds.has(currentWord.id);
    const shouldShowNextAction = isCurrentMarkedWrong && isFlipped;
    const exampleTranslation = currentWord.exampleTranslation || currentWord.translation;

    return (
      <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
        {reward && <RewardOverlay reward={reward} />}
        {/* Top bar */}
        <div className="px-4 sm:px-8 pt-5 pb-3 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => {
              resetRewardState();
              setPage("home");
            }}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-mono tabular-nums">
                {currentIndex + 1} / {total}
              </span>
              <span className="text-xs font-bold" style={{ color: C.primary }}>
                {Math.round(((currentIndex + 1) / total) * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / total) * 100}%`, background: C.primary }}
              />
            </div>
          </div>
          <button
            onClick={() => toggleBookmark(currentWord.id)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <Star
              size={20}
              fill={isBookmarked ? C.yellow : "none"}
              stroke={isBookmarked ? "#c8a000" : "#9ca3af"}
            />
          </button>
        </div>

        {/* Card + Buttons */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 pb-10 gap-6">
          {/* 3D Flip Card */}
          <div style={{ perspective: "1400px" }} className="w-full max-w-2xl">
            <div
              key={currentWord.id}
              className="w-full relative"
              style={{
                height: "clamp(300px, 40vh, 400px)",
                transformStyle: "preserve-3d",
                transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                cursor: "pointer",
              }}
              onClick={() => setIsFlipped((f) => !f)}
            >
              {/* Front */}
              <div
                className="absolute inset-0 rounded-2xl flex flex-col overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  background: "white",
                  border: "1.5px solid rgba(171,215,250,0.5)",
                  boxShadow: "0 8px 32px rgba(22,104,160,0.10)",
                }}
              >
                <div className="flex items-center justify-between px-6 pt-5 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: pal.bg, color: pal.text }}
                    >
                      {currentWord.unit}
                    </span>
                    {sessionMode === "en-zh" && (
                      <span
                        className="text-xs font-semibold text-gray-400"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {currentWord.partOfSpeech}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-300 select-none">点击翻转</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 pb-4">
                  {sessionMode === "zh-en" ? (
                    <>
                      <div
                        className="text-3xl sm:text-4xl font-bold text-center leading-snug"
                        style={{ color: C.navy }}
                      >
                        {currentWord.translation}
                      </div>
                      <span
                        className="text-sm font-bold px-3 py-1 rounded-full"
                        style={{ background: C.greenLight, color: C.greenText }}
                      >
                        {currentWord.partOfSpeech}
                      </span>
                    </>
                  ) : (
                    <>
                      <div
                        className="text-4xl sm:text-6xl font-extrabold tracking-tight text-center"
                        style={{ color: C.navy }}
                      >
                        {currentWord.word}
                      </div>
                      <div
                        className="text-base sm:text-lg text-gray-400"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {currentWord.phonetic}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(currentWord.word);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-80 mt-1"
                        style={{ background: C.blueLight, color: C.primary }}
                      >
                        <Volume2 size={14} />
                        朗读
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 rounded-2xl flex flex-col overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: pal.light,
                  border: `1.5px solid ${pal.bg}`,
                  boxShadow: "0 8px 32px rgba(22,104,160,0.10)",
                }}
              >
                <div className="flex items-center gap-2 px-6 pt-5 pb-2">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: pal.bg, color: pal.text }}
                  >
                    {currentWord.unit}
                  </span>
                  <span
                    className="text-xs font-semibold text-gray-400"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {currentWord.partOfSpeech}
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 pb-4">
                  {sessionMode === "zh-en" ? (
                    <>
                      <div
                        className="text-4xl sm:text-6xl font-extrabold tracking-tight text-center"
                        style={{ color: C.navy }}
                      >
                        {currentWord.word}
                      </div>
                      <div
                        className="text-base sm:text-lg text-gray-400"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {currentWord.phonetic}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(currentWord.word);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
                        style={{ background: pal.bg + "99", color: pal.text }}
                      >
                        <Volume2 size={14} />
                        朗读
                      </button>
                    </>
                  ) : (
                    <div
                      className="text-3xl sm:text-4xl font-bold text-center leading-snug"
                      style={{ color: C.navy }}
                    >
                      {currentWord.translation}
                    </div>
                  )}
                  {currentWord.example && (
                    <div className="flex flex-col items-center gap-2 max-w-md">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowExampleTranslation(true);
                          speak(currentWord.example);
                        }}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm text-gray-500 italic leading-relaxed transition-colors hover:bg-white/60"
                      >
                        <Volume2 size={14} className="not-italic flex-shrink-0" />
                        <span>{currentWord.example}</span>
                      </button>
                      {showExampleTranslation && exampleTranslation && (
                        <p className="text-sm text-center leading-relaxed px-4 py-2 rounded-xl bg-white/60 text-gray-500">
                          {exampleTranslation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full max-w-md">
            <button
              onClick={handleDontKnow}
              disabled={isRewarding}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed"
              style={{
                background: C.pinkLight,
                color: C.pinkText,
                border: `2px solid ${C.pink}`,
              }}
            >
              <X size={16} />
              不会
            </button>
            <button
              onClick={handleSkip}
              disabled={isRewarding}
              className="px-4 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-1 transition-all hover:bg-gray-100 text-gray-400 border border-gray-200 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
              跳过
            </button>
            <button
              onClick={shouldShowNextAction ? goNext : handleKnow}
              disabled={isRewarding}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed"
              style={{
                background: C.greenLight,
                color: C.greenText,
                border: `2px solid ${C.green}`,
              }}
            >
              {shouldShowNextAction ? <ChevronRight size={16} /> : <Check size={16} />}
              {shouldShowNextAction ? "下一个" : "会了"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────
  if (page === "results") {
    const knownCount = knownIds.size;
    const unknownCount = unknownIds.size;
    const skippedCount = Math.max(total - knownCount - unknownCount, 0);
    const pct = total > 0 ? Math.round((knownCount / total) * 100) : 0;

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
        style={{ background: "white" }}
      >
        {reward && <RewardOverlay reward={reward} />}
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">{pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📖"}</div>
            <h1 className="text-2xl font-extrabold mb-1" style={{ color: C.navy }}>
              本轮完成！
            </h1>
            <p className="text-gray-400 text-sm">共学习了 {total} 项内容</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: "总项数",   value: total,        bg: C.blueLight,  text: C.blueText  },
              { label: "已掌握",   value: knownCount,   bg: C.greenLight, text: C.greenText },
              { label: "需复习",   value: unknownCount, bg: C.pinkLight,  text: C.pinkText  },
              { label: "跳过",     value: skippedCount, bg: C.yellowLight,text: C.yellowText},
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: s.bg }}>
                <div className="text-4xl font-extrabold mb-0.5" style={{ color: s.text }}>
                  {s.value}
                </div>
                <div className="text-xs font-semibold opacity-60" style={{ color: s.text }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Progress ring text */}
          <div className="text-center mb-6">
            <span className="text-sm text-gray-400">
              正确率{" "}
              <span className="font-bold text-base" style={{ color: C.primary }}>
                {pct}%
              </span>
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {unknownCount > 0 && (
              <button
                onClick={() => startSession("mistakes", sessionMode)}
                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: C.pink, color: C.pinkText }}
              >
                <RefreshCw size={15} />
                复习{MODE_LABEL[sessionMode]}错题（{unknownCount} 项）
              </button>
            )}
            <button
              onClick={() => {
                resetRewardState();
                setSessionWords(shuffle(sessionWords));
                setCurrentIndex(0);
                setIsFlipped(false);
                setCorrectStreak(0);
                setKnownIds(new Set());
                setUnknownIds(new Set());
                setPage("study");
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: C.primary, color: "white" }}
            >
              <RefreshCw size={15} />
              重新开始
            </button>
            <button
              onClick={() => {
                resetRewardState();
                setPage("home");
              }}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-gray-50 text-gray-500 border border-gray-200"
            >
              <Home size={15} />
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MISTAKES ──────────────────────────────────────────────────────
  if (page === "mistakes") {
    const activeMistakeIds = mistakeIdsByMode[mistakeReviewMode];
    const mistakeWords = WORD_DATA.filter((w) => activeMistakeIds.has(w.id));
    const byUnit = UNITS.map((u) => ({
      unit: u,
      words: mistakeWords.filter((w) => w.unit === u),
    })).filter((g) => g.words.length > 0);

    return (
      <div className="min-h-screen bg-white">
        <header
          className="sticky top-0 z-20 bg-white border-b"
          style={{ borderColor: "rgba(171,215,250,0.45)" }}
        >
          <div className="max-w-2xl mx-auto px-5 sm:px-8 py-4 flex items-center gap-3">
            <button
              onClick={() => setPage("home")}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-extrabold text-lg" style={{ color: C.navy }}>
              错题集
            </h1>
            <span className="ml-auto text-sm text-gray-400 tabular-nums">
              {mistakeWords.length} 项
            </span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-5 sm:px-8 py-6">
          <div className="grid grid-cols-2 gap-2 mb-6">
            {(["en-zh", "zh-en"] as StudyMode[]).map((value) => {
              const active = mistakeReviewMode === value;
              const count = mistakeIdsByMode[value].size;
              return (
                <button
                  key={value}
                  onClick={() => setMistakeReviewMode(value)}
                  className="py-2.5 rounded-xl text-sm font-bold border transition-all"
                  style={{
                    background: active ? C.primary : "white",
                    color: active ? "white" : C.navy,
                    borderColor: active ? C.primary : "rgba(171,215,250,0.65)",
                  }}
                >
                  {MODE_LABEL[value]} · {count}项
                </button>
              );
            })}
          </div>
          {mistakeWords.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-4xl mb-3">✨</div>
              <p className="font-semibold text-gray-600">暂无{MODE_LABEL[mistakeReviewMode]}错题</p>
              <p className="text-sm text-gray-400 mt-1.5">
                对应模式里点"不会"的内容会出现在这里
              </p>
              <button
                onClick={() => setPage("home")}
                className="mt-6 px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ background: C.primary, color: "white" }}
              >
                去学习
              </button>
            </div>
          ) : (
            <>
              {byUnit.map((group) => {
                const pal = getUnitPalette(group.unit);
                return (
                  <div key={group.unit} className="mb-7">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full"
                        style={{ background: pal.bg, color: pal.text }}
                      >
                        {group.unit}
                      </span>
                      <span className="text-xs text-gray-400">{group.words.length} 项</span>
                    </div>
                    <div className="space-y-2">
                      {group.words.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors group hover:bg-gray-50"
                          style={{ borderColor: "rgba(0,0,0,0.07)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-bold text-sm" style={{ color: C.navy }}>
                                {w.word}
                              </span>
                              <span
                                className="text-xs text-gray-400"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                {w.phonetic}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              <span className="text-gray-400">{w.partOfSpeech}</span> {w.translation}
                            </div>
                          </div>
                          <button
                            onClick={() => removeMistake(w.id)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 text-gray-300 hover:text-red-400 flex-shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 pb-10 space-y-3">
                <button
                  onClick={() => startSession("mistakes", mistakeReviewMode)}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ background: C.primary, color: "white" }}
                >
                  <BookOpen size={16} />
                  开始复习{MODE_LABEL[mistakeReviewMode]}错题（{mistakeWords.length} 项）
                </button>
                <button
                  onClick={() =>
                    setMistakeIdsByMode((prev) => ({
                      ...prev,
                      [mistakeReviewMode]: new Set(),
                    }))
                  }
                  className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-red-50 hover:text-red-500 text-gray-400 border border-gray-200"
                >
                  <Trash2 size={14} />
                  清空当前方向错题
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  return null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{children}</p>
  );
}

function RewardOverlay({ reward }: { reward: RewardState }) {
  return (
    <div className={`wf-reward-overlay wf-reward-${reward.kind}`} aria-hidden="true">
      {reward.stars.map((star) => (
        <span
          key={`${reward.id}-${star.id}`}
          className="wf-reward-star"
          style={
            {
              "--left": `${star.left}%`,
              "--delay": `${star.delay}ms`,
              "--duration": `${star.duration}ms`,
              "--size": `${star.size}px`,
              "--drift": `${star.drift}px`,
              "--rotate": `${star.rotate}deg`,
              color: star.color,
            } as React.CSSProperties
          }
        >
          ★
        </span>
      ))}
      <div className="wf-reward-copy">
        <div className="wf-reward-title">{reward.title}</div>
        <div className="wf-reward-subtitle">{reward.subtitle}</div>
      </div>
    </div>
  );
}
