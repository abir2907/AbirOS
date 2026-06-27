# AbirOS — User Guide

Your complete manual for using AbirOS, your personal AI operating system. This
covers every module and feature, what each button does, and how to get the most
out of it.

> AbirOS is **single-user, self-hosted, and private**. Everything runs on your
> own machine for free: the AI is local (Ollama), your files stay on your disk,
> and only text/embeddings/metadata go to your private Neon database. Nothing is
> sent to any third party unless you explicitly configure a hosted provider.

---

## Table of contents

1. [The big idea](#1-the-big-idea)
2. [Starting & stopping AbirOS](#2-starting--stopping-abiros)
3. [Getting around (the app shell)](#3-getting-around-the-app-shell)
4. [Dashboard](#4-dashboard)
5. [Command Center (AI chat)](#5-command-center-ai-chat)
6. [Search](#6-search)
7. [Knowledge (your second brain)](#7-knowledge-your-second-brain)
8. [Learning](#8-learning)
9. [Planner](#9-planner)
10. [Developer](#10-developer)
11. [Life](#11-life)
12. [Settings](#12-settings)
13. [The AI agent tools](#13-the-ai-agent-tools)
14. [Tips, privacy & troubleshooting](#14-tips-privacy--troubleshooting)

---

## 1. The big idea

AbirOS keeps **one shared knowledge base** about your digital life. Everything you
add — notes, PDFs, web pages, screenshots, GitHub code, expenses, journal, study
material — is chunked, embedded, and made searchable through the same pipeline.

On top of that base sit **modules** (Knowledge, Learning, Planner, Developer,
Life) and an **AI Command Center** that can answer questions and run workflows
across all of them. The magic is that modules **share data**: a note you saved can
become a flashcard, feed a daily plan, or be cited in a chat answer.

**A typical loop:** add something in **Knowledge** → find it in **Search** → ask
about it in the **Command Center** → turn it into flashcards in **Learning**.

---

## 2. Starting & stopping AbirOS

**To start** (every time you want to use it):
1. Make sure **Ollama** is running (the icon is near your clock; it auto-starts).
2. Open a terminal, go to the project, and run the dev server:
   ```
   cd E:\AbirOS
   pnpm dev
   ```
3. Open **http://localhost:5173** in your browser and sign in.

**To stop:** press **Ctrl+C** in the terminal.

**First-time setup** (database, Ollama, `.env`) is covered in the
[README](README.md). After a phase update, run `pnpm db:migrate` once to apply new
tables, then `pnpm dev`.

**Signing in:** AbirOS has exactly one account. Use the username from your `.env`
(`AUTH_USERNAME`, default `abir`) and the password you created with
`pnpm setup:password`. Your session is remembered for 30 days.

---

## 3. Getting around (the app shell)

- **Left sidebar** — every module. Click the **Collapse** button at the bottom to
  shrink it to icons. (You can hide modules you don't use in **Settings**.)
- **Top bar** — a search/ask box, a **theme toggle** (dark/light), your username,
  and a **log-out** button.
- **Command palette** — press **Ctrl + K** (or ⌘ K) **anywhere** to jump between
  modules or open the Command Center. Start typing a module name and hit Enter.
- **Dark mode** is the default; toggle it with the sun/moon button.

Most screens have **empty states** that tell you exactly how to add data when
they're blank, so you're never stuck.

---

## 4. Dashboard

Your daily cockpit, pulling from every module.

- **Stat cards** (top): cards due for review, commits in the last 30 days, spend
  this month, total sources, and active goals. **Click any card** to jump to that
  module.
- **Today's plan** — the items from today's plan (generate it in the Planner).
- **Recently added** — your latest ingested sources.
- **System status** — live health of your **Database** (Neon + pgvector) and
  **Ollama**. Green = good; amber = that service isn't reachable/configured.

The dashboard refreshes itself, so it's a good "home base" to keep open.

---

## 5. Command Center (AI chat)

The heart of AbirOS — a chat box that answers using **your own knowledge base**.

**How to use it:**
1. Open **Command Center** (sidebar) or press **Ctrl+K → "Ask the AI…"**.
2. Type a question and press **Enter** (Shift+Enter for a new line). Try the
   suggested example prompts if it's your first time.
3. The answer **streams in live**. Below it you'll see **citation chips** — the
   exact sources the answer drew from. Hover to see the full source title.

**What makes it special:** before answering, it runs a **hybrid search** over
everything you've ingested and feeds the most relevant snippets to the AI, with
instructions to **cite them** and not make things up. If your knowledge base
doesn't contain the answer, it will say so rather than guess.

**Good questions to ask:**
- "Summarize everything I know about authentication."
- "What did I save about RAG?"
- "Explain [topic from your notes] simply."

> The model is local (`qwen2.5:7b-instruct` by default), so answers take a few
> seconds. If it feels slow, you can switch to a smaller model in `.env`
> (`OLLAMA_CHAT_MODEL=qwen2.5:3b-instruct`) — no code change needed.

---

## 6. Search

One search bar over **everything** you've ingested.

1. Type a query and press **Search**.
2. Results are **hybrid**: semantic (meaning-based, via embeddings) **and**
   keyword (full-text), fused together so the best matches rise to the top.
3. Each result shows the **source title**, its **type** (note/pdf/web…), a
   **relevance score**, and a snippet.

Search powers the Command Center too — anything you can search, the AI can cite.

---

## 7. Knowledge (your second brain)

Where you **add things** to AbirOS and manage them.

### Add a source
At the top, pick a tab:
- **Note** — give it a title and type/paste any text (Markdown supported).
- **Web page** — paste a URL. AbirOS fetches the article, **archives the raw
  HTML**, and extracts the readable text.
- **PDF / Image** — upload a file. PDFs are parsed for text; **images/screenshots
  are OCR'd locally** (text extracted automatically). Max 25 MB.

Click **Ingest**. The source appears in the list below with a status chip:
**pending → processing → ready** (it updates automatically). "Ready" means it's
chunked, embedded, searchable, and auto-tagged.

### Projects (project memory)
Group related sources under a **project** (e.g. a coursework project or a job).
- Add a project in the **Projects** row (type a name, click **+**).
- Assign any source to a project using the **dropdown** on its row in the list.

### Auto-tags
After ingestion, the AI assigns a few **topic tags** to each source. They appear
as a **tag cloud** with counts — a quick map of what your knowledge base is about.

### Source list
Every source with its type, date, status, project, and a **trash** button to
delete it (soft-delete — it's removed from search).

> The **Knowledge Map** (a visual graph of how your concepts connect) lives in the
> **Learning** module — see below.

---

## 8. Learning

Turn what you've saved into durable knowledge. Five tabs:

### Review (flashcards)
Spaced-repetition review using the **SM-2 algorithm** (the SuperMemo method).
- Cards that are **due** are shown one at a time. Read the front, click **Show
  answer**, then rate how well you knew it: **Again / Hard / Good / Easy**.
- Your rating sets the next review date — easy cards come back in weeks, lapsed
  cards come back tomorrow. The counter shows how many are due.
- When you're caught up, you'll see "All caught up!".

### Study tools
Generate study material from any **ready** source:
- **Summarize** — a short summary + key points (shown inline).
- **Flashcards** — auto-creates Q&A cards (review them in the Review tab).
- **Quiz** — generates a multiple-choice quiz (take it in the Quizzes tab).

### Quizzes
- Pick a quiz → answer the multiple-choice questions → **Submit**.
- It's graded **server-side** (answers aren't pre-loaded in the page), and you get
  your **score**, which answers were right/wrong, and **explanations**.

### Knowledge map
A visual graph of the **entities and relationships** the AI extracted from your
sources. Click **Build map** to extract them, then explore the force-directed
graph — bigger dots are mentioned more often; colors are entity types.

### Gaps
Your weak spots, ranked by how much you're **forgetting** (lapses + overdue cards,
low ease). Use it to decide what to review or re-study.

---

## 9. Planner

Plan your days and steer long-term goals. Three tabs:

### Today
- **Generate plan** — the AI builds a realistic, **time-blocked schedule** for
  today from your calendar events, upcoming assignments, open goal steps, and any
  tasks you added.
- **Add a task** quickly with the input box; tick items off as you go.
- **Sidebar** — upcoming calendar events, and an **Import .ics** box: paste the
  contents of a calendar export (from Google/Apple Calendar) to pull in events.

### Goals (Goal Simulator)
- Add a goal with a **target date**.
- Click **Simulate** — the AI estimates your **success probability (0–100%)**,
  gives a short rationale, and (the first time) generates a **roadmap** of steps.
- Tick off steps as you complete them, and **re-simulate** over time to watch your
  probability trend on a chart.

### University (University Companion)
- Add **courses**, then **assignments** (with due dates — these feed your daily
  plan) and **exams**.
- Tick assignments done as you finish them.
- Click **Generate** under "Exam-prep schedule" to get an AI study schedule leading
  up to your exams and deadlines.

---

## 10. Developer

Your coding life, indexed and analyzed. **Requires a GitHub token** (set
`GITHUB_TOKEN` in `.env` — see README). Four tabs:

### Overview
- **Sync GitHub** — pulls your repos (with languages) and recent commits into a
  local, searchable index.
- **Career Analyzer** — stat cards (repos, commits, stars), a **languages by
  bytes** chart, and a **commits-over-time** chart.
- **Code Historian** — search every commit message and repo. Try "authentication",
  "migration", "rate limit" — find every place you implemented something.
- **Repositories** — your repos, click through to GitHub.

### Interview Coach
Practice interviews and get scored.
1. Enter a **topic** (e.g. "React", "system design", "SQL") and click **Start**.
2. Answer the question — **type it, or click the mic** to speak it (voice uses your
   browser's built-in speech recognition; works best in Chrome).
3. **Submit** — each answer is scored on **relevance**, **confidence**, and
   **delivery** (it counts filler words like "um", "like", "you know"), with
   **feedback** and a **follow-up question**. Keep going to build a session.

### Resume (Resume Evolution)
- **Generate from GitHub** — builds a developer resume (Markdown) from your synced
  activity: summary, skills, projects.
- **Tailor to a job description** — paste a JD and click **Tailor**; the AI rewrites
  the resume to emphasize what's relevant. Every version is saved in the list.

### Time Machine
Replay your growth: a chart of **cumulative commits over time** plus a list of
**project milestones**. (Sync GitHub first.)

---

## 11. Life

Track, analyze, and replay your real life. Four tabs:

### Analytics (metrics)
- Define any **metric** (Sleep, Gym, Mood, Coding minutes, anything) with a unit.
- **Log** values over time. The chart shows your history plus a **simple trend
  forecast** (the green dashed line) and your average.

### Expenses (Expense Detective)
- **Add** an expense, or **Import CSV** (paste a bank/credit export — it matches
  common column names like date/amount/merchant/category).
- You get: **total spend**, a **next-month forecast**, a **category breakdown**
  chart, **detected subscriptions** (recurring charges it found), and **unusual
  charges** (statistical outliers).

### Life Replay (timeline)
- A **unified, searchable timeline** of your life: notes, commits, expenses,
  journal entries, and calendar events — grouped by day. Search to revisit any
  topic or day.
- **Journal box** (sidebar): write a quick entry for any date with an optional mood
  — it shows up on your timeline.

### Dataset (Personal Dataset Generator)
- A **daily-aggregated dataset** of your activity (commits, spend, sources added,
  cards reviewed, journal entries). Preview the recent days, and **Download CSV**
  (or fetch JSON) to train your own models.

---

## 12. Settings

- **AI providers** — which LLM/embedding provider and models you're using.
- **Integrations** — whether GitHub is connected (set `GITHUB_TOKEN` in `.env`).
- **Database usage** — row counts per table, so you can **watch the Neon free
  tier** (it caps around 0.5 GB; embeddings grow fastest).
- **Enabled modules** — toggle modules on/off; disabled ones disappear from the
  sidebar (Dashboard and Settings always stay).
- **Data export** — download your activity dataset as CSV.
- **Danger zone** — **Purge all data** wipes every piece of content (sources,
  chats, flashcards, expenses, everything). Your account and settings remain. Type
  **DELETE** to confirm. *This cannot be undone.*

---

## 13. The AI agent tools

The Command Center is backed by a registry of typed **tools** the system can use to
pull live data from any module:

| Tool | What it pulls |
| --- | --- |
| `search_knowledge` | Hybrid search across everything you've ingested |
| `list_sources` / `get_source` | Your sources / one source's detail |
| `search_code` | Your GitHub commit & repo history (Code Historian) |
| `get_github_activity` | Recent commit activity |
| `get_due_flashcards` / `create_study_plan` | Cards due + weak topics |
| `get_calendar` / `get_tasks` / `get_goals` | Calendar, daily plan, goals |
| `get_expenses` / `get_metrics` | Spending insights, tracked metrics |

Today the Command Center reliably uses `search_knowledge` to answer with citations.
The other tools power the modules directly and are wired for richer multi-step
agent workflows (e.g. "prepare me for tomorrow") as the system grows.

---

## 14. Tips, privacy & troubleshooting

**Privacy**
- Your files stay on your disk; only text, chunks, embeddings, and metadata go to
  **your own** Neon database. The AI is local. Nothing leaves your machine unless
  you set a hosted provider key in `.env`.

**Performance**
- First query after the app is idle can be slow — Neon "wakes up" (a second or
  two) and Ollama loads the model. This is normal.
- If chat feels slow, switch to a smaller model via `OLLAMA_CHAT_MODEL` in `.env`.

**Common issues**
- **Dashboard DB/Ollama amber** → that service isn't running/configured. Check
  Ollama is on (tray icon) and your Neon strings are in `.env`.
- **"Generation failed"** on summaries/plans/interviews → Ollama isn't running or
  the chat model isn't pulled (`ollama list`).
- **Developer tab empty** → add `GITHUB_TOKEN` to `.env`, restart, click **Sync
  GitHub**.
- **Watching storage** → Settings → Database usage. If embeddings grow large, you
  can purge and re-ingest only what you need.

**A good daily workflow**
1. Open the **Dashboard** — see what's due and your plan.
2. **Planner → Generate plan** for the day.
3. **Learning → Review** your due flashcards.
4. Capture anything new in **Knowledge** as you go.
5. Ask the **Command Center** whenever you need to recall or connect ideas.

---

Enjoy your AbirOS. Everything you add makes it smarter about *your* world.
