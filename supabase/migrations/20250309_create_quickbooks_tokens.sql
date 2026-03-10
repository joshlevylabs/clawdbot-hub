-- Create table for QuickBooks OAuth tokens
CREATE TABLE IF NOT EXISTS quickbooks_tokens (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  realm_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) for admin access only
ALTER TABLE quickbooks_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow access only to authenticated admin users
CREATE POLICY "Allow admin access to quickbooks_tokens" ON quickbooks_tokens
  FOR ALL 
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quickbooks_tokens_updated_at 
  BEFORE UPDATE ON quickbooks_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_quickbooks_tokens_expires_at ON quickbooks_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_quickbooks_tokens_realm_id ON quickbooks_tokens(realm_id);