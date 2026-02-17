-- Create verticals table
CREATE TABLE IF NOT EXISTS public.verticals (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    description TEXT,
    color TEXT,
    repos JSONB,
    paths JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create initiatives table
CREATE TABLE IF NOT EXISTS public.initiatives (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    verticals TEXT[],
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create standup_schedules table
CREATE TABLE IF NOT EXISTS public.standup_schedules (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    schedule TEXT NOT NULL,
    time TEXT NOT NULL,
    participants TEXT[],
    agenda TEXT,
    auto_execute BOOLEAN DEFAULT false,
    verticals TEXT[],
    initiatives TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on all tables (service role key is used)
ALTER TABLE public.verticals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.standup_schedules DISABLE ROW LEVEL SECURITY;

-- Grant permissions to service role
GRANT ALL ON public.verticals TO service_role;
GRANT ALL ON public.initiatives TO service_role;
GRANT ALL ON public.standup_schedules TO service_role;