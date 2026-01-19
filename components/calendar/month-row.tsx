'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import { eachDayOfInterval, endOfMonth, startOfMonth, format, differenceInDays, getDay } from 'date-fns';
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
import { DayCell } from './day-cell';
import { cn } from '@/lib/utils';
import { CalendarEvent } from '@/types/calendar';
import { CALENDAR_CATEGORIES } from '@/lib/calendar-config';
import { useCalendar } from './calendar-context';
import { createClient } from '@/lib/supabase/client';

interface MonthRowProps {
    month: Date;
    events: CalendarEvent[];
    totalColumns: number;
}

interface PositionedEventStrip extends CalendarEvent {
    lane: number;
    startIndex: number;
    endIndex: number;
    columnSpan: number;
}

// Draggable event strip component
function DraggableEventStrip({
    event,
    dayWidth,
    previewOffset,
    isResizing,
    isDragging,
    onResizeStart,
    onClick,
}: {
    event: PositionedEventStrip;
    dayWidth: number;
    previewOffset: number;
    isResizing: 'start' | 'end' | null;
    isDragging: boolean;
    onResizeStart: (handle: 'start' | 'end') => void;
    onClick: () => void;
}) {
    const cat = CALENDAR_CATEGORIES[event.category];

    let displayStartIndex = event.startIndex;
    let displayEndIndex = event.endIndex;

    if (isResizing === 'start') {
        displayStartIndex = Math.min(event.startIndex + previewOffset, event.endIndex);
    } else if (isResizing === 'end') {
        displayEndIndex = Math.max(event.endIndex + previewOffset, event.startIndex);
    } else if (isDragging) {
        displayStartIndex = event.startIndex + previewOffset;
        displayEndIndex = event.endIndex + previewOffset;
    }

    const leftPercent = displayStartIndex * dayWidth;
    const columnSpan = displayEndIndex - displayStartIndex + 1;
    const widthPercent = columnSpan * dayWidth;

    return (
        <div
            data-event-id={event.id}
            className={cn(
                "absolute h-4 flex items-center px-1.5 text-[10px] font-medium group/event",
                isDragging ? "cursor-grabbing" : "cursor-grab",
                "rounded shadow-sm hover:shadow-md hover:z-30",
                (isResizing || isDragging) && "opacity-75",
                "transition-[box-shadow]",
                cat.color,
                cat.textColor,
            )}
            style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                top: `${32 + event.lane * 20}px`,
                userSelect: 'none',
            }}
            title={`${event.title} (${format(new Date(event.start_date), 'MMM d')} - ${format(new Date(event.end_date), 'MMM d')})`}
            onClick={(e) => {
                e.stopPropagation();
                if (!isDragging && !isResizing) onClick();
            }}
        >
            {/* Start Resize Handle */}
            <div
                data-resize-handle="start"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onResizeStart('start');
                }}
                className={cn(
                    "absolute left-0 top-0 bottom-0 w-2 bg-blue-400 hover:bg-blue-600 cursor-col-resize transition-opacity",
                    (isResizing || isDragging) ? "opacity-100" : "opacity-0 group-hover/event:opacity-100"
                )}
            />

            <span className="truncate flex-1 mx-1">{event.title}</span>

            {/* End Resize Handle */}
            <div
                data-resize-handle="end"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onResizeStart('end');
                }}
                className={cn(
                    "absolute right-0 top-0 bottom-0 w-2 bg-blue-400 hover:bg-blue-600 cursor-col-resize transition-opacity",
                    (isResizing || isDragging) ? "opacity-100" : "opacity-0 group-hover/event:opacity-100"
                )}
            />
        </div>
    );
}

// Overlay component for drag preview
function EventDragOverlay({ event }: { event: PositionedEventStrip | null }) {
    if (!event) return null;

    const cat = CALENDAR_CATEGORIES[event.category];

    return (
        <div
            className={cn(
                "h-4 flex items-center px-1.5 text-[10px] font-medium pointer-events-none",
                "rounded shadow-lg opacity-90",
                cat.color,
                cat.textColor,
            )}
            style={{
                width: `${(event.endIndex - event.startIndex + 1) * 28}px`,
                userSelect: 'none',
            }}
        >
            <span className="truncate">{event.title}</span>
        </div>
    );
}

export function MonthRow({ month, events, totalColumns }: MonthRowProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { openModal, refreshEvents } = useCalendar();

    // DND Kit state
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<'drag' | 'resize-start' | 'resize-end' | null>(null);
    const [previewColumnDelta, setPreviewColumnDelta] = useState(0);
    const justDraggedRef = useRef(false);

    // Configure pointer sensor with activation constraint (distance threshold)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    // Calculate offset (0=Sun, 1=Mon, ... 6=Sat)
    const offset = useMemo(() => getDay(startOfMonth(month)), [month]);

    const days = useMemo(() => {
        return eachDayOfInterval({
            start: startOfMonth(month),
            end: endOfMonth(month),
        });
    }, [month]);

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
            let startIndex = -1;
            let endIndex = -1;

            days.forEach((day, index) => {
                const dStr = format(day, 'yyyy-MM-dd');
                if (dStr >= event.start_date && dStr <= event.end_date) {
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
    }, [days, events, offset]);

    const eventsById = useMemo(() => {
        const map = new Map<string, PositionedEventStrip>();
        positionedEvents.forEach(e => map.set(e.id, e));
        return map;
    }, [positionedEvents]);

    const getColumnFromX = useCallback((clientX: number): number => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        return Math.floor((x / rect.width) * totalColumns);
    }, [totalColumns]);

    const updateEventDate = async (eventId: string, startDate: string, endDate: string) => {
        const supabase = createClient();
        const { error } = await supabase
            .from('calendar_events')
            .update({ start_date: startDate, end_date: endDate })
            .eq('id', eventId);

        if (!error) {
            await refreshEvents();
        }
    };

    // DND Kit handlers
    const handleDragStart = (event: DragStartEvent) => {
        const id = String(event.active.id);

        // Check if it's a resize handle or the event itself
        if (id.endsWith('-resize-start')) {
            setActiveId(id.replace('-resize-start', ''));
            setActiveType('resize-start');
        } else if (id.endsWith('-resize-end')) {
            setActiveId(id.replace('-resize-end', ''));
            setActiveType('resize-end');
        } else {
            setActiveId(id);
            setActiveType('drag');
        }
        setPreviewColumnDelta(0);
    };

    const handleDragMove = (event: DragMoveEvent) => {
        if (!containerRef.current || !activeId) return;

        const rect = containerRef.current.getBoundingClientRect();
        const columnWidth = rect.width / totalColumns;
        const deltaColumns = Math.round(event.delta.x / columnWidth);

        setPreviewColumnDelta(deltaColumns);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (!activeId || !activeType) {
            resetDragState();
            return;
        }

        const positionedEvent = eventsById.get(activeId);
        if (!positionedEvent) {
            resetDragState();
            return;
        }

        const deltaColumns = previewColumnDelta;

        // Mark that a drag just completed to prevent onClick from firing
        justDraggedRef.current = true;
        setTimeout(() => { justDraggedRef.current = false; }, 0);

        if (deltaColumns === 0) {
            // No movement - the onClick handler will open the modal
            resetDragState();
            return;
        }

        if (activeType === 'drag') {
            // Move the entire event
            const newStartDayIndex = positionedEvent.startIndex + deltaColumns - offset;
            const newEndDayIndex = positionedEvent.endIndex + deltaColumns - offset;

            if (newStartDayIndex >= 0 && newEndDayIndex < days.length) {
                const newStartDate = format(days[newStartDayIndex], 'yyyy-MM-dd');
                const newEndDate = format(days[newEndDayIndex], 'yyyy-MM-dd');
                await updateEventDate(positionedEvent.id, newStartDate, newEndDate);
            }
        } else if (activeType === 'resize-start') {
            // Resize from start
            const newStartDayIndex = positionedEvent.startIndex + deltaColumns - offset;
            if (newStartDayIndex >= 0 && newStartDayIndex <= positionedEvent.endIndex - offset) {
                const newStartDate = format(days[newStartDayIndex], 'yyyy-MM-dd');
                await updateEventDate(positionedEvent.id, newStartDate, positionedEvent.end_date);
            }
        } else if (activeType === 'resize-end') {
            // Resize from end
            const newEndDayIndex = positionedEvent.endIndex + deltaColumns - offset;
            if (newEndDayIndex < days.length && newEndDayIndex >= positionedEvent.startIndex - offset) {
                const newEndDate = format(days[newEndDayIndex], 'yyyy-MM-dd');
                await updateEventDate(positionedEvent.id, positionedEvent.start_date, newEndDate);
            }
        }

        resetDragState();
    };

    const resetDragState = () => {
        setActiveId(null);
        setActiveType(null);
        setPreviewColumnDelta(0);
    };

    // Custom collision detection - we track position via delta, not droppables
    const collisionDetection = () => [];

    const maxLanes = useMemo(() => {
        if (positionedEvents.length === 0) return 0;
        return Math.max(...positionedEvents.map(e => e.lane)) + 1;
    }, [positionedEvents]);

    const eventsHeight = maxLanes > 0 ? maxLanes * 20 + 4 : 0;
    const minHeight = Math.max(48, eventsHeight + 20);
    const dayWidth = 100 / totalColumns;

    const activeEvent = activeId ? eventsById.get(activeId) : null;

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
                                (i % 7 === 0 || i % 7 === 6) && "bg-gray-50/50 dark:bg-zinc-900/30"
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
                                    (colIndex % 7 === 0 || colIndex % 7 === 6) && "bg-gray-50/50 dark:bg-zinc-900/30"
                                )}
                            />
                        );
                    })}
                </div>

                {/* Events Layer with DND Context */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={collisionDetection}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                >
                    <div className="absolute inset-0 pointer-events-none z-20">
                        {positionedEvents.map((event) => {
                            const isActive = activeId === event.id;
                            const isResizing = isActive && (activeType === 'resize-start' || activeType === 'resize-end')
                                ? (activeType === 'resize-start' ? 'start' : 'end')
                                : null;
                            const isDragging = isActive && activeType === 'drag';

                            return (
                                <div
                                    key={event.id}
                                    data-event
                                    className="pointer-events-auto"
                                    style={{ position: 'absolute', inset: 0 }}
                                >
                                    <DraggableEventWrapper
                                        event={event}
                                        dayWidth={dayWidth}
                                        previewOffset={isActive ? previewColumnDelta : 0}
                                        isResizing={isResizing}
                                        isDragging={isDragging}
                                        justDraggedRef={justDraggedRef}
                                        onResizeStart={(handle) => {
                                            // Resize is initiated via separate drag ID
                                        }}
                                        onClick={() => openModal(event)}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {activeType === 'drag' && activeEvent ? (
                            <EventDragOverlay event={activeEvent} />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}

// Wrapper that makes the event draggable
import { useDraggable } from '@dnd-kit/core';

function DraggableEventWrapper({
    event,
    dayWidth,
    previewOffset,
    isResizing,
    isDragging,
    justDraggedRef,
    onResizeStart,
    onClick,
}: {
    event: PositionedEventStrip;
    dayWidth: number;
    previewOffset: number;
    isResizing: 'start' | 'end' | null;
    isDragging: boolean;
    justDraggedRef: React.RefObject<boolean>;
    onResizeStart: (handle: 'start' | 'end') => void;
    onClick: () => void;
}) {
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: event.id,
    });

    const { setNodeRef: setStartRef, listeners: startListeners, attributes: startAttrs } = useDraggable({
        id: `${event.id}-resize-start`,
    });

    const { setNodeRef: setEndRef, listeners: endListeners, attributes: endAttrs } = useDraggable({
        id: `${event.id}-resize-end`,
    });

    const cat = CALENDAR_CATEGORIES[event.category];

    let displayStartIndex = event.startIndex;
    let displayEndIndex = event.endIndex;

    if (isResizing === 'start') {
        displayStartIndex = Math.min(event.startIndex + previewOffset, event.endIndex);
    } else if (isResizing === 'end') {
        displayEndIndex = Math.max(event.endIndex + previewOffset, event.startIndex);
    } else if (isDragging) {
        displayStartIndex = event.startIndex + previewOffset;
        displayEndIndex = event.endIndex + previewOffset;
    }

    const leftPercent = displayStartIndex * dayWidth;
    const columnSpan = displayEndIndex - displayStartIndex + 1;
    const widthPercent = columnSpan * dayWidth;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            data-event-id={event.id}
            className={cn(
                "absolute h-4 flex items-center px-1.5 text-[10px] font-medium group/event",
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
                if (!isDragging && !isResizing && !justDraggedRef.current) onClick();
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
