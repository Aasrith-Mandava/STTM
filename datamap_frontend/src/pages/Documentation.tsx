import { useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen } from "lucide-react";

/**
 * In-app Documentation page (reachable from the Sidebar, under the Chat option).
 * Renders comprehensive, low-level documentation for the DataMap / STTM app
 * from a single markdown source, with an auto-generated table of contents.
 */

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

// Each top-level (##) section title — used to build the left-hand TOC and to
// match the auto-generated heading ids in the rendered markdown.
const SECTIONS = [
  "Overview",
  "Architecture",
  "Tech Stack",
  "Running Locally",
  "Configuration & Environment Variables",
  "Authentication Modes",
  "The Data Profiling Pipeline",
  "AI Agents",
  "Backend API Reference",
  "Data Storage & Warehouse",
  "Frontend Structure",
  "LLM Providers & Standalone Patches",
  "Troubleshooting",
];

const DOC = `
# DataMap (STTM) — Technical Documentation

**Source-to-Target Mapping (STTM)** is an AI-assisted data profiling, mapping and
extraction workbench. This page documents the system end-to-end: architecture,
configuration, the profiling pipeline, the AI agents, the HTTP API, storage, and
troubleshooting. It is intended for developers and operators running the app.

---

## Overview

DataMap ingests source data files (CSV / Excel), loads them into a local
analytical warehouse, and then runs a sequence of AI agents to **profile**,
**relate**, **document**, **check anomalies**, and **map** the data to target
templates. It runs fully standalone — no external AI Launchpad and no login are
required.

The app has two tiers:

- **Frontend** — a React + Vite single-page app (default port \`5173\`).
- **Backend** — a FastAPI service (default port \`8001\`) that hosts the REST API,
  the AI agents (Google ADK), and a local SQLite warehouse.

---

## Architecture

\`\`\`
            Browser (React SPA, :5173)
                     |  HTTPS/JSON  (Authorization optional in dev mode)
                     v
            FastAPI backend (:8001)
            |        |            |
   REST routers   AI agents     Local warehouse
   (api/routers)  (Google ADK)  (SQLite + sqlite-vec)
                     |
              LLM provider (Gemini Developer API or Groq via LiteLLM)
\`\`\`

- **Frontend** calls the backend through an Axios instance
  (\`src/utils/axios-interceptor.ts\`). The API base URL is configured by
  \`VITE_REACT_API_BASE_URL\`.
- **Backend** exposes routers under \`api/routers/\` and wires them in
  \`api/main.py\`. Each request resolves a user identity via
  \`api/dependencies/auth.py\`.
- **Agents** live under \`agents/\` and are orchestrated with Google's Agent
  Development Kit (ADK). Sessions persist to a local SQLite
  \`DatabaseSessionService\`.
- **Warehouse** is a local SQLite database (\`datamap_backend/data/warehouse.db\`)
  used as a drop-in for BigQuery — uploaded tables are queried with SQL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Redux Toolkit, React Router, react-markdown |
| Backend | Python 3.12, FastAPI, Uvicorn, Pydantic v2 |
| AI / Agents | Google ADK (\`google.adk\`), google-genai, LiteLLM (multi-provider) |
| LLM | Gemini Developer API (default) or Groq |
| Storage | SQLite warehouse + \`sqlite-vec\`, ADK \`DatabaseSessionService\`, local artifacts/reports |
| Profiling | pandas, NumPy, ydata-profiling |

---

## Running Locally

From the repository root:

\`\`\`bash
./start.sh
\`\`\`

This script:

1. Creates a Python virtualenv at \`datamap_backend/.venv\` and installs
   \`requirements.txt\`.
2. Creates \`datamap_backend/.env\` from \`.env.example\` if missing.
3. Starts the FastAPI backend on \`http://localhost:8001\` and waits for
   \`/health\`.
4. Installs frontend deps and starts Vite on \`http://localhost:5173\`.

Override ports with environment variables:

\`\`\`bash
BACKEND_PORT=8011 FRONTEND_PORT=5173 ./start.sh
\`\`\`

> The backend's CORS allow-list defaults to \`localhost:5173\` / \`localhost:3000\`.
> If you run the frontend on a non-default port, add it to
> \`DATAMAP_CORS_ORIGINS\` (comma-separated) or the browser will report a
> "Network Error".

---

## Configuration & Environment Variables

Backend config is loaded by \`config/settings.py\` from \`datamap_backend/.env\`.

| Variable | Default | Purpose |
|---|---|---|
| \`LLM_PROVIDER\` | \`gemini\` | Which LLM provider to use (\`gemini\` or \`groq\`). |
| \`GOOGLE_API_KEY\` | — | Gemini Developer API key (from aistudio.google.com/apikey). |
| \`GROQ_API_KEY\` | — | Groq API key (from console.groq.com/keys). |
| \`GROQ_MODEL\` / \`GROQ_MAX_TOKENS\` | — | Groq model selection and token cap. |
| \`GOOGLE_GENAI_USE_VERTEXAI\` | \`FALSE\` | Keep \`FALSE\` for standalone (Developer API, no GCP). |
| \`AGENT_MODEL\` | \`gemini-2.5-pro\` | Default model for ADK agents. |
| \`APP_SESSION_AUTH_MODE\` | \`dev\` | Auth mode — see below. |
| \`DATAMAP_CORS_ORIGINS\` | local origins | Comma-separated CORS allow-list override. |

> **Secrets never live in the repo.** \`datamap_backend/.env\` is git-ignored.
> Use \`datamap_backend/.env.example\` as the template and add your own keys.

Frontend config (\`src/config/env.ts\`):

| Variable | Default | Purpose |
|---|---|---|
| \`VITE_REACT_API_BASE_URL\` | \`http://127.0.0.1:8001\` | Backend base URL the SPA calls. |

---

## Authentication Modes

Identity is resolved per-request in \`api/dependencies/auth.py\`, selected by
\`APP_SESSION_AUTH_MODE\`:

- **\`dev\`** *(standalone default)* — no login. A default local user
  (\`local-user\` / \`user@local\`) is assumed, or read from \`x-dev-user-id\` /
  \`x-dev-user-email\` headers if present.
- **\`launchpad_sso\`** — validates an HS256 JWT issued by an external AI
  Launchpad (shared \`SECRET_KEY\`). Not needed for standalone use.
- **\`iap\`** — trusts Google Identity-Aware Proxy headers.

In standalone mode the frontend has no login screen and loads straight to the
Dashboard.

---

## The Data Profiling Pipeline

After a session is created and files are uploaded + processed, the UI walks
through an 8-step pipeline. Steps 1–7 are AI-driven (calls to the message
endpoints); the warehouse load and HTML report are produced during processing.

| # | Step | What it does | Backend endpoint |
|---|---|---|---|
| 1 | **Dataset Overview** | Profiling report, row/column counts, data-quality score, AI summary. | \`POST /messages/send\` ("Do the profiling …") |
| 2 | **Relationship Analysis** | Detects PK/FK and cross-table relationships. | \`POST /messages/send\` ("[Relationship] …") |
| 3 | **Data Dictionary** | Generates a column-level data dictionary and saves it as a table. | \`POST /messages/data-dictionary\` |
| 4 | **Similarity Check** | Compares source columns against reference (DART) tables. | \`POST /messages/similarity-check\` |
| 5 | **Reference Suggestion** | Suggests reference tables via vector search (DART). | \`POST /dart/dart-suggestion\` |
| 6 | **Data Anomaly Analysis** | Detects column/table anomalies with severity scoring. | \`POST /messages/send\` ("[Data Anomaly Analysis] …") |
| 7 | **Metadata Template** | Fills a metadata template (column + file specs). | \`POST /messages/metadata_fill\` |
| 8 | **Detailed Profiling** | Full ydata-profiling HTML report. | \`GET /reports/{report_id}.html\` |

**Setup before the pipeline:**

1. \`POST /sessions/app?module=sess\` — create a session (returns app + vertex
   session ids and app name).
2. \`POST /files/upload-batch\` — stage raw files (\`status: ready_for_processing\`).
3. \`POST /files/process-files\` — load into the warehouse, build the profiling
   report, compute data-quality scores. Returns the created table names.

**Message payload shape** (steps 1, 2, 6 etc.):

\`\`\`json
{
  "appName": "<vertex_app_name>",
  "sessionId": "<vertex_session_id>",
  "userId": "local-user",
  "newMessage": { "parts": [{ "text": "<prompt>" }], "role": "user" },
  "streaming": false,
  "stateDelta": {}
}
\`\`\`

Responses are an array of \`{ text_response, tool_response, ... }\`. The
\`text_response\` is markdown shown in the UI; \`tool_response\` carries structured
results (e.g. \`result\`, \`relationship_analysis_tool_response\`,
\`table_anomaly_reports\`).

> **Transient hiccups:** the LLM may occasionally emit a malformed function call
> or hallucinate a tool name, surfaced as "Something went wrong, Try again". This
> is expected agent behaviour — click **Retry** and the step completes.

---

## AI Agents

Agents live under \`datamap_backend/agents/\` and are built on Google ADK. Key
ones used by the profiling pipeline:

- **profiling_agent** (\`agents/data_map_copilot_agent/sub_agents/profiling_agent\`)
  — handles both profiling and relationship analysis. Output schema
  \`OutputFormatProfiling\`; uses \`intelligent_profiling_tool\` and
  \`relationship_analysis_tool\`.
- **profiling_agent_anomaly** — anomaly detection with \`OutputFormatAnomaly\`.
- **datadict agents** — generate the data dictionary (\`DataDictionaryResponse\`).
- **smart_similarity_agent** — semantic column matching against reference tables.
- **dart_suggestion_agent** — reference-table suggestion via vector search.
- **metadata_fill agents** — populate the Excel metadata template.

Agents return a final \`set_model_response\` function call carrying
\`text_response\` + \`tool_response\`. ADK validates the output against the agent's
\`output_schema\`; when the model's output does not fit the strict schema the
backend falls back to the best-effort parsed object rather than failing the turn.

---

## Backend API Reference

Routers are registered in \`api/main.py\`. Selected endpoints:

**Sessions**
- \`POST /sessions/app?module=sess|extract\` — create an app session.
- \`GET /sessions/app/list\` — list sessions.
- \`GET /sessions/app/{id}\` — session detail.
- \`PATCH /sessions/app/{id}/profiling\` — persist profiling resume state.

**Files**
- \`POST /files/upload-batch\` — stage uploaded files.
- \`POST /files/process-files\` — load + profile files into the warehouse.
- \`GET /files/tables/{dataset_id}\`, \`GET /files/table-info/{table}\`.
- \`GET /files/profiling-reports/{session_id}/{report_id}\` — HTML report.

**Messages (agents)**
- \`POST /messages/send\` — profiling / relationship / anomaly (non-streaming).
- \`POST /messages/data-dictionary\` — data dictionary.
- \`POST /messages/similarity-check\` — similarity vs reference tables.
- \`POST /messages/metadata_fill\` — metadata template.
- \`POST /messages-strm/send-stream-new\` — streaming (SSE) variant.

**Data / DART / Mapping**
- \`GET /data/table\`, \`GET /data/table-schema\`, \`GET /data/default-dataset\`.
- \`POST /dart/dart-suggestion\` — reference suggestions.
- \`POST /mapping/draft\`, \`/mapping/ingest\`, \`/mapping/review/*\`.

**Health**
- \`GET /health\` — liveness/readiness.

> The full machine-readable spec is always available at \`GET /openapi.json\`
> and the interactive docs at \`/docs\` (Swagger UI).

---

## Data Storage & Warehouse

All persistence is local under \`datamap_backend/data/\` (git-ignored):

- **\`warehouse.db\`** — SQLite analytical warehouse. Uploaded files become tables
  (e.g. \`sttm_providers_<hash>\`) queried with SQL via a BigQuery-compatible
  shim (\`utils/local_warehouse\`).
- **ADK sessions** — conversation/agent state persisted by
  \`DatabaseSessionService\` (see \`utils/adk_runtime.py\`).
- **Artifacts & reports** — raw files, resume snapshots, and generated
  ydata-profiling HTML reports.

Because these are generated at runtime, they are excluded from version control.

---

## Frontend Structure

\`\`\`
src/
  pages/         Route screens (Dashboard, ProfilingResult, Sessions, Mapping,
                 Documentation, …)
  components/    Reusable UI (Layout, Sidebar, Header, ChatSidebar, step views)
  end-points/    Axios API wrappers (appSessionsApi, profilingResultApi, …)
  state/         Redux store + slices
  config/        env.ts, branding.ts, messages.ts
  utils/         axios-interceptor, userIdentity, storage helpers
\`\`\`

- **Layout** renders the Header, Sidebar, page \`<Outlet/>\`, and Chat sidebar.
- **Sidebar** holds the primary nav (New Profiling, Mapping, Sessions), the Chat
  toggle, and this **Documentation** link.
- Markdown (like this page) is rendered with \`react-markdown\` + \`remark-gfm\`.

---

## LLM Providers & Standalone Patches

For standalone operation, \`config/settings.py\` applies a few centralized
patches so call sites need no edits:

- **genai client** — all \`genai.Client(...)\` calls are routed to the Gemini
  Developer API using \`GOOGLE_API_KEY\` (ignoring any \`vertexai=True\`), or to a
  Groq-backed compatible client when \`LLM_PROVIDER=groq\`.
- **ADK model resolution** — \`LlmAgent\` models resolve to the selected provider
  (Gemini directly, or \`groq/<model>\` via LiteLLM).
- **Output parsing** — \`output_schema\` results are fence-stripped and parsed
  resiliently; on schema mismatch the raw parsed object is kept instead of
  crashing the turn.
- **Session compaction** — reloaded \`compaction\` event-actions are rehydrated to
  \`EventCompaction\` objects so context-window compaction does not error.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Network Error" on every call | Frontend origin not in CORS allow-list. | Run the frontend on \`5173\`, or set \`DATAMAP_CORS_ORIGINS\`. |
| "Something went wrong, Try again …" | Transient LLM hiccup (malformed function call / bad tool name). | Click **Retry**; it succeeds on re-run. |
| AI steps error with no LLM output | Missing/invalid API key. | Set \`GOOGLE_API_KEY\` (or \`GROQ_API_KEY\` + \`LLM_PROVIDER=groq\`) in \`.env\`. |
| Backend won't bind to its port | Another process owns the port. | Change \`BACKEND_PORT\` / \`FRONTEND_PORT\`, or stop the other process. |
| Profiling "table not found" | Profiling ran before \`process-files\` completed. | Upload → process → then run the pipeline. |

For deeper inspection, the backend logs every event and exposes Swagger UI at
\`/docs\`.
`;

export default function Documentation() {
  const toc = useMemo(
    () => SECTIONS.map((title) => ({ title, id: slugify(title) })),
    [],
  );

  return (
    <div className="min-h-screen bg-brand-light text-slate-900 font-sans pb-16">
      <main className="max-w-7xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen size={26} className="text-brand-darkblue" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-brand-darkblue">Documentation</h1>
        </div>

        <div className="flex gap-8 items-start">
          {/* Table of contents */}
          <nav className="hidden lg:block w-64 shrink-0 sticky top-8">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">
                On this page
              </div>
              <ul className="space-y-1.5">
                {toc.map(({ title, id }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="block text-sm text-slate-600 hover:text-brand-primary transition-colors"
                    >
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Document body */}
          <article className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <div className="prose prose-slate max-w-none prose-headings:text-brand-darkblue prose-a:text-brand-primary prose-code:text-brand-darkblue prose-code:before:content-none prose-code:after:content-none">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 id={slugify(String(children))} className="scroll-mt-8">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 id={slugify(String(children))} className="scroll-mt-8 border-b border-gray-100 pb-1">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 id={slugify(String(children))} className="scroll-mt-8">
                      {children}
                    </h3>
                  ),
                  table: ({ children }) => (
                    <div className="my-5 w-full overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full divide-y divide-gray-200 border-collapse text-sm">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="bg-brand-surface px-3 py-2 text-left font-semibold text-brand-darkblue">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 border-t border-gray-100 align-top">{children}</td>
                  ),
                  code: ({ children, ...props }) => (
                    <code
                      className="rounded bg-brand-surface px-1.5 py-0.5 text-[0.85em]"
                      {...props}
                    >
                      {children}
                    </code>
                  ),
                }}
              >
                {DOC}
              </Markdown>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
