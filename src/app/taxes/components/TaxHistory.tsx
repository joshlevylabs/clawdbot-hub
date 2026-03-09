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

export default function TaxHistory({ data }: TaxHistoryProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  const sortedHistory = [...data.history].sort((a, b) => b.year - a.year);
  
  return (
    <div className="space-y-6">
      {/* Year-over-Year Comparison */}
      <YearComparison records={data.history} />
      
      {/* Payment Tracker */}
      <PaymentTracker data={data} />
      
      {/* Historical Records */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">Tax History</h2>
          </div>
          
          {/* Placeholder for document upload - V2 feature */}
          <button 
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors text-sm text-slate-300 border border-slate-600/30"
            disabled
          >
            <Upload className="w-4 h-4" />
            Upload Returns (V2)
          </button>
        </div>
        
        {sortedHistory.length > 0 ? (
          <div className="space-y-6">
            {sortedHistory.map((record) => (
              <HistoryCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h3 className="text-slate-400 font-medium mb-1">No Tax History</h3>
            <p className="text-slate-600 text-sm">Tax return summaries will appear here once filed.</p>
          </div>
        )}
      </div>
      
      {/* Validation Section */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-slate-100">Validation & Accuracy</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/30 rounded-lg p-4">
            <h3 className="font-medium text-slate-200 mb-3">Your Records vs Filed Returns</h3>
            {sortedHistory.length > 0 ? (
              <div className="space-y-3">
                {sortedHistory.slice(0, 3).map((record) => {
                  const variance = Math.abs((record.accountant_estimate || 0) - 
                    ((record.federal_tax_owed || 0) + (record.state_tax_owed || 0)));
                  const isAccurate = variance < 1000;
                  
                  return (
                    <div key={record.id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">{record.year}</span>
                      <div className="flex items-center gap-2">
                        {isAccurate ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                        )}
                        <span className={`text-sm ${isAccurate ? "text-emerald-400" : "text-amber-400"}`}>
                          {isAccurate ? "Accurate" : `${formatCurrency(variance)} variance`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No historical data for comparison</p>
            )}
          </div>
          
          <div className="bg-slate-900/30 rounded-lg p-4">
            <h3 className="font-medium text-slate-200 mb-3">Estimated vs Actual Payments</h3>
            {data.estimates.length > 0 ? (
              <div className="space-y-3">
                {data.estimates
                  .filter(e => e.actual_amount)
                  .slice(0, 3)
                  .map((estimate) => {
                    const variance = Math.abs((estimate.actual_amount || 0) - (estimate.estimated_amount || 0));
                    const isAccurate = variance < (estimate.estimated_amount || 0) * 0.1; // Within 10%
                    
                    return (
                      <div key={estimate.id} className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">
                          {estimate.year} Q{estimate.quarter} {estimate.type}
                        </span>
                        <div className="flex items-center gap-2">
                          {isAccurate ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                          )}
                          <span className={`text-sm ${isAccurate ? "text-emerald-400" : "text-amber-400"}`}>
                            {isAccurate ? "On target" : `${formatCurrency(variance)} diff`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No payment data for comparison</p>
            )}
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-blue-300 font-medium mb-1">Continuous Improvement</p>
              <p className="text-sm text-blue-200">
                Track the accuracy of your estimates over time to improve tax planning. 
                Regular validation helps refine your quarterly payment calculations and reduces year-end surprises.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}