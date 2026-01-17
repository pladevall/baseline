'use client';

import { useState } from 'react';
import { SleepEntry } from '@/lib/types';
import { TimeSeriesTable, TimeSeriesRow, SectionHeaderRow } from './TimeSeriesTable';
import Tooltip from './Tooltip';
import { TrendPeriod, getTrendPeriodLabel, getComparisonEntry, formatTrendValue } from '@/lib/trend-utils';

interface SleepTableProps {
    entries: SleepEntry[];
}

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function formatDurationDiff(minutes: number): string {
    const sign = minutes > 0 ? '+' : '';
    const absMinutes = Math.abs(minutes);
    const h = Math.floor(absMinutes / 60);
    const m = Math.round(absMinutes % 60);

    if (absMinutes < 60) {
        return `${sign}${m}m`;
    }
    if (m === 0) {
        return `${sign}${h}h`;
    }
    return `${sign}${h}h ${m}m`;
}

function formatTime(isoString: string): string {
    if (!isoString) return '—';
    try {
        return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
        return '—';
    }
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getScoreColor(score: number): string {
    if (score >= 85) return 'text-emerald-500 font-medium';
    if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
}

function calculateAverage(
    entries: SleepEntry[],
    period: TrendPeriod,
    getValue: (entry: SleepEntry) => number | undefined
): number | undefined {
    if (entries.length === 0) return undefined;

    const now = new Date();
    let cutoffDate: Date;

    if (period === 'YTD') {
        cutoffDate = new Date(now.getFullYear(), 0, 1);
    } else {
        const days = parseInt(period);
        cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Filter entries within the period
    const entriesInPeriod = entries.filter(entry => {
        const entryDate = new Date(entry.sleepDate);
        return entryDate >= cutoffDate;
    });

    if (entriesInPeriod.length === 0) return undefined;

    // Calculate average
    const values = entriesInPeriod.map(getValue).filter((v): v is number => v !== undefined);
    if (values.length === 0) return undefined;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
}

export function SleepTable({ entries }: SleepTableProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'timing', 'stages', 'interruptions']));
    const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('7');

    const toggleSection = (section: string) => {
        const next = new Set(expandedSections);
        if (next.has(section)) next.delete(section);
        else next.add(section);
        setExpandedSections(next);
    };

    if (!entries || entries.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No sleep entries found.
            </div>
        );
    }

    // Sort by date descending
    const sortedEntries = [...entries].sort((a, b) =>
        new Date(b.sleepDate).getTime() - new Date(a.sleepDate).getTime()
    );

    const comparisonEntry = getComparisonEntry(sortedEntries, trendPeriod, (e) => e.sleepDate);
    const latestEntry = sortedEntries[0];

    const renderTrendCell = (
        currentValue: number | undefined,
        comparisonValue: number | undefined,
        higherIsBetter: boolean = true,
        isDuration: boolean = false
    ) => {
        if (currentValue === undefined || comparisonValue === undefined) {
            return <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20"><span className="text-xs text-gray-300 dark:text-gray-600">—</span></td>;
        }

        const diff = currentValue - comparisonValue;
        const improved = diff === 0 ? null : (higherIsBetter ? diff > 0 : diff < 0);

        // Format the text based on whether it's a duration
        let text: string;
        if (isDuration) {
            text = diff === 0 ? '—' : formatDurationDiff(diff);
        } else {
            const formatted = formatTrendValue(diff, improved);
            text = formatted.text;
        }

        const color = improved === null ? 'text-gray-600 dark:text-gray-300'
            : improved ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-500 dark:text-red-400';

        const periodLabel = getTrendPeriodLabel(trendPeriod);
        const tooltipValue = isDuration ? formatDuration(comparisonValue) : comparisonValue.toFixed(1);

        return (
            <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
                <Tooltip content={`Compared to ${periodLabel} ago: ${tooltipValue}`}>
                    <span className={`text-xs tabular-nums font-medium cursor-help ${color}`}>
                        {text}
                    </span>
                </Tooltip>
            </td>
        );
    };

    const renderAverageCell = (
        getValue: (entry: SleepEntry) => number | undefined,
        isDuration: boolean = false
    ) => {
        const avg = calculateAverage(sortedEntries, trendPeriod, getValue);

        if (avg === undefined) {
            return (
                <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-blue-50/30 dark:bg-blue-900/10">
                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                </td>
            );
        }

        const displayValue = isDuration ? formatDuration(avg) : avg.toFixed(1);
        const periodLabel = getTrendPeriodLabel(trendPeriod);

        return (
            <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-blue-50/30 dark:bg-blue-900/10">
                <Tooltip content={`Average over ${periodLabel}`}>
                    <span className="text-xs tabular-nums font-medium cursor-help text-gray-700 dark:text-gray-300">
                        {displayValue}
                    </span>
                </Tooltip>
            </td>
        );
    };

    return (
        <TimeSeriesTable
            headerLabel="Metric"
            columns={sortedEntries}
            headerFixedContent={
                <>
                    {/* Average column with period selector */}
                    <th className="px-2 py-2 text-center min-w-[70px] border-l border-gray-100 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Average</span>
                            <div className="flex gap-0.5">
                                {(['7', '30', '90', 'YTD'] as TrendPeriod[]).map((period) => (
                                    <button
                                        key={period}
                                        onClick={() => setTrendPeriod(period)}
                                        className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${trendPeriod === period
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

                    {/* Trend column (simplified header) */}
                    <th className="px-2 py-2 text-center min-w-[70px] border-l border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Trend</span>
                    </th>
                </>
            }
            renderColumnHeader={(entry) => (
                <th key={entry.id} className="px-3 py-2 text-center min-w-[100px] border-l border-gray-100 dark:border-gray-800/50">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(entry.sleepDate)}
                    </span>
                </th>
            )}
        >
            {/* Overview Section */}
            <SectionHeaderRow
                label="Overview"
                isExpanded={expandedSections.has('overview')}
                onToggle={() => toggleSection('overview')}
                columnCount={sortedEntries.length}
                fixedCellsCount={2}
            />

            {expandedSections.has('overview') && (
                <>
                    <TimeSeriesRow
                        label={
                            <div className="flex items-center gap-1">
                                Sleep Score
                                <Tooltip content={
                                    <div className="space-y-2">
                                        <p>Overall sleep quality score (0-100) based on three key components:</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li><span className="font-medium text-emerald-500">Duration (50 pts):</span> Total time asleep vs target.</li>
                                            <li><span className="font-medium text-emerald-500">Bedtime (30 pts):</span> Consistency with target bedtime.</li>
                                            <li><span className="font-medium text-emerald-500">Interruptions (20 pts):</span> Number and duration of wake-ups.</li>
                                        </ul>
                                    </div>
                                }>
                                    <svg className="w-3 h-3 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </Tooltip>
                            </div>
                        }
                        fixedContent={
                            <>
                                {renderAverageCell((e) => e.sleepScore, false)}
                                {renderTrendCell(latestEntry?.sleepScore, comparisonEntry?.sleepScore, true)}
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <div className="flex flex-col items-center gap-1">
                                    <span className={`text-sm font-bold ${getScoreColor(entry.sleepScore)}`}>
                                        {entry.sleepScore}
                                    </span>
                                    {/* Breakdown */}
                                    <div className="flex gap-1 text-[9px] text-gray-400">
                                        <Tooltip content={`Duration: ${entry.durationScore}/50`}>
                                            <span className="px-1 bg-gray-100/50 dark:bg-gray-800/50 rounded tabular-nums">{entry.durationScore}/50</span>
                                        </Tooltip>
                                        <Tooltip content={`Bedtime: ${entry.bedtimeScore}/30`}>
                                            <span className="px-1 bg-gray-100/50 dark:bg-gray-800/50 rounded tabular-nums">{entry.bedtimeScore}/30</span>
                                        </Tooltip>
                                        <Tooltip content={`Interruptions: ${entry.interruptionScore}/20`}>
                                            <span className="px-1 bg-gray-100/50 dark:bg-gray-800/50 rounded tabular-nums">{entry.interruptionScore}/20</span>
                                        </Tooltip>
                                    </div>
                                </div>
                            </td>
                        )}
                    />
                    <TimeSeriesRow
                        label={
                            <div className="flex items-center gap-1">
                                Duration
                                <Tooltip content="Total time asleep. Target: 8 hours (50 pts).">
                                    <svg className="w-3 h-3 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </Tooltip>
                            </div>
                        }
                        fixedContent={
                            <>
                                {renderAverageCell((e) => e.data.stages.totalSleepMinutes, true)}
                                {renderTrendCell(latestEntry?.data.stages.totalSleepMinutes, comparisonEntry?.data.stages.totalSleepMinutes, true, true)}
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className="text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {formatDuration(entry.data.stages.totalSleepMinutes)}
                                </span>
                            </td>
                        )}
                    />
                </>
            )}

            {/* Timing Section */}
            <SectionHeaderRow
                label="Timing"
                isExpanded={expandedSections.has('timing')}
                onToggle={() => toggleSection('timing')}
                columnCount={sortedEntries.length}
                fixedCellsCount={2}
            />

            {expandedSections.has('timing') && (
                <>
                    <TimeSeriesRow
                        label={
                            <div className="flex items-center gap-1">
                                Bedtime
                                <Tooltip content="Time you went to bed. Target: 10:30 PM (30 pts).">
                                    <svg className="w-3 h-3 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </Tooltip>
                            </div>
                        }
                        fixedContent={
                            <>
                                <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-blue-50/30 dark:bg-blue-900/10">
                                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                                </td>
                                <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
                                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                                </td>
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className="text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {formatTime(entry.data.sleepStart)}
                                </span>
                            </td>
                        )}
                    />
                    <TimeSeriesRow
                        label={
                            <div className="flex items-center gap-1">
                                Wake Up
                                <Tooltip content="Time you woke up.">
                                    <svg className="w-3 h-3 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </Tooltip>
                            </div>
                        }
                        fixedContent={
                            <>
                                <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-blue-50/30 dark:bg-blue-900/10">
                                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                                </td>
                                <td className="px-2 py-1.5 text-center border-l border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
                                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                                </td>
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className="text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {formatTime(entry.data.sleepEnd)}
                                </span>
                            </td>
                        )}
                    />
                    <TimeSeriesRow
                        label={
                            <div className="flex items-center gap-1">
                                Time in Bed
                                <Tooltip content="Total time spent in bed, including time to fall asleep and time awake after waking.">
                                    <svg className="w-3 h-3 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </Tooltip>
                            </div>
                        }
                        fixedContent={
                            <>
                                {renderAverageCell((e) => e.data.stages.inBedMinutes, true)}
                                {renderTrendCell(latestEntry?.data.stages.inBedMinutes, comparisonEntry?.data.stages.inBedMinutes, false, true)}
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className="text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {formatDuration(entry.data.stages.inBedMinutes)}
                                </span>
                            </td>
                        )}
                    />
                </>
            )}

            {/* Stages Section */}
            <SectionHeaderRow
                label="Stages"
                isExpanded={expandedSections.has('stages')}
                onToggle={() => toggleSection('stages')}
                columnCount={sortedEntries.length}
                fixedCellsCount={2}
            />

            {expandedSections.has('stages') && (
                <>
                    <TimeSeriesRow
                        label={
                            <div className="flex items-center gap-1">
                                Deep Sleep
                                <Tooltip content="Physical recovery stage. Essential for muscle growth and repair.">
                                    <svg className="w-3 h-3 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </Tooltip>
                            </div>
                        }
                        fixedContent={
                            <>
                                {renderAverageCell((e) => e.data.stages.deepMinutes, true)}
                                {renderTrendCell(latestEntry?.data.stages.deepMinutes, comparisonEntry?.data.stages.deepMinutes, true, true)}
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className="text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {formatDuration(entry.data.stages.deepMinutes)}
                                </span>
                            </td>
                        )}
                    />
                    <TimeSeriesRow
                        label="REM Sleep"
                        fixedContent={
                            <>
                                {renderAverageCell((e) => e.data.stages.remMinutes, true)}
                                {renderTrendCell(latestEntry?.data.stages.remMinutes, comparisonEntry?.data.stages.remMinutes, true, true)}
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className="text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {formatDuration(entry.data.stages.remMinutes)}
                                </span>
                            </td>
                        )}
                    />
                    <TimeSeriesRow
                        label="Core Sleep"
                        fixedContent={
                            <>
                                {renderAverageCell((e) => e.data.stages.coreMinutes, true)}
                                {renderTrendCell(latestEntry?.data.stages.coreMinutes, comparisonEntry?.data.stages.coreMinutes, true, true)}
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className="text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {formatDuration(entry.data.stages.coreMinutes)}
                                </span>
                            </td>
                        )}
                    />
                    <TimeSeriesRow
                        label={
                            <div className="flex items-center gap-1">
                                Awake
                                <Tooltip content="Time spent awake during the sleep period.">
                                    <svg className="w-3 h-3 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </Tooltip>
                            </div>
                        }
                        fixedContent={
                            <>
                                {renderAverageCell((e) => e.data.stages.awakeMinutes, true)}
                                {renderTrendCell(latestEntry?.data.stages.awakeMinutes, comparisonEntry?.data.stages.awakeMinutes, false, true)}
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className="text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {formatDuration(entry.data.stages.awakeMinutes)}
                                </span>
                            </td>
                        )}
                    />
                </>
            )}

            {/* Interruptions Section */}
            <SectionHeaderRow
                label="Interruptions"
                isExpanded={expandedSections.has('interruptions')}
                onToggle={() => toggleSection('interruptions')}
                columnCount={sortedEntries.length}
                fixedCellsCount={2}
            />

            {expandedSections.has('interruptions') && (
                <>
                    <TimeSeriesRow
                        label={
                            <div className="flex items-center gap-1">
                                Wake Ups
                                <Tooltip content="The number of times you were awake or restless during the night.">
                                    <svg className="w-3 h-3 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </Tooltip>
                            </div>
                        }
                        fixedContent={
                            <>
                                {renderAverageCell((e) => e.data.interruptions.wakeUpsCount ?? e.data.interruptions.count, false)}
                                {renderTrendCell(latestEntry?.data.interruptions.wakeUpsCount ?? latestEntry?.data.interruptions.count, comparisonEntry?.data.interruptions.wakeUpsCount ?? comparisonEntry?.data.interruptions.count, false)}
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className="text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {entry.data.interruptions.wakeUpsCount ?? entry.data.interruptions.count}
                                </span>
                            </td>
                        )}
                    />
                    <TimeSeriesRow
                        label={
                            <div className="flex items-center gap-1">
                                Interruption Time
                                <Tooltip content="Total duration of all wake-ups and restless periods.">
                                    <svg className="w-3 h-3 text-gray-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </Tooltip>
                            </div>
                        }
                        fixedContent={
                            <>
                                {renderAverageCell((e) => e.data.interruptions.interruptionsDurationMinutes ?? e.data.interruptions.totalMinutes, true)}
                                {renderTrendCell(latestEntry?.data.interruptions.interruptionsDurationMinutes ?? latestEntry?.data.interruptions.totalMinutes, comparisonEntry?.data.interruptions.interruptionsDurationMinutes ?? comparisonEntry?.data.interruptions.totalMinutes, false, true)}
                            </>
                        }
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className="text-xs tabular-nums font-medium text-gray-700 dark:text-gray-300">
                                    {formatDuration(entry.data.interruptions.interruptionsDurationMinutes ?? entry.data.interruptions.totalMinutes)}
                                </span>
                            </td>
                        )}
                    />
                </>
            )}
        </TimeSeriesTable>
    );
}
