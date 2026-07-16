"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const login = useAuthStore((state) => state.login);
  const resendVerification = useAuthStore((state) => state.resendVerification);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setResendMessage("");
    setLoading(true);
    try {
      await login(email, password);
      // Redirect based on role logic could go here, or handled inside dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await resendVerification(email);
      setResendMessage(res.message || "Verification code sent.");
    } catch (err: unknown) {
      setResendMessage(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-[var(--border)]">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-3" aria-label="Ternkonnect home">
            <Image src="/ternkonnect-logo.png" alt="Ternkonnect" width={40} height={40} className="rounded-lg" />
            <span className="text-left">
              <span className="block text-lg font-semibold leading-5 text-[var(--foreground)]">Ternkonnect</span>
              <span className="block text-xs font-medium text-zinc-500">Digital Accessibility Tools</span>
            </span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-center text-[var(--foreground)] mb-6">
          Login to your Account
        </h1>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center flex flex-col gap-2">
            <span>{error}</span>
            {error.includes("verify your email") && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="mt-1 bg-red-200 text-red-800 px-3 py-1.5 rounded font-medium hover:bg-red-300 transition-colors disabled:opacity-50"
              >
                {resendLoading ? "Sending..." : "Resend Verification Code"}
              </button>
            )}
          </div>
        )}
        {resendMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm text-center">
            {resendMessage}
          </div>
        )}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-600 dark:text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-600 dark:text-zinc-400">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-[var(--primary)] text-white font-medium py-2 px-4 rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        <div className="mt-6 flex justify-between text-sm border-t border-[var(--border)] pt-4">
          <Link href="/forgot-password" className="text-[var(--primary)] hover:underline">Forgot Password?</Link>
          <Link href="/signup" className="text-[var(--primary)] hover:underline">Sign Up</Link>
        </div>
        <div className="mt-4 text-center text-sm">
          <Link href="/" className="text-zinc-500 hover:text-[var(--primary)] flex items-center justify-center gap-1.5 transition-colors">
            &larr; Back to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}
