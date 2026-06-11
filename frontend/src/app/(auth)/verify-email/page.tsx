"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    axios.get(`http://localhost:9001/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.error || "Failed to verify email.");
      });
  }, [token, email]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-[var(--border)] text-center">
        {status === "loading" && <p>Verifying your email...</p>}
        {status === "success" && (
          <div>
            <h2 className="text-xl font-bold text-green-600 mb-2">Verified!</h2>
            <p className="text-zinc-500 mb-6">{message}</p>
            <Link href="/login" className="bg-[var(--primary)] text-white px-6 py-2 rounded-lg">Log In</Link>
          </div>
        )}
        {status === "error" && (
          <div>
            <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
            <p className="text-zinc-500 mb-6">{message}</p>
            <Link href="/login" className="bg-zinc-200 text-black px-6 py-2 rounded-lg">Return to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
