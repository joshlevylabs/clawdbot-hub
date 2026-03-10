import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface QuickBooksTokens {
  access_token: string;
  refresh_token: string;
  realm_id: string;
  expires_at: string;
  refresh_expires_at: string;
}

interface QuickBooksReportResponse {
  QueryResponse: {
    [reportName: string]: Array<{
      Header: {
        ReportName: string;
        StartPeriod: string;
        EndPeriod: string;
        Currency: string;
      };
      Rows: Array<{
        group?: string;
        ColData: Array<{ value: string | number }>;
        subRows?: Array<{
          ColData: Array<{ value: string | number }>;
        }>;
      }>;
      Columns: Array<{
        ColTitle: string;
        ColType: string;
      }>;
    }>;
  };
}

export interface ProfitLossData {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: { [category: string]: number };
  totalExpenses: number;
  netIncome: number;
  period: string;
}

export interface BalanceSheetData {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  period: string;
}

export interface ExpenseData {
  category: string;
  amount: number;
}

/**
 * Get stored QuickBooks tokens from Supabase
 */
async function getStoredTokens(): Promise<QuickBooksTokens | null> {
  try {
    const { data, error } = await supabase
      .from('quickbooks_tokens')
      .select('*')
      .eq('id', 'primary')
      .single();

    if (error || !data) {
      console.error('No QuickBooks tokens found:', error);
      return null;
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      realm_id: data.realm_id,
      expires_at: data.expires_at,
      refresh_expires_at: data.refresh_expires_at,
    };
  } catch (err) {
    console.error('Error fetching stored tokens:', err);
    return null;
  }
}

/**
 * Refresh QuickBooks access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('QuickBooks credentials not configured');
    return null;
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      console.error('Token refresh failed:', data);
      return null;
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
    };
  } catch (err) {
    console.error('Error refreshing token:', err);
    return null;
  }
}

/**
 * Update stored tokens in Supabase
 */
async function updateStoredTokens(accessToken: string, expiresIn: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error } = await supabase
      .from('quickbooks_tokens')
      .update({
        access_token: accessToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'primary');

    if (error) {
      console.error('Failed to update tokens:', error);
    }
  } catch (err) {
    console.error('Error updating stored tokens:', err);
  }
}

/**
 * Get a valid access token (refresh if needed)
 */
export async function getValidAccessToken(): Promise<{ access_token: string; realm_id: string } | null> {
  const tokens = await getStoredTokens();
  if (!tokens) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(tokens.expires_at);

  // If token expires within 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Access token expiring soon, refreshing...');
    
    const refreshResult = await refreshAccessToken(tokens.refresh_token);
    if (!refreshResult) {
      console.error('Failed to refresh access token');
      return null;
    }

    await updateStoredTokens(refreshResult.access_token, refreshResult.expires_in);
    
    return {
      access_token: refreshResult.access_token,
      realm_id: tokens.realm_id,
    };
  }

  return {
    access_token: tokens.access_token,
    realm_id: tokens.realm_id,
  };
}

/**
 * Make authenticated QuickBooks API request
 */
async function makeQuickBooksRequest(endpoint: string): Promise<any> {
  const authData = await getValidAccessToken();
  if (!authData) {
    throw new Error('No valid QuickBooks access token available');
  }

  const url = `https://quickbooks.api.intuit.com/v3/company/${authData.realm_id}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`QuickBooks API error: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (err) {
    console.error('QuickBooks API request failed:', err);
    throw err;
  }
}

/**
 * Parse QuickBooks P&L report data into clean structure
 */
function parseProfitLossReport(report: any): ProfitLossData | null {
  try {
    if (!report.Rows || !Array.isArray(report.Rows)) {
      return null;
    }

    let revenue = 0;
    let cogs = 0;
    let totalExpenses = 0;
    const expenses: { [category: string]: number } = {};

    report.Rows.forEach((row: any) => {
      if (!row.group || !row.ColData || !Array.isArray(row.ColData)) {
        return;
      }

      const groupName = row.group;
      const amount = parseFloat(row.ColData[1]?.value || '0');

      if (groupName.toLowerCase().includes('income') || groupName.toLowerCase().includes('revenue')) {
        revenue += Math.abs(amount);
      } else if (groupName.toLowerCase().includes('cost of goods sold') || groupName.toLowerCase().includes('cogs')) {
        cogs += Math.abs(amount);
      } else if (groupName.toLowerCase().includes('expense')) {
        totalExpenses += Math.abs(amount);
        expenses[groupName] = Math.abs(amount);
      }
    });

    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - totalExpenses;

    return {
      revenue,
      cogs,
      grossProfit,
      expenses,
      totalExpenses,
      netIncome,
      period: `${report.Header?.StartPeriod} to ${report.Header?.EndPeriod}`,
    };
  } catch (err) {
    console.error('Error parsing P&L report:', err);
    return null;
  }
}

/**
 * Parse QuickBooks Balance Sheet report data
 */
function parseBalanceSheetReport(report: any): BalanceSheetData | null {
  try {
    if (!report.Rows || !Array.isArray(report.Rows)) {
      return null;
    }

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    report.Rows.forEach((row: any) => {
      if (!row.group || !row.ColData || !Array.isArray(row.ColData)) {
        return;
      }

      const groupName = row.group.toLowerCase();
      const amount = parseFloat(row.ColData[1]?.value || '0');

      if (groupName.includes('asset')) {
        totalAssets += Math.abs(amount);
      } else if (groupName.includes('liabilit')) {
        totalLiabilities += Math.abs(amount);
      } else if (groupName.includes('equity')) {
        totalEquity += Math.abs(amount);
      }
    });

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      period: report.Header?.EndPeriod || '',
    };
  } catch (err) {
    console.error('Error parsing Balance Sheet report:', err);
    return null;
  }
}

/**
 * Fetch Profit & Loss report for date range
 */
export async function fetchProfitLossReport(startDate: string, endDate: string): Promise<ProfitLossData | null> {
  try {
    const endpoint = `/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`;
    const data: QuickBooksReportResponse = await makeQuickBooksRequest(endpoint);
    
    if (!data.QueryResponse?.ProfitAndLoss?.[0]) {
      throw new Error('Invalid P&L response format');
    }

    return parseProfitLossReport(data.QueryResponse.ProfitAndLoss[0]);
  } catch (err) {
    console.error('Error fetching P&L report:', err);
    throw err;
  }
}

/**
 * Fetch Balance Sheet report
 */
export async function fetchBalanceSheetReport(asOfDate?: string): Promise<BalanceSheetData | null> {
  try {
    const dateParam = asOfDate ? `?date=${asOfDate}` : '';
    const endpoint = `/reports/BalanceSheet${dateParam}`;
    const data: QuickBooksReportResponse = await makeQuickBooksRequest(endpoint);
    
    if (!data.QueryResponse?.BalanceSheet?.[0]) {
      throw new Error('Invalid Balance Sheet response format');
    }

    return parseBalanceSheetReport(data.QueryResponse.BalanceSheet[0]);
  } catch (err) {
    console.error('Error fetching Balance Sheet report:', err);
    throw err;
  }
}

/**
 * Get expense breakdown by category from P&L report
 */
export async function fetchExpenseBreakdown(startDate: string, endDate: string): Promise<ExpenseData[]> {
  try {
    const pnlData = await fetchProfitLossReport(startDate, endDate);
    if (!pnlData) {
      return [];
    }

    return Object.entries(pnlData.expenses)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  } catch (err) {
    console.error('Error fetching expense breakdown:', err);
    throw err;
  }
}