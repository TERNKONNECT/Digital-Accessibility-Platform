"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await resetPassword(email, otp, password);
      setMessage(res.message);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-[var(--border)]">
        <h1 className="text-2xl font-bold text-center text-[var(--foreground)] mb-2">Reset Password</h1>
        <p className="text-center text-sm text-zinc-500 mb-6">Enter the reset code sent to your email.</p>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{message}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reset Code (OTP)</label>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
          </div>
          <button type="submit" className="w-full mt-2 bg-[var(--primary)] text-white font-medium py-2 px-4 rounded-lg hover:bg-[var(--accent)] transition-colors">Reset Password</button>
        </form>
        <div className="mt-4 text-center text-sm">
          <Link href="/login" className="text-[var(--primary)] hover:underline">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
