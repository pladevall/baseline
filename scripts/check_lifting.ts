
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

async function checkLifting() {
    const startOfWeek = '2026-01-11';

    const { data: workouts, error } = await supabase
        .from('lifting_workouts')
        .select('id, hevy_id, name, workout_date')
        .gte('workout_date', startOfWeek)
        .order('workout_date', { ascending: false });

    if (error) {
        console.error('Error fetching workouts:', error);
        return;
    }

    console.log(`Found ${workouts.length} lifting workouts since ${startOfWeek}:`);
    workouts.forEach(w => {
        console.log(`- [${w.workout_date}] ${w.name} (ID: ${w.hevy_id})`);
    });
}

checkLifting();
