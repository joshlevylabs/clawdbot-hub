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
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  urgent?: boolean;
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
      <p className={`text-2xl font-bold ${trendColor}`}>{value}</p>
      {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}

export default function TaxDashboard({ data }: TaxDashboardProps) {
  // Find next deadline
  const upcomingDeadlines = data.deadlines
    .filter(d => d.status === 'upcoming')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  
  const nextDeadline = upcomingDeadlines[0];
  const daysToNextDeadline = nextDeadline ? daysUntil(nextDeadline.due_date) : null;
  
  // Calculate estimated tax summary for current year
  const currentYear = new Date().getFullYear();
  const currentYearEstimates = data.estimates.filter(e => e.year === currentYear);
  const federalEstimates = currentYearEstimates.filter(e => e.type === 'federal');
  const stateEstimates = currentYearEstimates.filter(e => e.type === 'state');
  
  const totalFederalEstimated = federalEstimates.reduce((sum, e) => sum + (e.estimated_amount || 0), 0);
  const totalStateEstimated = stateEstimates.reduce((sum, e) => sum + (e.estimated_amount || 0), 0);
  const totalFederalPaid = federalEstimates.reduce((sum, e) => sum + (e.actual_amount || 0), 0);
  const totalStatePaid = stateEstimates.reduce((sum, e) => sum + (e.actual_amount || 0), 0);
  
  // Find primary accountant
  const accountant = data.contacts.find(c => c.role === 'accountant');
  
  // Year-at-a-glance from latest history
  const latestHistory = data.history.sort((a, b) => b.year - a.year)[0];

  return (
    <div className="space-y-6">
      {/* Tax Deadline Countdown */}
      {nextDeadline && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-primary-400" />
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

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Federal Estimated"
          value={formatCurrency(totalFederalEstimated)}
          subValue={`Paid: ${formatCurrency(totalFederalPaid)}`}
          trend={totalFederalPaid >= totalFederalEstimated ? "up" : "down"}
        />
        <StatCard
          icon={DollarSign}
          label="CA State Estimated"
          value={formatCurrency(totalStateEstimated)}
          subValue={`Paid: ${formatCurrency(totalStatePaid)}`}
          trend={totalStatePaid >= totalStateEstimated ? "up" : "down"}
        />
        <StatCard
          icon={Calendar}
          label="Upcoming Deadlines"
          value={upcomingDeadlines.length}
          subValue="Next 12 months"
          urgent={upcomingDeadlines.some(d => daysUntil(d.due_date) <= 7)}
        />
        <StatCard
          icon={FileText}
          label="Tax Contacts"
          value={data.contacts.length}
          subValue="Service providers"
          trend="neutral"
        />
      </div>

      {/* Year-at-a-Glance */}
      {latestHistory && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              {latestHistory.year} Year-at-a-Glance
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">Gross Revenue</p>
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(latestHistory.gross_revenue)}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">Net Profit</p>
              <p className="text-xl font-bold text-slate-100">
                {formatCurrency(latestHistory.net_profit)}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">Federal Tax</p>
              <p className={`text-xl font-bold ${
                (latestHistory.federal_tax_owed || 0) > 0 ? "text-red-400" : "text-emerald-400"
              }`}>
                {formatCurrency(latestHistory.federal_tax_owed)}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-900/50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">CA State</p>
              <p className={`text-xl font-bold ${
                (latestHistory.state_tax_owed || 0) > 0 ? "text-red-400" : "text-emerald-400"
              }`}>
                {(latestHistory.state_tax_owed || 0) < 0 
                  ? `${formatCurrency(Math.abs(latestHistory.state_tax_owed || 0))} refund`
                  : formatCurrency(latestHistory.state_tax_owed)
                }
              </p>
            </div>
          </div>
          {latestHistory.notes && (
            <div className="mt-4 p-3 bg-slate-900/30 rounded-lg">
              <p className="text-sm text-slate-400">{latestHistory.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Accountant Status */}
      {accountant && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">Accountant Contact</h2>
          </div>
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-100 mb-1">{accountant.name}</h3>
              {accountant.company && (
                <p className="text-slate-400 mb-3">{accountant.company}</p>
              )}
              <div className="space-y-2">
                {accountant.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <a href={`mailto:${accountant.email}`} className="hover:text-primary-400 transition-colors">
                      {accountant.email}
                    </a>
                  </div>
                )}
                {accountant.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <a href={`tel:${accountant.phone}`} className="hover:text-primary-400 transition-colors">
                      {accountant.phone}
                    </a>
                  </div>
                )}
                {accountant.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                    <p>{accountant.address}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-sm text-emerald-400">Active</span>
            </div>
          </div>
          {accountant.notes && (
            <div className="mt-4 p-3 bg-slate-900/30 rounded-lg">
              <p className="text-sm text-slate-400">{accountant.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Upcoming Deadlines List */}
      {upcomingDeadlines.length > 1 && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">All Upcoming Deadlines</h2>
          </div>
          <div className="space-y-3">
            {upcomingDeadlines.map((deadline) => {
              const daysLeft = daysUntil(deadline.due_date);
              const isUrgent = daysLeft <= 7;
              const isWarning = daysLeft <= 30;
              
              return (
                <div key={deadline.id} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                  <div>
                    <h3 className="font-medium text-slate-100">{deadline.description}</h3>
                    <p className="text-sm text-slate-400">{deadline.form_type}</p>
                    {deadline.notes && (
                      <p className="text-xs text-slate-500 mt-1">{deadline.notes}</p>
                    )}
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
      )}
    </div>
  );
}