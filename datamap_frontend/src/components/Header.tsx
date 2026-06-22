import { useNavigate } from "react-router-dom";
import { Home, LogOut } from "lucide-react";

import { BRANDING } from "../config/branding";
import { getUserName, getLaunchpadUrl, logout } from "../utils/userIdentity";
import ustLogo from "../assets/ust-logo.svg";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Header() {
  const navigate = useNavigate();
  const name = getUserName();

  const handleLogout = () => {
    logout();
    // Sign-in is owned by the Launchpad (SSO); return there after logout.
    window.location.assign(getLaunchpadUrl());
  };

  return (
    <header className="bg-white px-6 py-3 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center gap-2.5">
        <img src={ustLogo} alt="UST" className="h-8 w-8" />
        <div className="flex flex-col leading-none">
          <span className="text-brand-darkblue font-bold text-xl tracking-tight">{BRANDING.APP_NAME}</span>
          <span className="text-[10px] text-gray-400 font-medium tracking-wide hidden sm:block">Source‑to‑Target Mapping</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="p-2 text-brand-darkblue hover:bg-brand-surface rounded-lg transition-colors"
          title="Go to Dashboard"
        >
          <Home className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-brand-darkblue text-white text-xs font-bold flex items-center justify-center">
            {initials(name)}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[160px] truncate">{name}</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-darkblue hover:bg-brand-surface rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </header>
  );
}
