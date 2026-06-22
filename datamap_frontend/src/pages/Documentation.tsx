import { useMemo, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Download } from "lucide-react";
import MermaidDiagram from "../components/MermaidDiagram";
import ArchitectureDiagram from "../components/ArchitectureDiagram";
import AgentArchitectureDiagram from "../components/AgentArchitectureDiagram";
import { API_BASE_URL } from "../config/env";

/**
 * In-app Documentation page (Sidebar → under the Chat option). Explains what
 * DataMap does, its architecture (component diagram), the request flow
 * (sequence diagram), the profiling pipeline, sample-data download, and setup.
 */

const slugify = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

const SECTIONS = [
  "Overview",
  "Key Capabilities",
  "Architecture",
  "Agentic AI Architecture",
  "Request Flow",
  "The Profiling Pipeline",
  "Sample Data",
  "Setup & Installation",
  "Running the App",
  "Configuration",
  "Troubleshooting",
];

const mdComponents = {
  table: ({ children }: { children?: ReactNode }) => (
    <div className="my-5 w-full overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full divide-y divide-gray-200 border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="bg-brand-surface px-3 py-2 text-left font-semibold text-brand-darkblue">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="px-3 py-2 border-t border-gray-100 align-top">{children}</td>
  ),
  code: ({ className, children, ...props }: { className?: string; children?: ReactNode }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return <code className={className} {...props}>{children}</code>;
    }
    return <code className="rounded bg-brand-surface px-1.5 py-0.5 text-[0.85em]" {...props}>{children}</code>;
  },
};

function Md({ children }: { readonly children: string }) {
  return (
    <div className="prose prose-slate max-w-none prose-headings:text-brand-darkblue prose-a:text-brand-primary prose-code:before:content-none prose-code:after:content-none prose-pre:bg-brand-charcoal">
      <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {children}
      </Markdown>
    </div>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section id={slugify(title)} className="scroll-mt-8 mb-10">
      <h2 className="text-xl font-bold text-brand-darkblue border-b border-gray-100 pb-2 mb-4">{title}</h2>
      {children}
    </section>
  );
}

const SEQUENCE = `sequenceDiagram
    actor U as User
    participant FE as React SPA
    participant API as FastAPI Backend
    participant WH as Local Warehouse
    participant AG as AI Agent (ADK)
    participant LLM as Gemini / Groq

    U->>FE: Open app (no login, dev mode)
    U->>FE: Create session, upload CSV/Excel
    FE->>API: POST /sessions/app, /files/upload-batch
    API->>WH: Stage raw files
    FE->>API: POST /files/process-files
    API->>WH: Load tables, build profiling report
    API-->>FE: Tables, data-quality scores, report URL
    U->>FE: Run a pipeline step (e.g. profiling)
    FE->>API: POST /messages/send
    API->>AG: Invoke agent (prompt + tools)
    AG->>WH: Query table metadata / stats
    AG->>LLM: Generate structured response
    LLM-->>AG: text_response + tool_response
    AG-->>API: Final set_model_response
    API-->>FE: { text_response, tool_response }
    FE-->>U: Render results (markdown + structured)`;

const AGENT_LOOP = `sequenceDiagram
    participant API as Endpoint
    participant R as ADK Runner
    participant O as Orchestrator
    participant A as Sub-agent
    participant LLM as LLM (Gemini/Groq)
    participant T as FunctionTool
    participant WH as Warehouse

    API->>R: run_async(session, message, run_config)
    R->>O: user message + session state
    O->>LLM: instruction + tool schemas + history
    LLM-->>O: transfer_to_agent(sub-agent)
    O->>A: hand off by intent / [stage]
    A->>LLM: agent prompt + its tool schemas
    LLM-->>A: function_call: tool(args)
    A->>T: execute(args, tool_context)
    T->>WH: SQL — stats, overlap, keys
    WH-->>T: rows / metrics
    T-->>A: function_response (structured dict)
    A->>LLM: append function_response to context
    Note over A,LLM: loop until the model is ready to answer
    LLM-->>A: function_call: set_model_response(text_response, tool_response)
    A->>A: validate vs output_schema → state_delta[output_key]
    A-->>R: final event
    R-->>API: event stream
    API-->>API: shape { text_response, tool_response, status }`;

export default function Documentation() {
  const toc = useMemo(() => SECTIONS.map((t) => ({ title: t, id: slugify(t) })), []);
  const sampleHref = `${API_BASE_URL}/files/sample-data`;

  return (
    <div className="min-h-screen bg-brand-light text-slate-900 font-sans pb-16">
      <main className="max-w-7xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={26} className="text-brand-darkblue" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-brand-darkblue">Documentation</h1>
        </div>
        <p className="text-slate-500 mb-8">DataMap (STTM) — Source-to-Target Mapping workbench</p>

        <div className="flex gap-8 items-start">
          {/* Table of contents */}
          <nav className="hidden lg:block w-60 shrink-0 sticky top-8">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">
                On this page
              </div>
              <ul className="space-y-1.5">
                {toc.map(({ title, id }) => (
                  <li key={id}>
                    <a href={`#${id}`} className="block text-sm text-slate-600 hover:text-brand-primary transition-colors">
                      {title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Body */}
          <article className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <Section title="Overview">
              <Md>{`**DataMap (STTM)** is an AI-assisted workbench for **Source-to-Target Mapping**.
You upload source data files (CSV / Excel); DataMap loads them into a local
analytical warehouse and runs a sequence of AI agents to **profile**, **relate**,
**document**, **check for anomalies**, and **map** the data to target templates.

It runs **fully standalone** — no external services, no login required. All you
provide is one LLM API key (Google Gemini or Groq).`}</Md>
            </Section>

            <Section title="Key Capabilities">
              <Md>{`- **Automated data profiling** — row/column stats, data-quality scoring, and a full HTML profiling report.
- **Relationship analysis** — detects primary/foreign keys and cross-table relationships.
- **Data dictionary generation** — column-level definitions, types, and keys.
- **Anomaly analysis** — flags column/table anomalies with severity scoring.
- **Reference matching** — similarity checks and reference-table suggestions (vector search).
- **Metadata templates** — fills column and file-spec templates for mapping.
- **Conversational assistant** — ask questions about your data from the Chat panel.`}</Md>
            </Section>

            <Section title="Architecture">
              <Md>{`Two tiers: a **React single-page app** talks to a **FastAPI backend** that hosts
the REST API, the AI agents (Google ADK), and a local SQLite warehouse. The
backend calls an LLM provider (Gemini by default, or Groq via LiteLLM). Sessions
and agent state persist locally — nothing leaves your machine except the LLM calls.`}</Md>
              <div className="my-6 border border-gray-200 rounded-lg p-4 bg-brand-light/40">
                <ArchitectureDiagram />
              </div>
            </Section>

            <Section title="Agentic AI Architecture">
              <Md>{`The AI work runs on **Google ADK**. Each pipeline step is an HTTP call that
spins up an **ADK \`Runner\`**, which drives an **Orchestrator agent**
(\`root_agent\`, an \`LlmAgent\`). The orchestrator reads the user's intent and the
bracketed \`[stage]\` (e.g. \`[Relationship]\`, \`[Data Anomaly Analysis]\`) and
**delegates** to a specialized sub-agent via ADK's \`transfer_to_agent\`. Each
sub-agent owns a small set of **FunctionTools** and a strict **\`output_schema\`**.`}</Md>
              <div className="my-6 border border-gray-200 rounded-lg p-4 bg-brand-light/40">
                <AgentArchitectureDiagram />
              </div>

              <h3 id="how-an-agent-works-internally" className="scroll-mt-8 text-base font-semibold text-brand-darkblue mt-6 mb-2">
                How an agent works internally (the tool-call loop)
              </h3>
              <Md>{`An ADK agent is an LLM wrapped in a **reason → act → observe** loop:

1. The agent is given its **instruction**, the **JSON schemas of its tools**, the conversation **history**, and the current **session state**.
2. The LLM emits a **\`function_call\`** (e.g. \`intelligent_profiling_tool(table_references=[...])\`).
3. ADK executes the matching **\`FunctionTool\`** — a plain Python function that receives the args plus a **\`tool_context\`** (its handle to session state).
4. The tool queries the **local warehouse** (SQL for stats, cardinality, key/overlap detection) and returns a structured **\`function_response\`** dict.
5. The response is appended to the context and the LLM continues — calling more tools if needed.
6. When done, the LLM calls the special **\`set_model_response(text_response, tool_response)\`** tool. ADK validates it against the agent's **\`output_schema\`** and writes it to **\`state_delta[output_key]\`**, which the endpoint reads and returns.

So **agents communicate in two channels**: *tool calls* (agent → tool → warehouse/LLM, returning structured dicts) and the *final structured answer* (\`text_response\` for the UI + \`tool_response\` carrying the raw analysis).`}</Md>

              <div className="my-6 border border-gray-200 rounded-lg p-4 bg-white">
                <MermaidDiagram chart={AGENT_LOOP} />
              </div>

              <h3 id="agents-registry" className="scroll-mt-8 text-base font-semibold text-brand-darkblue mt-6 mb-2">
                Agents
              </h3>
              <Md>{`| Agent | ADK type | Tools | Output schema |
|---|---|---|---|
| \`root_agent\` (orchestrator) | LlmAgent | \`ground_truth_tool\` + routing | — (router) |
| \`profiling_agent\` | Agent | \`intelligent_profiling_tool\`, \`relationship_analysis_tool\` | \`OutputFormatProfiling\` |
| \`profiling_agent_anomaly\` | Agent | \`data_anomaly_analysis_tool\` | \`OutputFormatAnomaly\` |
| \`data_dict_agent\` | LoopAgent (generator → saver) | \`append_chunk_to_bq\`, \`signal_exit\` | \`DataDictionaryResponse\` |
| \`smart_similarity_agent\` | SequentialAgent | \`fetch_metadata_tool\` (2 phases) | \`SemanticMatchingResponse\` |
| \`dart_suggestion_agent\` | LlmAgent | \`dart_suggestions_tool\` (vector search) | \`DartSuggestionResponse\` |
| \`metadata_fill_agent\` | LlmAgent (PlanReAct) | \`bigquery_toolset\`, execution tool | \`MetadataFillHITLResponse\` |`}</Md>

              <h3 id="tools-registry" className="scroll-mt-8 text-base font-semibold text-brand-darkblue mt-6 mb-2">
                Tool calls — inputs, work, and what they return
              </h3>
              <Md>{`| Tool | Receives | Does | Returns | Warehouse | LLM |
|---|---|---|---|---|---|
| \`intelligent_profiling_tool\` | \`table_references[]\`, \`tool_context\` | Per-table stats (nulls, cardinality, samples), PK/composite-key recommendations | \`result[]\` (\`ToolResultItem\`: quality score, column analysis, enhanced analysis) | Yes | Yes (key suggestions) |
| \`relationship_analysis_tool\` | \`table_references\`, \`analysis_depth\` | PK/FK detection, cross-table overlap, composite (AK) keys | \`relationship_analysis_tool_response\` (relationships, table_details, classifications) | Yes | Yes (business context) |
| \`data_anomaly_analysis_tool\` | \`table_references\`, \`anomaly_sensitivity\` | Format/outlier/duplicate/empty detection with severity | \`table_anomaly_reports\`, \`summary_statistics\` | Yes | No (statistical) |
| \`fetch_metadata_tool\` | source + reference tables | Pull column metadata/samples for semantic + overlap matching | match candidates with scores | Yes | Yes (semantic match) |
| \`dart_suggestions_tool\` | source columns | Vector search over reference (DART) catalog + MDR filter | suggested reference tables/columns | Yes (vector) | Yes (rerank) |
| \`set_model_response\` | \`text_response\`, \`tool_response\` | Finalize: validate against \`output_schema\` | the validated final answer | No | — (LLM calls it) |

> Reliability: in standalone mode the backend hardens this loop — \`output_schema\`
> parsing falls back gracefully on shape/JSON mismatch, \`tool_response\` is coerced
> to a dict, and session compaction is rehydrated on reload. Transient LLM hiccups
> (a malformed function call, a hallucinated tool name) surface as "Try again".`}</Md>
            </Section>

            <Section title="Request Flow">
              <Md>{`The sequence below shows a typical run: create a session, upload and process
files, then execute a pipeline step that drives an AI agent and renders results.`}</Md>
              <div className="my-6 border border-gray-200 rounded-lg p-4 bg-white">
                <MermaidDiagram chart={SEQUENCE} />
              </div>
            </Section>

            <Section title="The Profiling Pipeline">
              <Md>{`After uploading + processing, the UI walks through an 8-step pipeline. Steps
1–7 are AI-driven; the warehouse load and HTML report are produced during
processing.

| # | Step | What it does | Endpoint |
|---|---|---|---|
| 1 | Dataset Overview | Profiling report, row/column counts, data-quality score, AI summary | \`POST /messages/send\` |
| 2 | Relationship Analysis | Detects PK/FK and cross-table relationships | \`POST /messages/send\` |
| 3 | Data Dictionary | Column-level dictionary, saved as a table | \`POST /messages/data-dictionary\` |
| 4 | Similarity Check | Compares columns against reference tables | \`POST /messages/similarity-check\` |
| 5 | Reference Suggestion | Suggests reference tables (vector search) | \`POST /dart/dart-suggestion\` |
| 6 | Data Anomaly Analysis | Detects anomalies with severity scoring | \`POST /messages/send\` |
| 7 | Metadata Template | Fills the metadata + file-specs template | \`POST /messages/metadata_fill\` |
| 8 | Detailed Profiling | Full ydata-profiling HTML report | \`GET /reports/{id}.html\` |

> If a step ever shows "Something went wrong, Try again", that's a transient LLM
> hiccup — click **Retry** and it completes.`}</Md>
            </Section>

            <Section title="Sample Data">
              <Md>{`New here? Download the bundled sample datasets (healthcare-style \`providers\`,
\`members\`, \`medical_claims\`, \`groups\` CSVs) and upload them to try the full
pipeline without preparing your own files.`}</Md>
              <a
                href={sampleHref}
                className="inline-flex items-center gap-2 mt-2 rounded-lg bg-brand-primary px-4 py-2 text-white font-medium hover:bg-brand-primary-hover transition-colors no-underline"
              >
                <Download size={18} strokeWidth={1.8} />
                Download sample data (.zip)
              </a>
            </Section>

            <Section title="Setup & Installation">
              <Md>{`**Prerequisites**

- Python 3.12
- Node.js 18+ and npm
- bash shell (macOS / Linux; on Windows use WSL)
- An LLM API key — free Gemini key at <https://aistudio.google.com/apikey>, or a Groq key

**Steps**

1. Download or clone the repository, then \`cd\` into it.
2. Create the backend env file from the template:
   \`\`\`bash
   cp datamap_backend/.env.example datamap_backend/.env
   \`\`\`
3. Add your key to \`datamap_backend/.env\`:
   \`\`\`bash
   # Gemini (default)
   GOOGLE_API_KEY=your-key-here
   # — or — Groq instead:
   # LLM_PROVIDER=groq
   # GROQ_API_KEY=your-groq-key
   \`\`\`
4. Start everything (installs deps on first run):
   \`\`\`bash
   ./start.sh
   \`\`\`
5. Open <http://localhost:5173>.`}</Md>
            </Section>

            <Section title="Running the App">
              <Md>{`\`./start.sh\` creates the Python virtualenv, installs backend + frontend
dependencies, starts the **backend on :8001** and the **frontend on :5173**,
and waits for the backend health check.

- Override ports: \`BACKEND_PORT=8011 FRONTEND_PORT=5173 ./start.sh\`
- Stop both: press **Ctrl+C**.
- The runtime data directory (warehouse, sessions, reports) is created
  automatically on first run.

> If you run \`./start.sh\` before adding a key, the app still launches but AI
> steps will error until you add the key to \`.env\` and restart.`}</Md>
            </Section>

            <Section title="Configuration">
              <Md>{`Backend config is read from \`datamap_backend/.env\`.

| Variable | Default | Purpose |
|---|---|---|
| \`LLM_PROVIDER\` | auto (\`gemini\`) | \`gemini\` or \`groq\`. |
| \`GOOGLE_API_KEY\` | — | Gemini Developer API key. |
| \`GROQ_API_KEY\` | — | Groq API key (set with \`LLM_PROVIDER=groq\`). |
| \`GOOGLE_GENAI_USE_VERTEXAI\` | \`FALSE\` | Keep \`FALSE\` for standalone. |
| \`APP_SESSION_AUTH_MODE\` | \`dev\` | \`dev\` (no login), \`launchpad_sso\`, or \`iap\`. |
| \`DATAMAP_CORS_ORIGINS\` | local origins | Comma-separated CORS allow-list override. |

The frontend reads \`VITE_REACT_API_BASE_URL\` (defaults to \`http://127.0.0.1:8001\`).
Secrets live only in \`.env\`, which is git-ignored.`}</Md>
            </Section>

            <Section title="Troubleshooting">
              <Md>{`| Symptom | Cause | Fix |
|---|---|---|
| "Network Error" on every call | Frontend origin not allowed by CORS | Run the frontend on \`5173\`, or set \`DATAMAP_CORS_ORIGINS\`. |
| "Something went wrong, Try again …" | Transient LLM hiccup | Click **Retry**. |
| AI steps error, no output | Missing/invalid API key | Add \`GOOGLE_API_KEY\` (or Groq key) to \`.env\` and restart. |
| Port already in use | Another process owns the port | Change \`BACKEND_PORT\` / \`FRONTEND_PORT\`. |
| Similarity / Reference "no results" | No reference dataset in standalone | Expected — those need a reference (DART) dataset. |

The interactive API spec is available at \`/docs\` (Swagger) and \`/openapi.json\`.`}</Md>
            </Section>
          </article>
        </div>
      </main>
    </div>
  );
}
