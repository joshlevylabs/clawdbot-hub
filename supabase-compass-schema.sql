-- Compass Interactions table for Marriage Compass feature
-- Run these commands in Supabase SQL Editor (one at a time)

-- Step 1: Create the table
CREATE TABLE compass_interactions (id serial PRIMARY KEY, timestamp timestamptz DEFAULT now(), date date DEFAULT CURRENT_DATE, type text NOT NULL, description text, power numeric(3,1) NOT NULL, safety numeric(3,1) NOT NULL, answers jsonb, created_at timestamptz DEFAULT now());

-- Step 2: Create index for faster date queries
CREATE INDEX idx_compass_interactions_date ON compass_interactions(date DESC);

-- Step 3: Grant access to anon role
GRANT SELECT, INSERT ON compass_interactions TO anon;
