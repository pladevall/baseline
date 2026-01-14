'use client';

import { useState } from 'react';
import { SleepEntry } from '@/lib/types';
import { TimeSeriesTable, TimeSeriesRow, SectionHeaderRow } from './TimeSeriesTable';

interface SleepTableProps {
    entries: SleepEntry[];
}

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
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

export function SleepTable({ entries }: SleepTableProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'timing', 'stages']));

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

    return (
        <TimeSeriesTable
            headerLabel="METRIC"
            columns={sortedEntries}
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
            />

            {expandedSections.has('overview') && (
                <>
                    <TimeSeriesRow
                        label="Sleep Score"
                        columns={sortedEntries}
                        renderCell={(entry) => (
                            <td key={entry.id} className="px-3 py-2 text-center border-l border-gray-100 dark:border-gray-800/50">
                                <span className={`text-xs tabular-nums font-medium ${getScoreColor(entry.sleepScore)}`}>
                                    {entry.sleepScore}
                                </span>
                            </td>
                        )}
                    />
                    <TimeSeriesRow
                        label="Duration"
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
            />

            {expandedSections.has('timing') && (
                <>
                    <TimeSeriesRow
                        label="Bedtime"
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
                        label="Wake Up"
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
                        label="Time in Bed"
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
            />

            {expandedSections.has('stages') && (
                <>
                    <TimeSeriesRow
                        label="Deep Sleep"
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
                        label="Awake"
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
        </TimeSeriesTable>
    );
}
