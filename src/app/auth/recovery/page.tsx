'use client';

/**
 * Auth Recovery Bridge
 * 
 * Supabase redirects here after email token verification.
 * This page extracts the auth tokens from the URL hash and redirects
 * to the Faith Journey app via deep link.
 * 
 * Flow:
 * 1. User clicks "Reset Password" in email
 * 2. Supabase verifies token, redirects to this page with tokens in URL hash
 * 3. This page redirects to faith-journey://auth/reset-password with tokens
 */

import { useEffect, useState } from 'react';

export default function AuthRecoveryBridge() {
  const [status, setStatus] = useState<'redirecting' | 'fallback'>('redirecting');
  const [deepLink, setDeepLink] = useState('');

  useEffect(() => {
    // Supabase puts tokens in the URL hash fragment
    // e.g., #access_token=...&refresh_token=...&type=recovery
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    // Also check query params (some flows use these)
    const query = window.location.search;
    const queryParams = new URLSearchParams(query);

    // Build the deep link with all auth params
    const authParams = hash || query;
    const appDeepLink = `faith-journey://auth/reset-password${hash ? '#' + hash : ''}${!hash && query ? query : ''}`;
    setDeepLink(appDeepLink);

    // Try to redirect to the app
    window.location.href = appDeepLink;

    // If we're still here after 2 seconds, show fallback UI
    const timer = setTimeout(() => {
      setStatus('fallback');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0e1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
      }}>
        {status === 'redirecting' ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>🧭</div>
            <h1 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
              Opening Faith Journey...
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: '15px', lineHeight: 1.6 }}>
              Redirecting you to the app to reset your password.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>🧭</div>
            <h1 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
              Reset Your Password
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
              If the app didn't open automatically, tap the button below.
            </p>
            <a
              href={deepLink}
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                backgroundColor: '#f59e0b',
                color: '#000000',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '8px',
                textDecoration: 'none',
                letterSpacing: '0.2px',
              }}
            >
              Open Faith Journey
            </a>
            <p style={{ color: '#52525b', fontSize: '13px', marginTop: '24px', lineHeight: 1.5 }}>
              Don't have the app installed?{' '}
              <a href="https://apps.apple.com/app/faith-journey" style={{ color: '#f59e0b', textDecoration: 'none' }}>
                Download it here
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
