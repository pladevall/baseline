import {
  BIAEntry,
  BodyspecScan,
  LiftingWorkout,
  BIASegment,
  WorkoutVolumeBySegment,
  CorrelationResult,
  BalanceAnalysis,
  MeasurementPeriod,
} from './types';

// ========================================
// 1.1 Body Part Mapping
// ========================================

export const HEVY_TO_BIA_MAPPING: Record<string, BIASegment[]> = {
  'chest': ['trunk'],
  'back': ['trunk'],
  'shoulders': ['trunk', 'arms'], // Split: 60% trunk, 40% arms
  'biceps': ['leftArm', 'rightArm'],
  'triceps': ['leftArm', 'rightArm'],
  'forearms': ['leftArm', 'rightArm'],
  'core': ['trunk'],
  'quadriceps': ['leftLeg', 'rightLeg'],
  'hamstrings': ['leftLeg', 'rightLeg'],
  'glutes': ['leftLeg', 'rightLeg'],
  'calves': ['leftLeg', 'rightLeg'],
};

// Helper to get BIA segment value from entry
export function getBIASegmentValue(
  entry: BIAEntry | BodyspecScan,
  segment: BIASegment
): number {
  // Handle BIA entries
  if ('muscleLeftArm' in entry) {
    const biaEntry = entry as BIAEntry;
    switch (segment) {
      case 'leftArm':
        return biaEntry.muscleLeftArm.lb;
      case 'rightArm':
        return biaEntry.muscleRightArm.lb;
      case 'trunk':
        return biaEntry.muscleTrunk.lb;
      case 'leftLeg':
        return biaEntry.muscleLeftLeg.lb;
      case 'rightLeg':
        return biaEntry.muscleRightLeg.lb;
      case 'arms':
        return biaEntry.muscleLeftArm.lb + biaEntry.muscleRightArm.lb;
      case 'legs':
        return biaEntry.muscleLeftLeg.lb + biaEntry.muscleRightLeg.lb;
    }
  }

  // Handle Bodyspec scans
  if ('data' in entry) {
    const bodyspec = entry as BodyspecScan;
    const regional = bodyspec.data.regional;
    switch (segment) {
      case 'leftArm':
        return regional.leftArm.lean;
      case 'rightArm':
        return regional.rightArm.lean;
      case 'trunk':
        return regional.trunk.lean;
      case 'leftLeg':
        return regional.leftLeg.lean;
      case 'rightLeg':
        return regional.rightLeg.lean;
      case 'arms':
        return regional.leftArm.lean + regional.rightArm.lean;
      case 'legs':
        return regional.leftLeg.lean + regional.rightLeg.lean;
    }
  }

  return 0;
}

// ========================================
// 1.2 Volume Aggregation by Segment
// ========================================

function distributeVolume(
  bodyPart: string,
  volume: number
): Record<BIASegment, number> {
  const distribution: Record<BIASegment, number> = {
    leftArm: 0,
    rightArm: 0,
    trunk: 0,
    leftLeg: 0,
    rightLeg: 0,
    arms: 0,
    legs: 0,
  };

  const segments = HEVY_TO_BIA_MAPPING[bodyPart.toLowerCase()] || [];

  if (segments.length === 0) return distribution;

  // Special case for shoulders: 60% trunk, 40% arms
  if (bodyPart.toLowerCase() === 'shoulders') {
    distribution.trunk = volume * 0.6;
    distribution.leftArm = (volume * 0.4) / 2;
    distribution.rightArm = (volume * 0.4) / 2;
    distribution.arms = volume * 0.4;
    return distribution;
  }

  // For paired body parts (arms, legs), split evenly
  if (segments.includes('leftArm') && segments.includes('rightArm')) {
    distribution.leftArm = volume / 2;
    distribution.rightArm = volume / 2;
    distribution.arms = volume;
    return distribution;
  }

  if (segments.includes('leftLeg') && segments.includes('rightLeg')) {
    distribution.leftLeg = volume / 2;
    distribution.rightLeg = volume / 2;
    distribution.legs = volume;
    return distribution;
  }

  // Single segment
  if (segments.length === 1) {
    distribution[segments[0]] = volume;
  }

  return distribution;
}

export function aggregateWorkoutVolumeBySegment(
  workouts: LiftingWorkout[]
): Record<BIASegment, WorkoutVolumeBySegment> {
  const result: Record<BIASegment, WorkoutVolumeBySegment> = {
    leftArm: { segment: 'leftArm', totalSets: 0, totalReps: 0, totalVolumeLbs: 0, workoutCount: 0 },
    rightArm: { segment: 'rightArm', totalSets: 0, totalReps: 0, totalVolumeLbs: 0, workoutCount: 0 },
    trunk: { segment: 'trunk', totalSets: 0, totalReps: 0, totalVolumeLbs: 0, workoutCount: 0 },
    leftLeg: { segment: 'leftLeg', totalSets: 0, totalReps: 0, totalVolumeLbs: 0, workoutCount: 0 },
    rightLeg: { segment: 'rightLeg', totalSets: 0, totalReps: 0, totalVolumeLbs: 0, workoutCount: 0 },
    arms: { segment: 'arms', totalSets: 0, totalReps: 0, totalVolumeLbs: 0, workoutCount: 0 },
    legs: { segment: 'legs', totalSets: 0, totalReps: 0, totalVolumeLbs: 0, workoutCount: 0 },
  };

  const segmentWorkoutCounts: Record<BIASegment, Set<string>> = {
    leftArm: new Set(),
    rightArm: new Set(),
    trunk: new Set(),
    leftLeg: new Set(),
    rightLeg: new Set(),
    arms: new Set(),
    legs: new Set(),
  };

  for (const workout of workouts) {
    if (!workout.bodyParts) continue;

    for (const [bodyPart, stats] of Object.entries(workout.bodyParts)) {
      const volume = stats.volumeLbs || 0;
      const distribution = distributeVolume(bodyPart, volume);

      for (const segment of Object.keys(distribution) as BIASegment[]) {
        result[segment].totalVolumeLbs += distribution[segment];
        result[segment].totalSets += stats.sets || 0;
        result[segment].totalReps += stats.reps || 0;
        segmentWorkoutCounts[segment].add(workout.id);
      }
    }
  }

  // Update workout counts
  for (const segment of Object.keys(result) as BIASegment[]) {
    result[segment].workoutCount = segmentWorkoutCounts[segment].size;
  }

  return result;
}

// ========================================
// 1.3 Correlation Calculation
// ========================================

export function correlateMeasurements(
  measurements: (BIAEntry | BodyspecScan)[],
  workouts: LiftingWorkout[],
  windowWeeks: number = 4
): CorrelationResult[] {
  // Sort measurements by date
  const sortedMeasurements = [...measurements].sort((a, b) => {
    const dateA = 'date' in a ? a.date : a.scanDate;
    const dateB = 'date' in b ? b.date : b.scanDate;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  if (sortedMeasurements.length < 2) {
    return [];
  }

  const results: CorrelationResult[] = [];
  const windowDays = windowWeeks * 7;

  // Create sliding windows: each pair of consecutive measurements
  for (let i = 1; i < sortedMeasurements.length; i++) {
    const startMeasurement = sortedMeasurements[i - 1];
    const endMeasurement = sortedMeasurements[i];

    const startDate = 'date' in startMeasurement ? startMeasurement.date : startMeasurement.scanDate;
    const endDate = 'date' in endMeasurement ? endMeasurement.date : endMeasurement.scanDate;

    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    const durationDays = Math.round((endTime - startTime) / (1000 * 60 * 60 * 24));

    // Check minimum and maximum duration constraints
    if (durationDays < 14 || durationDays > windowDays * 2) {
      continue;
    }

    // Get workouts in this period
    const periodWorkouts = workouts.filter(w => {
      const workoutTime = new Date(w.workoutDate).getTime();
      return workoutTime >= startTime && workoutTime <= endTime;
    });

    // Calculate muscle changes per segment
    const muscleChanges = calculateMuscleChanges(startMeasurement, endMeasurement);

    // Skip if no significant changes detected
    const totalChange = Math.abs(
      muscleChanges.reduce((sum, m) => sum + m.changeLbs, 0)
    );
    if (totalChange < 0.3) {
      continue;
    }

    // Aggregate workout volume
    const volumeBySegment = aggregateWorkoutVolumeBySegment(periodWorkouts);

    // Calculate efficiency
    const efficiency = calculateEfficiency(muscleChanges, volumeBySegment, durationDays);

    // Compute totals
    const totalMuscleGain = muscleChanges
      .filter(m => m.changeLbs > 0)
      .reduce((sum, m) => sum + m.changeLbs, 0);

    const totalVolume = Object.values(volumeBySegment)
      .reduce((sum, v) => sum + v.totalVolumeLbs, 0);

    const totalSets = Object.values(volumeBySegment)
      .reduce((sum, v) => sum + v.totalSets, 0);

    const source = 'data' in startMeasurement ? 'bodyspec' : 'bia';

    const period: MeasurementPeriod = {
      startDate,
      endDate,
      startMeasurement,
      endMeasurement,
      durationDays,
      source,
    };

    results.push({
      period,
      workouts: periodWorkouts,
      muscleChanges,
      volumeBySegment,
      efficiency,
      totalMuscleGain,
      totalVolume,
      totalSets,
    });
  }

  // Sort by end date descending (most recent first)
  return results.sort((a, b) =>
    new Date(b.period.endDate).getTime() - new Date(a.period.endDate).getTime()
  );
}

// ========================================
// Helper Functions
// ========================================

function calculateMuscleChanges(
  startMeasurement: BIAEntry | BodyspecScan,
  endMeasurement: BIAEntry | BodyspecScan
): Array<{
  segment: BIASegment;
  startLbs: number;
  endLbs: number;
  changeLbs: number;
  changePercent: number;
}> {
  const segments: BIASegment[] = ['leftArm', 'rightArm', 'trunk', 'leftLeg', 'rightLeg'];

  return segments.map(segment => {
    const startLbs = getBIASegmentValue(startMeasurement, segment);
    const endLbs = getBIASegmentValue(endMeasurement, segment);
    const changeLbs = endLbs - startLbs;
    const changePercent = startLbs > 0 ? (changeLbs / startLbs) * 100 : 0;

    return {
      segment,
      startLbs,
      endLbs,
      changeLbs,
      changePercent,
    };
  });
}

function calculateEfficiency(
  muscleChanges: Array<{
    segment: BIASegment;
    startLbs: number;
    endLbs: number;
    changeLbs: number;
    changePercent: number;
  }>,
  volumeBySegment: Record<BIASegment, WorkoutVolumeBySegment>,
  durationDays: number
): Array<{
  segment: BIASegment;
  volumePerLbGained: number;
  setsPerLbGained: number;
  weeksToGain1Lb: number;
}> {
  return muscleChanges
    .filter(m => m.segment !== 'arms' && m.segment !== 'legs') // Only individual segments
    .map(change => {
      const volume = volumeBySegment[change.segment].totalVolumeLbs;
      const sets = volumeBySegment[change.segment].totalSets;
      const durationWeeks = durationDays / 7;

      const volumePerLbGained = change.changeLbs > 0 ? volume / change.changeLbs : 0;
      const setsPerLbGained = change.changeLbs > 0 ? sets / change.changeLbs : 0;
      const weeksToGain1Lb = change.changeLbs > 0 ? durationWeeks / change.changeLbs : 0;

      return {
        segment: change.segment,
        volumePerLbGained: volumePerLbGained > 0 ? volumePerLbGained : 0,
        setsPerLbGained: setsPerLbGained > 0 ? setsPerLbGained : 0,
        weeksToGain1Lb: weeksToGain1Lb > 0 ? weeksToGain1Lb : 0,
      };
    });
}

// ========================================
// 1.4 Balance Analysis
// ========================================

export function analyzeBodyPartBalance(
  correlation: CorrelationResult
): BalanceAnalysis[] {
  const segments: BIASegment[] = ['leftArm', 'rightArm', 'trunk', 'leftLeg', 'rightLeg'];

  const totalVolume = Object.values(correlation.volumeBySegment)
    .filter(v => segments.includes(v.segment))
    .reduce((sum, v) => sum + v.totalVolumeLbs, 0);

  const totalMuscleGain = correlation.muscleChanges
    .filter(m => segments.includes(m.segment) && m.changeLbs > 0)
    .reduce((sum, m) => sum + m.changeLbs, 0);

  return segments.map(segment => {
    const volumeData = correlation.volumeBySegment[segment];
    const muscleData = correlation.muscleChanges.find(m => m.segment === segment);

    const volumeShare = totalVolume > 0 ? (volumeData.totalVolumeLbs / totalVolume) * 100 : 0;
    const muscleGainShare =
      totalMuscleGain > 0 && muscleData ? (Math.max(0, muscleData.changeLbs) / totalMuscleGain) * 100 : 0;

    const balanceRatio = volumeShare > 0 ? muscleGainShare / volumeShare : 0;

    let status: 'underperforming' | 'balanced' | 'overperforming';
    if (balanceRatio > 1.2) {
      status = 'overperforming';
    } else if (balanceRatio < 0.8) {
      status = 'underperforming';
    } else {
      status = 'balanced';
    }

    return {
      segment,
      volumeShare,
      muscleGainShare,
      balanceRatio,
      status,
    };
  });
}
