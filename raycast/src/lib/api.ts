import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  apiUrl: string;
  apiToken?: string;
};

function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiUrl, apiToken } = getPreferences();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  }

  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}
