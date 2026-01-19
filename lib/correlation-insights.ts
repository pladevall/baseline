import {
  CorrelationResult,
  BalanceAnalysis,
  Insight,
  InsightSeverity,
  InsightType,
} from './types';
import { analyzeBodyPartBalance } from './correlation-utils';

// ========================================
// Insight Generation
// ========================================

export function generateVolumeEfficiencyInsights(
  correlation: CorrelationResult
): Insight[] {
  const insights: Insight[] = [];

  if (correlation.totalMuscleGain === 0 || correlation.totalVolume === 0) {
    return insights;
  }

  const volumePerLb = correlation.totalVolume / correlation.totalMuscleGain;

  // Categorize efficiency
  let category: string;
  let severity: InsightSeverity;
  let description: string;

  if (volumePerLb < 25000) {
    category = 'Excellent';
    severity = 'info';
    description = `You gained ${correlation.totalMuscleGain.toFixed(1)} lbs of muscle with ${(correlation.totalVolume / 1000).toFixed(0)}k lbs of volume (${(volumePerLb / 1000).toFixed(0)}k lbs per lb gained). This is excellent efficiency—typical of newer lifters.`;
  } else if (volumePerLb < 40000) {
    category = 'Good';
    severity = 'tip';
    description = `You gained ${correlation.totalMuscleGain.toFixed(1)} lbs of muscle with ${(correlation.totalVolume / 1000).toFixed(0)}k lbs of volume (${(volumePerLb / 1000).toFixed(0)}k lbs per lb gained). This is good intermediate-level efficiency.`;
  } else if (volumePerLb < 60000) {
    category = 'Average';
    severity = 'tip';
    description = `You gained ${correlation.totalMuscleGain.toFixed(1)} lbs of muscle with ${(correlation.totalVolume / 1000).toFixed(0)}k lbs of volume (${(volumePerLb / 1000).toFixed(0)}k lbs per lb gained). This is typical for advanced lifters.`;
  } else {
    category = 'Needs Improvement';
    severity = 'warning';
    description = `You gained ${correlation.totalMuscleGain.toFixed(1)} lbs of muscle with ${(correlation.totalVolume / 1000).toFixed(0)}k lbs of volume (${(volumePerLb / 1000).toFixed(0)}k lbs per lb gained). Consider increasing nutrition (calories/protein) or volume frequency.`;
  }

  insights.push({
    type: 'volume-efficiency',
    severity,
    title: `Efficiency: ${category}`,
    description,
    metrics: {
      volumePerLbGained: volumePerLb,
      totalMuscleGain: correlation.totalMuscleGain,
      totalVolume: correlation.totalVolume,
    },
  });

  // Additional recommendation based on duration
  const durationWeeks = correlation.period.durationDays / 7;
  const gainPerWeek = correlation.totalMuscleGain / durationWeeks;

  if (gainPerWeek > 0.5) {
    insights.push({
      type: 'volume-efficiency',
      severity: 'info',
      title: 'Strong Muscle Gain Rate',
      description: `You're gaining ${gainPerWeek.toFixed(2)} lbs per week. This is a strong rate—maintain your current training and nutrition.`,
      metrics: { gainPerWeek },
    });
  } else if (gainPerWeek < 0.1) {
    insights.push({
      type: 'volume-efficiency',
      severity: 'warning',
      title: 'Low Muscle Gain Rate',
      description: `You're gaining ${gainPerWeek.toFixed(2)} lbs per week. Consider increasing calories, protein, or training volume to improve muscle growth.`,
      metrics: { gainPerWeek },
    });
  }

  return insights;
}

export function generateBalanceInsights(
  balance: BalanceAnalysis[]
): Insight[] {
  const insights: Insight[] = [];

  // Find underperforming segments
  const underperforming = balance.filter(b => b.status === 'underperforming');

  if (underperforming.length > 0) {
    const segments = underperforming
      .map(b => segmentDisplayName(b.segment))
      .join(', ');

    insights.push({
      type: 'body-part-balance',
      severity: 'warning',
      title: 'Body Parts Underperforming',
      description: `${segments} received ${underperforming[0].volumeShare.toFixed(0)}% of volume but only ${underperforming[0].muscleGainShare.toFixed(0)}% of muscle growth. Try increasing ${segments} training frequency or intensity.`,
      recommendation: `Add 1-2 extra sets per week for ${segments}.`,
      metrics: {
        volumeShare: underperforming[0].volumeShare,
        muscleGainShare: underperforming[0].muscleGainShare,
        balanceRatio: underperforming[0].balanceRatio,
      },
    });
  }

  // Find overperforming segments
  const overperforming = balance.filter(b => b.status === 'overperforming');

  if (overperforming.length > 0) {
    const segments = overperforming
      .map(b => segmentDisplayName(b.segment))
      .join(', ');

    insights.push({
      type: 'body-part-balance',
      severity: 'info',
      title: 'Body Parts Overperforming',
      description: `${segments} received ${overperforming[0].volumeShare.toFixed(0)}% of volume but delivered ${overperforming[0].muscleGainShare.toFixed(0)}% of muscle growth. Excellent response to training.`,
      metrics: {
        volumeShare: overperforming[0].volumeShare,
        muscleGainShare: overperforming[0].muscleGainShare,
        balanceRatio: overperforming[0].balanceRatio,
      },
    });
  }

  // Check for imbalance between left/right
  const leftArm = balance.find(b => b.segment === 'leftArm');
  const rightArm = balance.find(b => b.segment === 'rightArm');
  const leftLeg = balance.find(b => b.segment === 'leftLeg');
  const rightLeg = balance.find(b => b.segment === 'rightLeg');

  if (leftArm && rightArm && Math.abs(leftArm.muscleGainShare - rightArm.muscleGainShare) > 5) {
    insights.push({
      type: 'body-part-balance',
      severity: 'tip',
      title: 'Left-Right Arm Imbalance',
      description: `Left and right arm muscle growth differs by ${Math.abs(leftArm.muscleGainShare - rightArm.muscleGainShare).toFixed(1)}%. Consider single-limb exercises to even out growth.`,
    });
  }

  if (leftLeg && rightLeg && Math.abs(leftLeg.muscleGainShare - rightLeg.muscleGainShare) > 5) {
    insights.push({
      type: 'body-part-balance',
      severity: 'tip',
      title: 'Left-Right Leg Imbalance',
      description: `Left and right leg muscle growth differs by ${Math.abs(leftLeg.muscleGainShare - rightLeg.muscleGainShare).toFixed(1)}%. Consider single-leg exercises to even out growth.`,
    });
  }

  return insights;
}

export function generatePeriodizationInsights(
  correlations: CorrelationResult[]
): Insight[] {
  const insights: Insight[] = [];

  if (correlations.length < 2) {
    return insights;
  }

  // Sort by date ascending
  const sorted = [...correlations].sort((a, b) =>
    new Date(a.period.endDate).getTime() - new Date(b.period.endDate).getTime()
  );

  // Check for declining muscle gain trend
  const recentGains = sorted.slice(-3).map(c => c.totalMuscleGain);

  if (recentGains.length >= 2) {
    const gainTrend = recentGains[recentGains.length - 1] - recentGains[0];
    const declinePercent = recentGains[0] > 0
      ? ((gainTrend / recentGains[0]) * 100)
      : 0;

    if (declinePercent < -30) {
      insights.push({
        type: 'periodization',
        severity: 'warning',
        title: 'Declining Muscle Gain',
        description: `Your muscle gain rate has declined ${Math.abs(declinePercent).toFixed(0)}% over the past ${sorted.length} periods. Consider a deload week, increase training volume, or adjust nutrition.`,
        recommendation: 'Implement a deload week (reduce volume 40-50%) followed by 1-2 weeks of progressive overload.',
        metrics: {
          recentGain: recentGains[recentGains.length - 1],
          previousGain: recentGains[0],
          declinePercent,
        },
      });
    }

    if (declinePercent > 20 && recentGains[0] > 0) {
      insights.push({
        type: 'periodization',
        severity: 'info',
        title: 'Improving Muscle Gain',
        description: `Your muscle gain rate has improved ${declinePercent.toFixed(0)}% over the past ${sorted.length} periods. Your current approach is working well.`,
        metrics: {
          recentGain: recentGains[recentGains.length - 1],
          previousGain: recentGains[0],
          improvementPercent: declinePercent,
        },
      });
    }
  }

  // Check overall consistency
  const averageGain = recentGains.reduce((a, b) => a + b, 0) / recentGains.length;
  const variance = recentGains.reduce((sum, gain) => sum + Math.pow(gain - averageGain, 2), 0) / recentGains.length;
  const stdDev = Math.sqrt(variance);

  if (averageGain > 0.5 && stdDev / averageGain > 0.5) {
    insights.push({
      type: 'periodization',
      severity: 'tip',
      title: 'Inconsistent Muscle Gain',
      description: `Your muscle gain varies widely (${stdDev.toFixed(2)} lbs std dev). Ensure consistency in nutrition, sleep, and training frequency.`,
    });
  }

  // Recommend next phase
  if (sorted.length > 0) {
    const lastPeriod = sorted[sorted.length - 1];
    const durationWeeks = lastPeriod.period.durationDays / 7;

    if (durationWeeks >= 4 && lastPeriod.totalMuscleGain > 0.5) {
      insights.push({
        type: 'periodization',
        severity: 'info',
        title: 'Ready for Next Phase',
        description: `You've completed a ${durationWeeks.toFixed(0)}-week training cycle with positive results. Consider progressive overload: increase weight 5%, volume 10%, or change exercise selection.`,
        recommendation: 'Add 1-2 more reps, 5 lbs more weight, or 2-3 more sets to your main lifts for the next cycle.',
      });
    }
  }

  return insights;
}

// ========================================
// Helpers
// ========================================

export function segmentDisplayName(segment: string): string {
  const names: Record<string, string> = {
    leftArm: 'Left Arm',
    rightArm: 'Right Arm',
    trunk: 'Trunk',
    leftLeg: 'Left Leg',
    rightLeg: 'Right Leg',
    arms: 'Arms',
    legs: 'Legs',
  };
  return names[segment] || segment;
}

export function getInsightColor(severity: InsightSeverity): string {
  switch (severity) {
    case 'warning':
      return 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400';
    case 'tip':
      return 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400';
    case 'info':
      return 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-400';
  }
}

export function getInsightIcon(severity: InsightSeverity): string {
  switch (severity) {
    case 'warning':
      return '⚠️';
    case 'tip':
      return '💡';
    case 'info':
      return '✓';
  }
}
