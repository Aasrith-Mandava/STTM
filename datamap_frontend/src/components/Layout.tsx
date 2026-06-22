import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, type KeyboardEvent } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ChatSidebar from "./ChatSidebar";
import { useChat } from "../contexts/ChatContext";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";
const NO_SIDEBAR_ROUTES = ["/extract","/", "/dashboard"];

export default function Layout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isChatOpen, setIsChatOpen } = useChat();
  const location = useLocation();
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<{ id: string; text: string; isBot: boolean; timestamp: Date }[]>([]);

  const isProfilingRoute = location.pathname === "/profiling";
  const hideSidebar = NO_SIDEBAR_ROUTES.includes(location.pathname);

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: inputMessage, isBot: false, timestamp: new Date() },
    ]);
    setInputMessage("");
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleSend();
  };

  useEffect(() => {
    const storedValue = sessionStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    setIsSidebarCollapsed(storedValue === "true");
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      sessionStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Header */}
      <Header />

      {/* Sidebar + Main */}
      <div className="flex flex-1 items-stretch overflow-hidden">
        {!hideSidebar && (
          <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={handleToggleSidebar} />
        )}
        <main className="flex-1 min-w-0 px-6 py-4 bg-white overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {!isProfilingRoute && (
        <ChatSidebar
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={messages}
          inputMessage={inputMessage}
          onInputChange={setInputMessage}
          onSend={handleSend}
          onKeyPress={handleKeyPress}
        />
      )}
    </div>
  );
}
