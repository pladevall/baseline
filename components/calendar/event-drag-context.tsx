'use client';

import { createContext, useContext, useState, useRef, ReactNode, RefObject, useCallback } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { format, addDays, differenceInDays } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

// Grid layout constants
export const TOTAL_COLUMNS = 37;
const MONTHS_IN_YEAR = 12;

interface MonthInfo {
    month: Date;
    offset: number; // Day of week offset (0=Sun)
    daysInMonth: number;
    containerRect: DOMRect | null;
}

interface EventDragContextType {
    // Active drag state
    activeEventId: string | null;
    activeType: 'drag' | 'resize-start' | 'resize-end' | null;
    previewDelta: { days: number } | null;

    // Methods
    startDrag: (eventId: string, type: 'drag' | 'resize-start' | 'resize-end') => void;
    updateDrag: (pointerX: number, pointerY: number) => void;
    endDrag: () => Promise<void>;
    cancelDrag: () => void;

    // Month registration for coordinate calculation
    registerMonth: (monthIndex: number, info: MonthInfo) => void;

    // Grid ref for coordinate calculation
    gridRef: RefObject<HTMLDivElement | null>;

    // Check if just dragged (for click suppression)
    justDragged: boolean;
}

const EventDragContext = createContext<EventDragContextType | undefined>(undefined);

interface EventDragProviderProps {
    children: ReactNode;
    events: CalendarEvent[];
    refreshEvents: () => Promise<void>;
    openModal: (event: CalendarEvent) => void;
}

export function EventDragProvider({ children, events, refreshEvents, openModal }: EventDragProviderProps) {
    const [activeEventId, setActiveEventId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<'drag' | 'resize-start' | 'resize-end' | null>(null);
    const [previewDelta, setPreviewDelta] = useState<{ days: number } | null>(null);
    const [justDragged, setJustDragged] = useState(false);

    const gridRef = useRef<HTMLDivElement | null>(null);
    const monthInfoRef = useRef<Map<number, MonthInfo>>(new Map());
    const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

    const registerMonth = useCallback((monthIndex: number, info: MonthInfo) => {
        monthInfoRef.current.set(monthIndex, info);
    }, []);

    const getDateFromPointer = useCallback((pointerX: number, pointerY: number): Date | null => {
        if (!gridRef.current) return null;

        const gridRect = gridRef.current.getBoundingClientRect();

        // Find which month row we're in
        for (const [monthIndex, info] of monthInfoRef.current.entries()) {
            if (!info.containerRect) continue;

            if (pointerY >= info.containerRect.top && pointerY <= info.containerRect.bottom) {
                // We're in this month row
                const monthLabelWidth = 48; // w-12 = 48px
                const contentWidth = info.containerRect.width - monthLabelWidth;
                const columnWidth = contentWidth / TOTAL_COLUMNS;

                const relativeX = pointerX - info.containerRect.left - monthLabelWidth;
                const columnIndex = Math.floor(relativeX / columnWidth);

                // Convert column index to day
                const dayIndex = columnIndex - info.offset;

                if (dayIndex >= 0 && dayIndex < info.daysInMonth) {
                    const year = info.month.getFullYear();
                    const month = info.month.getMonth();
                    return new Date(year, month, dayIndex + 1);
                }

                return null;
            }
        }

        return null;
    }, []);

    const startDrag = useCallback((eventId: string, type: 'drag' | 'resize-start' | 'resize-end') => {
        setActiveEventId(eventId);
        setActiveType(type);
        setPreviewDelta(null);
        dragStartPosRef.current = null;
    }, []);

    const updateDrag = useCallback((pointerX: number, pointerY: number) => {
        if (!activeEventId || !activeType) return;

        // Store initial position
        if (!dragStartPosRef.current) {
            dragStartPosRef.current = { x: pointerX, y: pointerY };
        }

        const event = events.find(e => e.id === activeEventId);
        if (!event) return;

        const targetDate = getDateFromPointer(pointerX, pointerY);
        if (!targetDate) return;

        const eventStartDate = new Date(event.start_date);
        const eventEndDate = new Date(event.end_date);

        if (activeType === 'drag') {
            // Calculate days offset from event start to target
            const daysDelta = differenceInDays(targetDate, eventStartDate);
            setPreviewDelta({ days: daysDelta });
        } else if (activeType === 'resize-start') {
            // Calculate days offset for start resize
            const daysDelta = differenceInDays(targetDate, eventStartDate);
            // Don't allow resizing past the end date
            if (differenceInDays(eventEndDate, targetDate) >= 0) {
                setPreviewDelta({ days: daysDelta });
            }
        } else if (activeType === 'resize-end') {
            // Calculate days offset for end resize
            const daysDelta = differenceInDays(targetDate, eventEndDate);
            // Don't allow resizing before the start date
            if (differenceInDays(targetDate, eventStartDate) >= 0) {
                setPreviewDelta({ days: daysDelta });
            }
        }
    }, [activeEventId, activeType, events, getDateFromPointer]);

    const endDrag = useCallback(async () => {
        if (!activeEventId || !activeType) {
            cancelDrag();
            return;
        }

        const event = events.find(e => e.id === activeEventId);
        if (!event) {
            cancelDrag();
            return;
        }

        // Mark as just dragged to suppress click
        setJustDragged(true);
        setTimeout(() => setJustDragged(false), 50);

        const delta = previewDelta?.days ?? 0;

        if (delta === 0) {
            // No movement - treat as click, open modal
            openModal(event);
            cancelDrag();
            return;
        }

        const eventStartDate = new Date(event.start_date);
        const eventEndDate = new Date(event.end_date);

        let newStartDate: string;
        let newEndDate: string;

        if (activeType === 'drag') {
            newStartDate = format(addDays(eventStartDate, delta), 'yyyy-MM-dd');
            newEndDate = format(addDays(eventEndDate, delta), 'yyyy-MM-dd');
        } else if (activeType === 'resize-start') {
            newStartDate = format(addDays(eventStartDate, delta), 'yyyy-MM-dd');
            newEndDate = event.end_date;
        } else {
            newStartDate = event.start_date;
            newEndDate = format(addDays(eventEndDate, delta), 'yyyy-MM-dd');
        }

        // Update in database
        const supabase = createClient();
        const { error } = await supabase
            .from('calendar_events')
            .update({ start_date: newStartDate, end_date: newEndDate })
            .eq('id', activeEventId);

        if (!error) {
            await refreshEvents();
        }

        cancelDrag();
    }, [activeEventId, activeType, previewDelta, events, refreshEvents, openModal]);

    const cancelDrag = useCallback(() => {
        setActiveEventId(null);
        setActiveType(null);
        setPreviewDelta(null);
        dragStartPosRef.current = null;
    }, []);

    return (
        <EventDragContext.Provider value={{
            activeEventId,
            activeType,
            previewDelta,
            startDrag,
            updateDrag,
            endDrag,
            cancelDrag,
            registerMonth,
            gridRef,
            justDragged,
        }}>
            {children}
        </EventDragContext.Provider>
    );
}

export function useEventDrag() {
    const context = useContext(EventDragContext);
    if (context === undefined) {
        throw new Error('useEventDrag must be used within an EventDragProvider');
    }
    return context;
}
