import { useState, useEffect } from "react";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Building,
  User,
  Receipt,
  FileText,
  AlertCircle,
  Info,
  Lightbulb,
  ExternalLink,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { TaxData } from "../page";
import { formatCurrency } from "../utils";

interface TaxEstimatorProps {
  data: TaxData;
}

interface SCORPInputs {
  grossRevenue: number;
  officerSalary: number;
  businessExpenses: number;
  depreciation: number;
  businessDeductions: number;
  personalDeductions: number;
}

interface TaxCalculation {
  scorp: {
    netProfitLoss: number;
    corporateTax: number;
    passThrough: number;
  };
  personal: {
    salaryTax: number;
    passThroughTax: number;
    totalPersonalTax: number;
    fica: number;
    medicare: number;
  };
  state: {
    corporateTax: number;
    personalTax: number;
    totalStateTax: number;
  };
  summary: {
    totalFederal: number;
    totalState: number;
    totalCombined: number;
    effectiveRate: number;
  };
}

// S-Corp tax calculation logic
function calculateSCorpTaxes(inputs: SCORPInputs): TaxCalculation {
  // S-Corp Business Income
  const netProfitLoss = inputs.grossRevenue - inputs.officerSalary - inputs.businessExpenses - inputs.depreciation - inputs.businessDeductions;
  
  // S-Corp doesn't pay federal corporate tax (pass-through entity)
  const corporateTax = 0;
  
  // Pass-through income to personal return
  const passThrough = Math.max(0, netProfitLoss);
  
  // Officer salary taxes (W-2 income)
  const socialSecurityWage = Math.min(inputs.officerSalary, 168600); // 2025 SS wage cap
  const ficaTax = socialSecurityWage * 0.062; // Employee portion (6.2%)
  const medicareEmployee = inputs.officerSalary * 0.0145; // Employee portion (1.45%)
  const medicareEmployer = inputs.officerSalary * 0.0145; // Employer portion (1.45%)
  const totalFica = ficaTax * 2; // Both employee and employer portions for S-Corp owner
  const totalMedicare = (medicareEmployee + medicareEmployer) + 
    (inputs.officerSalary > 200000 ? (inputs.officerSalary - 200000) * 0.009 : 0); // Additional Medicare tax
  
  // Federal personal income tax calculation (simplified)
  const totalPersonalIncome = inputs.officerSalary + passThrough;
  const adjustedGrossIncome = totalPersonalIncome - inputs.personalDeductions;
  
  // 2025 tax brackets (simplified calculation)
  let personalFederalTax = 0;
  const brackets = [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 }
  ];
  
  let remainingIncome = Math.max(0, adjustedGrossIncome);
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    const taxableInThisBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    personalFederalTax += taxableInThisBracket * bracket.rate;
    remainingIncome -= taxableInThisBracket;
  }
  
  // Self-employment tax on pass-through income (if applicable)
  const selfEmploymentTax = passThrough > 0 ? passThrough * 0.9235 * 0.153 * 0.5 : 0; // Simplified SE tax
  
  // California state taxes (simplified)
  const caStateTax = Math.max(0, adjustedGrossIncome - 25000) * 0.093; // Simplified CA tax rate
  const caCorporateTax = netProfitLoss > 0 ? Math.max(800, netProfitLoss * 0.015) : 800; // CA S-Corp franchise tax (1.5%, min $800)
  
  return {
    scorp: {
      netProfitLoss,
      corporateTax: 0, // S-Corp pass-through
      passThrough,
    },
    personal: {
      salaryTax: personalFederalTax,
      passThroughTax: selfEmploymentTax,
      totalPersonalTax: personalFederalTax + selfEmploymentTax,
      fica: totalFica,
      medicare: totalMedicare,
    },
    state: {
      corporateTax: caCorporateTax,
      personalTax: caStateTax,
      totalStateTax: caCorporateTax + caStateTax,
    },
    summary: {
      totalFederal: personalFederalTax + selfEmploymentTax + totalFica + totalMedicare,
      totalState: caCorporateTax + caStateTax,
      totalCombined: personalFederalTax + selfEmploymentTax + totalFica + totalMedicare + caCorporateTax + caStateTax,
      effectiveRate: totalPersonalIncome > 0 ? 
        ((personalFederalTax + selfEmploymentTax + totalFica + totalMedicare + caCorporateTax + caStateTax) / totalPersonalIncome) * 100 : 0,
    },
  };
}

export default function TaxEstimator({ data }: TaxEstimatorProps) {
  // Pre-populated with actual 2025 Josh Levy Labs S-Corp numbers (from QuickBooks P&L)
  const [inputs, setInputs] = useState<SCORPInputs>({
    grossRevenue: 210300, // 2025 QB actual: $210,299.64
    officerSalary: 63333, // 2025 W-2 actual: $63,333.40
    businessExpenses: 38061, // 2025 QB actual: total expenses $107,090 - payroll $69,029
    depreciation: 0, // Included in business expenses above
    businessDeductions: 440, // 2025 QB actual: COGS (contractors)
    personalDeductions: 50463, // 2025 itemized: mortgage $40,463 + SALT cap $10,000
  });
  
  const [calculation, setCalculation] = useState<TaxCalculation | null>(null);
  const [accountantEstimate, setAccountantEstimate] = useState<string>("");
  
  useEffect(() => {
    setCalculation(calculateSCorpTaxes(inputs));
  }, [inputs]);
  
  const updateInput = (field: keyof SCORPInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };
  
  // Find accountant's estimate from data
  const currentYear = new Date().getFullYear();
  const accountantEstimateFromHistory = data.history.find(h => h.year === currentYear)?.accountant_estimate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <Calculator className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-slate-100">S-Corp Tax Calculator</h2>
        </div>
        <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-blue-300 font-medium mb-1">2025 Tax Year Estimates</p>
            <p className="text-sm text-blue-200">
              This calculator provides estimates based on current tax brackets and rates. 
              Consult with your accountant for precise calculations and tax planning strategies.
            </p>
          </div>
        </div>
      </div>
      
      {/* Input Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-primary-400" />
            Business Income & Expenses
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Gross Revenue
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  value={inputs.grossRevenue}
                  onChange={(e) => updateInput('grossRevenue', Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600/30 rounded-lg text-slate-100 focus:border-primary-400 focus:outline-none"
                  placeholder="500000"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Officer Salary (from Gusto)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  value={inputs.officerSalary}
                  onChange={(e) => updateInput('officerSalary', Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600/30 rounded-lg text-slate-100 focus:border-primary-400 focus:outline-none"
                  placeholder="120000"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Biweekly AutoPilot payroll</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Business Expenses
              </label>
              <div className="relative">
                <Receipt className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  value={inputs.businessExpenses}
                  onChange={(e) => updateInput('businessExpenses', Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600/30 rounded-lg text-slate-100 focus:border-primary-400 focus:outline-none"
                  placeholder="350000"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Depreciation
              </label>
              <div className="relative">
                <TrendingUp className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  value={inputs.depreciation}
                  onChange={(e) => updateInput('depreciation', Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600/30 rounded-lg text-slate-100 focus:border-primary-400 focus:outline-none"
                  placeholder="10000"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Business Deductions
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  value={inputs.businessDeductions}
                  onChange={(e) => updateInput('businessDeductions', Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600/30 rounded-lg text-slate-100 focus:border-primary-400 focus:outline-none"
                  placeholder="15000"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-400" />
            Personal Deductions
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Standard/Itemized Deductions
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
              <input
                type="number"
                value={inputs.personalDeductions}
                onChange={(e) => updateInput('personalDeductions', Number(e.target.value))}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600/30 rounded-lg text-slate-100 focus:border-primary-400 focus:outline-none"
                placeholder="29200"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">2025 standard deduction: $29,200 (MFJ)</p>
          </div>
          
          {/* What-if Scenarios */}
          <div className="mt-6">
            <h4 className="text-md font-medium text-slate-200 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Quick Scenarios
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => updateInput('grossRevenue', inputs.grossRevenue + 50000)}
                className="w-full text-left px-3 py-2 bg-slate-900/30 hover:bg-slate-700/30 rounded-lg text-sm transition-colors"
              >
                <span className="text-emerald-400">+$50K revenue</span>
                <span className="text-slate-500 ml-2">→ What if I make $50K more?</span>
              </button>
              <button
                onClick={() => updateInput('businessExpenses', inputs.businessExpenses + 25000)}
                className="w-full text-left px-3 py-2 bg-slate-900/30 hover:bg-slate-700/30 rounded-lg text-sm transition-colors"
              >
                <span className="text-amber-400">+$25K expenses</span>
                <span className="text-slate-500 ml-2">→ What if I spend more on business?</span>
              </button>
              <button
                onClick={() => updateInput('officerSalary', Math.min(inputs.officerSalary + 20000, 200000))}
                className="w-full text-left px-3 py-2 bg-slate-900/30 hover:bg-slate-700/30 rounded-lg text-sm transition-colors"
              >
                <span className="text-blue-400">+$20K salary</span>
                <span className="text-slate-500 ml-2">→ What if I increase my salary?</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tax Calculation Results */}
      {calculation && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary-400" />
            Estimated Tax Calculation
          </h3>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-500 mb-1">Net Business Profit</p>
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(calculation.scorp.netProfitLoss)}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-500 mb-1">Total Federal Tax</p>
              <p className="text-xl font-bold text-red-400">
                {formatCurrency(calculation.summary.totalFederal)}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-500 mb-1">Total CA State Tax</p>
              <p className="text-xl font-bold text-red-400">
                {formatCurrency(calculation.summary.totalState)}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-500 mb-1">Effective Tax Rate</p>
              <p className="text-xl font-bold text-slate-100">
                {calculation.summary.effectiveRate.toFixed(1)}%
              </p>
            </div>
          </div>
          
          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-900/30 rounded-lg p-4">
              <h4 className="font-medium text-slate-200 mb-3">Federal Taxes</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Income Tax</span>
                  <span className="text-slate-300">{formatCurrency(calculation.personal.salaryTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Self-Employment</span>
                  <span className="text-slate-300">{formatCurrency(calculation.personal.passThroughTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">FICA</span>
                  <span className="text-slate-300">{formatCurrency(calculation.personal.fica)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Medicare</span>
                  <span className="text-slate-300">{formatCurrency(calculation.personal.medicare)}</span>
                </div>
                <div className="border-t border-slate-600 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-200">Total Federal</span>
                    <span className="text-red-400">{formatCurrency(calculation.summary.totalFederal)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900/30 rounded-lg p-4">
              <h4 className="font-medium text-slate-200 mb-3">California Taxes</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Personal Income</span>
                  <span className="text-slate-300">{formatCurrency(calculation.state.personalTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Corporate/LLC Fee</span>
                  <span className="text-slate-300">{formatCurrency(calculation.state.corporateTax)}</span>
                </div>
                <div className="border-t border-slate-600 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-200">Total State</span>
                    <span className="text-red-400">{formatCurrency(calculation.summary.totalState)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900/30 rounded-lg p-4">
              <h4 className="font-medium text-slate-200 mb-3">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Income</span>
                  <span className="text-slate-300">{formatCurrency(inputs.grossRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Business Profit</span>
                  <span className="text-slate-300">{formatCurrency(calculation.scorp.netProfitLoss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Taxes</span>
                  <span className="text-red-400">{formatCurrency(calculation.summary.totalCombined)}</span>
                </div>
                <div className="border-t border-slate-600 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-200">After-Tax Income</span>
                    <span className="text-emerald-400">
                      {formatCurrency((inputs.officerSalary + calculation.scorp.netProfitLoss) - calculation.summary.totalCombined)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Compare with Accountant */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-400" />
          Compare with Accountant
        </h3>
        
        {accountantEstimateFromHistory ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/30 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-500 mb-1">Your Estimate</p>
              <p className="text-xl font-bold text-slate-100">
                {calculation ? formatCurrency(calculation.summary.totalCombined) : "—"}
              </p>
            </div>
            <div className="bg-slate-900/30 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-500 mb-1">Accountant's Estimate</p>
              <p className="text-xl font-bold text-primary-400">
                {formatCurrency(accountantEstimateFromHistory)}
              </p>
            </div>
            <div className="bg-slate-900/30 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-500 mb-1">Difference</p>
              <p className={`text-xl font-bold ${
                calculation && Math.abs(calculation.summary.totalCombined - accountantEstimateFromHistory) < 1000
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}>
                {calculation 
                  ? formatCurrency(Math.abs(calculation.summary.totalCombined - accountantEstimateFromHistory))
                  : "—"
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/30 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Enter Nick's estimate for comparison
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={accountantEstimate}
                onChange={(e) => setAccountantEstimate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600/30 rounded-lg text-slate-100 focus:border-primary-400 focus:outline-none"
                placeholder="Enter accountant's total tax estimate"
              />
            </div>
            {accountantEstimate && calculation && (
              <div className="mt-3 flex items-center gap-4">
                <span className="text-sm text-slate-400">Your estimate: {formatCurrency(calculation.summary.totalCombined)}</span>
                <span className="text-sm text-slate-400">Difference: {formatCurrency(Math.abs(calculation.summary.totalCombined - parseFloat(accountantEstimate) || 0))}</span>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <p className="text-amber-300 font-medium mb-1">Professional Advice Recommended</p>
            <p className="text-sm text-amber-200">
              This calculator provides estimates only. Schedule a consultation with Nick Jackson 
              for accurate tax planning, quarterly payment calculations, and optimization strategies.
            </p>
          </div>
        </div>
      </div>

      {/* Pay Now — Direct Payment Links */}
      {calculation && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-100">Pay Your Taxes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Federal — IRS Direct Pay */}
            <a
              href="https://directpay.irs.gov/directpay/payment?execution=e1s1"
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-gradient-to-br from-blue-900/40 to-blue-800/20 hover:from-blue-900/60 hover:to-blue-800/40 rounded-xl p-5 border border-blue-500/30 hover:border-blue-400/50 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">Federal — IRS</span>
                <ExternalLink className="w-4 h-4 text-blue-500 group-hover:text-blue-300 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-blue-300 mb-1">
                {calculation.summary.totalFederal > (inputs.officerSalary > 0 ? 25958.70 : 0)
                  ? formatCurrency(calculation.summary.totalFederal - 25958.70)
                  : "Refund"}
              </p>
              <p className="text-sm text-blue-400/80 mb-3">
                {calculation.summary.totalFederal > 25958.70 ? "Estimated amount owed" : "No payment needed — refund expected"}
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-blue-300 group-hover:text-blue-200">
                <span>IRS Direct Pay</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* California Personal — FTB Web Pay */}
            <a
              href="https://webapp.ftb.ca.gov/webpay/"
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-gradient-to-br from-amber-900/40 to-amber-800/20 hover:from-amber-900/60 hover:to-amber-800/40 rounded-xl p-5 border border-amber-500/30 hover:border-amber-400/50 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">California — Personal</span>
                <ExternalLink className="w-4 h-4 text-amber-500 group-hover:text-amber-300 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-amber-300 mb-1">
                {formatCurrency(Math.max(0, calculation.state.personalTax - 11200.90))}
              </p>
              <p className="text-sm text-amber-400/80 mb-3">
                Estimated CA personal tax owed
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-amber-300 group-hover:text-amber-200">
                <span>FTB Web Pay (Form 540)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* California S-Corp Franchise Tax — FTB Web Pay */}
            <a
              href="https://webapp.ftb.ca.gov/webpay/"
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-gradient-to-br from-purple-900/40 to-purple-800/20 hover:from-purple-900/60 hover:to-purple-800/40 rounded-xl p-5 border border-purple-500/30 hover:border-purple-400/50 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">California — S-Corp</span>
                <ExternalLink className="w-4 h-4 text-purple-500 group-hover:text-purple-300 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-purple-300 mb-1">
                {formatCurrency(calculation.state.corporateTax)}
              </p>
              <p className="text-sm text-purple-400/80 mb-3">
                1.5% franchise tax (min $800)
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-purple-300 group-hover:text-purple-200">
                <span>FTB Web Pay (Form 100S)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="https://www.irs.gov/payments/pay-with-your-bank-account"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-slate-900/30 hover:bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-all group"
            >
              <CreditCard className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-300 group-hover:text-slate-100">IRS Pay by Bank Account</p>
                <p className="text-xs text-slate-500">Free, same-day payment via bank account</p>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-600" />
            </a>
            <a
              href="https://www.irs.gov/payments/pay-your-taxes-by-debit-or-credit-card"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-slate-900/30 hover:bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-all group"
            >
              <CreditCard className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-300 group-hover:text-slate-100">IRS Pay by Card</p>
                <p className="text-xs text-slate-500">Debit/credit card (processing fee applies)</p>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-600" />
            </a>
            <a
              href="https://eftps.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-slate-900/30 hover:bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-all group"
            >
              <Building className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-300 group-hover:text-slate-100">EFTPS (Business Payments)</p>
                <p className="text-xs text-slate-500">Electronic Federal Tax Payment System for S-Corp</p>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-600" />
            </a>
            <a
              href="https://www.ftb.ca.gov/pay/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-slate-900/30 hover:bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-all group"
            >
              <Building className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-300 group-hover:text-slate-100">CA FTB All Payment Options</p>
                <p className="text-xs text-slate-500">All California payment methods and vouchers</p>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-600" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}