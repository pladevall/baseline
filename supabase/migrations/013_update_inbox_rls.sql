-- Make user_id nullable in inbox_events to support anonymous/guest usage
ALTER TABLE public.inbox_events ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing restrictive RLS policies for inbox_events
DROP POLICY IF EXISTS "Users can view their own inbox events" ON public.inbox_events;
DROP POLICY IF EXISTS "Users can insert their own inbox events" ON public.inbox_events;
DROP POLICY IF EXISTS "Users can update their own inbox events" ON public.inbox_events;
DROP POLICY IF EXISTS "Users can delete their own inbox events" ON public.inbox_events;

-- Create permissive policies (Public Access)
CREATE POLICY "Allow public select on inbox_events"
ON public.inbox_events FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on inbox_events"
ON public.inbox_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update on inbox_events"
ON public.inbox_events FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete on inbox_events"
ON public.inbox_events FOR DELETE
USING (true);
