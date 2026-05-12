import { useState, useEffect, useRef } from "react";
import {
  Search, Moon, Sun, BookOpen, Sparkles,
  Loader2, ChevronDown, ScrollText, ArrowLeft, LogOut
} from "lucide-react";
import { useAuth } from "./AuthContext";

// ─── API Config ───────────────────────────────────────────────────────────────

const BASE           = "https://api.quran.com/api/v4";
const TRANSLATION_ID = 20;  // Saheeh International

const TAFSIR_SOURCES = [
  { id: 169, name: "Ibn Kathir" },
  { id: 168, name: "Ma'arif al-Qur'an" },
];

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanTranslation(text = "") {
  const cleaned = stripHtml(text)
    .replace(/\s+\d+\s+/g, " ")  // inline footnote numbers: "Lord 1 of" → "Lord of"
    .replace(/\s+\d+$/g, "")     // trailing footnote numbers: "Merciful. 1" → "Merciful."
    .replace(/\s+-\s*$/g, "")    // trailing dash: "worlds -" → "worlds"
    .replace(/\s+/g, " ")
    .trim();
  // Normalize ending: comma/semicolon → period, no punctuation → period
  return /[.!?…]$/.test(cleaned) ? cleaned : cleaned.replace(/[,;]$/, "") + ".";
}

// ─── Cache helpers (24 h TTL) ─────────────────────────────────────────────────

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, exp } = JSON.parse(raw);
    if (Date.now() > exp) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, exp: Date.now() + 86_400_000 }));
  } catch {} // ignore quota errors silently
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchAllVerses(chapterId) {
  const perPage = 100;
  const url = (page) =>
    `${BASE}/verses/by_chapter/${chapterId}` +
    `?translations=${TRANSLATION_ID}&fields=text_uthmani` +
    `&per_page=${perPage}&page=${page}`;

  const first = await fetch(url(1)).then((r) => r.json());
  const totalPages = first.pagination?.total_pages ?? 1;
  if (totalPages === 1) return first.verses;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetch(url(i + 2)).then((r) => r.json()).then((d) => d.verses)
    )
  );
  return [...first.verses, ...rest.flat()];
}

async function fetchOneTafsirMap(chapterId, sourceId, sourceName) {
  try {
    const perPage = 50;
    const url = (page) =>
      `${BASE}/tafsirs/${sourceId}/by_chapter/${chapterId}` +
      `?per_page=${perPage}&page=${page}`;

    const first = await fetch(url(1)).then((r) => r.json());
    const totalPages = first.pagination?.total_pages ?? 1;
    let all = [...(first.tafsirs ?? [])];

    if (totalPages > 1) {
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          fetch(url(i + 2)).then((r) => r.json()).then((d) => d.tafsirs ?? [])
        )
      );
      all = [...all, ...rest.flat()];
    }

    const map = {};
    for (const t of all) {
      if (t.verse_key && t.text) {
        map[t.verse_key] = { text: stripHtml(t.text), name: sourceName };
      }
    }
    return map;
  } catch { return {}; }
}

async function fetchAllTafsirsMap(chapterId) {
  const maps = await Promise.all(
    TAFSIR_SOURCES.map(({ id, name }) => fetchOneTafsirMap(chapterId, id, name))
  );
  // Merge into verse_key → array of tafsir objects (only non-empty entries)
  const combined = {};
  for (const map of maps) {
    for (const [verseKey, tafsir] of Object.entries(map)) {
      if (!combined[verseKey]) combined[verseKey] = [];
      combined[verseKey].push(tafsir);
    }
  }
  return combined;
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
  const [openIdx, setOpenIdx] = useState(null);

  const translation = cleanTranslation(verse.translations?.[0]?.text ?? "");
  const tafsirs = verse.tafsirs ?? [];

  const toggle = (i) => setOpenIdx((prev) => (prev === i ? null : i));

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
          <span className="text-xs font-semibold tracking-wide truncate" style={{ color: dark ? "#6ee7b7" : "#065f46" }}>
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

        <div className="w-full h-px" style={{ background: dark ? "rgba(55,65,81,0.35)" : "rgba(6,95,70,0.07)" }} />

        {/* Translation */}
        <div
          className="w-full rounded-2xl px-4 py-3"
          style={{
            background: "rgba(35, 119, 29, 0.23)",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(11px)",
            WebkitBackdropFilter: "blur(11px)",
            border: "1px solid rgba(35, 119, 29, 0.1)",
          }}
        >
          <p
            className="w-full text-sm leading-relaxed break-words"
            style={{ fontFamily: '"Lora", Georgia, serif', fontStyle: "italic", color: dark ? "#bbf7d0" : "#14532d" }}
          >
            {translation}
          </p>
        </div>

        {/* Tafsir buttons — one per scholar */}
        {tafsirs.length > 0 && (
          <div className="w-full flex flex-wrap gap-2 justify-end pt-1">
            {tafsirs.map((tafsir, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                style={
                  openIdx === i
                    ? { background: "linear-gradient(135deg, #065f46, #047857)", color: "#fff", boxShadow: "0 2px 8px rgba(6,95,70,0.28)" }
                    : { background: dark ? "rgba(16,185,129,0.09)" : "rgba(6,95,70,0.06)", color: dark ? "#6ee7b7" : "#065f46", border: dark ? "1px solid rgba(16,185,129,0.18)" : "1px solid rgba(6,95,70,0.14)" }
                }
              >
                <BookOpen size={11} />
                {tafsir.name}
                <ChevronDown size={11} style={{ transform: openIdx === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tafsir Accordions — one per scholar */}
      {tafsirs.map((tafsir, i) => (
        <div
          key={i}
          className="w-full grid transition-all duration-300 ease-in-out"
          style={{ gridTemplateRows: openIdx === i ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden min-w-0">
            <div
              className="px-4 sm:px-5 pb-4 border-t"
              style={{ borderColor: dark ? "rgba(52,211,153,0.13)" : "rgba(6,95,70,0.09)" }}
            >
              <div className="flex flex-wrap items-center gap-2 pt-3 pb-2">
                <ScrollText size={13} style={{ color: dark ? "#6ee7b7" : "#065f46", flexShrink: 0 }} />
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: dark ? "#6ee7b7" : "#065f46" }}>
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
                  {tafsir.name}
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
                {tafsir.text.split(/\n+/).filter(Boolean).map((para, j) => (
                  <p
                    key={j}
                    className="text-sm leading-[1.85] mb-3 last:mb-0 break-words"
                    style={{ fontFamily: '"Lora", Georgia, serif', color: dark ? "#94a3b8" : "#44403c" }}
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
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

// ─── Sign-In Modal ────────────────────────────────────────────────────────────

function SignInModal({ dark, onClose, onGoogleSignIn }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden relative"
        style={{
          background: dark ? "rgba(7,18,14,0.98)" : "#fafff8",
          border: dark ? "1px solid rgba(52,211,153,0.18)" : "1px solid rgba(6,95,70,0.12)",
          boxShadow: dark ? "0 32px 80px rgba(0,0,0,0.8)" : "0 32px 80px rgba(6,95,70,0.18)",
          animation: "cardRise 0.25s ease both",
        }}
      >
        {/* Islamic geometric watermark */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: dark ? 0.04 : 0.06 }}>
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            {[0,1,2,3].map(row => [0,1,2,3].map(col => {
              const cx = col * 100 + 50, cy = row * 100 + 50, r = 38;
              const pts = Array.from({length:8},(_,i)=>{
                const a=(i*45-22.5)*Math.PI/180;
                return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;
              }).join(' ');
              return <polygon key={`${row}-${col}`} points={pts} fill="none" stroke="#065f46" strokeWidth="1.5"/>;
            }))}
          </svg>
        </div>

        {/* Top bar with Bismillah and close button */}
        <div
          className="relative flex items-center justify-center px-6 pt-5 pb-4 border-b"
          style={{ borderColor: dark ? "rgba(52,211,153,0.1)" : "rgba(6,95,70,0.07)" }}
        >
          <span
            style={{ fontFamily: "'Scheherazade New', serif", fontSize: "1.1rem", color: dark ? "#6ee7b7" : "#065f46", letterSpacing: "0.05em" }}
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </span>
          <button
            onClick={onClose}
            className="absolute right-6 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-150 cursor-pointer"
            style={{
              background: dark ? "rgba(55,65,81,0.5)" : "rgba(6,95,70,0.07)",
              color: dark ? "#9ca3af" : "#6b7280",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.18)"; e.currentTarget.style.color = "#059669"; }}
            onMouseLeave={e => { e.currentTarget.style.background = dark ? "rgba(55,65,81,0.5)" : "rgba(6,95,70,0.07)"; e.currentTarget.style.color = dark ? "#9ca3af" : "#6b7280"; }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="relative px-10 pt-8 pb-10 flex flex-col items-center text-center">
          {/* Logo */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "linear-gradient(135deg, #065f46 0%, #6ee7b7 100%)", boxShadow: "0 6px 20px rgba(6,95,70,0.4)" }}
          >
            <span style={{ fontFamily: "'Scheherazade New', serif", fontSize: "22px", color: "#fff", lineHeight: 1 }}>
              ﷽
            </span>
          </div>

          <h2
            className="mb-2"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.75rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: dark ? "#f1f5f9" : "#064e3b",
            }}
          >
            Welcome back
          </h2>
          <p
            className="text-sm leading-relaxed mb-8 max-w-xs"
            style={{ fontFamily: "'Lora', serif", color: dark ? "#64748b" : "#78716c" }}
          >
            Sign in to continue your journey through the Quran
          </p>

          {/* Google button */}
          <button
            onClick={onGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-lg active:scale-[0.98] cursor-pointer"
            style={{
              background: dark ? "rgba(255,255,255,0.07)" : "#ffffff",
              color: dark ? "#f1f5f9" : "#3c4043",
              border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid #dadce0",
              boxShadow: dark ? "none" : "0 2px 6px rgba(0,0,0,0.08)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" className="flex-shrink-0">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.8 0-14.6 4.5-17.7 10.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36.5 24 36.5c-5.3 0-9.7-2.9-11.3-7l-6.6 5.1C9.5 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-[11px] mt-4" style={{ color: dark ? "#1f2937" : "#cbd5e1" }}>
            By continuing, you agree to our terms of use.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function QuranSearch() {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [userMenuOpen, setUserMenuOpen]     = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const userMenuRef = useRef(null);

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    setSignInModalOpen(false);
  };

  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");

  // Close user menu when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      const cacheKey = `qs_v2_${chapter.id}`;
      const cached = readCache(cacheKey);
      if (cached) {
        setVerses(cached);
        setVersesLoading(false);
        return;
      }

      const [all, tafsirsMap] = await Promise.all([
        fetchAllVerses(chapter.id),
        fetchAllTafsirsMap(chapter.id),
      ]);
      const merged = all.map((v) => ({ ...v, tafsirs: tafsirsMap[v.verse_key] ?? [] }));
      setVerses(merged);
      writeCache(cacheKey, merged);
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
        button { cursor: pointer; }

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
            <button onClick={closeChapter} className="flex items-center gap-2 select-none min-w-0 bg-transparent border-0 p-0">
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
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Dark mode toggle */}
              <button
                onClick={() => setDark((d) => !d)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  background: dark ? "rgba(55,65,81,0.5)" : "rgba(236,253,245,0.9)",
                  color: dark ? "#fbbf24" : "#374151",
                  border: dark ? "1px solid rgba(75,85,99,0.4)" : "1px solid rgba(6,95,70,0.13)",
                }}
              >
                {dark ? <Sun size={13} /> : <Moon size={13} />}
                <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
              </button>

              {/* Auth */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200"
                    style={{
                      background: dark ? "rgba(16,185,129,0.09)" : "rgba(6,95,70,0.06)",
                      border: dark ? "1px solid rgba(16,185,129,0.18)" : "1px solid rgba(6,95,70,0.13)",
                    }}
                  >
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-6 h-6 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                    <span
                      className="hidden sm:inline text-xs font-medium max-w-[100px] truncate"
                      style={{ color: dark ? "#6ee7b7" : "#065f46" }}
                    >
                      {user.displayName?.split(" ")[0]}
                    </span>
                    <ChevronDown
                      size={11}
                      style={{
                        color: dark ? "#6ee7b7" : "#065f46",
                        transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </button>

                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-50"
                      style={{
                        background: dark ? "rgba(15,25,20,0.97)" : "#ffffff",
                        border: dark ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(6,95,70,0.12)",
                        boxShadow: dark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(6,95,70,0.12)",
                      }}
                    >
                      <div
                        className="px-4 py-3 border-b"
                        style={{ borderColor: dark ? "rgba(55,65,81,0.4)" : "rgba(6,95,70,0.08)" }}
                      >
                        <p className="text-xs font-semibold truncate" style={{ color: dark ? "#f1f5f9" : "#1c1917" }}>
                          {user.displayName}
                        </p>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: dark ? "#64748b" : "#78716c" }}>
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => { signOutUser(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors duration-150 hover:bg-red-50"
                        style={{ color: "#ef4444" }}
                      >
                        <LogOut size={12} />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setSignInModalOpen(true)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    background: dark ? "rgba(16,185,129,0.09)" : "rgba(6,95,70,0.07)",
                    color: dark ? "#6ee7b7" : "#065f46",
                    border: dark ? "1px solid rgba(16,185,129,0.18)" : "1px solid rgba(6,95,70,0.14)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = dark ? "rgba(16,185,129,0.18)" : "rgba(6,95,70,0.13)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = dark ? "rgba(16,185,129,0.09)" : "rgba(6,95,70,0.07)"; }}
                >
                  Sign in
                </button>
              )}
            </div>
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
                className="w-full flex items-center gap-2 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-300 focus-within:ring-2 focus-within:ring-emerald-500/40"
                style={{
                  background: dark ? "rgba(10,20,30,0.94)" : "rgba(255,255,255,0.97)",
                  border: dark ? "1.5px solid rgba(52,211,153,0.2)" : "1.5px solid rgba(6,95,70,0.15)",
                  boxShadow: dark
                    ? "0 4px 28px rgba(0,0,0,0.5)"
                    : "0 4px 28px rgba(6,95,70,0.07), 0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <Sparkles size={16} className="hidden sm:block flex-shrink-0" style={{ color: dark ? "#6ee7b7" : "#059669" }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && query.trim() && null}
                  placeholder="Describe a feeling, situation, or question…"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm px-1 cursor-text"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: dark ? "#f1f5f9" : "#1c1917" }}
                />
                <button
                  disabled={!query.trim()}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
                  style={
                    query.trim()
                      ? { background: "linear-gradient(135deg, #065f46, #047857)", color: "#fff", boxShadow: "0 2px 10px rgba(6,95,70,0.3)" }
                      : { background: dark ? "rgba(31,41,55,0.55)" : "rgba(229,231,235,0.75)", color: dark ? "#6b7280" : "#9ca3af", cursor: "not-allowed" }
                  }
                >
                  <Search size={13} />
                  <span className="hidden sm:inline">Search</span>
                </button>
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

      {/* ── Sign-In Modal ── */}
      {signInModalOpen && (
        <SignInModal
          dark={dark}
          onClose={() => setSignInModalOpen(false)}
          onGoogleSignIn={handleGoogleSignIn}
        />
      )}
    </>
  );
}
