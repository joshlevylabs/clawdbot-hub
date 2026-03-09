-- Create tax_settings table for PIN security
CREATE TABLE IF NOT EXISTS tax_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- User identifier who set the PIN
    pin_hash TEXT, -- bcrypt hash of the PIN
    pin_salt TEXT, -- Salt for additional security
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    -- Security settings
    auto_lock_minutes INTEGER DEFAULT 30,
    max_failed_attempts INTEGER DEFAULT 5,
    
    CONSTRAINT unique_user_tax_settings UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tax_settings_user_id ON tax_settings(user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_tax_settings_updated_at ON tax_settings;
CREATE TRIGGER update_tax_settings_updated_at
    BEFORE UPDATE ON tax_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for security
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own tax settings
CREATE POLICY "Users can manage their own tax settings" 
ON tax_settings 
FOR ALL 
TO authenticated 
USING (user_id = auth.jwt() ->> 'sub');

-- Grant permissions
GRANT ALL ON tax_settings TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;