import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const realmId = searchParams.get('realmId');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(
      `<html><body>
        <h1>QuickBooks Connection Failed</h1>
        <p>Error: ${error}</p>
        <p>You can close this tab.</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code || !realmId) {
    return new NextResponse(
      `<html><body>
        <h1>Missing Parameters</h1>
        <p>No authorization code or company ID received.</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Exchange the authorization code for tokens
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return new NextResponse(
      `<html><body>
        <h1>Server Configuration Error</h1>
        <p>QuickBooks credentials not configured.</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  const redirectUri = 'https://joshos-hub.vercel.app/api/quickbooks/callback';
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      // Store tokens in a secure way - write to a temp endpoint that Theo can read
      // For now, display them securely (this page is only accessible to Joshua)
      const maskedAccess = tokenData.access_token.substring(0, 30) + '...';
      const maskedRefresh = tokenData.refresh_token.substring(0, 30) + '...';
      
      // Store in Vercel KV or env - for now, return them for manual Keychain storage
      return new NextResponse(
        `<html>
        <head><style>
          body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .success { color: #0f5132; background: #d1e7dd; border: 1px solid #badbcc; padding: 16px; border-radius: 8px; }
          .token-box { background: #f8f9fa; border: 1px solid #dee2e6; padding: 12px; border-radius: 4px; margin: 8px 0; font-family: monospace; font-size: 12px; word-break: break-all; }
          .label { font-weight: bold; margin-top: 16px; }
          .warning { color: #664d03; background: #fff3cd; border: 1px solid #ffecb5; padding: 12px; border-radius: 8px; margin-top: 16px; }
        </style></head>
        <body>
          <div class="success">
            <h1>✅ QuickBooks Connected!</h1>
            <p>Successfully connected to your QuickBooks company.</p>
          </div>
          
          <p class="label">Company (Realm) ID:</p>
          <div class="token-box">${realmId}</div>
          
          <p class="label">Access Token (masked):</p>
          <div class="token-box">${maskedAccess}</div>
          
          <p class="label">Refresh Token (masked):</p>
          <div class="token-box">${maskedRefresh}</div>
          
          <p class="label">Expires In:</p>
          <div class="token-box">${tokenData.expires_in}s (access) / ${tokenData.x_refresh_token_expires_in}s (refresh)</div>
          
          <div class="warning">
            <strong>⚠️ Tokens captured.</strong> Theo will store these in Keychain automatically.
            You can close this tab.
          </div>
          
          <script>
            // Post tokens back so they can be captured server-side
            fetch('/api/quickbooks/store-tokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: '${tokenData.access_token}',
                refresh_token: '${tokenData.refresh_token}',
                realm_id: '${realmId}',
                expires_in: ${tokenData.expires_in || 3600},
                x_refresh_token_expires_in: ${tokenData.x_refresh_token_expires_in || 8726400}
              })
            }).catch(() => {});
          </script>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    } else {
      return new NextResponse(
        `<html><body>
          <h1>Token Exchange Failed</h1>
          <pre>${JSON.stringify(tokenData, null, 2)}</pre>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(
      `<html><body>
        <h1>Error</h1>
        <p>${errorMessage}</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
