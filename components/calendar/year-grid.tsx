'use client';

import { useMemo, useEffect, useRef } from 'react';
import { eachMonthOfInterval, startOfYear, endOfYear, getDay, getDaysInMonth } from 'date-fns';
import {
    DndContext,
    DragEndEvent,
    DragMoveEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import { MonthRow } from './month-row';
import { useCalendar } from './calendar-context';
import { EventDragProvider, useEventDrag, TOTAL_COLUMNS } from './event-drag-context';
import { CALENDAR_CATEGORIES } from '@/lib/calendar-config';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function YearGridInner() {
    const { events, refreshEvents, openModal } = useCalendar();
    const {
        activeEventId,
        activeType,
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        gridRef
    } = useEventDrag();

    const year = 2026;
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));

    const months = useMemo(() => {
        return eachMonthOfInterval({ start, end });
    }, [start, end]);

    // Configure pointer sensor with activation constraint
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const id = String(event.active.id);

        if (id.endsWith('-resize-start')) {
            startDrag(id.replace('-resize-start', ''), 'resize-start');
        } else if (id.endsWith('-resize-end')) {
            startDrag(id.replace('-resize-end', ''), 'resize-end');
        } else {
            startDrag(id, 'drag');
        }
    };

    const handleDragMove = (event: DragMoveEvent) => {
        // Get absolute pointer position
        const activatorEvent = event.activatorEvent as PointerEvent;
        if (activatorEvent) {
            const pointerX = activatorEvent.clientX + event.delta.x;
            const pointerY = activatorEvent.clientY + event.delta.y;
            updateDrag(pointerX, pointerY);
        }
    };

    const handleDragEnd = async () => {
        await endDrag();
    };

    const handleDragCancel = () => {
        cancelDrag();
    };

    // Get active event for overlay
    const activeEvent = activeEventId ? events.find(e => e.id === activeEventId) : null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div ref={gridRef} className="min-w-[1200px] w-full h-full flex flex-col gap-0 overflow-x-auto">
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
                    {months.map((month, index) => (
                        <MonthRow
                            key={month.toISOString()}
                            month={month}
                            monthIndex={index}
                            events={events}
                            totalColumns={TOTAL_COLUMNS}
                        />
                    ))}
                </div>
            </div>

            {/* Drag overlay for visual feedback */}
            <DragOverlay dropAnimation={null}>
                {activeType === 'drag' && activeEvent ? (
                    <EventDragOverlay event={activeEvent} />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

// Overlay component for drag preview
function EventDragOverlay({ event }: { event: { title: string; category: string; start_date: string; end_date: string } }) {
    const cat = CALENDAR_CATEGORIES[event.category];
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return (
        <div
            className={cn(
                "h-4 flex items-center px-1.5 text-[10px] font-medium pointer-events-none",
                "rounded shadow-lg opacity-90",
                cat.color,
                cat.textColor,
            )}
            style={{
                width: `${days * 28}px`,
                minWidth: '28px',
                userSelect: 'none',
            }}
        >
            <span className="truncate">{event.title}</span>
        </div>
    );
}

export function YearGrid() {
    const { events, refreshEvents, openModal } = useCalendar();

    return (
        <EventDragProvider events={events} refreshEvents={refreshEvents} openModal={openModal}>
            <YearGridInner />
        </EventDragProvider>
    );
}
