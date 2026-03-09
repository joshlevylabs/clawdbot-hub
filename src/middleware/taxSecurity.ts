import { NextRequest, NextResponse } from 'next/server';

const TAX_SESSION_HEADER = 'x-tax-session-token';
const TAX_SESSION_EXPIRY_HEADER = 'x-tax-session-expiry';

export interface TaxSecurityContext {
  userId: string;
  sessionToken: string;
  isValid: boolean;
}

/**
 * Middleware to verify tax session tokens for sensitive tax API endpoints
 */
export async function verifyTaxSession(request: NextRequest): Promise<TaxSecurityContext | null> {
  const sessionToken = request.headers.get(TAX_SESSION_HEADER);
  const sessionExpiry = request.headers.get(TAX_SESSION_EXPIRY_HEADER);
  
  if (!sessionToken || !sessionExpiry) {
    return null;
  }
  
  // Verify session is not expired
  const expiryTime = parseInt(sessionExpiry);
  const now = Date.now();
  
  if (now >= expiryTime) {
    return null;
  }
  
  // Extract user ID from session token (in production, verify signature)
  const tokenParts = sessionToken.split('_');
  if (tokenParts.length < 3) {
    return null;
  }
  
  // In production, verify token signature and lookup in database
  // For now, extract user ID from localStorage key format
  const userId = request.headers.get('x-user-id') || 'demo-user';
  
  return {
    userId,
    sessionToken,
    isValid: true,
  };
}

/**
 * Create a tax-protected API response with security headers
 */
export function createTaxApiResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Add security headers to prevent caching of sensitive data
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  
  return response;
}

/**
 * Create an unauthorized response for failed tax session verification
 */
export function createUnauthorizedTaxResponse(message: string = 'Tax session required'): NextResponse {
  return createTaxApiResponse({
    error: 'UNAUTHORIZED',
    message,
    code: 'TAX_SESSION_REQUIRED',
  }, 403);
}

/**
 * Higher-order function to protect tax API routes
 */
export function withTaxSecurity(
  handler: (request: NextRequest, context: TaxSecurityContext) => Promise<NextResponse>
) {
  return async function protectedHandler(request: NextRequest): Promise<NextResponse> {
    // Verify tax session
    const securityContext = await verifyTaxSession(request);
    
    if (!securityContext) {
      return createUnauthorizedTaxResponse();
    }
    
    // Add user context to request for the handler
    const requestWithContext = new Request(request.url, {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.body,
    });
    
    try {
      return await handler(requestWithContext as NextRequest, securityContext);
    } catch (error) {
      console.error('Tax API error:', error);
      
      return createTaxApiResponse({
        error: 'INTERNAL_ERROR',
        message: 'An error occurred processing your request',
      }, 500);
    }
  };
}

/**
 * Rate limiting for tax operations (simple in-memory implementation)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 50; // 50 requests per window

export function checkTaxRateLimit(userId: string): { allowed: boolean; resetTime: number } {
  const now = Date.now();
  const key = `tax_rate_limit:${userId}`;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false, resetTime: current.resetTime };
  }
  
  // Increment counter
  rateLimitStore.set(key, { ...current, count: current.count + 1 });
  return { allowed: true, resetTime: current.resetTime };
}

/**
 * Clean up expired rate limit entries
 */
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes