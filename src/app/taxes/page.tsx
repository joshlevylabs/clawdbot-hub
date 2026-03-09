"use client";

import { useState, useEffect } from "react";
import {
  Receipt,
  Calculator,
  ExternalLink,
  History,
  RefreshCw,
  AlertTriangle,
  Calendar,
  DollarSign,
  Clock,
  Building,
  TrendingUp,
  FileText,
  Lock,
  Shield,
  Timer,
} from "lucide-react";
import TaxDashboard from "./components/TaxDashboard";
import TaxEstimator from "./components/TaxEstimator";
import ImportantLinks from "./components/ImportantLinks";
import TaxHistory from "./components/TaxHistory";
import TaxPinGate from "./components/TaxPinGate";
import { useTaxSecurity } from "./hooks/useTaxSecurity";
import { taxApi, handleTaxApiError } from "./utils/taxApi";
import { formatCurrency, formatDate, daysSince, daysUntil } from "./utils";

// ===== Types =====

export interface TaxEstimate {
  id: string;
  year: number;
  quarter: number | null;
  type: 'federal' | 'state';
  estimated_amount: number | null;
  actual_amount: number | null;
  paid_date: string | null;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxContact {
  id: string;
  name: string;
  role: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface TaxDeadline {
  id: string;
  year: number;
  form_type: string;
  description: string;
  due_date: string;
  status: 'upcoming' | 'filed' | 'extended';
  notes: string | null;
  created_at: string;
}

export interface TaxHistoryRecord {
  id: string;
  year: number;
  filing_type: 'personal' | 's-corp';
  gross_revenue: number | null;
  net_profit: number | null;
  federal_tax_owed: number | null;
  state_tax_owed: number | null;
  total_paid: number | null;
  refund_amount: number | null;
  accountant_estimate: number | null;
  notes: string | null;
  created_at: string;
}

export interface TaxData {
  estimates: TaxEstimate[];
  contacts: TaxContact[];
  deadlines: TaxDeadline[];
  history: TaxHistoryRecord[];
  timestamp: string;
}

// ===== Main Component =====

type ActiveTab = "dashboard" | "estimator" | "links" | "history";

export default function TaxesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [data, setData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Security layer for tax data access
  const taxSecurity = useTaxSecurity();

  // Load tax data from secure API
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use secure tax API
      const response = await taxApi.get<TaxData>('/api/taxes');
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        handleTaxApiError(response);
        setError(response.error?.message || "Failed to load tax data");
      }
    } catch (err) {
      console.error("Error loading tax data:", err);
      setError("Failed to load tax data");
      
      // Fallback to mock data for development
      const mockData: TaxData = {
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
            id: "3",
            year: 2024,
            filing_type: "s-corp",
            gross_revenue: 198752,
            net_profit: 84884,
            federal_tax_owed: -3024,
            state_tax_owed: null,
            total_paid: 37648,
            refund_amount: 3024,
            accountant_estimate: null,
            notes: "S-Corp gross receipts $198,752, officer compensation $63,333, received federal refund",
            created_at: "2024-04-15T00:00:00Z"
          },
          {
            id: "2",
            year: 2023,
            filing_type: "s-corp",
            gross_revenue: 207784,
            net_profit: 75460,
            federal_tax_owed: 2870,
            state_tax_owed: null,
            total_paid: 20689,
            refund_amount: null,
            accountant_estimate: null,
            notes: "S-Corp gross receipts $207,784, officer compensation $54,415, owed $2,870 to IRS",
            created_at: "2023-04-15T00:00:00Z"
          },
          {
            id: "1",
            year: 2022,
            filing_type: "s-corp",
            gross_revenue: 272297,
            net_profit: 91953,
            federal_tax_owed: 17764,
            state_tax_owed: null,
            total_paid: null,
            refund_amount: null,
            accountant_estimate: null,
            notes: "S-Corp gross receipts $272,297, officer compensation $12,000, owed $17,764 to IRS",
            created_at: "2022-04-15T00:00:00Z"
          }
        ],
        timestamp: new Date().toISOString()
      };

      console.log("Using fallback mock data due to API error");
      setData(mockData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: Calendar },
    { key: "estimator", label: "Tax Estimator", icon: Calculator },
    { key: "links", label: "Links & Contacts", icon: ExternalLink },
    { key: "history", label: "History", icon: History },
  ] as const;

  // Redirect to vault taxes section
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto bg-[#D4A020]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#D4A020]/20">
          <Receipt className="w-10 h-10 text-[#D4A020]" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-3">Taxes Moved to Secure Vault</h1>
        <p className="text-slate-400 mb-6 text-sm leading-relaxed">
          Tax management is now part of the Secure Vault for enhanced security. 
          Access your tax data alongside other sensitive information with unified TOTP authentication.
        </p>
        <a
          href="/vault?tab=taxes"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4A020] hover:bg-[#D4A020]/80 rounded-xl transition-colors text-slate-900 font-medium"
        >
          <Lock className="w-4 h-4" />
          Go to Secure Vault
        </a>
        <p className="text-slate-600 text-xs mt-4">
          This page will be removed in a future update
        </p>
      </div>
    </div>
  );
}