"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  History,
  Activity
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { AdminResponse, API_URL, authHeaders, formatMoney, formatDate } from "@/lib/platform";

export default function PaymentsPage() {
  const { token } = useAuthStore();
  const [admin, setAdmin] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const response = await axios.get(`${API_URL}/platform/admin`, { headers: authHeaders(token) });
      setAdmin(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to load payments data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />;

  if (error || !admin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-950/20 dark:bg-red-950/10">
        <h3 className="font-semibold text-lg">Error Loading Revenue</h3>
        <p className="mt-1 text-sm">{error || "Could not retrieve payments information."}</p>
      </div>
    );
  }

  // Calculate stats on the client
  const payments = admin.payments || [];
  const paidPayments = payments.filter((p: any) => p.status === "successful");
  
  const totalRevenue = paidPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const paymentCount = paidPayments.length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const todayRevenue = paidPayments
    .filter((p: any) => new Date(p.paidAt || p.createdAt) >= todayStart)
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const monthRevenue = paidPayments
    .filter((p: any) => new Date(p.paidAt || p.createdAt) >= monthStart)
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const statCards = [
    { label: "Today's Revenue", value: todayRevenue, icon: DollarSign, color: "text-emerald-500" },
    { label: "This Month", value: monthRevenue, icon: TrendingUp, color: "text-indigo-500" },
    { label: "Total Revenue", value: totalRevenue, icon: Activity, color: "text-purple-500" },
    { label: "Payment Volume", value: paymentCount, icon: CreditCard, color: "text-amber-500" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Revenue & Payments</h1>
        <p className="text-zinc-500 mt-1.5">Monitor client transactions, licensing invoices, and financial performance counters.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm hover:shadow transition-shadow dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{card.label}</span>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="mt-4 text-2xl font-bold text-[var(--foreground)]">
              {card.label.includes("Volume") ? card.value : formatMoney(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Transaction log */}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 dark:bg-zinc-900 shadow-sm flex flex-col gap-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-[var(--primary)]" />
          Transaction Logs
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-400 border-b border-[var(--border)]">
              <tr>
                <th className="pb-3 font-semibold">Transaction Date</th>
                <th className="pb-3 font-semibold">User details</th>
                <th className="pb-3 font-semibold">Subscription</th>
                <th className="pb-3 font-semibold">Gateway / Provider</th>
                <th className="pb-3 font-semibold">Reference</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-zinc-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((payment: any) => (
                  <tr key={payment.id} className="border-t border-[var(--border)] hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                    <td className="py-4">
                      {formatDate(payment.paidAt || payment.createdAt)}
                    </td>
                    <td className="py-4">
                      {payment.user ? (
                        <>
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200">{payment.user.name}</div>
                          <div className="text-xs text-zinc-400">{payment.user.email}</div>
                        </>
                      ) : (
                        <span className="text-zinc-400">Anonymous / Standard</span>
                      )}
                    </td>
                    <td className="py-4">
                      {payment.user?.subscription?.planDetails?.name ? (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {payment.user.subscription.planDetails.name}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-4 capitalize">
                      {payment.provider}
                    </td>
                    <td className="py-4 font-mono text-xs text-zinc-500">
                      {payment.reference || "Manual"}
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        payment.status === "successful" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                        payment.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                        payment.status === "initiated" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" :
                        "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-4 text-right font-bold text-zinc-800 dark:text-zinc-200">
                      {formatMoney(payment.amount, payment.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
