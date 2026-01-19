'use client';

import { useMemo, useEffect, useRef } from 'react';
import { eachDayOfInterval, endOfMonth, startOfMonth, format, differenceInDays, getDay, getDaysInMonth, addDays } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import { DayCell } from './day-cell';
import { cn } from '@/lib/utils';
import { CalendarEvent } from '@/types/calendar';
import { CALENDAR_CATEGORIES } from '@/lib/calendar-config';
import { useCalendar } from './calendar-context';
import { useEventDrag } from './event-drag-context';

interface MonthRowProps {
    month: Date;
    monthIndex: number;
    events: CalendarEvent[];
    totalColumns: number;
}

interface PositionedEventStrip extends CalendarEvent {
    lane: number;
    startIndex: number;
    endIndex: number;
    columnSpan: number;
}

export function MonthRow({ month, monthIndex, events, totalColumns }: MonthRowProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { openModal } = useCalendar();
    const {
        activeEventId,
        activeType,
        previewDelta,
        registerMonth,
        justDragged
    } = useEventDrag();

    // Calculate offset (0=Sun, 1=Mon, ... 6=Sat)
    const offset = useMemo(() => getDay(startOfMonth(month)), [month]);
    const daysInMonth = getDaysInMonth(month);

    const days = useMemo(() => {
        return eachDayOfInterval({
            start: startOfMonth(month),
            end: endOfMonth(month),
        });
    }, [month]);

    // Register this month's info for coordinate calculation
    useEffect(() => {
        const updateRect = () => {
            if (containerRef.current) {
                registerMonth(monthIndex, {
                    month,
                    offset,
                    daysInMonth,
                    containerRect: containerRef.current.getBoundingClientRect(),
                });
            }
        };

        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect);

        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect);
        };
    }, [monthIndex, month, offset, daysInMonth, registerMonth]);

    // Calculate positioned events as horizontal strips
    const positionedEvents = useMemo(() => {
        const strips: PositionedEventStrip[] = [];
        const lanes: number[] = [];

        const sortedEvents = [...events].sort((a, b) => {
            if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
            const aDuration = differenceInDays(new Date(a.end_date), new Date(a.start_date));
            const bDuration = differenceInDays(new Date(b.end_date), new Date(b.start_date));
            return bDuration - aDuration;
        });

        sortedEvents.forEach((event) => {
            // For dragging events, apply preview delta
            let eventStartDate = event.start_date;
            let eventEndDate = event.end_date;

            if (event.id === activeEventId && previewDelta) {
                const origStart = new Date(event.start_date);
                const origEnd = new Date(event.end_date);

                if (activeType === 'drag') {
                    eventStartDate = format(addDays(origStart, previewDelta.days), 'yyyy-MM-dd');
                    eventEndDate = format(addDays(origEnd, previewDelta.days), 'yyyy-MM-dd');
                } else if (activeType === 'resize-start') {
                    eventStartDate = format(addDays(origStart, previewDelta.days), 'yyyy-MM-dd');
                } else if (activeType === 'resize-end') {
                    eventEndDate = format(addDays(origEnd, previewDelta.days), 'yyyy-MM-dd');
                }
            }

            let startIndex = -1;
            let endIndex = -1;

            days.forEach((day, index) => {
                const dStr = format(day, 'yyyy-MM-dd');
                if (dStr >= eventStartDate && dStr <= eventEndDate) {
                    if (startIndex === -1) startIndex = index;
                    endIndex = index;
                }
            });

            if (startIndex === -1) return;

            // Apply offset to indices
            startIndex += offset;
            endIndex += offset;

            // Find a lane
            let lane = 0;
            let foundLane = false;

            while (!foundLane) {
                let laneAvailable = true;
                for (let i = startIndex; i <= endIndex; i++) {
                    if (lanes[lane * 1000 + i]) {
                        laneAvailable = false;
                        break;
                    }
                }

                if (laneAvailable) {
                    for (let i = startIndex; i <= endIndex; i++) {
                        lanes[lane * 1000 + i] = 1;
                    }
                    foundLane = true;
                } else {
                    lane++;
                }
            }

            const columnSpan = endIndex - startIndex + 1;
            strips.push({
                ...event,
                lane,
                startIndex,
                endIndex,
                columnSpan,
            });
        });

        return strips;
    }, [days, events, offset, activeEventId, activeType, previewDelta]);

    const maxLanes = useMemo(() => {
        if (positionedEvents.length === 0) return 0;
        return Math.max(...positionedEvents.map(e => e.lane)) + 1;
    }, [positionedEvents]);

    const dayWidth = 100 / totalColumns;

    return (
        <div className="flex w-full flex-1 min-h-0 bg-background border-b border-gray-100 dark:border-zinc-800/50 last:border-0 hover:bg-gray-50/10 transition-colors group">
            {/* Month Label */}
            <div className="w-12 flex-shrink-0 flex items-center justify-center border-r border-gray-100 dark:border-zinc-800/50 font-mono text-xs text-gray-400 uppercase tracking-wider font-semibold">
                {format(month, 'MMM')}
            </div>

            {/* Days Grid with Events Overlay */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden">
                {/* Day Cells Grid */}
                <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(28px, 1fr))` }}>
                    {/* Offset empty cells */}
                    {Array.from({ length: offset }).map((_, i) => (
                        <div
                            key={`offset-${i}`}
                            className={cn(
                                "border-r border-gray-100 dark:border-zinc-800/50 min-h-[48px]",
                                (i % 7 === 0 || i % 7 === 6) && "bg-gray-100/50 dark:bg-zinc-900/30"
                            )}
                        />
                    ))}
                    {/* Actual days */}
                    {days.map((day) => (
                        <DayCell
                            key={day.toISOString()}
                            date={day}
                            month={month}
                            events={[]}
                        />
                    ))}
                    {/* Trailing empty cells to fill row */}
                    {Array.from({ length: totalColumns - offset - days.length }).map((_, i) => {
                        const colIndex = offset + days.length + i;
                        return (
                            <div
                                key={`trail-${i}`}
                                className={cn(
                                    "border-r border-gray-100 dark:border-zinc-800/50 min-h-[48px]",
                                    (colIndex % 7 === 0 || colIndex % 7 === 6) && "bg-gray-100/50 dark:bg-zinc-900/30"
                                )}
                            />
                        );
                    })}
                </div>

                {/* Events Layer */}
                <div className="absolute inset-0 pointer-events-none z-20">
                    {positionedEvents.map((event) => {
                        const isActive = activeEventId === event.id;
                        const isDragging = isActive && activeType === 'drag';

                        return (
                            <DraggableEvent
                                key={event.id}
                                event={event}
                                dayWidth={dayWidth}
                                isDragging={isDragging}
                                isResizing={isActive && (activeType === 'resize-start' || activeType === 'resize-end')}
                                justDragged={justDragged}
                                onOpenModal={() => openModal(event)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Draggable event component
function DraggableEvent({
    event,
    dayWidth,
    isDragging,
    isResizing,
    justDragged,
    onOpenModal,
}: {
    event: PositionedEventStrip;
    dayWidth: number;
    isDragging: boolean;
    isResizing: boolean;
    justDragged: boolean;
    onOpenModal: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: event.id,
    });

    const { setNodeRef: setStartRef, listeners: startListeners, attributes: startAttrs } = useDraggable({
        id: `${event.id}-resize-start`,
    });

    const { setNodeRef: setEndRef, listeners: endListeners, attributes: endAttrs } = useDraggable({
        id: `${event.id}-resize-end`,
    });

    const cat = CALENDAR_CATEGORIES[event.category];

    const leftPercent = event.startIndex * dayWidth;
    const widthPercent = event.columnSpan * dayWidth;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            data-event
            data-event-id={event.id}
            className={cn(
                "absolute h-4 flex items-center px-1.5 text-[10px] font-medium group/event pointer-events-auto",
                isDragging ? "cursor-grabbing opacity-50" : "cursor-grab",
                "rounded shadow-sm hover:shadow-md hover:z-30",
                isResizing && "opacity-75",
                "transition-[box-shadow]",
                cat.color,
                cat.textColor,
            )}
            style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                top: `${32 + event.lane * 20}px`,
                userSelect: 'none',
                touchAction: 'none',
            }}
            title={`${event.title} (${format(new Date(event.start_date), 'MMM d')} - ${format(new Date(event.end_date), 'MMM d')})`}
            onClick={(e) => {
                e.stopPropagation();
                if (!isDragging && !isResizing && !justDragged) {
                    onOpenModal();
                }
            }}
        >
            {/* Start Resize Handle */}
            <div
                ref={setStartRef}
                {...startListeners}
                {...startAttrs}
                data-resize-handle="start"
                className={cn(
                    "absolute left-0 top-0 bottom-0 w-2 bg-blue-400 hover:bg-blue-600 cursor-col-resize transition-opacity",
                    (isResizing || isDragging) ? "opacity-100" : "opacity-0 group-hover/event:opacity-100"
                )}
                style={{ touchAction: 'none' }}
                onClick={(e) => e.stopPropagation()}
            />

            <span className="truncate flex-1 mx-1">{event.title}</span>

            {/* End Resize Handle */}
            <div
                ref={setEndRef}
                {...endListeners}
                {...endAttrs}
                data-resize-handle="end"
                className={cn(
                    "absolute right-0 top-0 bottom-0 w-2 bg-blue-400 hover:bg-blue-600 cursor-col-resize transition-opacity",
                    (isResizing || isDragging) ? "opacity-100" : "opacity-0 group-hover/event:opacity-100"
                )}
                style={{ touchAction: 'none' }}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}
