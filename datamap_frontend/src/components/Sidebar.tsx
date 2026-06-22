import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight, FileUp, GitBranch, ListIcon, MessageCircle, Plus, Settings as SettingsIcon } from "lucide-react";

import {
  createAppSession,
  getAppSessionOpenRoute,
  getProfilingRoute,
  listAppSessions,
  selectAppSession,
  type AppSessionItem,
} from "../end-points/appSessionsApi";
import { getCurrentAppSessionId, onSessionChanged, emitNewSessionLoading } from "../utils/appSessionStorage";
import { useChat } from "../contexts/ChatContext";

const links = [
  { to: "/upload", icon: FileUp, title: "New Profiling" },
  { to: "/mapping", icon: GitBranch, title: "Mapping" },
  { to: "/sessions", icon: ListIcon, title: "Sessions" },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const { isChatOpen, setIsChatOpen } = useChat();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AppSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSessionLoading, setNewSessionLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(getCurrentAppSessionId());

  const refreshSessions = async () => {
    setIsLoading(true);
    try {
      const data = await listAppSessions();
      setSessions(data.slice(0, 10));
      setCurrentSessionId(getCurrentAppSessionId());
    } catch (error) {
      console.error("Failed to load app sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSessions();
    return onSessionChanged(() => {
      setCurrentSessionId(getCurrentAppSessionId());
      refreshSessions();
    });
  }, []);

  const handleCreateSession = async () => {
    setNewSessionLoading(true);
    emitNewSessionLoading(true);
    try {
      await createAppSession(undefined, "sess");
      navigate("/upload");
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setNewSessionLoading(false);
      emitNewSessionLoading(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      const detail = await selectAppSession(sessionId);
      setCurrentSessionId(sessionId);
      navigate(getAppSessionOpenRoute(detail));
    } catch (error) {
      console.error("Failed to select session:", error);
    }
  };

  const handleOpenWorkflow = async (
    sessionId: string,
    route: "profiling" | "mapping" | "extract",
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event?.stopPropagation();
    try {
      const detail = await selectAppSession(sessionId);
      setCurrentSessionId(sessionId);
      let target = "/extract";
      if (route === "mapping") target = "/mapping?resume=1";
      else if (route === "profiling") target = getProfilingRoute(detail);
      navigate(target);
    } catch (error) {
      console.error(`Failed to open ${route}:`, error);
    }
  };

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center rounded-lg transition-colors text-sm",
      isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
      isActive ? "bg-white/20 text-white" : "text-white hover:bg-white/15",
    ].join(" ");

  return (
    <aside
      className={[
        "bg-brand-darkblue h-full overflow-y-auto sidebar-scroll p-4 flex flex-col gap-3 transition-all duration-200 border-r border-black/10",
        isCollapsed ? "w-20" : "w-72",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        {!isCollapsed && <div className="text-white/60 text-[11px] font-semibold uppercase tracking-[0.18em]">Menu</div>}
        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <button
              onClick={handleCreateSession}
              disabled={newSessionLoading}
              className="flex items-center justify-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Create session"
            >
              {newSessionLoading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={14} />}
              New Session
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="rounded-md bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      <nav className="flex flex-col gap-[2px]">
        {links.map(({ to, icon: Icon, title }) => (
          <NavLink key={to} to={to} className={linkClasses} title={title}>
            <Icon size={18} strokeWidth={1.5} />
            {!isCollapsed && <span>{title}</span>}
          </NavLink>
        ))}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className={[
              "rounded-lg text-white hover:bg-white/15 transition-colors text-sm cursor-pointer",
              isCollapsed ? "flex justify-center px-2 py-2" : "flex items-center gap-3 px-3 py-2",
            ].join(" ")}
            title="Ask about your data"
          >
            <MessageCircle size={18} strokeWidth={1.5} />
            {!isCollapsed && <span>Chat</span>}
          </button>
        )}
        <NavLink to="/documentation" className={linkClasses} title="Documentation">
          <BookOpen size={18} strokeWidth={1.5} />
          {!isCollapsed && <span>Documentation</span>}
        </NavLink>
        <NavLink to="/settings" className={linkClasses} title="Settings">
          <SettingsIcon size={18} strokeWidth={1.5} />
          {!isCollapsed && <span>Settings</span>}
        </NavLink>
      </nav>
      {/* Session Section   */}
      <div className="border-t border-white/15 pt-4 flex-1 min-h-0">
        <div className="flex items-center justify-between mb-3">
          {!isCollapsed && <div className="text-white/60 text-[11px] font-semibold uppercase tracking-[0.18em]">Recent Sessions</div>}
          <button
            onClick={() => navigate("/sessions")}
            className={[
              "text-white/80 hover:text-white transition-colors cursor-pointer",
              isCollapsed ? "rounded-md bg-white/10 p-2 text-xs hover:bg-white/20" : "text-[11px]",
            ].join(" ")}
            title="Manage sessions"
          >
            {isCollapsed ? <ListIcon size={14} /> : "Manage"}
          </button>
        </div>
        {/* Session Listing */}
        <div>
          <div className="space-y-2 pb-4">
          {isLoading && <div className="text-xs text-white/60 px-2 py-1">Loading sessions...</div>}
          {!isLoading && sessions.length === 0 && (
            <div className="text-xs text-white/60 px-2 py-1">No sessions yet.</div>
          )}
          {sessions.map((session) => {
            const isActive = currentSessionId === session.id;
            return (
              <div
                key={session.id}
                className={[
                  "rounded-lg border transition-colors",
                  isActive ? "border-white/35 bg-white/15" : "border-white/10 bg-white/5 hover:bg-white/10",
                  isCollapsed ? "px-2 py-2" : "px-3 py-2",
                ].join(" ")}
              >
                {isCollapsed ? (
                  <div className="w-full text-center">
                    <button
                      onClick={() => handleSelectSession(session.id)}
                      className="w-full cursor-pointer"
                      title={session.title}
                    >
                      <div className="text-sm text-white font-medium truncate">{session.title.slice(0, 1).toUpperCase()}</div>
                    </button>
                    <div className="mt-1 flex flex-col gap-1 items-center">
                      {session.current_extract_run_id && (
                        <button
                          onClick={(event) => handleOpenWorkflow(session.id, "extract", event)}
                          className="rounded bg-brand-primary/20 px-2 py-1 text-[10px] text-teal-100 hover:bg-brand-primary/30 cursor-pointer"
                          title="Open Extract"
                        >
                          E
                        </button>
                      )}
                      {session.current_profiling_run_id && (
                        <button
                          onClick={(event) => handleOpenWorkflow(session.id, "profiling", event)}
                          className="rounded bg-brand-primary/20 px-2 py-1 text-[10px] text-teal-100 hover:bg-brand-primary/30 cursor-pointer"
                          title="Open Profiling"
                        >
                          P
                        </button>
                      )}
                      {session.current_mapping_run_id && (
                        <button
                          onClick={(event) => handleOpenWorkflow(session.id, "mapping", event)}
                          className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-100 hover:bg-emerald-500/30 cursor-pointer"
                          title="Open Mapping"
                        >
                          M
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleSelectSession(session.id)}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="text-xs text-white font-medium truncate">{session.title}</div>
                    </button>
                    <div className="flex flex-wrap">
                      {session.id.startsWith("extract_") ? (
                        session.current_extract_run_id ? (
                          <button
                            onClick={(event) => handleOpenWorkflow(session.id, "extract", event)}
                            className="rounded-md bg-brand-primary/20 px-2.5 py-1 text-[10px] font-medium text-teal-100 hover:bg-brand-primary/30 transition-colors cursor-pointer mr-2"
                          >
                            Open Extract
                          </button>
                        ) : (
                          <span className="rounded-md border border-white/10 px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors mr-2">No extract</span>
                        )
                      ) : (
                        <>
                          {session.current_profiling_run_id ? (
                            <button
                              onClick={(event) => handleOpenWorkflow(session.id, "profiling", event)}
                              className="rounded-md bg-brand-primary/20 px-2.5 py-1 text-[10px] font-medium text-teal-100 hover:bg-brand-primary/30 transition-colors cursor-pointer mr-2"
                            >
                              Open Profiling
                            </button>
                          ) : (
                            <span className="rounded-md border border-white/10 px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors mr-2">No profiling</span>
                          )}
                          {session.current_mapping_run_id ? (
                            <button
                              onClick={(event) => handleOpenWorkflow(session.id, "mapping", event)}
                              className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/30 transition-colors cursor-pointer mr-2"
                            >
                              Open Mapping
                            </button>
                          ) : (
                            <span className="rounded-md border border-white/10 px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors mr-2">No mapping</span>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </aside>
  );
}