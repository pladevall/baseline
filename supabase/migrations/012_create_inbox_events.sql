-- Create inbox_events table
create table if not exists inbox_events (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) not null,
    external_id text,
    title text not null,
    start_date text not null, -- YYYY-MM-DD
    end_date text not null,   -- YYYY-MM-DD
    category text default 'deep_work',
    status text default 'pending' check (status in ('pending', 'rejected')),
    created_at timestamptz default now()
);

-- RLS policies
alter table inbox_events enable row level security;

create policy "Users can view their own inbox events"
    on inbox_events for select
    using (auth.uid() = user_id);

create policy "Users can insert their own inbox events"
    on inbox_events for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own inbox events"
    on inbox_events for update
    using (auth.uid() = user_id);

create policy "Users can delete their own inbox events"
    on inbox_events for delete
    using (auth.uid() = user_id);
