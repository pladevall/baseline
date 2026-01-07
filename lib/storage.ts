import { BIAEntry } from './types';

const STORAGE_KEY = 'bia-tracker-entries';

export function saveEntry(entry: BIAEntry): void {
  const entries = getEntries();

  // Check if entry with same date already exists
  const existingIndex = entries.findIndex(e => e.date === entry.date);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }

  // Sort by date (newest first)
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}

export function getEntries(): BIAEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const entries = JSON.parse(stored) as BIAEntry[];
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export function deleteEntry(id: string): void {
  const entries = getEntries();
  const filtered = entries.filter(e => e.id !== id);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

export function exportData(): string {
  const entries = getEntries();
  return JSON.stringify(entries, null, 2);
}

export function importData(json: string): boolean {
  try {
    const entries = JSON.parse(json) as BIAEntry[];
    if (!Array.isArray(entries)) {
      return false;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
    return true;
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
