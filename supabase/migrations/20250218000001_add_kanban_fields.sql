-- Add new columns to tasks table for Kanban board functionality

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS components text[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_ready boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS activity jsonb DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_tasks text[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ticket_id text;