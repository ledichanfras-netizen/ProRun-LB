
-- Full Schema for ProRun LB Performance Integrated

-- 1. Athletes Table
CREATE TABLE IF NOT EXISTS public.athletes (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Workouts Library Table
CREATE TABLE IF NOT EXISTS public.workouts_library (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Athlete Plans Table
CREATE TABLE IF NOT EXISTS public.athlete_plans (
    id TEXT PRIMARY KEY, -- Usually the athlete_id
    weeks JSONB NOT NULL,
    race_strategy TEXT,
    motivational_message TEXT,
    specific_goal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    athlete_id TEXT,
    plan_type TEXT CHECK (plan_type IN ('mensal', 'trimestral', 'semestral', 'anual')),
    status TEXT CHECK (status IN ('active', 'expired', 'trial')),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    category TEXT,
    link TEXT,
    read BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    user_id TEXT -- Target user or empty for all
);

-- Enable RLS
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- Basic Public Policies
CREATE POLICY "Public Read Access" ON public.app_notifications FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON public.app_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON public.app_notifications FOR UPDATE USING (true);

-- Basic Public Policies (Adjust as needed for production)
CREATE POLICY "Public Read Access" ON public.athletes FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON public.athletes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON public.athletes FOR UPDATE USING (true);

CREATE POLICY "Public Read Access" ON public.workouts_library FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON public.workouts_library FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Access" ON public.athlete_plans FOR SELECT USING (true);
CREATE POLICY "Public Write Access" ON public.athlete_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON public.athlete_plans FOR UPDATE USING (true);

-- Subscriptions are more sensitive
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
