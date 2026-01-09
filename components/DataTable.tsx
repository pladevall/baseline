'use client';

import { useState } from 'react';
import { BIAEntry, METRIC_DEFINITIONS, CATEGORY_LABELS, MetricDefinition, GOAL_ELIGIBLE_METRICS } from '@/lib/types';
import { Goal } from '@/lib/supabase';
import Tooltip from './Tooltip';
import GoalEditor from './GoalEditor';

interface DataTableProps {
  entries: BIAEntry[];
  goals: Goal[];
  onDelete: (id: string) => void;
  onSaveGoal: (metricKey: string, targetValue: number) => void;
  onDeleteGoal: (metricKey: string) => void;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object' && 'lb' in value && 'percent' in value) {
    const seg = value as { lb: number; percent: number };
    if (seg.lb === 0) return '—';
    return seg.lb.toFixed(1);
  }
  if (typeof value === 'number') {
    if (value === 0) return '—';
    return value.toFixed(1);
  }
  return String(value);
}

function getTrendIndicator(
  current: number,
  previous: number | undefined,
  metric: MetricDefinition
): { color: string; arrow: string } {
  if (previous === undefined || current === 0 || previous === 0) {
    return { color: '', arrow: '' };
  }

  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return { color: '', arrow: '' };

  const improved = metric.higherIsBetter
    ? diff > 0
    : metric.higherIsBetter === false
    ? diff < 0
    : null;

  if (improved === null) return { color: '', arrow: '' };

  return {
    color: improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
    arrow: diff > 0 ? '↑' : '↓'
  };
}

type RangeStatus = 'below' | 'within' | 'above' | null;

function getRangeStatus(value: number, metric: MetricDefinition): RangeStatus {
  if (!metric.normalRange || value === 0) return null;
  const { min, max } = metric.normalRange;
  if (value < min) return 'below';
  if (value > max) return 'above';
  return 'within';
}

function getRangeIndicator(status: RangeStatus, metric: MetricDefinition): { dotColor: string; label: string } {
  const range = metric.normalRange;
  const rangeStr = range ? ` (${range.min}–${range.max}${metric.unit})` : '';

  switch (status) {
    case 'below':
      return { dotColor: 'bg-amber-500', label: `Below normal${rangeStr}` };
    case 'above':
      return { dotColor: 'bg-red-500', label: `Above normal${rangeStr}` };
    case 'within':
      return { dotColor: 'bg-emerald-500', label: `Within normal${rangeStr}` };
    default:
      return { dotColor: '', label: '' };
  }
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

type TrendPeriod = '30' | '60' | '90' | 'YTD';

function getTrendPeriodLabel(period: TrendPeriod): string {
  if (period === 'YTD') return 'YTD';
  return `${period}d`;
}

function getComparisonEntry(entries: BIAEntry[], period: TrendPeriod): BIAEntry | null {
  if (entries.length < 2) return null;

  const now = new Date();
  const latestEntry = entries[0];
  let cutoffDate: Date;

  if (period === 'YTD') {
    cutoffDate = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
  } else {
    const days = parseInt(period);
    cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  // Find the entry closest to (but not after) the cutoff date
  // Entries are sorted by date descending, so we look for the first entry before cutoff
  for (let i = 1; i < entries.length; i++) {
    const entryDate = new Date(entries[i].date);
    if (entryDate <= cutoffDate) {
      return entries[i];
    }
  }

  // If no entry before cutoff, return the oldest entry (for comparison)
  return entries[entries.length - 1] !== latestEntry ? entries[entries.length - 1] : null;
}

function formatTrendValue(diff: number, improved: boolean | null): { text: string; color: string } {
  if (diff === 0) return { text: '—', color: 'text-gray-400' };

  const sign = diff > 0 ? '+' : '';
  const text = `${sign}${diff.toFixed(1)}`;

  if (improved === null) return { text, color: 'text-gray-600 dark:text-gray-300' };

  return {
    text,
    color: improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
  };
}

type GoalProgress = 'met' | 'close' | 'far' | null;

function getGoalProgress(current: number, target: number, higherIsBetter: boolean): GoalProgress {
  if (!current || !target) return null;

  if (higherIsBetter) {
    if (current >= target) return 'met';
    if (current >= target * 0.9) return 'close';
    return 'far';
  } else {
    if (current <= target) return 'met';
    if (current <= target * 1.1) return 'close';
    return 'far';
  }
}

function getGoalProgressColor(progress: GoalProgress): string {
  switch (progress) {
    case 'met': return 'text-emerald-600 dark:text-emerald-400';
    case 'close': return 'text-amber-600 dark:text-amber-400';
    case 'far': return 'text-gray-500 dark:text-gray-400';
    default: return 'text-gray-400';
  }
}

interface ForecastResult {
  timeText: string;
  dateText: string;
  isMet: boolean;
}

function calculateForecast(
  currentValue: number,
  goalValue: number | undefined,
  comparisonValue: number,
  daysBetween: number,
  higherIsBetter: boolean
): ForecastResult | null {
  if (!goalValue || !currentValue || !comparisonValue || daysBetween <= 0) {
    return null;
  }

  // Already at goal
  const goalMet = higherIsBetter ? currentValue >= goalValue : currentValue <= goalValue;
  if (goalMet) {
    return { timeText: '✓', dateText: 'Goal reached!', isMet: true };
  }

  // Calculate daily rate of change
  const totalChange = currentValue - comparisonValue;
  const dailyRate = totalChange / daysBetween;

  // Check if trending in wrong direction or no progress
  const trendingRight = higherIsBetter ? dailyRate > 0 : dailyRate < 0;
  if (!trendingRight || Math.abs(dailyRate) < 0.001) {
    return null; // Can't forecast - wrong direction or no change
  }

  // Calculate days to goal
  const remaining = Math.abs(goalValue - currentValue);
  const daysToGoal = remaining / Math.abs(dailyRate);

  // Cap at reasonable forecast (2 years)
  if (daysToGoal > 730) {
    return null;
  }

  // Format output
  const weeks = Math.round(daysToGoal / 7);
  const months = Math.round(daysToGoal / 30);

  let timeText: string;
  if (weeks < 1) {
    timeText = '<1 wk';
  } else if (months >= 3) {
    timeText = `~${months} mo`;
  } else {
    timeText = `~${weeks} wk${weeks !== 1 ? 's' : ''}`;
  }

  const targetDate = new Date(Date.now() + daysToGoal * 24 * 60 * 60 * 1000);
  const dateText = `Est. ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return { timeText, dateText, isMet: false };
}

function formatGapTooltip(currentValue: number, goalValue: number, higherIsBetter: boolean, unit: string): React.ReactNode {
  const gap = goalValue - currentValue;

  if (higherIsBetter) {
    return gap > 0 ? <><span className="font-bold">Gap</span>: {gap.toFixed(1)} {unit}</> : 'Goal reached!';
  } else {
    return gap < 0 ? <><span className="font-bold">Gap</span>: {gap.toFixed(1)} {unit}</> : 'Goal reached!';
  }
}

function getDaysBetweenEntries(latest: BIAEntry, comparison: BIAEntry | null): number {
  if (!comparison) return 0;
  const latestDate = new Date(latest.date);
  const comparisonDate = new Date(comparison.date);
  return Math.round((latestDate.getTime() - comparisonDate.getTime()) / (24 * 60 * 60 * 1000));
}

export default function DataTable({ entries, goals, onDelete, onSaveGoal, onDeleteGoal }: DataTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['header', 'core', 'segmental-muscle', 'segmental-fat'])
  );
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('30');
  const [editingGoal, setEditingGoal] = useState<{ metricKey: string; label: string } | null>(null);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const comparisonEntry = getComparisonEntry(entries, trendPeriod);
  const goalsMap = new Map(goals.map(g => [g.metricKey, g.targetValue]));
  const daysBetween = entries.length > 0 ? getDaysBetweenEntries(entries[0], comparisonEntry) : 0;

  if (entries.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        No entries yet. Upload a screenshot to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[180px]">
              Metric
            </th>
            <th className="px-2 py-2 text-center min-w-[60px] border-l border-gray-100 dark:border-gray-800/50 bg-blue-50/50 dark:bg-blue-900/20">
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Goal</span>
            </th>
            <th className="px-2 py-2 text-center min-w-[60px] border-l border-gray-100 dark:border-gray-800/50 bg-blue-50/30 dark:bg-blue-900/10">
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">ETA</span>
            </th>
            <th className="px-2 py-2 text-center min-w-[70px] border-l border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Trend</span>
                <div className="flex gap-0.5">
                  {(['30', '60', '90', 'YTD'] as TrendPeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setTrendPeriod(period)}
                      className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                        trendPeriod === period
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {getTrendPeriodLabel(period)}
                    </button>
                  ))}
                </div>
              </div>
            </th>
            {entries.map((entry) => (
              <th
                key={entry.id}
                className="px-3 py-2 text-center min-w-[100px] border-l border-gray-100 dark:border-gray-800/50"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(entry.date)}
                  </span>
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
          {/* Header & Core */}
          {(['header', 'core'] as const).map((category) => {
            const metricsInCategory = METRIC_DEFINITIONS.filter(
              (m) => m.category === category
            );
            return (
              <CategorySection
                key={category}
                category={category}
                categoryLabel={CATEGORY_LABELS[category]}
                metrics={metricsInCategory}
                entries={entries}
                comparisonEntry={comparisonEntry}
                isExpanded={expandedCategories.has(category)}
                onToggle={() => toggleCategory(category)}
                goalsMap={goalsMap}
                onEditGoal={setEditingGoal}
                daysBetween={daysBetween}
              />
            );
          })}

          {/* Segmental sections right after core */}
          <SegmentalSection
            title="Segmental Muscle"
            isExpanded={expandedCategories.has('segmental-muscle')}
            onToggle={() => toggleCategory('segmental-muscle')}
            entries={entries}
            comparisonEntry={comparisonEntry}
            fields={[
              { key: 'muscleLeftArm', label: 'Left Arm' },
              { key: 'muscleRightArm', label: 'Right Arm' },
              { key: 'muscleTrunk', label: 'Trunk' },
              { key: 'muscleLeftLeg', label: 'Left Leg' },
              { key: 'muscleRightLeg', label: 'Right Leg' },
            ]}
            higherIsBetter={true}
            goalsMap={goalsMap}
            onEditGoal={setEditingGoal}
            daysBetween={daysBetween}
          />

          <SegmentalSection
            title="Segmental Fat"
            isExpanded={expandedCategories.has('segmental-fat')}
            onToggle={() => toggleCategory('segmental-fat')}
            entries={entries}
            comparisonEntry={comparisonEntry}
            fields={[
              { key: 'fatLeftArm', label: 'Left Arm' },
              { key: 'fatRightArm', label: 'Right Arm' },
              { key: 'fatTrunk', label: 'Trunk' },
              { key: 'fatLeftLeg', label: 'Left Leg' },
              { key: 'fatRightLeg', label: 'Right Leg' },
            ]}
            higherIsBetter={false}
            goalsMap={goalsMap}
            onEditGoal={setEditingGoal}
            daysBetween={daysBetween}
          />

          {/* Remaining sections */}
          {(['composition', 'additional', 'recommendations'] as const).map((category) => {
            const metricsInCategory = METRIC_DEFINITIONS.filter(
              (m) => m.category === category
            );
            return (
              <CategorySection
                key={category}
                category={category}
                categoryLabel={CATEGORY_LABELS[category]}
                metrics={metricsInCategory}
                entries={entries}
                comparisonEntry={comparisonEntry}
                isExpanded={expandedCategories.has(category)}
                onToggle={() => toggleCategory(category)}
                goalsMap={goalsMap}
                onEditGoal={setEditingGoal}
                daysBetween={daysBetween}
              />
            );
          })}
        </tbody>
      </table>

      {editingGoal && (
        <GoalEditor
          metricKey={editingGoal.metricKey}
          metricLabel={editingGoal.label}
          currentValue={goalsMap.get(editingGoal.metricKey) || null}
          onSave={onSaveGoal}
          onDelete={onDeleteGoal}
          onClose={() => setEditingGoal(null)}
        />
      )}
    </div>
  );
}

interface CategorySectionProps {
  category: string;
  categoryLabel: string;
  metrics: MetricDefinition[];
  entries: BIAEntry[];
  comparisonEntry: BIAEntry | null;
  isExpanded: boolean;
  onToggle: () => void;
  goalsMap: Map<string, number>;
  onEditGoal: (goal: { metricKey: string; label: string }) => void;
  daysBetween: number;
}

function CategorySection({
  categoryLabel,
  metrics,
  entries,
  comparisonEntry,
  isExpanded,
  onToggle,
  goalsMap,
  onEditGoal,
  daysBetween,
}: CategorySectionProps) {
  const latestEntry = entries[0];

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={onToggle}
      >
        <td
          className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50 px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 min-w-[180px]"
        >
          <span className="inline-flex items-center gap-1.5">
            <svg
              className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {categoryLabel}
          </span>
        </td>
        <td className="bg-gray-50 dark:bg-gray-900/50 border-l border-gray-100 dark:border-gray-800/50" />
        <td className="bg-gray-50 dark:bg-gray-900/50 border-l border-gray-100 dark:border-gray-800/50" />
        <td className="bg-gray-50 dark:bg-gray-900/50 border-l border-gray-100 dark:border-gray-800/50" />
        {entries.map((entry) => (
          <td
            key={entry.id}
            className="bg-gray-50 dark:bg-gray-900/50 border-l border-gray-100 dark:border-gray-800/50"
          />
        ))}
      </tr>
      {isExpanded &&
        metrics.map((metric) => {
          // Calculate trend for this metric
          const latestValue = typeof latestEntry?.[metric.key] === 'number' ? latestEntry[metric.key] as number : 0;
          const comparisonValue = comparisonEntry && typeof comparisonEntry[metric.key] === 'number'
            ? comparisonEntry[metric.key] as number
            : 0;
          const trendDiff = latestValue && comparisonValue ? latestValue - comparisonValue : 0;
          const trendImproved = metric.higherIsBetter !== undefined && trendDiff !== 0
            ? (metric.higherIsBetter ? trendDiff > 0 : trendDiff < 0)
            : null;
          const { text: trendText, color: trendColor } = formatTrendValue(trendDiff, trendImproved);

          // Goal data
          const isGoalEligible = GOAL_ELIGIBLE_METRICS.includes(metric.key);
          const goalValue = goalsMap.get(metric.key as string);
          const goalProgress = goalValue && latestValue
            ? getGoalProgress(latestValue, goalValue, metric.higherIsBetter ?? true)
            : null;
          const goalColor = getGoalProgressColor(goalProgress);

          // Forecast data
          const forecast = calculateForecast(
            latestValue,
            goalValue,
            comparisonValue,
            daysBetween,
            metric.higherIsBetter ?? true
          );

          return (
            <tr
              key={metric.key}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
            >
              <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-1.5 text-gray-600 dark:text-gray-300 min-w-[180px]">
                <span className="text-xs inline-flex items-center gap-1">
                  {metric.label}
                  {metric.normalRange && (
                    <Tooltip content={`Normal: ${metric.normalRange.min}–${metric.normalRange.max}${metric.unit}`}>
                      <svg className="w-3 h-3 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </Tooltip>
                  )}
                </span>
              </td>
              <td
                className={`px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-blue-50/30 dark:bg-blue-900/10 ${isGoalEligible ? 'cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30' : ''}`}
                onClick={isGoalEligible ? () => onEditGoal({ metricKey: metric.key as string, label: metric.label }) : undefined}
              >
                {goalValue && latestValue ? (
                  <Tooltip content={formatGapTooltip(latestValue, goalValue, metric.higherIsBetter ?? true, metric.unit)}>
                    <span className={`text-xs tabular-nums font-medium cursor-help ${goalColor}`}>
                      {goalValue.toFixed(1)}
                    </span>
                  </Tooltip>
                ) : goalValue ? (
                  <span className={`text-xs tabular-nums font-medium ${goalColor}`}>
                    {goalValue.toFixed(1)}
                  </span>
                ) : isGoalEligible ? (
                  <span className="text-xs text-gray-300 dark:text-gray-600">+</span>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-blue-50/20 dark:bg-blue-900/5">
                {forecast ? (
                  <Tooltip content={forecast.dateText}>
                    <span className={`text-xs tabular-nums font-medium cursor-help ${forecast.isMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {forecast.timeText}
                    </span>
                  </Tooltip>
                ) : goalValue ? (
                  <span className="text-xs text-gray-400">—</span>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/30">
                <span className={`text-xs tabular-nums font-medium ${trendColor}`}>
                  {trendText}
                </span>
              </td>
              {entries.map((entry, entryIdx) => {
                const value = entry[metric.key];
                const previousEntry = entries[entryIdx + 1];
                const previousValue = previousEntry
                  ? (previousEntry[metric.key] as number)
                  : undefined;

                const numValue = typeof value === 'number' ? value : 0;
                const { color, arrow } = getTrendIndicator(numValue, previousValue, metric);
                const rangeStatus = getRangeStatus(numValue, metric);
                const { dotColor, label: rangeLabel } = getRangeIndicator(rangeStatus, metric);
                const displayValue = formatValue(value);

                return (
                  <td
                    key={entry.id}
                    className="px-3 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50"
                  >
                    <span className={`text-xs inline-flex items-center justify-center gap-1.5 ${color || 'text-gray-900 dark:text-gray-100'}`}>
                      {rangeStatus ? (
                        <Tooltip content={rangeLabel}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} cursor-help flex-shrink-0`} />
                        </Tooltip>
                      ) : (
                        <span className="w-1.5" />
                      )}
                      <span className="tabular-nums w-14 text-right">{displayValue}</span>
                      {arrow ? (
                        <span className="text-[10px] w-3">{arrow}</span>
                      ) : (
                        <span className="w-3" />
                      )}
                    </span>
                  </td>
                );
              })}
            </tr>
          );
        })}
    </>
  );
}

interface SegmentalSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  entries: BIAEntry[];
  comparisonEntry: BIAEntry | null;
  fields: Array<{ key: keyof BIAEntry; label: string }>;
  higherIsBetter: boolean;
  goalsMap: Map<string, number>;
  onEditGoal: (goal: { metricKey: string; label: string }) => void;
  daysBetween: number;
}

function getSegmentalTrendIndicator(
  current: number,
  previous: number | undefined,
  higherIsBetter: boolean
): { color: string; arrow: string } {
  if (previous === undefined || current === 0 || previous === 0) {
    return { color: '', arrow: '' };
  }

  const diff = current - previous;
  if (Math.abs(diff) < 0.1) return { color: '', arrow: '' };

  const isIncrease = diff > 0;
  const improved = higherIsBetter ? isIncrease : !isIncrease;

  return {
    color: improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
    arrow: isIncrease ? '↑' : '↓'
  };
}

function SegmentalSection({
  title,
  isExpanded,
  onToggle,
  entries,
  comparisonEntry,
  fields,
  higherIsBetter,
  goalsMap,
  onEditGoal,
  daysBetween,
}: SegmentalSectionProps) {
  const latestEntry = entries[0];

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={onToggle}
      >
        <td
          className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50 px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 min-w-[180px]"
        >
          <span className="inline-flex items-center gap-1.5">
            <svg
              className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {title}
          </span>
        </td>
        <td className="bg-gray-50 dark:bg-gray-900/50 border-l border-gray-100 dark:border-gray-800/50" />
        <td className="bg-gray-50 dark:bg-gray-900/50 border-l border-gray-100 dark:border-gray-800/50" />
        <td className="bg-gray-50 dark:bg-gray-900/50 border-l border-gray-100 dark:border-gray-800/50" />
        {entries.map((entry) => (
          <td
            key={entry.id}
            className="bg-gray-50 dark:bg-gray-900/50 border-l border-gray-100 dark:border-gray-800/50"
          />
        ))}
      </tr>
      {isExpanded &&
        fields.map((field) => {
          // Calculate trend for this segmental field
          const latestValue = latestEntry?.[field.key] as { lb: number; percent: number } | undefined;
          const latestLb = latestValue?.lb || 0;
          const comparisonValue = comparisonEntry?.[field.key] as { lb: number; percent: number } | undefined;
          const comparisonLb = comparisonValue?.lb || 0;
          const trendDiff = latestLb && comparisonLb ? latestLb - comparisonLb : 0;
          const trendImproved = trendDiff !== 0 ? (higherIsBetter ? trendDiff > 0 : trendDiff < 0) : null;
          const { text: trendText, color: trendColor } = formatTrendValue(trendDiff, trendImproved);

          // Goal data for segmental muscle (lb values)
          const isGoalEligible = GOAL_ELIGIBLE_METRICS.includes(field.key);
          const goalValue = goalsMap.get(field.key as string);
          const goalProgress = goalValue && latestLb
            ? getGoalProgress(latestLb, goalValue, higherIsBetter)
            : null;
          const goalColor = getGoalProgressColor(goalProgress);

          // Forecast data
          const forecast = calculateForecast(
            latestLb,
            goalValue,
            comparisonLb,
            daysBetween,
            higherIsBetter
          );

          return (
            <tr
              key={field.key}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
            >
              <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-1.5 text-gray-600 dark:text-gray-300 min-w-[180px]">
                <span className="text-xs">{field.label}</span>
              </td>
              <td
                className={`px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-blue-50/30 dark:bg-blue-900/10 ${isGoalEligible ? 'cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30' : ''}`}
                onClick={isGoalEligible ? () => onEditGoal({ metricKey: field.key as string, label: field.label }) : undefined}
              >
                {goalValue && latestLb ? (
                  <Tooltip content={formatGapTooltip(latestLb, goalValue, higherIsBetter, 'lb')}>
                    <span className={`text-xs tabular-nums font-medium cursor-help ${goalColor}`}>
                      {goalValue.toFixed(1)}
                    </span>
                  </Tooltip>
                ) : goalValue ? (
                  <span className={`text-xs tabular-nums font-medium ${goalColor}`}>
                    {goalValue.toFixed(1)}
                  </span>
                ) : isGoalEligible ? (
                  <span className="text-xs text-gray-300 dark:text-gray-600">+</span>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-blue-50/20 dark:bg-blue-900/5">
                {forecast ? (
                  <Tooltip content={forecast.dateText}>
                    <span className={`text-xs tabular-nums font-medium cursor-help ${forecast.isMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {forecast.timeText}
                    </span>
                  </Tooltip>
                ) : goalValue ? (
                  <span className="text-xs text-gray-400">—</span>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/30">
                <span className={`text-xs tabular-nums font-medium ${trendColor}`}>
                  {trendText}
                </span>
              </td>
              {entries.map((entry, entryIdx) => {
                const value = entry[field.key] as { lb: number; percent: number } | undefined;
                const currentLb = value?.lb || 0;

                const previousEntry = entries[entryIdx + 1];
                const previousValue = previousEntry?.[field.key] as { lb: number; percent: number } | undefined;
                const previousLb = previousValue?.lb || 0;

                const { color, arrow } = getSegmentalTrendIndicator(currentLb, previousLb, higherIsBetter);

                return (
                  <td
                    key={entry.id}
                    className="px-3 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50"
                  >
                    <span className={`text-xs inline-flex items-center justify-center gap-1.5 ${color || 'text-gray-900 dark:text-gray-100'}`}>
                      <span className="w-1.5" />
                      <span className="tabular-nums w-14 text-right">{formatValue(value)}</span>
                      {arrow ? (
                        <span className="text-[10px] w-3">{arrow}</span>
                      ) : (
                        <span className="w-3" />
                      )}
                    </span>
                  </td>
                );
              })}
            </tr>
          );
        })}
    </>
  );
}
