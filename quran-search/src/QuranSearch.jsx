import { useState, useEffect } from "react";
import {
  Search, Moon, Sun, BookOpen, Sparkles,
  Loader2, ChevronDown, ScrollText, ArrowLeft
} from "lucide-react";

// ─── API Config ───────────────────────────────────────────────────────────────

const BASE           = "https://api.quran.com/api/v4";
const TRANSLATION_ID = 131; // Dr. Mustafa Khattab – The Clear Quran
const TAFSIR_ID      = 169; // Tafsir Ibn Kathir (English)

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchAllVerses(chapterId) {
  const perPage = 50;
  const url = (page) =>
    `${BASE}/verses/by_chapter/${chapterId}` +
    `?translations=${TRANSLATION_ID}&tafsirs=${TAFSIR_ID}` +
    `&fields=text_uthmani&per_page=${perPage}&page=${page}`;

  const firstData = await fetch(url(1)).then((r) => r.json());
  const totalPages = firstData.pagination?.total_pages ?? 1;
  let all = [...firstData.verses];

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        fetch(url(i + 2))
          .then((r) => r.json())
          .then((d) => d.verses)
      )
    );
    for (const batch of rest) all = all.concat(batch);
  }

  return all;
}

// ─── Chapter Card ─────────────────────────────────────────────────────────────

function ChapterCard({ chapter, dark, index, onClick }) {
  return (
    <div
      onClick={onClick}
      className="w-full rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.005]"
      style={{
        animationDelay: `${Math.min(index, 15) * 25}ms`,
        animation: "cardRise 0.4s ease both",
        background: dark ? "rgba(20,30,40,0.88)" : "#ffffff",
        borderColor: dark ? "rgba(52,211,153,0.14)" : "rgba(6,95,70,0.11)",
        boxShadow: dark
          ? "0 2px 20px rgba(0,0,0,0.4)"
          : "0 2px 16px rgba(6,95,70,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Number badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
          style={{ background: "linear-gradient(135deg, #065f46, #047857)", boxShadow: "0 2px 8px rgba(6,95,70,0.3)" }}
        >
          {chapter.id}
        </div>

        {/* Names */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-sm truncate" style={{ color: dark ? "#d1fae5" : "#064e3b" }}>
              {chapter.name_simple}
            </span>
            <span
              className="text-base flex-shrink-0"
              dir="rtl"
              style={{ fontFamily: '"Scheherazade New", serif', color: dark ? "#f1f5f9" : "#1c1917" }}
            >
              {chapter.name_arabic}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px]" style={{ color: dark ? "#64748b" : "#78716c" }}>
              {chapter.translated_name?.name}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                background: dark ? "rgba(16,185,129,0.07)" : "rgba(6,95,70,0.04)",
                color: dark ? "#6ee7b7" : "#047857",
                border: dark ? "1px solid rgba(16,185,129,0.16)" : "1px solid rgba(6,95,70,0.11)",
              }}
            >
              {chapter.verses_count} verses
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
              style={{
                background: dark ? "rgba(30,30,50,0.6)" : "rgba(241,245,249,0.8)",
                color: dark ? "#94a3b8" : "#64748b",
              }}
            >
              {chapter.revelation_place}
            </span>
          </div>
        </div>

        <ChevronDown
          size={14}
          style={{ color: dark ? "#4b5563" : "#9ca3af", transform: "rotate(-90deg)", flexShrink: 0 }}
        />
      </div>
    </div>
  );
}

// ─── Verse Card ───────────────────────────────────────────────────────────────

function VerseCard({ verse, dark, index }) {
  const [tafsirOpen, setTafsirOpen] = useState(false);

  const translation  = verse.translations?.[0]?.text ?? "";
  const rawTafsir    = verse.tafsirs?.[0]?.text ?? "";
  const tafsirText   = stripHtml(rawTafsir);
  const scholarName  = verse.tafsirs?.[0]?.resource_name ?? "Ibn Kathir";

  return (
    <div
      className="w-full rounded-2xl border overflow-hidden flex flex-col transition-shadow duration-300"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: "cardRise 0.5s ease both",
        background: dark ? "rgba(20,30,40,0.88)" : "#ffffff",
        borderColor: dark ? "rgba(52,211,153,0.14)" : "rgba(6,95,70,0.11)",
        boxShadow: dark
          ? "0 2px 20px rgba(0,0,0,0.4)"
          : "0 2px 16px rgba(6,95,70,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Card Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-5 py-3 border-b"
        style={{ borderColor: dark ? "rgba(55,65,81,0.4)" : "rgba(6,95,70,0.08)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-0.5 h-4 rounded-full flex-shrink-0" style={{ background: "#059669" }} />
          <span
            className="text-xs font-semibold tracking-wide truncate"
            style={{ color: dark ? "#6ee7b7" : "#065f46" }}
          >
            {verse.verse_key}
          </span>
        </div>
        <span className="text-[11px] font-medium" style={{ color: dark ? "#9ca3af" : "#6b7280" }}>
          Verse {verse.verse_number}
        </span>
      </div>

      {/* Verse Body */}
      <div className="flex flex-col w-full px-4 sm:px-5 pt-4 pb-3 gap-3 min-w-0">
        {/* Arabic */}
        <p
          className="w-full text-right break-words"
          dir="rtl"
          style={{
            fontFamily: '"Scheherazade New", "Amiri", serif',
            fontSize: "clamp(1.2rem, 5vw, 1.6rem)",
            lineHeight: "2.2",
            color: dark ? "#f1f5f9" : "#1c1917",
          }}
        >
          {verse.text_uthmani}
        </p>

        <div
          className="w-full h-px"
          style={{ background: dark ? "rgba(55,65,81,0.35)" : "rgba(6,95,70,0.07)" }}
        />

        {/* Translation */}
        <p
          className="w-full text-sm leading-relaxed break-words"
          style={{
            fontFamily: '"Lora", Georgia, serif',
            fontStyle: "italic",
            color: dark ? "#cbd5e1" : "#44403c",
          }}
        >
          "{translation}"
        </p>

        {/* Tafsir toggle */}
        {tafsirText && (
          <div className="w-full flex justify-end pt-1">
            <button
              onClick={() => setTafsirOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all duration-200"
              style={
                tafsirOpen
                  ? {
                      background: "linear-gradient(135deg, #065f46, #047857)",
                      color: "#ffffff",
                      boxShadow: "0 2px 8px rgba(6,95,70,0.28)",
                    }
                  : {
                      background: dark ? "rgba(16,185,129,0.09)" : "rgba(6,95,70,0.06)",
                      color: dark ? "#6ee7b7" : "#065f46",
                      border: dark ? "1px solid rgba(16,185,129,0.18)" : "1px solid rgba(6,95,70,0.14)",
                    }
              }
            >
              <BookOpen size={11} />
              {tafsirOpen ? "Hide Tafsir" : "Read Tafsir"}
              <ChevronDown
                size={11}
                style={{
                  transform: tafsirOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                }}
              />
            </button>
          </div>
        )}
      </div>

      {/* Tafsir Accordion */}
      {tafsirText && (
        <div
          className="w-full grid transition-all duration-300 ease-in-out"
          style={{ gridTemplateRows: tafsirOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden min-w-0">
            <div
              className="px-4 sm:px-5 pb-4 border-t"
              style={{ borderColor: dark ? "rgba(52,211,153,0.13)" : "rgba(6,95,70,0.09)" }}
            >
              <div className="flex flex-wrap items-center gap-2 pt-3 pb-2">
                <ScrollText size={13} style={{ color: dark ? "#6ee7b7" : "#065f46", flexShrink: 0 }} />
                <span
                  className="text-[10px] font-bold tracking-[0.14em] uppercase"
                  style={{ color: dark ? "#6ee7b7" : "#065f46" }}
                >
                  Tafsir
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: dark ? "rgba(16,185,129,0.09)" : "rgba(6,95,70,0.05)",
                    color: dark ? "#a7f3d0" : "#047857",
                    border: dark ? "1px solid rgba(16,185,129,0.14)" : "1px solid rgba(6,95,70,0.1)",
                  }}
                >
                  {scholarName}
                </span>
              </div>

              <div
                className="tafsir-scroll overflow-y-auto rounded-xl p-4 w-full"
                style={{
                  maxHeight: "350px",
                  background: dark ? "rgba(7,20,14,0.55)" : "rgba(236,253,245,0.55)",
                  border: dark ? "1px solid rgba(52,211,153,0.1)" : "1px solid rgba(6,95,70,0.08)",
                }}
              >
                {tafsirText.split(/\n+/).filter(Boolean).map((para, i) => (
                  <p
                    key={i}
                    className="text-sm leading-[1.85] mb-3 last:mb-0 break-words"
                    style={{
                      fontFamily: '"Lora", Georgia, serif',
                      color: dark ? "#94a3b8" : "#44403c",
                    }}
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Cards ───────────────────────────────────────────────────────────

function SkeletonVerseCard({ dark }) {
  return (
    <div
      className="w-full rounded-2xl border p-4 sm:p-5 space-y-4"
      style={{
        background: dark ? "rgba(20,30,40,0.75)" : "rgba(255,255,255,0.85)",
        borderColor: dark ? "rgba(55,65,81,0.35)" : "rgba(6,95,70,0.07)",
      }}
    >
      <div className="flex justify-between gap-3">
        <div className="h-3 w-20 rounded-full animate-pulse" style={{ background: dark ? "#1f2937" : "#e5e7eb" }} />
        <div className="h-3 w-14 rounded-full animate-pulse" style={{ background: dark ? "#1f2937" : "#e5e7eb" }} />
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="h-4 w-5/6 rounded-full animate-pulse" style={{ background: dark ? "#1f2937" : "#f3f4f6" }} />
        <div className="h-4 w-3/5 rounded-full animate-pulse" style={{ background: dark ? "#1f2937" : "#f3f4f6" }} />
        <div className="h-4 w-2/5 rounded-full animate-pulse" style={{ background: dark ? "#1f2937" : "#f3f4f6" }} />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded-full animate-pulse" style={{ background: dark ? "#111827" : "#f9fafb" }} />
        <div className="h-3 w-3/4 rounded-full animate-pulse" style={{ background: dark ? "#111827" : "#f9fafb" }} />
      </div>
    </div>
  );
}

function SkeletonChapterCard({ dark }) {
  return (
    <div
      className="w-full rounded-2xl border p-3"
      style={{
        background: dark ? "rgba(20,30,40,0.75)" : "rgba(255,255,255,0.85)",
        borderColor: dark ? "rgba(55,65,81,0.35)" : "rgba(6,95,70,0.07)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl animate-pulse flex-shrink-0"
          style={{ background: dark ? "#1f2937" : "#e5e7eb" }}
        />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded-full animate-pulse" style={{ background: dark ? "#1f2937" : "#e5e7eb" }} />
          <div className="h-2.5 w-1/2 rounded-full animate-pulse" style={{ background: dark ? "#111827" : "#f3f4f6" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function QuranSearch() {
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");

  const [chapters, setChapters]               = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersError, setChaptersError]     = useState(null);

  const [selectedChapter, setSelectedChapter] = useState(null);
  const [verses, setVerses]                   = useState([]);
  const [versesLoading, setVersesLoading]     = useState(false);
  const [versesError, setVersesError]         = useState(null);

  useEffect(() => {
    fetch(`${BASE}/chapters?language=en`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setChapters(data.chapters ?? []))
      .catch((err) => setChaptersError(err.message))
      .finally(() => setChaptersLoading(false));
  }, []);

  const openChapter = async (chapter) => {
    setSelectedChapter(chapter);
    setVerses([]);
    setVersesError(null);
    setVersesLoading(true);
    try {
      const all = await fetchAllVerses(chapter.id);
      setVerses(all);
    } catch (err) {
      setVersesError(err.message);
    } finally {
      setVersesLoading(false);
    }
  };

  const closeChapter = () => {
    setSelectedChapter(null);
    setVerses([]);
    setVersesError(null);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        @keyframes cardRise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .tafsir-scroll { scrollbar-width: thin; scrollbar-color: #6ee7b7 transparent; }
        .tafsir-scroll::-webkit-scrollbar { width: 5px; }
        .tafsir-scroll::-webkit-scrollbar-track { background: transparent; border-radius: 99px; }
        .tafsir-scroll::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.45); border-radius: 99px; }
        .tafsir-scroll::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.85); }
      `}</style>

      <div
        className="min-h-screen w-full flex flex-col items-center"
        style={{
          background: dark
            ? "linear-gradient(158deg, #071410 0%, #0f172a 48%, #111827 100%)"
            : "linear-gradient(158deg, #d1fae5 0%, #ecfdf5 28%, #f8fafc 62%, #ffffff 100%)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: dark ? "#f1f5f9" : "#1c1917",
          overflowX: "hidden",
        }}
      >
        {/* ── Sticky Header ── */}
        <header
          className="w-full sticky top-0 z-10 border-b flex justify-center"
          style={{
            background: dark ? "rgba(7,20,16,0.9)" : "rgba(255,255,255,0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderColor: dark ? "rgba(52,211,153,0.11)" : "rgba(6,95,70,0.09)",
          }}
        >
          <div className="w-full max-w-4xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 select-none min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: "linear-gradient(135deg, #065f46, #047857)" }}
              >
                <span style={{ fontFamily: "'Scheherazade New', serif", fontSize: "10px", lineHeight: "1", color: "#fde68a" }}>
                  ﷽
                </span>
              </div>
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="font-semibold text-sm" style={{ color: dark ? "#6ee7b7" : "#065f46" }}>Quran</span>
                <span className="font-light text-sm" style={{ color: dark ? "#64748b" : "#78716c" }}>Search</span>
              </div>
              <span
                className="hidden sm:inline text-[9px] font-bold tracking-[0.13em] uppercase px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  background: dark ? "rgba(16,185,129,0.09)" : "rgba(6,95,70,0.06)",
                  color: dark ? "#6ee7b7" : "#065f46",
                  border: dark ? "1px solid rgba(16,185,129,0.17)" : "1px solid rgba(6,95,70,0.13)",
                }}
              >
                Semantic AI
              </span>
            </div>
            <button
              onClick={() => setDark((d) => !d)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0"
              style={{
                background: dark ? "rgba(55,65,81,0.5)" : "rgba(236,253,245,0.9)",
                color: dark ? "#fbbf24" : "#374151",
                border: dark ? "1px solid rgba(75,85,99,0.4)" : "1px solid rgba(6,95,70,0.13)",
              }}
            >
              {dark
                ? <Sun size={13} />
                : <Moon size={13} />}
              <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>

        {/* ── Hero + Search (chapters view only) ── */}
        {!selectedChapter && (
          <div className="w-full max-w-4xl px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 flex flex-col items-center">
            <h1
              className="text-center font-light leading-tight mb-6 sm:mb-8 w-full"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(1.65rem, 5vw, 2.9rem)",
                letterSpacing: "-0.02em",
                color: dark ? "#d1fae5" : "#064e3b",
              }}
            >
              Discover the Quran{" "}
              <span style={{ fontStyle: "italic", color: dark ? "#6ee7b7" : "#065f46" }}>
                by Meaning
              </span>
            </h1>

            <div className="w-full max-w-2xl">
              <div
                className="w-full flex items-center gap-2 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3"
                style={{
                  background: dark ? "rgba(10,20,30,0.94)" : "rgba(255,255,255,0.97)",
                  border: dark ? "1.5px solid rgba(52,211,153,0.15)" : "1.5px solid rgba(6,95,70,0.12)",
                  boxShadow: dark
                    ? "0 4px 28px rgba(0,0,0,0.5)"
                    : "0 4px 28px rgba(6,95,70,0.07), 0 1px 3px rgba(0,0,0,0.04)",
                  opacity: 0.7,
                }}
              >
                <Sparkles size={16} className="hidden sm:block flex-shrink-0" style={{ color: dark ? "#6ee7b7" : "#059669" }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Semantic search coming soon — browse chapters below"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm px-1 cursor-not-allowed"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: dark ? "#64748b" : "#9ca3af" }}
                  readOnly
                />
                <Search size={14} style={{ color: dark ? "#4b5563" : "#9ca3af", flexShrink: 0 }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <div className="w-full max-w-4xl px-4 sm:px-6 pb-20">

          {/* ── Chapters View ── */}
          {!selectedChapter && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <div
                className="flex items-center justify-between mb-5 pb-3 border-b"
                style={{ borderColor: dark ? "rgba(52,211,153,0.11)" : "rgba(6,95,70,0.09)" }}
              >
                <p className="text-xs" style={{ color: dark ? "#94a3b8" : "#78716c" }}>
                  <span className="font-semibold" style={{ color: dark ? "#f1f5f9" : "#1c1917" }}>
                    114 Chapters
                  </span>
                  {" "}· Select a chapter to read its verses and tafsir
                </p>
              </div>

              {chaptersError && (
                <p className="text-sm text-center py-10" style={{ color: "#ef4444" }}>
                  Failed to load chapters: {chaptersError}
                </p>
              )}

              {chaptersLoading
                ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 12 }, (_, i) => <SkeletonChapterCard key={i} dark={dark} />)}
                  </div>
                )
                : (
                  <div className="flex flex-col gap-3">
                    {chapters.map((ch, i) => (
                      <ChapterCard key={ch.id} chapter={ch} dark={dark} index={i} onClick={() => openChapter(ch)} />
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* ── Chapter Detail / Verses View ── */}
          {selectedChapter && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              {/* Back + Chapter Header */}
              <div
                className="flex flex-wrap items-center gap-3 mb-5 pb-4 border-b"
                style={{ borderColor: dark ? "rgba(52,211,153,0.11)" : "rgba(6,95,70,0.09)" }}
              >
                <button
                  onClick={closeChapter}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                  style={{
                    background: dark ? "rgba(31,41,55,0.6)" : "rgba(236,253,245,0.9)",
                    color: dark ? "#6ee7b7" : "#065f46",
                    border: dark ? "1px solid rgba(52,211,153,0.18)" : "1px solid rgba(6,95,70,0.13)",
                  }}
                >
                  <ArrowLeft size={12} />
                  All Chapters
                </button>

                <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold text-sm" style={{ color: dark ? "#d1fae5" : "#064e3b" }}>
                    {selectedChapter.name_simple}
                  </span>
                  <span className="text-xs" style={{ color: dark ? "#64748b" : "#78716c" }}>
                    · {selectedChapter.translated_name?.name}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: dark ? "rgba(16,185,129,0.07)" : "rgba(6,95,70,0.04)",
                      color: dark ? "#6ee7b7" : "#047857",
                      border: dark ? "1px solid rgba(16,185,129,0.16)" : "1px solid rgba(6,95,70,0.11)",
                    }}
                  >
                    {selectedChapter.verses_count} verses
                  </span>
                </div>

                <span
                  dir="rtl"
                  style={{ fontFamily: '"Scheherazade New", serif', fontSize: "1.4rem", color: dark ? "#f1f5f9" : "#1c1917" }}
                >
                  {selectedChapter.name_arabic}
                </span>
              </div>

              {versesError && (
                <p className="text-sm text-center py-10" style={{ color: "#ef4444" }}>
                  Failed to load verses: {versesError}
                </p>
              )}

              {versesLoading && (
                <div className="flex flex-col gap-5">
                  <p
                    className="text-xs text-center mb-2 flex items-center justify-center gap-2"
                    style={{ color: dark ? "#6ee7b7" : "#047857" }}
                  >
                    <Loader2 size={12} className="animate-spin" />
                    Loading verses and tafsir…
                  </p>
                  {[0, 1, 2].map((i) => <SkeletonVerseCard key={i} dark={dark} />)}
                </div>
              )}

              {!versesLoading && !versesError && verses.length > 0 && (
                <div className="flex flex-col gap-5">
                  {verses.map((verse, i) => (
                    <VerseCard key={verse.id} verse={verse} dark={dark} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
