import { getPreferenceValues } from "@raycast/api";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

type Preferences = {
  apiUrl: string;
  apiToken?: string;
  vercelBypassToken?: string;
};

function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

async function resolveBypassToken(preferences: Preferences): Promise<string | undefined> {
  if (preferences.vercelBypassToken) {
    return preferences.vercelBypassToken;
  }

  const tokenPath = join(homedir(), ".config", "raycast", "extensions", "baseline", ".vercel-bypass-token");
  try {
    const raw = await readFile(tokenPath, "utf8");
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const preferences = getPreferences();
  const { apiUrl, apiToken } = preferences;
  const vercelBypassToken = await resolveBypassToken(preferences);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  }

  if (vercelBypassToken) {
    headers["x-vercel-protection-bypass"] = vercelBypassToken;
  }

  const url = new URL(path, apiUrl);
  if (vercelBypassToken) {
    url.searchParams.set("x-vercel-set-bypass-cookie", "true");
    url.searchParams.set("x-vercel-protection-bypass", vercelBypassToken);
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}
