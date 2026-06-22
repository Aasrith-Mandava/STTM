/**
 * Identity for this app — driven by the AI Launchpad single sign-on (SSO).
 *
 * DataMap no longer has its own login. It is launched from the Launchpad, which
 * hands off its JWT in the URL fragment (`#lp_token=...`). We consume that token
 * into localStorage ("token") and derive the user identity from the JWT's `sub`
 * (email) claim. Every API request then carries `Authorization: Bearer <token>`
 * (see axios-interceptor.ts / apiFetch.ts); the backend resolves the user from
 * that token. There is no separate DataMap user store or password.
 */

const TOKEN_KEY = "token";

// Legacy local-identity keys (kept only so logout can clear any stale values
// left over from the previous standalone login).
const USER_ID_KEY = "ust_user_id";
const USER_EMAIL_KEY = "ust_user_email";
const USER_NAME_KEY = "ust_user_name";
const LOGGED_IN_KEY = "ust_logged_in";

type JwtPayload = {
  sub?: string;
  user_id?: string | number;
  name?: string;
  exp?: number;
  [key: string]: unknown;
};

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const withPad = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  return decodeURIComponent(
    atob(withPad)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
}

/** Decode (without verifying) the stored Launchpad JWT. Verification happens server-side. */
function getTokenPayload(token: string): JwtPayload | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    return JSON.parse(base64UrlDecode(segment)) as JwtPayload;
  } catch {
    return null;
  }
}

/** The raw Launchpad JWT, or "" if none is stored. */
export function getAuthToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

/**
 * Consume an `lp_token` handed off by the Launchpad via the URL hash or query,
 * persist it as the auth token, and strip it from the address bar. Call once at
 * startup (before rendering). Mirrors the Launchpad's own SSO token handoff.
 */
export function consumeSsoTokenFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams((url.hash || "").replace(/^#/, ""));
    const token = hashParams.get("lp_token") || url.searchParams.get("lp_token");
    if (!token) return;

    localStorage.setItem(TOKEN_KEY, token);

    hashParams.delete("lp_token");
    url.searchParams.delete("lp_token");
    const newHash = hashParams.toString();
    url.hash = newHash ? `#${newHash}` : "";
    window.history.replaceState({}, document.title, url.toString());
  } catch {
    // ignore malformed URLs
  }
}

/** Identity sent to the backend, derived from the SSO token's `sub` (email). */
export function getUserIdentity(): { userId: string; userEmail: string } {
  const payload = getTokenPayload(getAuthToken());
  const email = (payload?.sub || "").trim();
  if (!email) {
    return { userId: "", userEmail: "" };
  }
  // Key everything by the SSO email so identity is stable and matches the
  // backend's launchpad_sso resolution (user_key = email).
  return { userId: email, userEmail: email };
}

/** Kept for API compatibility; identity now comes from the SSO token. */
export function setUserIdentity(_userId: string, _userEmail?: string): void {
  // no-op: identity is derived from the Launchpad JWT, not set locally.
}

/** Logged in when a non-expired Launchpad JWT is present. */
export function isLoggedIn(): boolean {
  const payload = getTokenPayload(getAuthToken());
  if (!payload?.sub) return false;
  if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) return false;
  return true;
}

/** Display name from the JWT (name claim, else the email's local part). */
export function getUserName(): string {
  const payload = getTokenPayload(getAuthToken());
  if (payload?.name && String(payload.name).trim()) return String(payload.name).trim();
  const email = (payload?.sub || "").trim();
  if (email) return email.split("@")[0];
  return "User";
}

/** Base URL of the Launchpad, used to bounce unauthenticated users to its login. */
export function getLaunchpadUrl(): string {
  const configured = import.meta.env.VITE_LAUNCHPAD_URL as string | undefined;
  return (configured && configured.trim()) || "http://localhost:3000";
}

/** No-op kept for API compatibility (the old name/email login was removed). */
export function login(_name: string, _email?: string): void {
  // Identity is established via the Launchpad SSO token, not a local form.
}

/** Sign out: clear the SSO token (and any legacy local identity) and return to the Launchpad. */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LOGGED_IN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_NAME_KEY);
}
