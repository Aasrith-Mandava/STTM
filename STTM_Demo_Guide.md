# STTM — Source-to-Target Mapping
### Client Demo Guide (10-minute walkthrough)

> **How to use this document:** Read it top to bottom — it's written as a continuous
> story. Each section flows into the next, with a suggested time so you finish in
> ~10 minutes. Plain-English talking points are in normal text; the small *"Say
> this"* lines are ready-to-speak sentences.

**Suggested timing**
| # | Section | Time |
|---|---|---|
| 1 | The problem (why this exists) | 1.0 min |
| 2 | What STTM is + the benefits | 1.0 min |
| 3 | How it's built (architecture) | 1.5 min |
| 4 | Live demo — Data Profiling | 3.5 min |
| 5 | Live demo — Data Mapping | 2.5 min |
| 6 | Why it runs locally + close | 0.5 min |
| | **Total** | **~10 min** |

---

## 1. The Problem — why we built this  *(1 min)*

Every time a company moves or integrates data — a new data warehouse, a vendor
feed, a migration, a reporting platform — someone has to answer two hard questions:

1. **"What's actually in this data?"** (Is it clean? What are the columns, the
   keys, the gaps, the duplicates, the weird values?)
2. **"Where does each piece of source data go in the target?"** (Which source
   column feeds which target column, and with what rule?)

Today this is done **by hand**. A Business/Systems Analyst opens the files in
Excel, eyeballs thousands of rows, profiles quality manually, then builds a giant
"source-to-target mapping" spreadsheet column by column. On a real project this
takes **weeks per interface**, it's **error-prone**, it's **inconsistent** between
analysts, and the documentation goes stale the moment the data changes.

> *Say this:* "The root cause is simple — understanding data and mapping it is
> still a manual, slow, expensive, and error-prone process. That's the bottleneck
> in almost every data project."

**This naturally leads to the question: what if an AI did the heavy lifting?**

---

## 2. What STTM Is — and why clients care  *(1 min)*

**STTM is an AI assistant for data analysts.** You give it your data files and your
target schema, and it does two jobs automatically:

- **Profiling** — it reads your data and produces a full health report: columns,
  data types, quality score, keys, relationships, anomalies, a business-friendly
  data dictionary, and a comparison against your reference tables.
- **Mapping** — it figures out how your **source** data should populate your
  **target** tables, generates the mapping rules, asks you smart review questions
  where it's unsure, lets you edit, and exports the final mapping to Excel.

**Why a client should care — the benefits:**

| Manual today | With STTM |
|---|---|
| Weeks per interface | **Hours** |
| Analyst reads rows by hand | **AI profiles automatically** |
| Inconsistent across people | **Consistent, repeatable output** |
| Spreadsheets go stale | **Re-run anytime on new data** |
| Tribal knowledge | **Documented, exportable, auditable** |
| Cloud data exposure concerns | **Runs 100% locally — your data never leaves the machine** |

> *Say this:* "STTM compresses weeks of analyst work into hours, makes it
> consistent and documented, and — importantly — it runs entirely on your own
> machine, so sensitive data never leaves your environment."

**Now that they know *what* it does, show *how* it's built so they trust it.**

---

## 3. How It's Built — Low-Level Architecture  *(1.5 min)*

Keep this part simple and confident. It's three layers plus an AI brain.

```
 ┌──────────────────────────────────────────────────────────────────┐
 │  1) WEB APP (what the user sees)                                  │
 │     React + TypeScript single-page app  →  http://localhost:5173 │
 │     Profiling screens · Mapping screens · Chat · Login           │
 └───────────────┬──────────────────────────────────────────────────┘
                 │  REST / streaming API calls
 ┌───────────────▼──────────────────────────────────────────────────┐
 │  2) BACKEND (the engine)  —  FastAPI (Python) :8001              │
 │     • Receives files, runs the pipelines                          │
 │     • Orchestrates AI "agents" (Google ADK) that do each step     │
 │     • Translates everything to run on a local database            │
 └───────┬───────────────────────────────────────┬──────────────────┘
         │                                        │
 ┌───────▼─────────────┐               ┌──────────▼───────────────────┐
 │  3) LOCAL STORAGE    │               │  4) AI BRAIN (the LLM)        │
 │  All on disk, no cloud│               │  Google Gemini (API key)     │
 │  • warehouse.db (data)│               │  or Groq — via ADK agents    │
 │  • app.db (sessions)  │               │  Reads context, writes SQL,  │
 │  • artifacts/ (files) │               │  generates mappings & text   │
 └──────────────────────┘               └──────────────────────────────┘
```

**In plain English:**
- **The web app** is just the screens. It talks to the backend over the network.
- **The backend** is the brain-stem: it takes your files, stores them, and runs a
  series of small AI "agents," each responsible for one step (profile this table,
  find relationships, generate a mapping rule, answer a question, etc.).
- **The AI brain** is a Large Language Model (Gemini). The agents feed it your
  data's context and it produces the analysis, the SQL, and the mappings.
- **Local storage** is the key trust point: your uploaded data becomes tables in a
  local **SQLite** database file, the reports/mappings are saved as files on disk.
  **There is no cloud database, no external data warehouse — nothing leaves the box.**

> *Say this:* "Originally this ran on Google Cloud. We re-engineered it to run fully
> standalone — a local SQLite database replaces the cloud warehouse, local files
> replace cloud storage — so it installs and runs anywhere, offline-friendly, with
> your data staying private."

**With the foundation explained, let's see it work — starting from a blank session.**

---

## 4. Live Demo — Data Profiling  *(3.5 min)*

> **Before you start:** the app is running (`./start.sh`). Log in with your name,
> click **New Session**, then **New Profiling**.

Walk through it as one continuous flow. Each screen builds on the previous one.

### Step 0 — Upload (the starting step)
You drag in one or more data files (CSV, Excel, JSON, fixed-width, etc.), add a
little context (vendor, frequency, file type), and click **Start Profiling**.
*Behind the scenes:* the backend reads the file, loads it into the **local SQLite
warehouse**, and kicks off the AI pipeline.
> *Say this:* "I just dropped in a providers file. The system loaded it locally and
> is now profiling it automatically."

**That upload becomes the input for every step below — here's what it produces:**

### Step 1 — Dataset Overview
The headline health check: total rows, duplicate rows, and a per-column breakdown —
data types, distinct value samples, null %, blank %, uniqueness, and which columns
look like **primary keys**. There's also a **"View Detailed Profiling Report"**
button that opens a full statistical report (distributions, correlations, missing
values) generated automatically.
> *Say this:* "In seconds we know the shape and quality of the data — no manual
> inspection."

### Step 2 — Relationship Analysis
The AI looks across the columns (and across multiple files if you uploaded several)
and explains how they relate — candidate **foreign keys** and **composite keys**.
> *Say this:* "It's telling us how the tables connect — the kind of thing an analyst
> would normally reverse-engineer by hand."

### Step 3 — Data Dictionary
A business-friendly description of **every column**: name, meaning, type, nullability,
keys. This is the documentation deliverable analysts usually write manually. You can
even **chat** with it to refine a definition.
> *Say this:* "This is auto-generated documentation — column-by-column, in plain
> business language."

### Step 4 — Similarity Check
Compares your uploaded data against your **existing reference tables** — overlap
percentage and a confidence score — so you can spot "we already have this data
somewhere" before you build something new.

### Step 5 — Reference Suggestion
Suggests which reference tables are the best match for your data.

### Step 6 — Data Anomaly Analysis
Flags unusual or inconsistent values — outliers, format problems, suspicious nulls
and duplicates — with a severity breakdown and an overall data-quality score.
> *Say this:* "It proactively surfaces data-quality issues before they cause
> problems downstream."

### Step 7 — Metadata Template
Generates the consolidated **file specification + row-level metadata** in the exact
format analysts hand off — and it exports to Excel.

### Step 8 — Detailed Profiling
The deep-dive table profiling view for anyone who wants the full detail.

### The Chat (throughout profiling)
On the profiling screen there's an **AI chat** — ask natural-language questions like
*"how many rows?"*, *"what columns are in this table?"*, *"what's the average claim
amount?"* — it writes the query, runs it on the local database, and answers.

> **Continuation:** "So profiling has told us *what the data is and how healthy it
> is.* The natural next question is *where does it go?* — that's Mapping."

---

## 5. Live Demo — Data Mapping  *(2.5 min)*

Open the **Mapping** section. This is the namesake feature — **Source-to-Target
Mapping** — and it runs as a clean 4-step pipeline.

### Step 1 — Configuration (the input)
You provide the **source metadata** (the data you profiled) and the **target
metadata** (the destination schema, e.g. an Excel layout), plus optional free-text
**instructions** (your naming conventions, special rules). Click **Generate Mapping**.
> *Say this:* "I'm giving it the source on one side and the target schema on the
> other, and asking it to connect them."

### Step 2 — Draft Generation (the AI does the work)
The AI analyzes both sides and produces a **draft mapping**: for every target
column it decides the **rule type** (Direct, Lookup, Surrogate Key, Default,
Hardcode, etc.), the **source column** that feeds it, any **lookup/join** logic,
filters, and a **confidence indicator**.
> *Say this:* "This table — which target column comes from which source, and how —
> is the deliverable that normally takes an analyst days to build per interface."

### Step 3 — Review (human-in-the-loop)
This is the smart part. Where the AI is unsure, it generates **Review Questions**
for you to answer, and you can **edit any row** directly — change the rule, the
source, the join, add comments. The AI learns from your answers.
> *Say this:* "It's not a black box. It asks for help where it's unsure and lets the
> expert stay in control — that's what makes the output trustworthy."

### Step 4 — Finalize & Export
Click **Finalize Update**: the system applies your edits, regenerates the affected
rows, keeps anything unresolved flagged, and produces the **final mapping**. Then
**Export as Excel** for handoff and downstream implementation.
> *Say this:* "One click and we have a finalized, documented, exportable mapping —
> ready for the engineering team."

> **Continuation:** "And remember — every bit of this, the data and the mapping,
> lives in local files on this machine."

---

## 6. Why It Runs Locally + Close  *(0.5 min)*

- **Data privacy:** uploaded data → local SQLite; reports/mappings → local files.
  Nothing is sent to a cloud warehouse.
- **Portable & low-cost:** no cloud project, no heavy infrastructure to stand up —
  it runs on a laptop or a single server.
- **The only external call** is to the AI model (a Gemini API key); that can be
  swapped for a fully on-prem model later with no change to the rest of the system.

> **Closing line:** "So in ten minutes you've seen STTM take raw files, automatically
> tell us everything about the data's health, and then generate and finalize a
> source-to-target mapping — work that normally takes weeks — running privately on
> your own machine. That's the time, cost, and consistency win for your data teams."

---

## Appendix — One-line answers if the client asks

- **"What AI is it?"** Google Gemini via API key (swappable to Groq or on-prem).
- **"Where's the data stored?"** Local SQLite files + local filesystem. No cloud DB.
- **"What file types?"** CSV, JSON, XML, Excel, PSV/TXT, fixed-width, ZIP, DAT.
- **"Can it handle our naming conventions?"** Yes — via the Instructions box per run.
- **"Is it accurate?"** It drafts; the analyst reviews/edits — best of AI speed +
  human judgment.
- **"How do we run it?"** One command (`./start.sh`) starts the whole app.
