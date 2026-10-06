"use client";

/**
 * ==============================================================================
 * AUTHENTICATION MODAL (LangGPT Auth & Verification)
 * ==============================================================================
 * Seamless multi-provider auth supporting:
 * - Google OAuth
 * - GitHub OAuth
 * - Email & Password with 6-digit OTP delivery
 */

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { X, Mail, Lock, ShieldCheck, ArrowRight, Loader2, RefreshCw, Sparkles } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devModeNotice, setDevModeNotice] = useState(false);

  if (!isOpen) return null;

  // Handle 1-Tap Quick Guest Sign-In (ideal for mobile / local network testing)
  const handleQuickGuestSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: "guest@langgpt.com",
        password: "guest_password_123",
        otp: "DEV_GUEST",
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      onClose();
      window.location.reload();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to sign in as guest.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth provider sign-in
  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setError(null);
    setLoading(true);
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch {
      setError(`Failed to sign in with ${provider}.`);
      setLoading(false);
    }
  };

  // Step 1: Request 6-digit OTP code to email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, isSignUp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch verification code.");
      }

      setSuccessMsg(data.message);
      setDevModeNotice(!!data.devMode);
      if (data.devOtp) {
        setOtp(data.devOtp);
      }
      setStep("otp");
    } catch (err: unknown) {
      setError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit credentials + OTP code to NextAuth
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        otp: otp.trim(),
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Successful sign in
      onClose();
      window.location.reload();
    } catch (err: unknown) {
      setError((err as Error).message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep("credentials");
    setOtp("");
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer touch-manipulation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] text-zinc-900 dark:text-zinc-100 cursor-default"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer touch-manipulation"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Branding Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl mb-3 shadow-md">
            L
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {step === "otp"
              ? "Check your email"
              : isSignUp
              ? "Create your LangGPT account"
              : "Welcome back to LangGPT"}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {step === "otp"
              ? `We sent a 6-digit verification code to ${email}`
              : "Log in or register to persist memory and personalized context"}
          </p>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            {successMsg}
            {devModeNotice && (
              <span className="block mt-1 font-mono text-[11px] opacity-80">
                (Dev mode active: Check terminal console for OTP code)
              </span>
            )}
          </div>
        )}

        {step === "credentials" ? (
          <>
            {/* 1-Tap Quick Guest Sign-In (Instant for Mobile & Dev Testing) */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleQuickGuestSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold transition-all shadow-sm cursor-pointer touch-manipulation"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>1-Tap Instant Guest Login</span>
              </button>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center mt-1.5">
                Recommended for mobile & LAN testing (zero setup required)
              </div>
            </div>

            {/* Visual Divider */}
            <div className="relative flex items-center justify-center my-3.5">
              <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
              <span className="bg-white dark:bg-[#181818] px-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                OR SIGN IN WITH
              </span>
              <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
            </div>

            {/* OAuth Quick Sign-ins */}
            <div className="space-y-2 mb-3">
              <button
                type="button"
                onClick={() => handleOAuthSignIn("google")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors shadow-xs cursor-pointer touch-manipulation"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => handleOAuthSignIn("github")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors shadow-xs cursor-pointer touch-manipulation"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                Continue with GitHub
              </button>

              <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500 text-center leading-tight pt-0.5">
                (Google/GitHub OAuth redirects to localhost desktop. On phone LAN, use Guest or Email.)
              </p>
            </div>

            {/* Visual Divider */}
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
              <span className="bg-white dark:bg-[#181818] px-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                OR EMAIL & PASSWORD
              </span>
              <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
            </div>

            {/* Email + Password Form */}
            <form onSubmit={handleRequestOtp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Sign in vs Sign up */}
            <div className="mt-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setIsSignUp(false);
                      resetState();
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account yet?{" "}
                  <button
                    onClick={() => {
                      setIsSignUp(true);
                      resetState();
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          /* STEP 2: OTP VERIFICATION */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {devModeNotice && otp && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs text-center font-medium animate-in fade-in">
                Dev Mode: Verification code <span className="font-mono font-bold tracking-wider">{otp}</span> has been auto-filled! Tap Verify to continue.
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Enter 6-Digit Code
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-3 w-5 h-5 text-emerald-500" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-10 pr-3 py-2.5 text-center font-mono text-2xl tracking-[0.4em] font-bold bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Verify & Enter LangGPT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={resetState}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                ← Back to email
              </button>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={loading}
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
