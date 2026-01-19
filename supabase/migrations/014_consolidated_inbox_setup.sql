-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.inbox_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id), -- Nullable for anonymous access
    external_id text,
    title text NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    category text DEFAULT 'deep_work',
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'rejected')),
    created_at timestamptz DEFAULT now()
);

-- 2. Ensure user_id is nullable (in case table existed from a previous run)
ALTER TABLE public.inbox_events ALTER COLUMN user_id DROP NOT NULL;

-- 3. Enable RLS
ALTER TABLE public.inbox_events ENABLE ROW LEVEL SECURITY;

-- 4. Drop any old strict policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own inbox events" ON public.inbox_events;
DROP POLICY IF EXISTS "Users can insert their own inbox events" ON public.inbox_events;
DROP POLICY IF EXISTS "Users can update their own inbox events" ON public.inbox_events;
DROP POLICY IF EXISTS "Users can delete their own inbox events" ON public.inbox_events;

-- 5. Create/Replace permissive policies for public/anonymous access
DROP POLICY IF EXISTS "Allow public select on inbox_events" ON public.inbox_events;
CREATE POLICY "Allow public select on inbox_events" ON public.inbox_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on inbox_events" ON public.inbox_events;
CREATE POLICY "Allow public insert on inbox_events" ON public.inbox_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on inbox_events" ON public.inbox_events;
CREATE POLICY "Allow public update on inbox_events" ON public.inbox_events FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on inbox_events" ON public.inbox_events;
CREATE POLICY "Allow public delete on inbox_events" ON public.inbox_events FOR DELETE USING (true);
