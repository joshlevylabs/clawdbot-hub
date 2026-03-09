"use client";

import { useState, useEffect, useRef } from "react";
import {
  Lock,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader,
  KeyRound,
  Timer,
} from "lucide-react";

interface TaxPinGateProps {
  onAuthenticated: () => void;
  onLocked: () => void;
  isAuthenticated: boolean;
}

interface PinSetupState {
  step: "check" | "setup" | "confirm" | "authenticate";
  pin: string;
  confirmPin: string;
  isLoading: boolean;
  error: string | null;
  attempts: number;
  isLocked: boolean;
  lockUntil: Date | null;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Generate random user ID for demo (in production, use actual auth user)
const getUserId = () => {
  let userId = localStorage.getItem('tax-user-id');
  if (!userId) {
    userId = `tax-user-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('tax-user-id', userId);
  }
  return userId;
};

// Simple hash function for demo (use bcrypt in production)
const hashPin = (pin: string): string => {
  // In production, use bcrypt.hash(pin, 12)
  const salt = 'tax_salt_2025';
  return btoa(`${salt}:${pin}:${salt}`);
};

const verifyPin = (pin: string, hash: string): boolean => {
  // In production, use bcrypt.compare(pin, hash)
  return hashPin(pin) === hash;
};

// Mock API calls (replace with actual Supabase calls)
const taxSecurityApi = {
  async checkPinExists(userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const settings = localStorage.getItem(`tax_pin_${userId}`);
    return !!settings;
  },

  async createPin(userId: string, pin: string): Promise<{ success: boolean; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const hash = hashPin(pin);
      const settings = {
        pinHash: hash,
        createdAt: new Date().toISOString(),
        failedAttempts: 0,
        lockedUntil: null,
      };
      
      localStorage.setItem(`tax_pin_${userId}`, JSON.stringify(settings));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to create PIN" };
    }
  },

  async verifyPin(userId: string, pin: string): Promise<{ 
    success: boolean; 
    error?: string; 
    attempts?: number;
    lockedUntil?: Date | null;
  }> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const settingsStr = localStorage.getItem(`tax_pin_${userId}`);
    if (!settingsStr) {
      return { success: false, error: "PIN not found" };
    }
    
    const settings = JSON.parse(settingsStr);
    
    // Check if locked
    if (settings.lockedUntil && new Date(settings.lockedUntil) > new Date()) {
      return { 
        success: false, 
        error: "Account temporarily locked", 
        lockedUntil: new Date(settings.lockedUntil) 
      };
    }
    
    // Verify PIN
    const isValid = verifyPin(pin, settings.pinHash);
    
    if (isValid) {
      // Reset failed attempts
      settings.failedAttempts = 0;
      settings.lockedUntil = null;
      localStorage.setItem(`tax_pin_${userId}`, JSON.stringify(settings));
      return { success: true };
    } else {
      // Increment failed attempts
      settings.failedAttempts = (settings.failedAttempts || 0) + 1;
      
      if (settings.failedAttempts >= MAX_ATTEMPTS) {
        settings.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      }
      
      localStorage.setItem(`tax_pin_${userId}`, JSON.stringify(settings));
      
      return { 
        success: false, 
        error: "Invalid PIN", 
        attempts: settings.failedAttempts,
        lockedUntil: settings.lockedUntil ? new Date(settings.lockedUntil) : null
      };
    }
  },
};

function PinInput({ 
  value, 
  onChange, 
  onEnter,
  maxLength = 6,
  masked = false,
  disabled = false 
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  maxLength?: number;
  masked?: boolean;
  disabled?: boolean;
}) {
  const inputRefs = useRef<HTMLInputElement[]>([]);
  
  const handleChange = (index: number, digit: string) => {
    if (disabled) return;
    
    if (digit.length <= 1 && /^\d*$/.test(digit)) {
      const newValue = value.split('');
      newValue[index] = digit;
      const result = newValue.join('').slice(0, maxLength);
      onChange(result);
      
      // Auto-focus next input
      if (digit && index < maxLength - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      
      // Auto-submit when complete
      if (result.length === maxLength && onEnter) {
        onEnter();
      }
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter' && onEnter) {
      onEnter();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, maxLength);
    onChange(paste);
    
    if (paste.length === maxLength && onEnter) {
      setTimeout(onEnter, 100);
    }
  };
  
  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length: maxLength }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            if (el) inputRefs.current[index] = el;
          }}
          type={masked ? "password" : "text"}
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-12 h-12 text-center text-xl font-bold bg-slate-900/50 border-2 border-slate-600/30 rounded-xl focus:border-primary-400 focus:outline-none disabled:opacity-50 transition-colors"
          style={{ color: "#F5F5F0" }}
        />
      ))}
    </div>
  );
}

export default function TaxPinGate({ onAuthenticated, onLocked, isAuthenticated }: TaxPinGateProps) {
  const [state, setState] = useState<PinSetupState>({
    step: "check",
    pin: "",
    confirmPin: "",
    isLoading: true,
    error: null,
    attempts: 0,
    isLocked: false,
    lockUntil: null,
  });
  
  const [showPin, setShowPin] = useState(false);
  const userId = getUserId();
  
  // Check if PIN exists on mount
  useEffect(() => {
    checkPinStatus();
  }, [userId]); // Include userId as dependency
  
  const checkPinStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const pinExists = await taxSecurityApi.checkPinExists(userId);
      
      setState(prev => ({
        ...prev,
        step: pinExists ? "authenticate" : "setup",
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "Failed to check PIN status",
      }));
    }
  };
  
  const handleCreatePin = async () => {
    if (state.pin.length < 4) {
      setState(prev => ({ ...prev, error: "PIN must be at least 4 digits" }));
      return;
    }
    
    if (state.step === "setup") {
      setState(prev => ({ ...prev, step: "confirm", error: null }));
      return;
    }
    
    if (state.step === "confirm") {
      if (state.pin !== state.confirmPin) {
        setState(prev => ({ 
          ...prev, 
          error: "PINs don't match",
          confirmPin: "",
        }));
        return;
      }
      
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const result = await taxSecurityApi.createPin(userId, state.pin);
        
        if (result.success) {
          onAuthenticated();
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: result.error || "Failed to create PIN",
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: "Failed to create PIN",
        }));
      }
    }
  };
  
  const handleVerifyPin = async () => {
    if (state.pin.length < 4) {
      setState(prev => ({ ...prev, error: "Please enter your PIN" }));
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await taxSecurityApi.verifyPin(userId, state.pin);
      
      if (result.success) {
        onAuthenticated();
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || "Authentication failed",
          attempts: result.attempts || 0,
          isLocked: !!result.lockedUntil,
          lockUntil: result.lockedUntil || null,
          pin: "",
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "Authentication failed",
        pin: "",
      }));
    }
  };
  
  const resetSetup = () => {
    setState(prev => ({
      ...prev,
      step: "setup",
      pin: "",
      confirmPin: "",
      error: null,
    }));
  };
  
  if (state.isLoading && state.step === "check") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Checking security settings...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="p-4 bg-primary-900/30 rounded-xl w-fit mx-auto mb-4">
              {state.isLocked ? (
                <Lock className="w-8 h-8 text-red-400" />
              ) : (
                <Shield className="w-8 h-8 text-primary-400" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mb-2">
              Tax Data Security
            </h1>
            <p className="text-slate-400">
              {state.step === "setup" ? "Set up your security PIN" :
               state.step === "confirm" ? "Confirm your PIN" :
               state.isLocked ? "Account temporarily locked" :
               "Enter your PIN to access tax data"}
            </p>
          </div>
          
          {/* Lockout Notice */}
          {state.isLocked && state.lockUntil && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium mb-1">Too many failed attempts</p>
                  <p className="text-sm text-red-200">
                    Account locked until {state.lockUntil.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Display */}
          {state.error && !state.isLocked && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-red-300 text-sm">{state.error}</p>
            </div>
          )}
          
          {/* PIN Input */}
          {!state.isLocked && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  {state.step === "setup" ? "Create a 4-6 digit PIN" :
                   state.step === "confirm" ? "Confirm your PIN" :
                   "Enter your PIN"}
                </label>
                <PinInput
                  value={state.step === "confirm" ? state.confirmPin : state.pin}
                  onChange={(value) => {
                    if (state.step === "confirm") {
                      setState(prev => ({ ...prev, confirmPin: value, error: null }));
                    } else {
                      setState(prev => ({ ...prev, pin: value, error: null }));
                    }
                  }}
                  onEnter={state.step === "authenticate" ? handleVerifyPin : handleCreatePin}
                  maxLength={6}
                  masked={!showPin && state.step === "authenticate"}
                  disabled={state.isLoading}
                />
                
                {state.step === "authenticate" && (
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="mt-3 flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mx-auto"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPin ? "Hide" : "Show"} PIN
                  </button>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={state.step === "authenticate" ? handleVerifyPin : handleCreatePin}
                  disabled={state.isLoading || (state.step === "confirm" ? state.confirmPin : state.pin).length < 4}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors font-medium"
                >
                  {state.isLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : state.step === "authenticate" ? (
                    <KeyRound className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {state.isLoading ? "Please wait..." :
                   state.step === "setup" ? "Set PIN" :
                   state.step === "confirm" ? "Create PIN" :
                   "Unlock"}
                </button>
                
                {state.step === "confirm" && (
                  <button
                    onClick={resetSetup}
                    className="w-full px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    Back to setup
                  </button>
                )}
              </div>
            </>
          )}
          
          {/* Attempt Counter */}
          {state.step === "authenticate" && state.attempts > 0 && !state.isLocked && (
            <div className="mt-4 text-center">
              <p className="text-sm text-amber-400">
                Failed attempts: {state.attempts}/{MAX_ATTEMPTS}
              </p>
            </div>
          )}
          
          {/* Security Notice */}
          <div className="mt-6 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Timer className="w-4 h-4 text-blue-400 mt-0.5" />
              <div>
                <p className="text-blue-300 text-sm font-medium mb-1">Security Notice</p>
                <p className="text-blue-200 text-xs">
                  Your session will automatically lock after 30 minutes of inactivity. 
                  This page contains sensitive financial information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}