import { getCurrentAppSessionId, setCurrentAppSessionId, setSessionRuntime, setUserEmail } from "../utils/appSessionStorage";
import { apiFetch } from "../utils/apiFetch";

const baseUrl = import.meta.env.VITE_REACT_API_BASE_URL || "http://127.0.0.1:8001";

export interface AppSessionItem {
  id: string;
  title: string;
  status: string;
  user_email: string | null;
  current_profiling_run_id: string | null;
  current_mapping_run_id: string | null;
  current_extract_run_id: string | null;
  active_vertex_session_id: string | null;
  active_vertex_app_name: string | null;
  last_opened_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProfilingRunDetail {
  id: string;
  status: string;
  current_step: string | null;
  profiling_mode: "normal" | "streaming";
  resume_state: Record<string, any>;
  profiling_context_uri: string | null;
  active_vertex_session_id: string | null;
  active_vertex_app_name: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
}

export interface MappingRunDetail {
  id: string;
  status: string;
  current_step: string | null;
  mapping_run_id: string | null;
  resume_state: Record<string, any>;
  artifacts: Record<string, string | null>;
  review_draft?: {
    answers: Record<string, any>;
    feedbacks: Record<string, any>;
    changed_rows: any[];
    active_tab: string | null;
    selected_row_id: string | null;
    last_saved_at: string | null;
  } | null;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
}

export interface ExtractRunDetail {
  id: string;
  status: string;
  current_step: string | null;
  resume_state: Record<string, any>;
  upload_session_id: string | null;
  brd_gcs_uri: string | null;
  layout_gcs_uri: string | null;
  metadata_gcs_uri: string | null;
  driver_gcs_uri: string | null;
  active_vertex_session_id: string | null;
  active_vertex_app_name: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
}

export interface AppSessionDetail {
  session: AppSessionItem;
  profiling_run: ProfilingRunDetail | null;
  mapping_run: MappingRunDetail | null;
  extract_run: ExtractRunDetail | null;
  runtime: {
    vertex_session_id: string | null;
    vertex_app_name: string | null;
    vertex_user_id: string | null;
  };
}

export interface ProfilingRunSummary {
  id: string;
  status: string;
  current_step: string | null;
  profiling_mode: "normal" | "streaming";
  profiling_context_uri: string | null;
  active_vertex_session_id: string | null;
  active_vertex_app_name: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  has_resume: boolean;
}

export interface MappingRunSummary {
  id: string;
  status: string;
  current_step: string | null;
  mapping_run_id: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  has_resume: boolean;
}

export interface ExtractRunSummary {
  id: string;
  status: string;
  current_step: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  has_resume: boolean;
}

export interface AppSessionSummaryDetail {
  session: AppSessionItem;
  profiling_run: ProfilingRunSummary | null;
  mapping_run: MappingRunSummary | null;
  extract_run: ExtractRunSummary | null;
  flags: {
    has_profiling_resume: boolean;
    has_mapping_resume: boolean;
    has_extract_resume: boolean;
  };
}

export function canResumeProfilingRun(detail: AppSessionDetail): boolean {
  return Boolean(detail.profiling_run?.resume_state?.uploadResponse);
}

export function getProfilingRoute(detail: AppSessionDetail): "/profiling" | "/upload" {
  // Large Data Upload (streaming) was removed; route everything through the
  // normal profiling pages so any older streaming session still opens cleanly.
  const hasResume = canResumeProfilingRun(detail);
  return hasResume ? "/profiling" : "/upload";
}

export function canResumeProfilingRunFromSummary(detail: AppSessionSummaryDetail): boolean {
  return Boolean(detail.flags?.has_profiling_resume || detail.profiling_run?.has_resume);
}

export function canResumeMappingRun(detail: AppSessionDetail): boolean {
  const resumeState = detail.mapping_run?.resume_state;
  if (!resumeState) {
    return false;
  }
  return Boolean(
    resumeState.step4Data ||
    resumeState.mappingData ||
    (typeof resumeState.currentStep === "number" && resumeState.currentStep >= 2),
  );
}

export function canResumeMappingRunFromSummary(detail: AppSessionSummaryDetail): boolean {
  return Boolean(detail.flags?.has_mapping_resume || detail.mapping_run?.has_resume);
}

export function canResumeExtractRun(detail: AppSessionDetail): boolean {
  const resumeState = detail.extract_run?.resume_state;
  if (!resumeState) return false;
  return Boolean(resumeState.uploadSessionId || resumeState.brdInfo);
}

async function parseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.message || `Request failed: ${response.status}`);
  }
  return data;
}

function applySessionDetail(detail: AppSessionDetail): AppSessionDetail {
  setCurrentAppSessionId(detail.session.id);
  setUserEmail(detail.session.user_email);
  setSessionRuntime(detail.runtime);
  return detail;
}

export async function listAppSessions(module?: "sess" | "extract"): Promise<AppSessionItem[]> {
  let url = `${baseUrl}/sessions/app/list`;
  if (module) url += `?module=${encodeURIComponent(module)}`;
  const response = await apiFetch(url);
  const data = await parseJson(response);
  return data.sessions || [];
}

export async function createAppSession(title?: string, module?: string): Promise<AppSessionDetail> {
  let url = `${baseUrl}/sessions/app`;
  if (module) url += `?module=${encodeURIComponent(module)}`;
  const response = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const data = await parseJson(response);
  if (data.session?.active_vertex_session_id) {
    sessionStorage.setItem("vertex_session_id", data.session.active_vertex_session_id);
  }
  const detail = await getAppSessionDetail(data.session.id);
  return applySessionDetail(detail);
}

export async function getAppSessionDetail(sessionId: string): Promise<AppSessionDetail> {
  const response = await apiFetch(`${baseUrl}/sessions/app/${sessionId}`);
  const data = await parseJson(response);
  return data as AppSessionDetail;
}

export async function getAppSessionSummary(sessionId: string): Promise<AppSessionSummaryDetail> {
  const response = await apiFetch(`${baseUrl}/sessions/app/${sessionId}/summary`);
  const data = await parseJson(response);
  return data as AppSessionSummaryDetail;
}

export async function selectAppSession(sessionId: string): Promise<AppSessionDetail> {
  const detail = await getAppSessionDetail(sessionId);
  return applySessionDetail(detail);
}

export async function renameAppSession(sessionId: string, title: string): Promise<AppSessionItem> {
  const response = await apiFetch(`${baseUrl}/sessions/app/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const data = await parseJson(response);
  return data.session;
}

export async function deleteAppSession(sessionId: string): Promise<void> {
  const response = await apiFetch(`${baseUrl}/sessions/app/${sessionId}`, { method: "DELETE" });
  await parseJson(response);
  if (getCurrentAppSessionId() === sessionId) {
    setCurrentAppSessionId(null);
  }
}

export async function saveProfilingResumeState(sessionId: string, payload: Record<string, any>) {
  const response = await apiFetch(`${baseUrl}/sessions/app/${sessionId}/profiling`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function saveMappingResumeState(sessionId: string, payload: Record<string, any>) {
  const response = await apiFetch(`${baseUrl}/sessions/app/${sessionId}/mapping`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function saveExtractResumeState(sessionId: string, payload: Record<string, any>) {
  const response = await apiFetch(`${baseUrl}/sessions/app/${sessionId}/extract`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function saveMappingReviewDraft(sessionId: string, payload: Record<string, any>) {
  const response = await apiFetch(`${baseUrl}/sessions/app/${sessionId}/mapping-review-draft`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

function runTimestamp(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function getAppSessionOpenRoute(detail: AppSessionDetail): string {
  // Extract sessions (extract_* ids) always open the Extract workflow.
  if (detail.session.id.startsWith("extract_") || detail.extract_run) {
    return "/extract";
  }
  const profilingRun = detail.profiling_run;
  const mappingRun = detail.mapping_run;
  const profilingRoute = getProfilingRoute(detail);
  const hasProfilingResume = canResumeProfilingRun(detail);

  if (profilingRun && !mappingRun) {
    return profilingRoute;
  }
  if (mappingRun && !profilingRun) {
    return "/mapping";
  }
  if (profilingRun && mappingRun) {
    if (!hasProfilingResume) {
      return "/mapping";
    }
    const profilingTime = Math.max(
      runTimestamp(profilingRun.completed_at),
      runTimestamp(profilingRun.started_at),
    );
    const mappingTime = Math.max(
      runTimestamp(mappingRun.completed_at),
      runTimestamp(mappingRun.started_at),
    );
    return profilingTime >= mappingTime ? profilingRoute : "/mapping";
  }
  return "/upload";
}
