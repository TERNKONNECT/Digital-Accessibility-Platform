"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { API_URL, authHeaders, formatDate, formatMoney, Payment, Plan, SubscriptionSummary } from "@/lib/platform";

interface BillingResponse {
  subscription: SubscriptionSummary;
  payments: Payment[];
}

export default function BillingPage() {
  const { token } = useAuthStore();
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    const [billingResponse, plansResponse] = await Promise.all([
      axios.get(`${API_URL}/platform/billing`, { headers: authHeaders(token) }),
      axios.get(`${API_URL}/platform/plans`, { headers: authHeaders(token) }),
    ]);
    setBilling(billingResponse.data);
    setPlans(plansResponse.data);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      axios.get(`${API_URL}/platform/billing`, { headers: authHeaders(token) }),
      axios.get(`${API_URL}/platform/plans`, { headers: authHeaders(token) }),
    ])
      .then(([billingResponse, plansResponse]) => {
        setBilling(billingResponse.data);
        setPlans(plansResponse.data);
      })
      .catch(console.error);
  }, [token]);

  async function changePlan(planId: string) {
    await axios.post(`${API_URL}/platform/subscription/change`, { planId }, { headers: authHeaders(token) });
    load();
  }

  if (!billing) return <div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-zinc-500">View your current subscription, renewal date, plan options, and payment history.</p>
      </div>

      <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500">Current Subscription</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">{billing.subscription.planName}</h2>
            <p className="mt-2 text-zinc-500">Renews {formatDate(billing.subscription.renewalDate)} · {billing.subscription.status}</p>
          </div>
          <p className="text-2xl font-semibold">{formatMoney(billing.subscription.price, billing.subscription.currency)} <span className="text-sm font-normal text-zinc-500">/ {billing.subscription.billingCycle}</span></p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Plans</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const active = billing.subscription.planName === plan.name;
            return (
              <div key={plan.id} className="rounded-lg border border-[var(--border)] bg-white p-5 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {active && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                </div>
                <p className="mt-3 text-2xl font-semibold">{formatMoney(plan.amount, plan.currency)}</p>
                <p className="text-sm text-zinc-500">{plan.billingCycle}</p>
                <div className="mt-5 grid gap-2 text-sm">
                  <p>Chrome Extension: <strong>{plan.chromeExtensionAccess ? "Yes" : "No"}</strong></p>
                  <p>Widget: <strong>{plan.widgetAccess ? "Yes" : "No"}</strong></p>
                  <p>Chrome Profiles: <strong>{plan.maxChromeProfiles ?? "Unlimited"}</strong></p>
                  <p>Websites: <strong>{plan.maxWebsites ?? "Unlimited"}</strong></p>
                </div>
                <button disabled={active} onClick={() => changePlan(plan.id)} className="mt-5 w-full rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300">
                  {active ? "Current Plan" : "Switch Plan"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold">Payment History</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500"><tr><th className="py-2">Date</th><th>Provider</th><th>Reference</th><th>Status</th><th>Amount</th></tr></thead>
            <tbody>
              {billing.payments.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-zinc-500">No payments recorded yet.</td></tr>
              ) : (
                billing.payments.map((payment: Payment) => (
                  <tr key={payment.id} className="border-t border-[var(--border)]"><td className="py-3">{formatDate(payment.paidAt || payment.createdAt)}</td><td>{payment.provider}</td><td>{payment.reference || "Manual"}</td><td>{payment.status}</td><td>{formatMoney(payment.amount, payment.currency)}</td></tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
