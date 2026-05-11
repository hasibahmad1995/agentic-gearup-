# Quran Search

A semantic search interface for the Quran — built to find verses not by keyword, but by meaning, emotion, and human situation.

---

## The Problem

The Quran has 6,236 verses. When someone is overwhelmed, grieving, losing hope, or searching for guidance on a specific situation in their life, they rarely know which surah or verse number to look for. Traditional search tools return results based on word matching — useful only if you already know what you are looking for.

Most people do not. They know how they feel.

---

## The Objective

Build a search experience where a person can describe:

- A feeling — *"I feel crushed under pressure and can't see a way out"*
- A situation — *"I am dealing with loss and don't know how to move forward"*
- A question — *"How should I respond when someone wrongs me?"*

...and receive the verses most relevant to that experience, ranked by semantic similarity — not keyword overlap.

Each result includes:
- The **Arabic text** in its original Uthmani script
- An **English translation** (Dr. Mustafa Khattab — The Clear Quran)
- An expandable **Tafsir** (scholarly commentary by Ibn Kathir) for deeper context

---

## Current State

The app currently works as a **chapter browser**:

- All 114 chapters (surahs) are loaded from the [Quran.com API v4](https://api.quran.com/api/v4)
- Selecting a chapter fetches all its verses with translation and tafsir
- Dark and light mode supported

Semantic search is the next milestone. The plan:

1. Pre-compute vector embeddings for every verse (translation + tafsir combined)
2. Store in a vector database
3. At query time, embed the user's input and return the closest verses by cosine similarity

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Data | Quran.com public API v4 |
| Fonts | Scheherazade New (Arabic) · Lora (body) · Cormorant Garamond (display) |
| Search (planned) | Embeddings + vector similarity |

---

## Running Locally

```bash
cd quran-search
npm install
npm run dev
```

Open **http://localhost:5173**

No API key required — Quran.com's v4 API is publicly accessible.
