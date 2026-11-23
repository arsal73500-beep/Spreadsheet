"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  Table2,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/");
    }
  }, [status, session, router]);

  // Check for NextAuth error query param
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      if (error === "OAuthSignin" || error === "OAuthCallback") {
        setErrorMsg(
          "Google OAuth is not configured on this environment. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in your environment / Vercel."
        );
      } else if (error === "AccessDenied") {
        setErrorMsg("Access was denied. Please use an authorized account.");
      } else if (error === "CredentialsSignin") {
        setErrorMsg("Invalid email or password. Please verify your credentials.");
      } else {
        setErrorMsg(`Authentication error: ${error}`);
      }
    }
  }, [searchParams]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: "/",
      });

      if (res?.error) {
        setErrorMsg("Authentication failed. Please verify credentials.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during sign-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (err: any) {
      setErrorMsg(err.message || "Could not initialize Google authentication.");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f9fa]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f9fa] p-4 text-xs select-none">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Top Header */}
        <div className="p-6 text-center border-b border-gray-100 bg-gradient-to-b from-emerald-50/50 to-white">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Table2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Sign in to Backlink Manager
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Google Sheets-style collaborative workspace with GitHub persistence
          </p>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Real Google OAuth Login */}
          <div>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2.5 font-medium text-gray-700 transition shadow-sm hover:border-gray-400"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>Continue with Google</span>
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              Authorized Google accounts receive Admin privileges via <code className="bg-gray-100 px-1 py-0.5 rounded">ADMIN_EMAILS</code> allowlist.
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-3 text-gray-400 text-[11px] uppercase tracking-wider font-semibold">
              Or sign in with email
            </span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleCredentialsSubmit} className="space-y-3">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arsal73500@gmail.com"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-gray-500 text-[11px]">
          Need an account?{" "}
          <Link href="/register" className="text-emerald-600 hover:underline font-semibold">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f9fa]">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
