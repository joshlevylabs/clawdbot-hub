export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-300 p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-100 mb-6">End-User License Agreement</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: March 9, 2026</p>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Agreement</h2>
          <p>This End-User License Agreement (&quot;EULA&quot;) governs your use of JoshOS Hub (&quot;the App&quot;), a personal business management dashboard operated by Josh Levy Labs Inc.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">License Grant</h2>
          <p>Josh Levy Labs Inc grants you a limited, non-exclusive, non-transferable license to use the App for personal business management purposes, including connecting to third-party financial services such as QuickBooks Online.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">QuickBooks Integration</h2>
          <p>The App connects to QuickBooks Online via Intuit&apos;s official API to retrieve your financial data. By connecting your QuickBooks account, you authorize the App to access your accounting data for display and analysis within the App. You may revoke this access at any time through the App settings or your Intuit account.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Data Handling</h2>
          <p>Your financial data is handled in accordance with our Privacy Policy. We do not sell, share, or distribute your data to any third parties. All data access is limited to the authenticated account holder.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Disclaimer</h2>
          <p>The App provides financial summaries and tax estimates for informational purposes only. It does not constitute tax advice, financial advice, or accounting services. Consult a qualified tax professional for tax filing and planning decisions.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Limitation of Liability</h2>
          <p>The App is provided &quot;as is&quot; without warranty of any kind. Josh Levy Labs Inc shall not be liable for any damages arising from the use of the App or reliance on information displayed within it.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Termination</h2>
          <p>This agreement is effective until terminated. You may terminate by discontinuing use and disconnecting any linked accounts. Josh Levy Labs Inc may terminate access at any time.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Contact</h2>
          <p>Josh Levy Labs Inc<br />Temecula, CA<br />josh@joshlevylabs.com</p>
        </section>
      </div>
    </div>
  );
}
