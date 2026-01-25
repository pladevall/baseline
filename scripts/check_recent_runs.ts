
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual .env parsing
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1'); // Remove quotes
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecent() {
    // Filter for Jan 2026
    const startOfWeek = '2026-01-11'; // approximate start of "this week" (Jan 18 is today)

    const { data: activities, error } = await supabase
        .from('running_activities')
        .select('id, strava_id, name, activity_date, duration_seconds, distance_miles')
        .gte('activity_date', startOfWeek)
        .order('activity_date', { ascending: false });

    if (error) {
        console.error('Error fetching activities:', error);
        return;
    }

    console.log(`Found ${activities.length} activities since ${startOfWeek}:`);
    activities.forEach(a => {
        console.log(`- [${a.activity_date}] ${a.name} (ID: ${a.strava_id}) - ${a.distance_miles}mi`);
    });

    // Check for day-duplicates
    const dayCounts = new Map<string, number>();
    activities.forEach(a => {
        const day = a.activity_date.split('T')[0];
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    console.log('\nDay breakdown:');
    for (const [day, count] of dayCounts) {
        console.log(`${day}: ${count} runs`);
    }
}

checkRecent();
