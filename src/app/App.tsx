import { useEffect, useState } from "react";
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
type Mode = "en-zh" | "zh-en" | "mistakes";

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

function getUnitPalette(unit: string) {
  const idx = UNITS.indexOf(unit);
  return UNIT_PALETTE[Math.max(idx, 0) % UNIT_PALETTE.length];
}

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [textbook, setTextbook] = useState(0);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("en-zh");

  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());
  const [unknownIds, setUnknownIds] = useState<Set<number>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [mistakeIds, setMistakeIds] = useState<Set<number>>(new Set());

  const currentWord = sessionWords[currentIndex];
  const total = sessionWords.length;

  useEffect(() => {
    if (page === "study" && mode !== "zh-en" && currentWord) {
      speak(currentWord.word);
    }
  }, [page, mode, currentWord?.id]);

  function startSession(targetMode?: Mode) {
    const m = targetMode ?? mode;
    let words: Word[];
    if (m === "mistakes") {
      words = WORD_DATA.filter((w) => mistakeIds.has(w.id));
    } else {
      words = WORD_DATA.filter((w) => selectedUnits.has(w.unit));
    }
    if (words.length === 0) return;
    setSessionWords(shuffle(words));
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownIds(new Set());
    setUnknownIds(new Set());
    setMode(m);
    setPage("study");
  }

  function handleKnow() {
    setKnownIds((prev) => new Set([...prev, currentWord.id]));
    goNext();
  }

  function handleDontKnow() {
    setUnknownIds((prev) => new Set([...prev, currentWord.id]));
    setMistakeIds((prev) => new Set([...prev, currentWord.id]));
    setIsFlipped(true);
  }

  function goNext() {
    if (currentIndex + 1 >= total) {
      setPage("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
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
    setMistakeIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // ── HOME ──────────────────────────────────────────────────────────
  if (page === "home") {
    const hasMistakes = mistakeIds.size > 0;
    const wordCount = WORD_DATA.filter((w) => selectedUnits.has(w.unit)).length;
    const canStart =
      (mode !== "mistakes" && selectedUnits.size > 0) ||
      (mode === "mistakes" && hasMistakes);

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
              错题集{hasMistakes ? ` (${mistakeIds.size})` : ""}
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
                      {count}词
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
                个单词
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
                    desc: hasMistakes ? `共 ${mistakeIds.size} 个错题` : "暂无错题",
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
                    onClick={() => !disabled && setMode(m.value)}
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
                <span className="font-normal opacity-75 text-sm">· {wordCount} 个单词</span>
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
    const progress = (currentIndex / total) * 100;
    const isBookmarked = bookmarkedIds.has(currentWord.id);

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Top bar */}
        <div className="px-4 sm:px-8 pt-5 pb-3 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setPage("home")}
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
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: pal.bg, color: pal.text }}
                  >
                    {currentWord.unit}
                  </span>
                  <span className="text-xs text-gray-300 select-none">点击翻转</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 pb-4">
                  {mode === "zh-en" ? (
                    <div
                      className="text-3xl sm:text-4xl font-bold text-center leading-snug"
                      style={{ color: C.navy }}
                    >
                      {currentWord.translation}
                    </div>
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
                  {mode === "zh-en" ? (
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
                  <p className="text-sm text-gray-500 text-center italic leading-relaxed max-w-sm">
                    {currentWord.example}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 w-full max-w-md">
            <button
              onClick={handleDontKnow}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.97]"
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
              onClick={goNext}
              className="px-4 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-1 transition-all hover:bg-gray-100 text-gray-400 border border-gray-200"
            >
              <ChevronRight size={16} />
              跳过
            </button>
            <button
              onClick={handleKnow}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.97]"
              style={{
                background: C.greenLight,
                color: C.greenText,
                border: `2px solid ${C.green}`,
              }}
            >
              <Check size={16} />
              会了
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
    const skippedCount = total - knownCount - unknownCount;
    const pct = Math.round((knownCount / total) * 100);

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: "white" }}
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">{pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📖"}</div>
            <h1 className="text-2xl font-extrabold mb-1" style={{ color: C.navy }}>
              本轮完成！
            </h1>
            <p className="text-gray-400 text-sm">共学习了 {total} 个单词</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: "总词数",   value: total,        bg: C.blueLight,  text: C.blueText  },
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
                onClick={() => startSession("mistakes")}
                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: C.pink, color: C.pinkText }}
              >
                <RefreshCw size={15} />
                复习错题（{unknownCount} 词）
              </button>
            )}
            <button
              onClick={() => {
                setSessionWords(shuffle(sessionWords));
                setCurrentIndex(0);
                setIsFlipped(false);
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
              onClick={() => setPage("home")}
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
    const mistakeWords = WORD_DATA.filter((w) => mistakeIds.has(w.id));
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
              {mistakeIds.size} 词
            </span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-5 sm:px-8 py-6">
          {mistakeWords.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-4xl mb-3">✨</div>
              <p className="font-semibold text-gray-600">暂无错题</p>
              <p className="text-sm text-gray-400 mt-1.5">
                学习时点"不会"的单词会出现在这里
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
                      <span className="text-xs text-gray-400">{group.words.length} 词</span>
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
                  onClick={() => startSession("mistakes")}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ background: C.primary, color: "white" }}
                >
                  <BookOpen size={16} />
                  开始复习错题（{mistakeWords.length} 词）
                </button>
                <button
                  onClick={() => setMistakeIds(new Set())}
                  className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-red-50 hover:text-red-500 text-gray-400 border border-gray-200"
                >
                  <Trash2 size={14} />
                  清空全部错题
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
