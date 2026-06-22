import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  deleteAppSession,
  getAppSessionOpenRoute,
  getProfilingRoute,
  listAppSessions,
  renameAppSession,
  selectAppSession,
  type AppSessionItem,
} from "../end-points/appSessionsApi";
import { getCurrentAppSessionId, onSessionChanged } from "../utils/appSessionStorage";

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : "Not available");

export default function Sessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AppSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(getCurrentAppSessionId());

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAppSessions();
      setSessions(data);
      setCurrentSessionId(getCurrentAppSessionId());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    return onSessionChanged(() => {
      setCurrentSessionId(getCurrentAppSessionId());
      refresh();
    });
  }, []);

  const handleSelect = async (sessionId: string) => {
    try {
      const detail = await selectAppSession(sessionId);
      navigate(getAppSessionOpenRoute(detail));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open session");
    }
  };

  const handleOpenWorkflow = async (sessionId: string, route: "profiling" | "mapping" | "extract") => {
    try {
      const detail = await selectAppSession(sessionId);
      let target = "/extract";
      if (route === "mapping") target = "/mapping?resume=1";
      else if (route === "profiling") target = getProfilingRoute(detail);
      navigate(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to open ${route}`);
    }
  };

  const handleRename = async (session: AppSessionItem) => {
    const nextTitle = globalThis.prompt("Rename session", session.title);
    if (!nextTitle || nextTitle.trim() === session.title) return;
    try {
      await renameAppSession(session.id, nextTitle.trim());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename session");
    }
  };

  const handleDelete = async (session: AppSessionItem) => {
    const confirmed = globalThis.confirm(`Delete session "${session.title}"?`);
    if (!confirmed) return;
    try {
      await deleteAppSession(session.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold mb-1 text-brand-darkblue">Sessions</h2>
          <p className="text-sm text-gray-500">Select, rename, or delete your sessions.</p>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading sessions...</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!loading && !error && (
        <div className="space-y-4">
          {sessions.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
              No sessions yet.
            </div>
          )}
          {sessions.map((session) => {
            const isActive = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                className={[
                  "rounded-lg border p-4 shadow-sm transition-colors",
                  isActive ? "border-teal-200 bg-brand-surface" : "border-gray-200 bg-white",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <button className="text-left flex-1 cursor-pointer" onClick={() => handleSelect(session.id)}>
                    <div className="text-base font-semibold text-brand-darkblue">{session.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{session.id}</div>
                    <div className="mt-3 flex gap-4 text-xs text-gray-600">
                      {session.id.startsWith("extract_") ? (
                        <span>{session.current_extract_run_id ? "Extract saved" : "No extract run"}</span>
                      ) : (
                        <>
                          <span>{session.current_profiling_run_id ? "Profiling saved" : "No profiling run"}</span>
                          <span>{session.current_mapping_run_id ? "Mapping saved" : "No mapping run"}</span>
                        </>
                      )}
                      <span>Updated {formatDate(session.updated_at)}</span>
                    </div>
                  </button>
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {session.current_extract_run_id && (
                      <button
                        onClick={() => handleOpenWorkflow(session.id, "extract")}
                        className="rounded-md border border-teal-200 bg-brand-surface px-3 py-1.5 text-sm text-font-blue hover:bg-teal-100 cursor-pointer"
                      >
                        Open Extract
                      </button>
                    )}
                    {session.current_profiling_run_id && (
                      <button
                        onClick={() => handleOpenWorkflow(session.id, "profiling")}
                        className="rounded-md border border-teal-200 bg-brand-surface px-3 py-1.5 text-sm text-font-blue hover:bg-teal-100 cursor-pointer"
                      >
                        Open Profiling
                      </button>
                    )}
                    {session.current_mapping_run_id && (
                      <button
                        onClick={() => handleOpenWorkflow(session.id, "mapping")}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      >
                        Open Mapping
                      </button>
                    )}
                    <button
                      onClick={() => handleRename(session)}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(session)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
