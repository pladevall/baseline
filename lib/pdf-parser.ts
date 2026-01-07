import { BIAEntry, SegmentalData } from './types';
import { v4 as uuidv4 } from 'uuid';

function extractSegmentalData(lb: number, percent: number): SegmentalData {
  return { lb, percent };
}

export function parseBIAReport(text: string): BIAEntry {
  console.log('=== PARSING BIA REPORT ===');
  console.log('Text length:', text.length);

  // Extract date - "01/07/2026"
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  let date = new Date().toISOString();
  if (dateMatch) {
    const [month, day, year] = dateMatch[1].split('/');
    date = new Date(`${year}-${month}-${day}T08:00:00`).toISOString();
  }

  // Extract name (if present)
  const nameMatch = text.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)\s+\d+\s+(?:Male|Female)/i);
  const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

  // Extract age - number before Male/Female
  const ageMatch = text.match(/(\d+)\s+(?:Male|Female)/i);
  const age = ageMatch ? parseInt(ageMatch[1]) : 0;

  // Extract gender
  const genderMatch = text.match(/(Male|Female)/i);
  const gender = genderMatch ? genderMatch[1] : '';

  // Extract height
  const heightMatch = text.match(/(\d+)['"]\s*(\d*)['""]?/);
  const height = heightMatch ? `${heightMatch[1]}'${heightMatch[2] || '0'}"` : '';

  // Fitness score / Health assessment - "93.3points" or "93.3/100"
  const fitnessMatch = text.match(/(?:Health\s*assessment|assessment)\s*(\d+\.?\d*)\s*points/i) ||
                       text.match(/(\d+\.?\d*)\s*points/i) ||
                       text.match(/(\d+\.?\d*)\s*\/\s*100/);
  const fitnessScore = fitnessMatch ? parseFloat(fitnessMatch[1]) : 0;
  console.log('Fitness score:', fitnessScore);

  // Weight - "172Ib" or "Weight\n172lb"
  const weightMatch = text.match(/Weight\s*\n?\s*(\d{2,3})(?:I|l)?b/i) ||
                      text.match(/(\d{3})(?:I|l)?b\s*(?:Fat\s*Mass|\n)/i);
  const weight = weightMatch ? parseFloat(weightMatch[1]) : 0;
  console.log('Weight:', weight);

  // BMI - look after "BMI" or "(kg/m?)" - "23.2"
  const bmiMatch = text.match(/BMI\s*[\s\S]*?(\d{2}\.\d)/i) ||
                   text.match(/\(kg\/m[²2\?]?\)\s*[\s\S]*?(\d{2}\.\d)/i);
  const bmi = bmiMatch ? parseFloat(bmiMatch[1]) : 0;
  console.log('BMI:', bmi);

  // Body Fat Percentage - "Fat Mass 15.7%" in composition section
  const pbfMatch = text.match(/Fat\s*Mass\s*(\d{1,2}\.\d)%/i);
  const bodyFatPercentage = pbfMatch ? parseFloat(pbfMatch[1]) : 0;
  console.log('Body Fat %:', bodyFatPercentage);

  // Visceral Fat - number after "Visceral Fat ~"
  const visceralMatch = text.match(/Visceral\s*Fat\s*[~\-—]*\s*(?:\[?[^\d]*)?\s*(\d+)/i);
  const visceralFat = visceralMatch ? parseFloat(visceralMatch[1]) : 0;
  console.log('Visceral Fat:', visceralFat);

  // Body Water Percentage - "Body Water 60.8%" or "Body Water Percentage 60.8"
  const bodyWaterPercentMatch = text.match(/Body\s*Water\s*Percentage\s*(\d+\.?\d*)/i) ||
                                text.match(/Body\s*Water\s*(\d{2}\.\d)%/i);
  const bodyWaterPercentage = bodyWaterPercentMatch ? parseFloat(bodyWaterPercentMatch[1]) : 0;

  // Body Water absolute (lb) - calculate from weight and percentage
  const bodyWater = weight > 0 && bodyWaterPercentage > 0
    ? Math.round(weight * bodyWaterPercentage / 100 * 10) / 10
    : 0;
  console.log('Body Water:', bodyWater, 'lb (calculated from', bodyWaterPercentage, '%)');

  // Protein Percentage - "Protein 19.3%" or "Protein Percentage 19.3"
  const proteinPercentMatch = text.match(/Protein\s*Percentage\s*(\d+\.?\d*)/i) ||
                              text.match(/Protein\s*(\d{1,2}\.\d)%/i);
  const proteinPercentage = proteinPercentMatch ? parseFloat(proteinPercentMatch[1]) : 0;

  // Protein absolute (lb) - calculate from weight and percentage
  const protein = weight > 0 && proteinPercentage > 0
    ? Math.round(weight * proteinPercentage / 100 * 10) / 10
    : 0;
  console.log('Protein:', protein, 'lb (calculated from', proteinPercentage, '%)');

  // Bone Mass Percentage - "Bone Mass 4.2%"
  const boneMassPercentMatch = text.match(/Bone\s*Mass\s*Percentage\s*(\d+\.?\d*)/i) ||
                               text.match(/Bone\s*Mass\s*(\d\.\d)%/i);
  const boneMassPercentage = boneMassPercentMatch ? parseFloat(boneMassPercentMatch[1]) : 0;

  // Bone Mass absolute (lb) - calculate from weight and percentage
  const boneMass = weight > 0 && boneMassPercentage > 0
    ? Math.round(weight * boneMassPercentage / 100 * 10) / 10
    : 0;
  console.log('Bone Mass:', boneMass, 'lb (calculated from', boneMassPercentage, '%)');

  // Body Fat Mass (lb) - calculate from weight and body fat percentage
  const bodyFatMass = weight > 0 && bodyFatPercentage > 0
    ? Math.round(weight * bodyFatPercentage / 100 * 10) / 10
    : 0;
  console.log('Body Fat Mass:', bodyFatMass, 'lb (calculated from', bodyFatPercentage, '%)');

  // Skeletal Muscle Percentage - "Skeletal Muscle Percentage 54.4"
  const skeletalPercentMatch = text.match(/Skeletal\s*Muscle\s*Percentage\s*(\d+\.?\d*)/i);
  const skeletalMusclePercentage = skeletalPercentMatch ? parseFloat(skeletalPercentMatch[1]) : 0;

  // Skeletal Muscle absolute (lb) - calculate from weight and percentage
  const skeletalMuscle = weight > 0 && skeletalMusclePercentage > 0
    ? Math.round(weight * skeletalMusclePercentage / 100 * 10) / 10
    : 0;
  console.log('Skeletal Muscle:', skeletalMuscle, 'lb (calculated from', skeletalMusclePercentage, '%)');

  // Fat-free Body Weight - "Fat-free Body Weight 144 .8|p" or "144.8lb"
  // OCR sometimes puts space before decimal and uses "|p" instead of "lb"
  const fatFreeMassMatch = text.match(/Fat[- ]?free\s*Body\s*Weight\s*(\d+)\s*\.?\s*(\d+)\s*(?:l|I|\|)?[bp]/i) ||
                           text.match(/Fat[- ]?free\s*Body\s*Weight\s*(\d+\.?\d*)\s*(?:l|I|\|)?b/i);
  let fatFreeMass = 0;
  if (fatFreeMassMatch) {
    if (fatFreeMassMatch[2]) {
      // Handle "144 .8" format
      fatFreeMass = parseFloat(`${fatFreeMassMatch[1]}.${fatFreeMassMatch[2]}`);
    } else {
      fatFreeMass = parseFloat(fatFreeMassMatch[1]);
    }
  }
  console.log('Fat Free Mass:', fatFreeMass);

  // Soft Lean Mass / Muscle Mass - "Muscle Mass  137.8Ib"
  const softLeanMassMatch = text.match(/Muscle\s*Mass\s{1,4}(\d{2,3})\.?(\d*)(?:l|I)?b/i);
  let softLeanMass = 0;
  if (softLeanMassMatch) {
    const intPart = softLeanMassMatch[1];
    const decPart = softLeanMassMatch[2] || '0';
    softLeanMass = parseFloat(`${intPart}.${decPart}`);
  }
  console.log('Soft Lean Mass:', softLeanMass);

  // LBM
  const lbm = fatFreeMass || 0;

  // BMR - "BMR  1790kcal"
  const bmrMatch = text.match(/BMR\s{1,4}(\d{4})/i);
  const bmr = bmrMatch ? parseFloat(bmrMatch[1]) : 0;
  console.log('BMR:', bmr);

  // Metabolic Age - "Metabolic Age 26"
  const metabolicAgeMatch = text.match(/Metabolic\s*Age\s*(\d+)/i);
  const metabolicAge = metabolicAgeMatch ? parseInt(metabolicAgeMatch[1]) : 0;
  console.log('Metabolic Age:', metabolicAge);

  // Muscle Mass Percentage - "Muscle Mass Percentage 80.1%"
  const muscleMassPercentMatch = text.match(/Muscle\s*Mass\s*Percentage\s*(\d+\.?\d*)%?/i);
  const muscleMassPercentage = muscleMassPercentMatch ? parseFloat(muscleMassPercentMatch[1]) : 0;
  console.log('Muscle Mass %:', muscleMassPercentage);

  // Subcutaneous Fat Percentage - "Subcutaneous Fat Percentage 13.8%"
  const subcutPercentMatch = text.match(/Subcutaneous\s*Fat\s*Percentage\s*(\d+\.?\d*)/i);
  const subcutaneousFatPercentage = subcutPercentMatch ? parseFloat(subcutPercentMatch[1]) : 0;
  console.log('Subcutaneous Fat %:', subcutaneousFatPercentage);

  // SMI - "SMI 8.9"
  const smiMatch = text.match(/SMI\s*(\d+\.?\d*)/i);
  const smi = smiMatch ? parseFloat(smiMatch[1]) : 0;
  console.log('SMI:', smi);

  // Waist-Hip Ratio - "(0.95" or "Waist-Hip Ratio (0.95"
  const waistHipMatch = text.match(/Waist[- ]?Hip\s*Ratio\s*\(?(\d+\.?\d*)/i);
  const waistHipRatio = waistHipMatch ? parseFloat(waistHipMatch[1]) : 0;
  console.log('Waist-Hip Ratio:', waistHipRatio);

  // Parse segmental data - multiple patterns needed due to OCR variations
  // Pattern 1: "@ 9.6lb MW 125.7%" or "® 9.6lb MW 125.7%"
  // Pattern 2: "HM 127.4% @9.8lb" (right side values)
  // Pattern 3: "© 1.6lb W114.1%"

  const defaultSegmental = { lb: 0, percent: 0 };

  let muscleLeftArm = defaultSegmental;
  let muscleRightArm = defaultSegmental;
  let muscleTrunk = defaultSegmental;
  let muscleLeftLeg = defaultSegmental;
  let muscleRightLeg = defaultSegmental;
  let fatLeftArm = defaultSegmental;
  let fatRightArm = defaultSegmental;
  let fatTrunk = defaultSegmental;
  let fatLeftLeg = defaultSegmental;
  let fatRightLeg = defaultSegmental;

  // Extract all lb/% pairs more flexibly
  // Match pattern: number followed by "lb" (or "Ib" or "b"), then "MW" or "W", then percentage
  const segPattern1 = /[@®©]\s*(\d+\.?\d*)\s*(?:l|I)?b?\s*(?:MW|W)\s*(\d+\.?\d*)%/gi;
  // Match pattern: "HM" or "H" followed by percentage, then symbol and number with lb
  const segPattern2 = /(?:HM|H)\s*(\d+\.?\d*)%\s*[@®©]\s*(\d+\.?\d*)\s*(?:l|I)?b/gi;

  const matches1 = [...text.matchAll(segPattern1)];
  const matches2 = [...text.matchAll(segPattern2)];

  console.log('Segmental pattern 1 matches:', matches1.length);
  matches1.forEach((m, i) => console.log(`  1-${i}: ${m[1]}lb / ${m[2]}%`));
  console.log('Segmental pattern 2 matches:', matches2.length);
  matches2.forEach((m, i) => console.log(`  2-${i}: ${m[2]}lb / ${m[1]}%`));

  // Try to extract muscle balance section values
  const muscleBalanceSection = text.match(/Muscle\s*balance[\s\S]*?Segmental\s*fat/i);
  const fatAnalysisSection = text.match(/Segmental\s*fat[\s\S]*?Other\s*Measurements/i);

  if (muscleBalanceSection) {
    const muscleText = muscleBalanceSection[0];
    // Extract pairs from muscle section
    const musclePairs: Array<{lb: number, percent: number}> = [];

    // Pattern: symbol + number + lb/b + MW/W + percent%
    const muscleMatches = [...muscleText.matchAll(/[@®©]\s*(\d+\.?\d*)\s*(?:l|I)?b?\s*(?:MW|W)\s*(\d+\.?\d*)%/gi)];
    muscleMatches.forEach(m => musclePairs.push({ lb: parseFloat(m[1]), percent: parseFloat(m[2]) }));

    // Pattern for right side: HM/H + percent% + symbol + number + lb
    const rightMatches = [...muscleText.matchAll(/(?:HM|H)\s*(\d+\.?\d*)%\s*[@®©]\s*(\d+\.?\d*)\s*(?:l|I)?b/gi)];
    // Insert these after each left match (they come in pairs on same line)
    rightMatches.forEach((m, i) => {
      // Insert after position i (left arm -> right arm, etc)
      const insertPos = Math.min(i + 1 + i, musclePairs.length);
      musclePairs.splice(insertPos, 0, { lb: parseFloat(m[2]), percent: parseFloat(m[1]) });
    });

    console.log('Muscle pairs found:', musclePairs.length);
    musclePairs.forEach((p, i) => console.log(`  M${i}: ${p.lb}lb / ${p.percent}%`));

    if (musclePairs.length >= 5) {
      muscleLeftArm = extractSegmentalData(musclePairs[0].lb, musclePairs[0].percent);
      muscleRightArm = extractSegmentalData(musclePairs[1].lb, musclePairs[1].percent);
      muscleTrunk = extractSegmentalData(musclePairs[2].lb, musclePairs[2].percent);
      muscleLeftLeg = extractSegmentalData(musclePairs[3].lb, musclePairs[3].percent);
      muscleRightLeg = extractSegmentalData(musclePairs[4].lb, musclePairs[4].percent);
    }
  }

  if (fatAnalysisSection) {
    const fatText = fatAnalysisSection[0];
    const fatPairs: Array<{lb: number, percent: number}> = [];

    // Pattern: symbol + number + lb/b + W + percent%
    const fatMatches = [...fatText.matchAll(/[@®©]\s*(\d+\.?\d*)\s*(?:l|I)?b?\s*(?:MW|W)\s*(\d+\.?\d*)%/gi)];
    fatMatches.forEach(m => fatPairs.push({ lb: parseFloat(m[1]), percent: parseFloat(m[2]) }));

    // Pattern for right side
    const rightFatMatches = [...fatText.matchAll(/(?:HM|H)\s*(\d+\.?\d*)%\s*[@®©]\s*(\d+\.?\d*)\s*(?:l|I)?b/gi)];
    rightFatMatches.forEach((m, i) => {
      const insertPos = Math.min(i + 1 + i, fatPairs.length);
      fatPairs.splice(insertPos, 0, { lb: parseFloat(m[2]), percent: parseFloat(m[1]) });
    });

    console.log('Fat pairs found:', fatPairs.length);
    fatPairs.forEach((p, i) => console.log(`  F${i}: ${p.lb}lb / ${p.percent}%`));

    if (fatPairs.length >= 5) {
      fatLeftArm = extractSegmentalData(fatPairs[0].lb, fatPairs[0].percent);
      fatRightArm = extractSegmentalData(fatPairs[1].lb, fatPairs[1].percent);
      fatTrunk = extractSegmentalData(fatPairs[2].lb, fatPairs[2].percent);
      fatLeftLeg = extractSegmentalData(fatPairs[3].lb, fatPairs[3].percent);
      fatRightLeg = extractSegmentalData(fatPairs[4].lb, fatPairs[4].percent);
    }
  }

  console.log('Segmental Muscle Left Arm:', muscleLeftArm);
  console.log('Segmental Fat Left Arm:', fatLeftArm);

  // Body Shape / Body Type - "Body Type Normal"
  const bodyShapeMatch = text.match(/Body\s*Type\s*(Very\s*Muscular|Muscular|Heavy|Fit|Normal|Overweight|Skinny|Under\s*Exercised|Skinny\s*Fat)/i);
  const bodyShape = bodyShapeMatch?.[1] || 'Normal';
  console.log('Body Shape:', bodyShape);

  // Categories
  const bmiCategory = bmi < 18.5 ? 'Under' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Over' : 'Over excessively';
  const pbfCategory = bodyFatPercentage < 10 ? 'Normal' : bodyFatPercentage < 20 ? 'Normal' : bodyFatPercentage < 25 ? 'Mild obesity' : 'Obesity';

  // Weight Control recommendations - "Normal weight 170.61b"
  const normalWeightMatch = text.match(/Normal\s*weight\s*(\d+\.?\d*)(?:l|I)?b/i);
  const normalWeight = normalWeightMatch ? parseFloat(normalWeightMatch[1]) : 0;
  console.log('Normal Weight:', normalWeight);

  // "Weight Control -1.41b"
  const weightControlMatch = text.match(/Weight\s*Control\s*(-?\d+\.?\d*)(?:l|I)?b/i);
  const weightControl = weightControlMatch ? parseFloat(weightControlMatch[1]) : 0;

  // "Fat mass control -1.4lb"
  const fatMassControlMatch = text.match(/Fat\s*mass\s*control\s*(-?\d+\.?\d*)(?:l|I)?b/i);
  const fatMassControl = fatMassControlMatch ? parseFloat(fatMassControlMatch[1]) : 0;

  // "Muscle control +0lb" - handle various formats including "+0lb", "+ 0lb", "0lb"
  const muscleControlMatch = text.match(/Muscle\s*control\s*([+-]?\s*\d+\.?\d*)\s*(?:l|I)?b/i);
  const muscleControl = muscleControlMatch ? parseFloat(muscleControlMatch[1].replace(/\s/g, '')) : 0;
  console.log('Muscle Control:', muscleControl);

  const result: BIAEntry = {
    id: uuidv4(),
    date,
    name,
    age,
    gender,
    height,
    fitnessScore,
    weight,
    bmi,
    bodyFatPercentage,
    visceralFat,
    skeletalMuscle,
    bodyWater,
    protein,
    boneMass,
    bodyFatMass,
    softLeanMass,
    fatFreeMass,
    lbm,
    bmr,
    metabolicAge,
    subcutaneousFatPercentage,
    muscleMassPercentage,
    skeletalMusclePercentage,
    boneMassPercentage,
    proteinPercentage,
    bodyWaterPercentage,
    smi,
    waistHipRatio,
    muscleLeftArm,
    muscleRightArm,
    muscleTrunk,
    muscleLeftLeg,
    muscleRightLeg,
    fatLeftArm,
    fatRightArm,
    fatTrunk,
    fatLeftLeg,
    fatRightLeg,
    bodyShape,
    bmiCategory,
    pbfCategory,
    normalWeight,
    weightControl,
    fatMassControl,
    muscleControl,
  };

  console.log('=== PARSED RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  return result;
}
