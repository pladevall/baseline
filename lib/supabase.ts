import { createClient } from '@supabase/supabase-js';
import { BIAEntry } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database operations
export async function saveEntryToDb(entry: BIAEntry): Promise<void> {
  const { error } = await supabase
    .from('bia_entries')
    .upsert({
      id: entry.id,
      date: entry.date,
      data: entry,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving entry:', error);
    throw error;
  }
}

export async function getEntriesFromDb(): Promise<BIAEntry[]> {
  const { data, error } = await supabase
    .from('bia_entries')
    .select('data')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching entries:', error);
    return [];
  }

  return (data || []).map(row => row.data as BIAEntry);
}

export async function deleteEntryFromDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('bia_entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting entry:', error);
    throw error;
  }
}

// Migration helper - move localStorage data to Supabase
export async function migrateFromLocalStorage(): Promise<number> {
  if (typeof window === 'undefined') return 0;

  const stored = localStorage.getItem('bia-entries');
  if (!stored) return 0;

  try {
    const entries: BIAEntry[] = JSON.parse(stored);
    if (entries.length === 0) return 0;

    // Upload each entry
    for (const entry of entries) {
      await saveEntryToDb(entry);
    }

    // Clear localStorage after successful migration
    localStorage.removeItem('bia-entries');
    console.log(`Migrated ${entries.length} entries to cloud`);
    return entries.length;
  } catch (err) {
    console.error('Migration error:', err);
    return 0;
  }
}
