const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function compareData() {
  // Get BIA entries
  const { data: biaData, error: biaError } = await supabase
    .from('bia_entries')
    .select('data')
    .order('date', { ascending: false });

  if (biaError) {
    console.error('Error fetching BIA entries:', biaError);
    return;
  }

  const biaEntries = (biaData || []).map(row => row.data);

  // Get DEXA scans
  const response = await fetch('http://localhost:3000/api/bodyspec/scans');
  const { scans } = await response.json();

  console.log('\n=== BIA ENTRIES (Recent) ===\n');
  biaEntries.slice(0, 5).forEach(entry => {
    console.log(`Date: ${entry.date}`);
    console.log(`  Weight: ${entry.weight} lb`);
    console.log(`  Body Fat %: ${entry.bodyFatPercentage}%`);
    console.log(`  Body Fat Mass: ${entry.bodyFatMass || (entry.weight * entry.bodyFatPercentage / 100).toFixed(1)} lb`);
    console.log(`  Lean Mass: ${entry.lbm || entry.fatFreeMass || (entry.weight - (entry.bodyFatMass || entry.weight * entry.bodyFatPercentage / 100)).toFixed(1)} lb`);
    console.log('');
  });

  console.log('\n=== DEXA SCANS ===\n');
  scans.forEach(scan => {
    console.log(`Date: ${scan.scanDate}`);
    console.log(`  Weight: ${scan.data.weight.toFixed(1)} lb`);
    console.log(`  Body Fat %: ${scan.data.bodyFatPercentage}%`);
    console.log(`  Body Fat Mass: ${scan.data.totalBodyFat.toFixed(1)} lb`);
    console.log(`  Lean Mass: ${scan.data.leanBodyMass.toFixed(1)} lb`);
    console.log('');
  });

  // Compare Jan 7 BIA with Dec 19-20 DEXA
  const jan7 = biaEntries.find(e => e.date.startsWith('2026-01-07'));
  const dec20Dexa = scans.find(s => s.scanDate === '2025-12-20');

  if (jan7 && dec20Dexa) {
    console.log('\n=== COMPARISON: Jan 7 BIA vs Dec 20 DEXA ===\n');

    const jan7FatMass = jan7.bodyFatMass || (jan7.weight * jan7.bodyFatPercentage / 100);
    const jan7LeanMass = jan7.weight - jan7FatMass;

    console.log('Jan 7 (BIA):');
    console.log(`  Weight: ${jan7.weight} lb`);
    console.log(`  Body Fat %: ${jan7.bodyFatPercentage}%`);
    console.log(`  Fat Mass: ${jan7FatMass.toFixed(1)} lb`);
    console.log(`  Lean Mass: ${jan7LeanMass.toFixed(1)} lb`);
    console.log('');

    console.log('Dec 20 (DEXA):');
    console.log(`  Weight: ${dec20Dexa.data.weight.toFixed(1)} lb`);
    console.log(`  Body Fat %: ${dec20Dexa.data.bodyFatPercentage}%`);
    console.log(`  Fat Mass: ${dec20Dexa.data.totalBodyFat.toFixed(1)} lb`);
    console.log(`  Lean Mass: ${dec20Dexa.data.leanBodyMass.toFixed(1)} lb`);
    console.log('');

    console.log('Changes (Jan 7 - Dec 20):');
    const weightChange = jan7.weight - dec20Dexa.data.weight;
    const fatChange = jan7FatMass - dec20Dexa.data.totalBodyFat;
    const leanChange = jan7LeanMass - dec20Dexa.data.leanBodyMass;
    const bfPercentChange = jan7.bodyFatPercentage - dec20Dexa.data.bodyFatPercentage;

    console.log(`  Weight: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lb`);
    console.log(`  Body Fat %: ${bfPercentChange > 0 ? '+' : ''}${bfPercentChange.toFixed(1)}%`);
    console.log(`  Fat Mass: ${fatChange > 0 ? '+' : ''}${fatChange.toFixed(1)} lb`);
    console.log(`  Lean Mass: ${leanChange > 0 ? '+' : ''}${leanChange.toFixed(1)} lb`);
    console.log('');

    console.log('Analysis:');
    if (Math.abs(bfPercentChange) > 2) {
      console.log(`  ⚠️  Large body fat % difference (${Math.abs(bfPercentChange).toFixed(1)}%). This is likely due to:`);
      console.log('     - BIA measurement variability (hydration, time of day, etc.)');
      console.log('     - Different measurement technologies (BIA vs DEXA)');
    }

    if (Math.abs(weightChange) < 2 && Math.abs(fatChange) < 2 && Math.abs(leanChange) > 2) {
      console.log('  ⚠️  Similar weight and fat mass, but different lean mass.');
      console.log('     This suggests the BIA is estimating lean mass differently than DEXA.');
    }
  }
}

compareData();
