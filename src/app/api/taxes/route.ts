import { NextRequest } from 'next/server';
import { 
  withTaxSecurity, 
  createTaxApiResponse,
  checkTaxRateLimit,
  createUnauthorizedTaxResponse,
  TaxSecurityContext 
} from '@/middleware/taxSecurity';

// Mock tax data - in production, this would come from Supabase
const getMockTaxData = (userId: string) => ({
  estimates: [
    {
      id: "1",
      year: 2025,
      quarter: 1,
      type: "federal",
      estimated_amount: 15000,
      actual_amount: null,
      paid_date: null,
      due_date: "2025-04-15",
      status: "pending",
      notes: "Q1 2025 estimated payment",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z"
    },
    {
      id: "2",
      year: 2025,
      quarter: 1,
      type: "state",
      estimated_amount: 5000,
      actual_amount: null,
      paid_date: null,
      due_date: "2025-04-15",
      status: "pending",
      notes: "CA Q1 2025 estimated payment",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z"
    }
  ],
  contacts: [
    {
      id: "1",
      name: "Nick Jackson",
      role: "accountant",
      company: "Trusted Tax Services LLC",
      email: "nick@trustedtaxservicesllc.com",
      phone: "(619) 514-4262",
      address: "7777 Alvarado Rd., Suite 202, La Mesa, CA 91942",
      notes: "Primary accountant for Josh Levy Labs Inc S-Corp filings",
      created_at: "2025-01-01T00:00:00Z"
    }
  ],
  deadlines: [
    {
      id: "1",
      year: 2025,
      form_type: "1120-S",
      description: "S-Corp Tax Return (Josh Levy Labs Inc)",
      due_date: "2025-03-15",
      status: "upcoming",
      notes: null,
      created_at: "2025-01-01T00:00:00Z"
    },
    {
      id: "2",
      year: 2025,
      form_type: "1040",
      description: "Personal Tax Return",
      due_date: "2025-04-15",
      status: "upcoming",
      notes: null,
      created_at: "2025-01-01T00:00:00Z"
    },
    {
      id: "3",
      year: 2025,
      form_type: "quarterly-estimate",
      description: "Q1 Estimated Tax Payments",
      due_date: "2025-04-15",
      status: "upcoming",
      notes: "Federal and CA state quarterly estimates",
      created_at: "2025-01-01T00:00:00Z"
    }
  ],
  history: [
    {
      id: "1",
      year: 2024,
      filing_type: "s-corp",
      gross_revenue: 500000,
      net_profit: 75000,
      federal_tax_owed: 800,
      state_tax_owed: -1200, // Negative = refund
      total_paid: 3024,
      refund_amount: 1200,
      accountant_estimate: 1000,
      notes: "Owed less than $1K to IRS, CA state refund, $3,024 in estimated payments",
      created_at: "2024-04-15T00:00:00Z"
    }
  ],
  timestamp: new Date().toISOString()
});

// GET /api/taxes - Fetch all tax data
const handleGet = async (request: NextRequest, context: TaxSecurityContext) => {
  // Rate limiting check
  const rateLimit = checkTaxRateLimit(context.userId);
  if (!rateLimit.allowed) {
    return createUnauthorizedTaxResponse('Rate limit exceeded. Too many requests.');
  }

  try {
    // In production, fetch from Supabase using context.userId
    const taxData = getMockTaxData(context.userId);
    
    // Log access for security audit
    console.log(`Tax data accessed by user: ${context.userId} at ${new Date().toISOString()}`);
    
    return createTaxApiResponse(taxData);
  } catch (error) {
    console.error('Error fetching tax data:', error);
    
    return createTaxApiResponse({
      error: 'DATA_FETCH_ERROR',
      message: 'Failed to retrieve tax data',
    }, 500);
  }
};

// POST /api/taxes - Create/update tax records
const handlePost = async (request: NextRequest, context: TaxSecurityContext) => {
  // Rate limiting check
  const rateLimit = checkTaxRateLimit(context.userId);
  if (!rateLimit.allowed) {
    return createUnauthorizedTaxResponse('Rate limit exceeded. Too many requests.');
  }

  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.type || !['estimate', 'deadline', 'contact', 'history'].includes(body.type)) {
      return createTaxApiResponse({
        error: 'VALIDATION_ERROR',
        message: 'Invalid or missing record type',
      }, 400);
    }
    
    // In production, save to Supabase using context.userId
    // const savedRecord = await saveTaxRecord(context.userId, body);
    
    // Log the creation for security audit
    console.log(`Tax record created by user: ${context.userId}, type: ${body.type} at ${new Date().toISOString()}`);
    
    return createTaxApiResponse({
      success: true,
      message: 'Tax record saved successfully',
      // record: savedRecord
    });
  } catch (error) {
    console.error('Error saving tax record:', error);
    
    return createTaxApiResponse({
      error: 'SAVE_ERROR',
      message: 'Failed to save tax record',
    }, 500);
  }
};

// Export protected handlers
export const GET = withTaxSecurity(handleGet);
export const POST = withTaxSecurity(handlePost);