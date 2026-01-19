export type CalendarEvent = {
    id: string;
    user_id: string;
    start_date: string; // ISO Date YYYY-MM-DD
    end_date: string;   // ISO Date YYYY-MM-DD
    title: string;
    category: CalendarCategoryKey;
    notes?: string;
    created_at: string;
};

export type CalendarCategoryKey = 'deep_work' | 'ship' | 'fitness' | 'learn' | 'life' | 'other';

export type CalendarCategory = {
    key: CalendarCategoryKey;
    label: string;
    color: string; // Tailwind class for background
    textColor: string; // Tailwind class for text
    borderColor: string;
};

export type InboxEvent = {
    id: string;
    user_id: string;
    external_id?: string;
    title: string;
    start_date: string; // ISO Date YYYY-MM-DD
    end_date: string;   // ISO Date YYYY-MM-DD
    category: CalendarCategoryKey;
    status: 'pending' | 'rejected';
    created_at: string;
};
