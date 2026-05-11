# Quran Search

Find Quran verses by meaning — not by keyword. Describe how you feel or what you are going through, and the right verse finds you.

**Live →** https://hasibahmad1995.github.io/agentic-gearup-/

---

## The Problem

The Quran has 6,236 verses. When someone is overwhelmed, grieving, or searching for guidance, they rarely know which surah or verse to look for. Keyword search only works if you already know what you are looking for.

Most people don't. They know how they feel.

---

## What It Does

Describe a feeling, a situation, or a question in plain language:

> *"I feel crushed under pressure and can't see a way out"*  
> *"I am dealing with loss and don't know how to move forward"*  
> *"How should I respond when someone wrongs me?"*

The app returns the most relevant verses ranked by meaning — not word matching. Each result shows the Arabic text, an English translation, and expandable scholarly commentary (tafsir).

---

## Status

| Feature | State |
|---|---|
| Browse all 114 chapters | ✅ Live |
| Verse + translation per chapter | ✅ Live |
| Ibn Kathir tafsir per verse | ✅ Live |
| Dark / light mode | ✅ Live |
| Semantic search by meaning | 🔜 Next milestone |

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Data | Quran.com API v4 — no key required |
| Fonts | Scheherazade New · Lora · Cormorant Garamond |
| Search (planned) | Vector embeddings + cosine similarity |

---

## Run Locally

```bash
git clone https://github.com/hasibahmad1995/agentic-gearup-
cd agentic-gearup-/quran-search
npm install
npm run dev
```
