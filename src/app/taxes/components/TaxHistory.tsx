import { useState } from "react";
import {
  History,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  Building,
  User,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Upload,
  Eye,
  Download,
} from "lucide-react";
import { TaxData, TaxHistoryRecord } from "../page";
import { formatCurrency, formatDate } from "../utils";

interface TaxHistoryProps {
  data: TaxData;
}

interface PaymentRecord {
  id: string;
  year: number;
  quarter: number;
  type: 'federal' | 'state';
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: 'paid' | 'pending' | 'overdue';
}

function HistoryCard({ record }: { record: TaxHistoryRecord }) {
  const isProfit = (record.net_profit || 0) > 0;
  const federalRefund = (record.federal_tax_owed || 0) < 0;
  const stateRefund = (record.state_tax_owed || 0) < 0;
  
  return (
    <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900/50 rounded-lg">
            <Calendar className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">{record.year} Tax Year</h3>
            <p className="text-sm text-slate-400 capitalize">{record.filing_type} filing</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Filed</p>
          <p className="text-sm text-slate-300">{formatDate(record.created_at)}</p>
        </div>
      </div>
      
      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-slate-900/30 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Gross Revenue</p>
          <p className="text-lg font-bold text-emerald-400">
            {formatCurrency(record.gross_revenue)}
          </p>
        </div>
        <div className="text-center p-3 bg-slate-900/30 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Net Profit</p>
          <p className={`text-lg font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
            {formatCurrency(record.net_profit)}
          </p>
        </div>
        <div className="text-center p-3 bg-slate-900/30 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Federal Tax</p>
          <p className={`text-lg font-bold ${federalRefund ? "text-emerald-400" : "text-red-400"}`}>
            {federalRefund 
              ? `${formatCurrency(Math.abs(record.federal_tax_owed || 0))} refund`
              : formatCurrency(record.federal_tax_owed)
            }
          </p>
        </div>
        <div className="text-center p-3 bg-slate-900/30 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">CA State</p>
          <p className={`text-lg font-bold ${stateRefund ? "text-emerald-400" : "text-red-400"}`}>
            {stateRefund 
              ? `${formatCurrency(Math.abs(record.state_tax_owed || 0))} refund`
              : formatCurrency(record.state_tax_owed)
            }
          </p>
        </div>
      </div>
      
      {/* Payment Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">Payments Made</p>
          </div>
          <p className="text-xl font-bold text-slate-100">
            {formatCurrency(record.total_paid)}
          </p>
        </div>
        <div className="bg-slate-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">Accountant Estimate</p>
          </div>
          <p className="text-xl font-bold text-primary-400">
            {formatCurrency(record.accountant_estimate)}
          </p>
        </div>
      </div>
      
      {/* Notes */}
      {record.notes && (
        <div className="p-3 bg-slate-900/30 rounded-lg">
          <p className="text-sm text-slate-400">{record.notes}</p>
        </div>
      )}
    </div>
  );
}

function PaymentTracker({ data }: { data: TaxData }) {
  // Convert estimates to payment records for display
  const paymentRecords: PaymentRecord[] = data.estimates.map(estimate => ({
    id: estimate.id,
    year: estimate.year,
    quarter: estimate.quarter || 0,
    type: estimate.type,
    amount: estimate.actual_amount || estimate.estimated_amount || 0,
    dueDate: estimate.due_date,
    paidDate: estimate.paid_date,
    status: estimate.status
  }));

  const currentYear = new Date().getFullYear();
  const currentYearPayments = paymentRecords.filter(p => p.year === currentYear);
  
  const totalPaid = currentYearPayments.reduce((sum, p) => sum + (p.paidDate ? p.amount : 0), 0);
  const totalDue = currentYearPayments.reduce((sum, p) => sum + p.amount, 0);
  
  return (
    <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-5 h-5 text-primary-400" />
        <h3 className="text-lg font-semibold text-slate-100">{currentYear} Payment Tracker</h3>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/30 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-500 mb-1">Total Due</p>
          <p className="text-xl font-bold text-slate-100">{formatCurrency(totalDue)}</p>
        </div>
        <div className="bg-slate-900/30 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-500 mb-1">Total Paid</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-slate-900/30 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-500 mb-1">Remaining</p>
          <p className={`text-xl font-bold ${totalDue - totalPaid > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {formatCurrency(totalDue - totalPaid)}
          </p>
        </div>
      </div>
      
      {/* Payment List */}
      <div className="space-y-3">
        {currentYearPayments
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .map((payment) => (
          <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                payment.status === 'paid' ? 'bg-emerald-900/30' :
                payment.status === 'overdue' ? 'bg-red-900/30' :
                'bg-amber-900/30'
              }`}>
                {payment.status === 'paid' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : payment.status === 'overdue' ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <Calendar className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-slate-100">
                  {payment.type === 'federal' ? 'Federal' : 'CA State'} 
                  {payment.quarter > 0 ? ` Q${payment.quarter}` : ' Annual'} Estimated Tax
                </h4>
                <p className="text-sm text-slate-400">
                  Due: {formatDate(payment.dueDate)}
                  {payment.paidDate && ` • Paid: ${formatDate(payment.paidDate)}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-slate-100">{formatCurrency(payment.amount)}</p>
              <p className={`text-xs ${
                payment.status === 'paid' ? 'text-emerald-400' :
                payment.status === 'overdue' ? 'text-red-400' :
                'text-amber-400'
              }`}>
                {payment.status.toUpperCase()}
              </p>
            </div>
          </div>
        ))}
        
        {currentYearPayments.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No payment records for {currentYear}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function YearComparison({ records }: { records: TaxHistoryRecord[] }) {
  if (records.length < 2) return null;
  
  const sortedRecords = [...records].sort((a, b) => b.year - a.year);
  const currentYear = sortedRecords[0];
  const previousYear = sortedRecords[1];
  
  const revenueChange = ((currentYear.gross_revenue || 0) - (previousYear.gross_revenue || 0)) / (previousYear.gross_revenue || 1) * 100;
  const profitChange = ((currentYear.net_profit || 0) - (previousYear.net_profit || 0)) / Math.abs(previousYear.net_profit || 1) * 100;
  const taxChange = ((currentYear.federal_tax_owed || 0) + (currentYear.state_tax_owed || 0)) - 
                   ((previousYear.federal_tax_owed || 0) + (previousYear.state_tax_owed || 0));
  
  return (
    <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-5 h-5 text-primary-400" />
        <h3 className="text-lg font-semibold text-slate-100">
          Year-over-Year Comparison ({previousYear.year} → {currentYear.year})
        </h3>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/30 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">Revenue Change</p>
          </div>
          <p className={`text-2xl font-bold ${revenueChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {revenueChange >= 0 ? "+" : ""}{revenueChange.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatCurrency(previousYear.gross_revenue)} → {formatCurrency(currentYear.gross_revenue)}
          </p>
        </div>
        
        <div className="bg-slate-900/30 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">Profit Change</p>
          </div>
          <p className={`text-2xl font-bold ${profitChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {profitChange >= 0 ? "+" : ""}{Math.abs(profitChange) > 1000 ? "∞" : profitChange.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatCurrency(previousYear.net_profit)} → {formatCurrency(currentYear.net_profit)}
          </p>
        </div>
        
        <div className="bg-slate-900/30 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">Tax Change</p>
          </div>
          <p className={`text-2xl font-bold ${taxChange >= 0 ? "text-red-400" : "text-emerald-400"}`}>
            {taxChange >= 0 ? "+" : ""}{formatCurrency(taxChange)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Combined federal + state</p>
        </div>
      </div>
    </div>
  );
}

function YearlyComparison({ year, sCorpData, personalData }: {
  year: number;
  sCorpData: any;
  personalData: any;
}) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-5 h-5 text-[#D4A020]" />
        <h2 className="text-lg font-semibold text-slate-100">{year} Tax Year</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* S-Corp Panel */}
        <div className="bg-slate-900/30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-4 h-4 text-[#D4A020]" />
            <h3 className="font-semibold text-slate-100">S-Corp (Josh Levy Labs Inc)</h3>
          </div>
          
          {sCorpData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Gross Receipts</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatCurrency(sCorpData.grossReceipts)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Officer Comp</p>
                  <p className="text-lg font-bold text-slate-300">
                    {formatCurrency(sCorpData.officerComp)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">K-1 Pass-through</p>
                  <p className="text-lg font-bold text-[#D4A020]">
                    {formatCurrency(sCorpData.passthrough)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Form</p>
                  <p className="text-lg font-bold text-slate-400">1120-S</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm">No S-Corp data for {year}</p>
            </div>
          )}
        </div>

        {/* Personal Panel */}
        <div className="bg-slate-900/30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#D4A020]" />
            <h3 className="font-semibold text-slate-100">Personal (Joshua & Jillian)</h3>
          </div>
          
          {personalData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">AGI</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatCurrency(personalData.agi)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Total Tax</p>
                  <p className="text-lg font-bold text-slate-300">
                    {formatCurrency(personalData.totalTax)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Balance Due/Refund</p>
                  <p className={`text-lg font-bold ${personalData.balance >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {personalData.balance >= 0 
                      ? `+${formatCurrency(personalData.balance)}`
                      : `${formatCurrency(personalData.balance)}`
                    }
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Form</p>
                  <p className="text-lg font-bold text-slate-400">1040</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 text-sm">No personal data for {year}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TaxHistory({ data }: TaxHistoryProps) {
  // Real historical tax data from extracted memory file
  const historicalData: Record<number, {
    scorp: { grossReceipts: number; officerComp: number; passthrough: number; };
    personal: { agi: number; totalTax: number; balance: number; };
  }> = {
    2024: {
      scorp: {
        grossReceipts: 198752,
        officerComp: 63333,
        passthrough: 84884
      },
      personal: {
        agi: 195896,
        totalTax: 37648,
        balance: -3024 // Refund
      }
    },
    2023: {
      scorp: {
        grossReceipts: 207784,
        officerComp: 54415,
        passthrough: 75460
      },
      personal: {
        agi: 217927,
        totalTax: 23559,
        balance: 2870 // Owed
      }
    },
    2022: {
      scorp: {
        grossReceipts: 272297,
        officerComp: 12000,
        passthrough: 91953
      },
      personal: {
        agi: 299443,
        totalTax: 48652,
        balance: 17764 // Owed
      }
    }
  };
  
  // Calculate year-over-year trends
  const years = [2024, 2023, 2022];
  const latestYear = years[0];
  const previousYear = years[1];
  
  const revenueChange = ((historicalData[latestYear].scorp.grossReceipts - historicalData[previousYear].scorp.grossReceipts) / historicalData[previousYear].scorp.grossReceipts * 100);
  const agiChange = ((historicalData[latestYear].personal.agi - historicalData[previousYear].personal.agi) / historicalData[previousYear].personal.agi * 100);
  const taxChange = historicalData[latestYear].personal.totalTax - historicalData[previousYear].personal.totalTax;

  return (
    <div className="space-y-6">
      {/* Year-over-Year Summary */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-5 h-5 text-[#D4A020]" />
          <h2 className="text-lg font-semibold text-slate-100">
            Year-over-Year Summary ({previousYear} → {latestYear})
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-slate-900/30 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-medium text-slate-300">S-Corp Revenue</p>
            </div>
            <p className={`text-2xl font-bold ${revenueChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {revenueChange >= 0 ? "+" : ""}{revenueChange.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatCurrency(historicalData[previousYear].scorp.grossReceipts)} → {formatCurrency(historicalData[latestYear].scorp.grossReceipts)}
            </p>
          </div>
          
          <div className="bg-slate-900/30 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <User className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-medium text-slate-300">Personal AGI</p>
            </div>
            <p className={`text-2xl font-bold ${agiChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {agiChange >= 0 ? "+" : ""}{agiChange.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatCurrency(historicalData[previousYear].personal.agi)} → {formatCurrency(historicalData[latestYear].personal.agi)}
            </p>
          </div>
          
          <div className="bg-slate-900/30 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-medium text-slate-300">Tax Change</p>
            </div>
            <p className={`text-2xl font-bold ${taxChange >= 0 ? "text-red-400" : "text-emerald-400"}`}>
              {taxChange >= 0 ? "+" : ""}{formatCurrency(taxChange)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Personal tax liability</p>
          </div>
        </div>
      </div>

      {/* Yearly Breakdown - S-Corp vs Personal Side by Side */}
      <div className="space-y-6">
        {years.map(year => (
          <YearlyComparison 
            key={year}
            year={year}
            sCorpData={historicalData[year].scorp}
            personalData={historicalData[year].personal}
          />
        ))}
      </div>

      {/* Summary Insights */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-[#D4A020]" />
          <h2 className="text-lg font-semibold text-slate-100">Three-Year Tax Summary</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* S-Corp Trends */}
          <div className="bg-slate-900/30 rounded-lg p-5">
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#D4A020]" />
              S-Corp Performance
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Peak Revenue Year:</span>
                <span className="text-sm font-medium text-emerald-400">2022 ({formatCurrency(272297)})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Highest K-1 Pass-through:</span>
                <span className="text-sm font-medium text-[#D4A020]">2022 ({formatCurrency(91953)})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Officer Comp Growth:</span>
                <span className="text-sm font-medium text-slate-300">$12k → $63k (2022-2024)</span>
              </div>
            </div>
          </div>

          {/* Personal Tax Trends */}
          <div className="bg-slate-900/30 rounded-lg p-5">
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#D4A020]" />
              Personal Tax Performance
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Highest Tax Year:</span>
                <span className="text-sm font-medium text-red-400">2022 ({formatCurrency(48652)})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Best Outcome:</span>
                <span className="text-sm font-medium text-emerald-400">2024 (${formatCurrency(3024)} refund)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Effective Rate (2024):</span>
                <span className="text-sm font-medium text-slate-300">~17.5%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-blue-300 font-medium mb-1">Tax Planning Insights</p>
              <p className="text-sm text-blue-200">
                The move from $12k to $63k officer compensation (2022→2024) improved tax efficiency by reducing 
                pass-through income subject to self-employment tax. 2024 federal refund suggests good withholding strategy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}