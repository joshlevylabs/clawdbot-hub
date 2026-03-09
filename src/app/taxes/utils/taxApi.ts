/**
 * Secure API client for tax-related requests
 * Includes session token validation and security headers
 */

const TAX_SESSION_KEY = 'tax_session_token';
const TAX_SESSION_EXPIRY_KEY = 'tax_session_expiry';

interface TaxApiOptions extends RequestInit {
  skipAuth?: boolean;
}

interface TaxApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  success: boolean;
}

/**
 * Get the current tax session token and expiry
 */
function getTaxSession(): { token: string | null; expiry: string | null; isValid: boolean } {
  if (typeof window === 'undefined') {
    return { token: null, expiry: null, isValid: false };
  }
  
  const token = sessionStorage.getItem(TAX_SESSION_KEY);
  const expiry = sessionStorage.getItem(TAX_SESSION_EXPIRY_KEY);
  
  if (!token || !expiry) {
    return { token: null, expiry: null, isValid: false };
  }
  
  const isValid = parseInt(expiry) > Date.now();
  
  return { token, expiry, isValid };
}

/**
 * Create headers with tax session authentication
 */
function createTaxHeaders(options: TaxApiOptions = {}): Headers {
  const headers = new Headers(options.headers);
  
  // Add standard security headers
  headers.set('X-Requested-With', 'XMLHttpRequest');
  headers.set('Content-Type', 'application/json');
  
  // Add tax session authentication headers
  if (!options.skipAuth) {
    const session = getTaxSession();
    
    if (!session.isValid) {
      throw new Error('TAX_SESSION_EXPIRED');
    }
    
    headers.set('x-tax-session-token', session.token!);
    headers.set('x-tax-session-expiry', session.expiry!);
    
    // Add user ID (in production, this would be from auth context)
    const userId = localStorage.getItem('tax-user-id') || 'demo-user';
    headers.set('x-user-id', userId);
  }
  
  return headers;
}

/**
 * Make a secure API request to tax endpoints
 */
export async function taxApiRequest<T = any>(
  url: string,
  options: TaxApiOptions = {}
): Promise<TaxApiResponse<T>> {
  try {
    const headers = createTaxHeaders(options);
    
    const response = await fetch(url, {
      ...options,
      headers,
      // Ensure credentials are included for authentication
      credentials: 'same-origin',
    });
    
    // Handle different response types
    if (response.status === 403) {
      return {
        success: false,
        error: {
          code: 'TAX_SESSION_REQUIRED',
          message: 'Tax session expired or invalid. Please re-authenticate.',
        },
      };
    }
    
    if (response.status === 429) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait before trying again.',
        },
      };
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: errorData.code || 'API_ERROR',
          message: errorData.message || `Request failed with status ${response.status}`,
        },
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Tax API request failed:', error);
    
    if (error instanceof Error && error.message === 'TAX_SESSION_EXPIRED') {
      return {
        success: false,
        error: {
          code: 'TAX_SESSION_EXPIRED',
          message: 'Tax session has expired. Please re-authenticate.',
        },
      };
    }
    
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network request failed. Please check your connection.',
      },
    };
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const taxApi = {
  /**
   * GET request to tax API
   */
  get: <T = any>(url: string, options?: TaxApiOptions): Promise<TaxApiResponse<T>> => {
    return taxApiRequest<T>(url, { ...options, method: 'GET' });
  },
  
  /**
   * POST request to tax API
   */
  post: <T = any>(url: string, data?: any, options?: TaxApiOptions): Promise<TaxApiResponse<T>> => {
    return taxApiRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  /**
   * PUT request to tax API
   */
  put: <T = any>(url: string, data?: any, options?: TaxApiOptions): Promise<TaxApiResponse<T>> => {
    return taxApiRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  /**
   * DELETE request to tax API
   */
  delete: <T = any>(url: string, options?: TaxApiOptions): Promise<TaxApiResponse<T>> => {
    return taxApiRequest<T>(url, { ...options, method: 'DELETE' });
  },
};

/**
 * Hook for using tax API in React components
 */
export function useTaxApi() {
  const checkSession = (): boolean => {
    const session = getTaxSession();
    return session.isValid;
  };
  
  return {
    ...taxApi,
    checkSession,
    isSessionValid: checkSession(),
  };
}

/**
 * Error handler for tax API responses
 */
export function handleTaxApiError(response: TaxApiResponse): void {
  if (!response.success && response.error) {
    switch (response.error.code) {
      case 'TAX_SESSION_EXPIRED':
      case 'TAX_SESSION_REQUIRED':
        // Redirect to PIN gate or show re-authentication modal
        window.location.reload();
        break;
        
      case 'RATE_LIMITED':
        alert('Too many requests. Please wait before trying again.');
        break;
        
      default:
        console.error('Tax API Error:', response.error);
        alert(`Error: ${response.error.message}`);
    }
  }
}