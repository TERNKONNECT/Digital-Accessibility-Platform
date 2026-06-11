"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { useParams } from "next/navigation";

export default function ToolIntegrationPage() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const [tool, setTool] = useState<any>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      axios.get("http://localhost:9001/api/tools", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const t = res.data.find((x: any) => x.id === id);
        setTool(t);
      })
      .catch(console.error);
    }
  }, [token, id]);

  const generatePin = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await axios.post(`http://localhost:9001/api/tools/${id}/generate-pin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPin(res.data.pin);
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to generate PIN");
    } finally {
      setLoading(false);
    }
  };

  if (!tool) return <div className="animate-pulse h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>;

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">{tool.name} Integration</h1>
        <p className="text-zinc-500 uppercase font-medium">{tool.type}</p>
      </div>

      <div className="p-8 bg-white dark:bg-zinc-900 border border-[var(--border)] rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold mb-4">Integration Instructions</h2>
        <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400">
          <p>Follow these steps to integrate the {tool.name}:</p>
          <ol>
            <li>Install the component on your website or browser.</li>
            <li>Generate a secure Integration PIN below.</li>
            <li>Initialize the SDK/Extension with your Email and the generated PIN.</li>
          </ol>
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--border)]">
          <h3 className="text-lg font-bold mb-4">Security Credentials</h3>
          <p className="text-sm text-zinc-500 mb-4">Generate a unique Integration PIN for this specific tool to connect securely to the Gemini proxy.</p>
          
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
          {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{message}</div>}
          
          {pin ? (
            <div className="bg-zinc-50 dark:bg-black p-6 rounded-xl border border-[var(--border)] text-center">
              <p className="text-sm text-zinc-500 mb-2">Your New Integration PIN</p>
              <div className="text-4xl font-mono font-bold tracking-widest text-[var(--primary)]">{pin}</div>
            </div>
          ) : (
            <button
              onClick={generatePin}
              disabled={loading}
              className="bg-[var(--primary)] text-white font-medium py-3 px-6 rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Integration PIN"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
