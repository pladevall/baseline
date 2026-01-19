'use client';

import { useMemo } from 'react';
import { eachMonthOfInterval, startOfYear, endOfYear, getDay, getDaysInMonth } from 'date-fns';
import { MonthRow } from './month-row';
import { useCalendar } from './calendar-context';

// Number of columns: max 6 offset + 31 days = 37
const TOTAL_COLUMNS = 37;
const DAYS_OF_WEEK = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export function YearGrid() {
    const { events } = useCalendar();

    const year = 2026;
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));

    const months = useMemo(() => {
        return eachMonthOfInterval({ start, end });
    }, [start, end]);

    return (
        <div className="min-w-[1200px] w-full h-full flex flex-col gap-0 overflow-x-auto">
            <div className="flex flex-col gap-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm flex-1">
                {/* Weekday Header - repeating pattern */}
                <div className="flex w-full bg-background border-b border-gray-100 dark:border-zinc-800/50">
                    {/* Month label spacer */}
                    <div className="w-12 flex-shrink-0 border-r border-gray-100 dark:border-zinc-800/50" />

                    {/* Repeating weekday headers */}
                    <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${TOTAL_COLUMNS}, minmax(28px, 1fr))` }}>
                        {Array.from({ length: TOTAL_COLUMNS }).map((_, i) => {
                            const weekdayIndex = i % 7;
                            const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center justify-center border-r border-gray-100 dark:border-zinc-800/50 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${isWeekend ? 'text-gray-300 dark:text-zinc-600 bg-gray-50/50 dark:bg-zinc-900/30' : 'text-gray-400'}`}
                                >
                                    {DAYS_OF_WEEK[weekdayIndex]}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Month rows */}
                {months.map((month) => (
                    <MonthRow
                        key={month.toISOString()}
                        month={month}
                        events={events}
                        totalColumns={TOTAL_COLUMNS}
                    />
                ))}
            </div>
        </div>
    );
}
