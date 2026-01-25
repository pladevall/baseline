
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
    console.error('Missing SUPABASE_URL or valid SUPABASE KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    console.log('Checking for duplicates in running_activities...');

    const { data: activities, error } = await supabase
        .from('running_activities')
        .select('id, strava_id, name, activity_date, connection_id')
        .order('activity_date', { ascending: false });

    if (error) {
        console.error('Error fetching activities:', error);
        return;
    }

    console.log(`Found ${activities.length} total activities.`);

    const stravaIdCounts = new Map<string, number>();
    const duplicates = [];

    for (const a of activities) {
        const key = `${a.connection_id}:${a.strava_id}`;
        const count = (stravaIdCounts.get(key) || 0) + 1;
        stravaIdCounts.set(key, count);

        if (count > 1) {
            duplicates.push(a);
        }
    }

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicate entries (same connection_id + strava_id).`);
        console.log('Sample duplicates:', duplicates.slice(0, 5));
    } else {
        console.log('No duplicates found by connection_id + strava_id.');
    }

    const nameDateCounts = new Map<string, any[]>();
    for (const a of activities) {
        const key = `${a.activity_date.split('T')[0]}:${a.name}`;
        const list = nameDateCounts.get(key) || [];
        list.push(a);
        nameDateCounts.set(key, list);
    }

    console.log('\nChecking for potential duplicates by Date + Name (ignoring Strava ID):');
    let potentialDups = 0;
    for (const [key, list] of nameDateCounts) {
        if (list.length > 1) {
            console.log(`\nPotential duplicate set for "${key}":`);
            list.forEach(a => console.log(`  - ID: ${a.id}, StravaID: ${a.strava_id}, Date: ${a.activity_date}`));
            potentialDups++;
        }
    }
    if (potentialDups === 0) console.log("No potential date/name duplicates found.");

}

checkDuplicates();
