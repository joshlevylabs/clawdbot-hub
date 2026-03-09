export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-300 p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-100 mb-6">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: March 9, 2026</p>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Overview</h2>
          <p>JoshOS Hub (&quot;the App&quot;) is a personal business dashboard operated by Josh Levy Labs Inc. This privacy policy describes how we handle data when connecting to third-party services like QuickBooks Online.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Data Collection</h2>
          <p>The App connects to QuickBooks Online via Intuit&apos;s OAuth2 API to retrieve financial data including profit &amp; loss statements, balance sheets, and expense categories. This data is used solely for the account holder&apos;s personal financial management and tax planning.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Data Usage</h2>
          <p>Financial data retrieved from QuickBooks is:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Displayed only to the authenticated account holder</li>
            <li>Used for tax estimation and financial reporting</li>
            <li>Never sold, shared, or disclosed to third parties</li>
            <li>Stored securely with encryption at rest</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Data Storage</h2>
          <p>Access tokens and credentials are stored using encrypted keychain storage. Financial data is cached locally and protected by multi-factor authentication (TOTP).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Third-Party Services</h2>
          <p>The App integrates with Intuit QuickBooks Online. Your use of QuickBooks is subject to Intuit&apos;s own privacy policy and terms of service.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Data Deletion</h2>
          <p>You may disconnect the QuickBooks integration at any time, which will revoke API access and delete cached financial data. Contact josh@joshlevylabs.com for any data deletion requests.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Contact</h2>
          <p>Josh Levy Labs Inc<br />Temecula, CA<br />josh@joshlevylabs.com</p>
        </section>
      </div>
    </div>
  );
}
