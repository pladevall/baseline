export interface SegmentalData {
  lb: number;
  percent: number;
}

export interface BIAEntry {
  id: string;
  date: string;

  // Header
  name: string;
  age: number;
  gender: string;
  height: string;
  fitnessScore: number;

  // Core Metrics
  weight: number;
  bmi: number;
  bodyFatPercentage: number;
  visceralFat: number;
  skeletalMuscle: number;

  // Body Composition
  bodyWater: number;
  protein: number;
  boneMass: number;
  bodyFatMass: number;
  softLeanMass: number;
  fatFreeMass: number;

  // Additional Data
  lbm: number;
  bmr: number;
  metabolicAge: number;
  subcutaneousFatPercentage: number;
  muscleMassPercentage: number;
  skeletalMusclePercentage: number;
  boneMassPercentage: number;
  proteinPercentage: number;
  bodyWaterPercentage: number;
  smi: number;
  waistHipRatio: number;

  // Segmental Muscle (Soft Lean Mass)
  muscleLeftArm: SegmentalData;
  muscleRightArm: SegmentalData;
  muscleTrunk: SegmentalData;
  muscleLeftLeg: SegmentalData;
  muscleRightLeg: SegmentalData;

  // Segmental Fat
  fatLeftArm: SegmentalData;
  fatRightArm: SegmentalData;
  fatTrunk: SegmentalData;
  fatLeftLeg: SegmentalData;
  fatRightLeg: SegmentalData;

  // Categories
  bodyShape: string;
  bmiCategory: string;
  pbfCategory: string;

  // Weight Control Recommendations
  normalWeight: number;
  weightControl: number;
  fatMassControl: number;
  muscleControl: number;
}

export interface NormalRange {
  min: number;
  max: number;
}

export interface MetricDefinition {
  key: keyof BIAEntry;
  label: string;
  unit: string;
  normalRange?: NormalRange;
  higherIsBetter?: boolean;
  category: 'header' | 'core' | 'composition' | 'additional' | 'segmental-muscle' | 'segmental-fat' | 'recommendations';
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // Header
  { key: 'fitnessScore', label: 'Fitness Score', unit: '/100', higherIsBetter: true, category: 'header' },

  // Core Metrics
  { key: 'weight', label: 'Weight', unit: 'lb', normalRange: { min: 136.6, max: 184.6 }, category: 'core' },
  { key: 'bmi', label: 'BMI', unit: 'kg/m²', normalRange: { min: 18.5, max: 25 }, category: 'core' },
  { key: 'bodyFatPercentage', label: 'Body Fat %', unit: '%', normalRange: { min: 6, max: 25 }, higherIsBetter: false, category: 'core' },
  { key: 'visceralFat', label: 'Visceral Fat', unit: '', normalRange: { min: 1, max: 10 }, higherIsBetter: false, category: 'core' },
  { key: 'skeletalMuscle', label: 'Skeletal Muscle', unit: 'lb', normalRange: { min: 69.6, max: 85 }, higherIsBetter: true, category: 'core' },

  // Body Composition
  { key: 'bodyWater', label: 'Body Water', unit: 'L', normalRange: { min: 39, max: 50.7 }, category: 'composition' },
  { key: 'protein', label: 'Protein', unit: 'lb', normalRange: { min: 24.6, max: 30 }, category: 'composition' },
  { key: 'boneMass', label: 'Bone Mass', unit: 'lb', normalRange: { min: 6.6, max: 11 }, category: 'composition' },
  { key: 'bodyFatMass', label: 'Body Fat Mass', unit: 'lb', normalRange: { min: 19.4, max: 39 }, category: 'composition' },
  { key: 'softLeanMass', label: 'Soft Lean Mass', unit: 'lb', category: 'composition' },
  { key: 'fatFreeMass', label: 'Fat Free Mass', unit: 'lb', category: 'composition' },

  // Additional Data
  { key: 'lbm', label: 'LBM (Fat-free Body Weight)', unit: 'lb', normalRange: { min: 124.2, max: 151.8 }, category: 'additional' },
  { key: 'bmr', label: 'BMR (Basal Metabolic Rate)', unit: 'kcal', normalRange: { min: 1657, max: 1945.6 }, category: 'additional' },
  { key: 'metabolicAge', label: 'Metabolic Age', unit: 'years', higherIsBetter: false, category: 'additional' },
  { key: 'subcutaneousFatPercentage', label: 'Subcutaneous Fat %', unit: '%', normalRange: { min: 8.6, max: 16.7 }, category: 'additional' },
  { key: 'muscleMassPercentage', label: 'Muscle Mass %', unit: '%', normalRange: { min: 67.3, max: 82.3 }, higherIsBetter: true, category: 'additional' },
  { key: 'skeletalMusclePercentage', label: 'Skeletal Muscle %', unit: '%', normalRange: { min: 40.5, max: 49.5 }, higherIsBetter: true, category: 'additional' },
  { key: 'boneMassPercentage', label: 'Bone Mass %', unit: '%', normalRange: { min: 3.8, max: 6.4 }, category: 'additional' },
  { key: 'proteinPercentage', label: 'Protein %', unit: '%', normalRange: { min: 14.3, max: 17.4 }, category: 'additional' },
  { key: 'bodyWaterPercentage', label: 'Body Water %', unit: '%', normalRange: { min: 50, max: 65 }, category: 'additional' },
  { key: 'smi', label: 'SMI', unit: '', normalRange: { min: 7, max: 8.6 }, category: 'additional' },
  { key: 'waistHipRatio', label: 'Waist-Hip Ratio', unit: '', normalRange: { min: 0, max: 0.9 }, higherIsBetter: false, category: 'additional' },

  // Weight Control
  { key: 'normalWeight', label: 'Target Weight', unit: 'lb', category: 'recommendations' },
  { key: 'weightControl', label: 'Weight Control', unit: 'lb', category: 'recommendations' },
  { key: 'fatMassControl', label: 'Fat Mass Control', unit: 'lb', category: 'recommendations' },
  { key: 'muscleControl', label: 'Muscle Control', unit: 'lb', category: 'recommendations' },
];

export const CATEGORY_LABELS: Record<MetricDefinition['category'], string> = {
  'header': 'Overview',
  'core': 'Core Metrics',
  'composition': 'Body Composition',
  'additional': 'Additional Data',
  'segmental-muscle': 'Segmental Muscle',
  'segmental-fat': 'Segmental Fat',
  'recommendations': 'Weight Control',
};
