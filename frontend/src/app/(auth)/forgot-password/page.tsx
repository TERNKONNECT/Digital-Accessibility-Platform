"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const forgotPassword = useAuthStore((state) => state.forgotPassword);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
      setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email)}`), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to request reset.");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-[var(--border)]">
        <h1 className="text-2xl font-bold text-center text-[var(--foreground)] mb-2">Forgot Password</h1>
        <p className="text-center text-sm text-zinc-500 mb-6">Enter your email to receive a reset code.</p>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{message}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
          </div>
          <button type="submit" className="w-full mt-2 bg-[var(--primary)] text-white font-medium py-2 px-4 rounded-lg hover:bg-[var(--accent)] transition-colors">Send Code</button>
        </form>
        <div className="mt-4 text-center text-sm">
          Remembered your password? <Link href="/login" className="text-[var(--primary)] hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}
