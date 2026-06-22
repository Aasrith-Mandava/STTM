const baseUrl = import.meta.env.VITE_REACT_API_BASE_URL || "http://127.0.0.1:8001";
import { apiFetch } from "../utils/apiFetch";

export const fetchSessions = async (): Promise<any> => {
  const response = await apiFetch(`${baseUrl}/sessions/app/list`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || `Failed to fetch sessions: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
};
