-- Create tax_estimates table
CREATE TABLE IF NOT EXISTS tax_estimates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    quarter INTEGER, -- 1, 2, 3, 4 for quarterly estimates, NULL for annual
    type TEXT NOT NULL CHECK (type IN ('federal', 'state')),
    estimated_amount DECIMAL(12,2),
    actual_amount DECIMAL(12,2),
    paid_date DATE,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tax_contacts table
CREATE TABLE IF NOT EXISTS tax_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'accountant', 'payroll', 'bookkeeper', etc.
    company TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tax_deadlines table
CREATE TABLE IF NOT EXISTS tax_deadlines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    form_type TEXT NOT NULL, -- '1120-S', '1040', 'quarterly-estimate', etc.
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'filed', 'extended')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tax_history table
CREATE TABLE IF NOT EXISTS tax_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    filing_type TEXT NOT NULL CHECK (filing_type IN ('personal', 's-corp')),
    gross_revenue DECIMAL(12,2),
    net_profit DECIMAL(12,2),
    federal_tax_owed DECIMAL(12,2),
    state_tax_owed DECIMAL(12,2),
    total_paid DECIMAL(12,2),
    refund_amount DECIMAL(12,2),
    accountant_estimate DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tax_estimates_year_type ON tax_estimates(year, type);
CREATE INDEX IF NOT EXISTS idx_tax_deadlines_year_due_date ON tax_deadlines(year, due_date);
CREATE INDEX IF NOT EXISTS idx_tax_history_year ON tax_history(year);

-- Add updated_at trigger for tax_estimates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tax_estimates_updated_at ON tax_estimates;
CREATE TRIGGER update_tax_estimates_updated_at
    BEFORE UPDATE ON tax_estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();