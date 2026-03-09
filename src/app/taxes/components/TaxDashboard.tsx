import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  TrendingUp,
  Building,
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  ArrowDown,
  Activity,
} from "lucide-react";
import { TaxData } from "../page";
import { formatCurrency, formatDate, daysUntil } from "../utils";

interface TaxDashboardProps {
  data: TaxData;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend = "neutral",
  urgent = false,
  size = "normal",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  urgent?: boolean;
  size?: "normal" | "large";
}) {
  const trendColor = urgent 
    ? "text-red-400" 
    : trend === "up" 
    ? "text-emerald-400" 
    : trend === "down" 
    ? "text-red-400" 
    : "text-slate-400";
    
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${trendColor}`} />
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`${size === "large" ? "text-3xl" : "text-2xl"} font-bold ${trendColor}`}>{value}</p>
      {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}

function MoneyFlowCard({ 
  label, 
  amount, 
  isPositive = true,
  size = "medium" 
}: { 
  label: string;
  amount: number | null;
  isPositive?: boolean;
  size?: "small" | "medium" | "large";
}) {
  const sizeClass = {
    small: "p-2 text-sm",
    medium: "p-3 text-base", 
    large: "p-4 text-lg"
  }[size];
  
  const amountClass = {
    small: "text-lg",
    medium: "text-xl",
    large: "text-2xl"
  }[size];

  return (
    <div className={`bg-slate-800/50 rounded-lg border border-slate-700/50 text-center ${sizeClass}`}>
      <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className={`font-bold ${isPositive ? "text-emerald-400" : "text-red-400"} ${amountClass}`}>
        {amount !== null ? formatCurrency(amount) : "—"}
      </div>
    </div>
  );
}

export default function TaxDashboard({ data }: TaxDashboardProps) {
  // Real tax data from extracted file (2024)
  const realTaxData = {
    scorp2024: {
      grossReceipts: 198752,
      totalIncome: 190893,
      officerCompensation: 63333,
      totalDeductions: 106009,
      ordinaryBusinessIncome: 84884, // K-1 pass-through
    },
    personal2024: {
      totalIncome: 283850,
      agi: 195896,
      taxableIncome: 214896,
      totalTax: 37648,
      federalRefund: 3024, // They received a refund
    }
  };

  // Find deadlines - fix years to 2026
  const upcomingDeadlines = data.deadlines
    .filter(d => d.status === 'upcoming')
    .map(d => ({
      ...d,
      // Fix the years - S-Corp deadline is Mar 15, 2026; Personal is Apr 15, 2026
      due_date: d.form_type === '1120-S' 
        ? '2026-03-15'
        : d.form_type === '1040'
        ? '2026-04-15'
        : d.form_type === 'quarterly-estimate'
        ? '2026-04-15'
        : d.due_date
    }))
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  
  const nextDeadline = upcomingDeadlines[0];
  const daysToNextDeadline = nextDeadline ? daysUntil(nextDeadline.due_date) : null;
  
  // Get S-Corp and Personal history data
  const latestSCorp = data.history.filter(h => h.filing_type === 's-corp').sort((a, b) => b.year - a.year)[0];
  const latestPersonal = data.history.filter(h => h.filing_type === 'personal').sort((a, b) => b.year - a.year)[0];

  // Find primary accountant
  const accountant = data.contacts.find(c => c.role === 'accountant');

  return (
    <div className="space-y-6">
      {/* Tax Deadline Countdown */}
      {nextDeadline && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-[#D4A020]" />
            <h2 className="text-lg font-semibold text-slate-100">Next Tax Deadline</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-100 mb-1">
                {nextDeadline.description}
              </h3>
              <p className="text-slate-400">{formatDate(nextDeadline.due_date)}</p>
              {nextDeadline.notes && (
                <p className="text-sm text-slate-500 mt-2">{nextDeadline.notes}</p>
              )}
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold mb-1 ${
                daysToNextDeadline !== null && daysToNextDeadline <= 7 
                  ? "text-red-400" 
                  : daysToNextDeadline !== null && daysToNextDeadline <= 30 
                  ? "text-amber-400" 
                  : "text-emerald-400"
              }`}>
                {daysToNextDeadline !== null ? daysToNextDeadline : "—"}
              </div>
              <div className="text-sm text-slate-500">
                {daysToNextDeadline !== null ? "days remaining" : ""}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Money Flow Visualization */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-[#D4A020]" />
          <h2 className="text-lg font-semibold text-slate-100">2024 Money Flow Diagram</h2>
        </div>
        
        {/* S-Corp to Personal Flow */}
        <div className="space-y-6">
          {/* S-Corp Revenue Flow */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300 mb-3">📊 S-Corp (Josh Levy Labs Inc) — 1120-S</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
              <MoneyFlowCard label="Gross Receipts" amount={realTaxData.scorp2024.grossReceipts} />
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-slate-500" />
              </div>
              <MoneyFlowCard label="Deductions" amount={-realTaxData.scorp2024.totalDeductions} isPositive={false} />
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-slate-500" />
              </div>
              <MoneyFlowCard label="Net Income" amount={realTaxData.scorp2024.ordinaryBusinessIncome} />
            </div>
          </div>

          {/* Split to Personal */}
          <div className="flex justify-center">
            <div className="flex flex-col items-center">
              <ArrowDown className="w-5 h-5 text-slate-500 mb-1" />
              <span className="text-xs text-slate-500">Splits into</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MoneyFlowCard 
              label="Officer W-2 Salary" 
              amount={realTaxData.scorp2024.officerCompensation}
              size="large"
            />
            <MoneyFlowCard 
              label="K-1 Pass-through" 
              amount={realTaxData.scorp2024.ordinaryBusinessIncome}
              size="large"
            />
          </div>

          {/* Personal Tax Flow */}
          <div className="space-y-3">
            <div className="flex justify-center mt-4 mb-3">
              <div className="flex flex-col items-center">
                <ArrowDown className="w-5 h-5 text-slate-500 mb-1" />
                <span className="text-xs text-slate-500">Flows to Personal</span>
              </div>
            </div>
            
            <h3 className="text-sm font-medium text-slate-300 mb-3">👫 Personal (Joshua & Jillian Levy) — 1040</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
              <MoneyFlowCard label="Total Income" amount={realTaxData.personal2024.totalIncome} />
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-slate-500" />
              </div>
              <MoneyFlowCard label="AGI" amount={realTaxData.personal2024.agi} />
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-slate-500" />
              </div>
              <MoneyFlowCard label="Taxable Income" amount={realTaxData.personal2024.taxableIncome} />
            </div>
          </div>

          {/* Final Tax Result */}
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="flex flex-col items-center">
                <ArrowDown className="w-5 h-5 text-slate-500 mb-1" />
                <span className="text-xs text-slate-500">Tax Liability</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MoneyFlowCard label="Total Tax Paid" amount={realTaxData.personal2024.totalTax} />
              <MoneyFlowCard 
                label="Federal Refund" 
                amount={realTaxData.personal2024.federalRefund}
                isPositive={true}
                size="large"
              />
              <MoneyFlowCard label="CA State" amount={0} />
            </div>
          </div>
        </div>
      </div>

      {/* Two-Panel Dashboard: S-Corp vs Personal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* S-Corp Panel */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Building className="w-5 h-5 text-[#D4A020]" />
            <h2 className="text-lg font-semibold text-slate-100">S-Corp (Josh Levy Labs Inc)</h2>
          </div>
          
          {latestSCorp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">2024 Gross Revenue</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatCurrency(realTaxData.scorp2024.grossReceipts)}
                  </p>
                </div>
                <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Officer W-2</p>
                  <p className="text-lg font-bold text-slate-100">
                    {formatCurrency(realTaxData.scorp2024.officerCompensation)}
                  </p>
                </div>
                <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">K-1 Pass-through</p>
                  <p className="text-lg font-bold text-[#D4A020]">
                    {formatCurrency(realTaxData.scorp2024.ordinaryBusinessIncome)}
                  </p>
                </div>
                <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Total Deductions</p>
                  <p className="text-lg font-bold text-slate-400">
                    {formatCurrency(realTaxData.scorp2024.totalDeductions)}
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-900/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Next Deadline:</span>
                  <span className="text-sm font-medium text-[#D4A020]">Mar 15, 2026 (1120-S)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Personal Panel */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-[#D4A020]" />
            <h2 className="text-lg font-semibold text-slate-100">Personal (Joshua & Jillian Levy)</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">2024 Total Income</p>
                <p className="text-lg font-bold text-emerald-400">
                  {formatCurrency(realTaxData.personal2024.totalIncome)}
                </p>
              </div>
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">AGI</p>
                <p className="text-lg font-bold text-slate-100">
                  {formatCurrency(realTaxData.personal2024.agi)}
                </p>
              </div>
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Federal Refund</p>
                <p className="text-lg font-bold text-emerald-400">
                  +{formatCurrency(realTaxData.personal2024.federalRefund)}
                </p>
              </div>
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">CA State Owed</p>
                <p className="text-lg font-bold text-slate-400">
                  $0
                </p>
              </div>
            </div>
            
            <div className="bg-slate-900/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Next Deadline:</span>
                <span className="text-sm font-medium text-[#D4A020]">Apr 15, 2026 (1040)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accountant Contact & All Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accountant Status */}
        {accountant && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-[#D4A020]" />
              <h2 className="text-lg font-semibold text-slate-100">Tax Professional</h2>
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="text-xl font-bold text-slate-100">{accountant.name}</h3>
                {accountant.company && (
                  <p className="text-slate-400">{accountant.company}</p>
                )}
              </div>
              <div className="space-y-2">
                {accountant.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <a href={`mailto:${accountant.email}`} className="hover:text-[#D4A020] transition-colors">
                      {accountant.email}
                    </a>
                  </div>
                )}
                {accountant.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <a href={`tel:${accountant.phone}`} className="hover:text-[#D4A020] transition-colors">
                      {accountant.phone}
                    </a>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Active</span>
              </div>
            </div>
          </div>
        )}

        {/* All Upcoming Deadlines */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-[#D4A020]" />
            <h2 className="text-lg font-semibold text-slate-100">All Deadlines (2026)</h2>
          </div>
          <div className="space-y-3">
            {upcomingDeadlines.map((deadline) => {
              const daysLeft = daysUntil(deadline.due_date);
              const isUrgent = daysLeft <= 7;
              const isWarning = daysLeft <= 30;
              
              return (
                <div key={deadline.id} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                  <div>
                    <h3 className="font-medium text-slate-100">{deadline.form_type}</h3>
                    <p className="text-sm text-slate-400">{deadline.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      isUrgent ? "text-red-400" : isWarning ? "text-amber-400" : "text-slate-300"
                    }`}>
                      {formatDate(deadline.due_date)}
                    </p>
                    <p className={`text-sm ${
                      isUrgent ? "text-red-400" : isWarning ? "text-amber-400" : "text-slate-500"
                    }`}>
                      {daysLeft} days
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}