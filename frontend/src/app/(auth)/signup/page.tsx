"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("solo");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");

  const signup = useAuthStore((state) => state.signup);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await signup(name, email, password, role, role === "org_admin" ? orgName : undefined);
      if (res.verificationOtp) {
        // For local testing when email sending isn't configured
        console.log("Verification code:", res.verificationOtp);
      }
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-[var(--border)] overflow-y-auto max-h-full">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-3" aria-label="Ternkonnect home">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--primary)] text-base font-bold text-white">
              TK
            </span>
            <span className="text-left">
              <span className="block text-lg font-semibold leading-5 text-[var(--foreground)]">Ternkonnect</span>
              <span className="block text-xs font-medium text-zinc-500">Digital Accessibility Tools</span>
            </span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-center text-[var(--foreground)] mb-2">Create an Account</h1>
        <p className="text-center text-sm text-zinc-500 mb-6">Join Ternkonnect Digital Accessibility Platform</p>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]"
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
          <button type="submit" className="w-full mt-4 bg-[var(--primary)] text-white font-medium py-2 px-4 rounded-lg hover:bg-[var(--accent)] transition-colors">Sign Up</button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account? <Link href="/login" className="text-[var(--primary)] hover:underline">Log in</Link>
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
