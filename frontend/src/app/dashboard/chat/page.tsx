"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";

export default function ChatPage() {
  const { user } = useAuthStore();
  const [pin, setPin] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const ws = useRef<WebSocket | null>(null);

  const connectToGemini = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pin) return;

    // Use WS (or WSS if in production)
    const socket = new WebSocket(`ws://localhost:9001/api/tools/proxy?email=${encodeURIComponent(user.email)}&pin=${pin}`);

    socket.onopen = () => {
      setConnected(true);
      setMessages((prev) => [...prev, { role: "ai", text: "Connected securely to Gemini. How can I help you?" }]);
    };

    socket.onmessage = (event) => {
      // In a real implementation with Bidi API, we would parse the Protobuf/JSON response
      // Here we just display the raw text for demonstration
      setMessages((prev) => [...prev, { role: "ai", text: event.data }]);
    };

    socket.onclose = () => {
      setConnected(false);
      setMessages((prev) => [...prev, { role: "ai", text: "Connection closed." }]);
    };

    socket.onerror = () => {
      setConnected(false);
      alert("Failed to connect. Please check your PIN.");
    };

    ws.current = socket;
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ws.current || !input.trim()) return;

    ws.current.send(input);
    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setInput("");
  };

  useEffect(() => {
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto gap-4">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">AI Assistant</h1>
        <p className="text-zinc-500">Secure WebSocket connection to Gemini</p>
      </div>

      {!connected ? (
        <div className="flex-1 flex items-center justify-center">
          <form onSubmit={connectToGemini} className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-[var(--border)] max-w-sm w-full flex flex-col gap-4">
            <h3 className="font-semibold text-lg">Connect to Proxy</h3>
            <div>
              <label className="block text-sm text-zinc-500 mb-1">Integration PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
                placeholder="6-digit PIN"
              />
            </div>
            <button
              type="submit"
              className="bg-[var(--primary)] text-white font-medium py-2 rounded-lg hover:bg-[var(--accent)] transition-colors mt-2"
            >
              Connect
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] p-4 rounded-2xl ${msg.role === "user" ? "bg-[var(--primary)] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-[var(--foreground)]"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="p-4 border-t border-[var(--border)] flex gap-2 bg-zinc-50 dark:bg-black">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Ask the AI..."
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[var(--primary)] text-white font-medium rounded-xl hover:bg-[var(--accent)] transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
