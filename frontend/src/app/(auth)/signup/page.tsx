"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("solo");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const signup = useAuthStore((state) => state.signup);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await signup(name, email, password, role, role === "org_admin" ? orgName : undefined);
      setSuccess(res.message);
      if (res.verificationLink) {
        // For local testing
        console.log("Verification link:", res.verificationLink);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-[var(--border)] overflow-y-auto max-h-full">
        <h1 className="text-2xl font-bold text-center text-[var(--foreground)] mb-2">Create an Account</h1>
        <p className="text-center text-sm text-zinc-500 mb-6">Join Ternkonnect Digital Accessibility Platform</p>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{success}</div>}

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
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Account Type</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]">
              <option value="solo">Solo Developer</option>
              <option value="org_admin">Organization Administrator</option>
            </select>
          </div>
          {role === "org_admin" && (
            <div>
              <label className="block text-sm font-medium mb-1">Organization Name</label>
              <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-[var(--primary)]" required />
            </div>
          )}
          <button type="submit" className="w-full mt-4 bg-[var(--primary)] text-white font-medium py-2 px-4 rounded-lg hover:bg-[var(--accent)] transition-colors">Sign Up</button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account? <Link href="/login" className="text-[var(--primary)] hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}
