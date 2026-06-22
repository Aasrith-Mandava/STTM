import { apiFetch } from "../utils/apiFetch";

const baseUrl = import.meta.env.VITE_REACT_API_BASE_URL || "http://127.0.0.1:8001";

export interface LlmSettings {
  provider: string;
  gemini: { configured: boolean; masked: string };
  groq: { configured: boolean; masked: string; model: string };
  saved?: boolean;
  validated?: boolean | null;
  message?: string;
}

export interface SaveLlmSettingsBody {
  provider?: string;
  google_api_key?: string;
  groq_api_key?: string;
  groq_model?: string;
}

export async function getLlmSettings(): Promise<LlmSettings> {
  const res = await apiFetch(`${baseUrl}/settings/llm`);
  if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
  return res.json();
}

export async function saveLlmSettings(body: SaveLlmSettingsBody): Promise<LlmSettings> {
  const res = await apiFetch(`${baseUrl}/settings/llm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Failed to save settings (${res.status})`);
  }
  return data as LlmSettings;
}
