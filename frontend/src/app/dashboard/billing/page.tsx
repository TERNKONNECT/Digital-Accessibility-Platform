"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { API_URL, authHeaders, formatDate, formatDateOnly, formatMoney, Payment, Plan, SubscriptionSummary } from "@/lib/platform";

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

  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (reference) {
      setVerifying(true);
      setVerifyMessage("Informed backend. Awaiting webhook confirmation...");
      
      let pollInterval: NodeJS.Timeout;
      
      const checkPayment = async () => {
        try {
          const res = await axios.get(`${API_URL}/platform/payment/verify/${reference}`, { headers: authHeaders(token) });
          if (res.data.status === "success") {
            setVerifyMessage("Payment verified! Subscription activated successfully.");
            clearInterval(pollInterval);
            window.history.replaceState({}, document.title, window.location.pathname);
            load();
            setTimeout(() => {
              setVerifying(false);
              setVerifyMessage("");
            }, 3000);
          } else if (res.data.status === "failed") {
            setVerifyMessage("Payment failed or was canceled. Please try again.");
            clearInterval(pollInterval);
            setTimeout(() => {
              setVerifying(false);
              setVerifyMessage("");
            }, 4000);
          } else {
            // It is pending
            setVerifyMessage("Awaiting webhook confirmation. Please wait...");
          }
        } catch (err: any) {
          setVerifyMessage(err?.response?.data?.error || "Payment verification failed.");
          clearInterval(pollInterval);
          setTimeout(() => {
            setVerifying(false);
            setVerifyMessage("");
          }, 4000);
        }
      };

      // Run immediately first
      checkPayment();
      
      // Poll every 3 seconds
      pollInterval = setInterval(checkPayment, 3000);
      
      return () => {
        clearInterval(pollInterval);
      };
    }

    load();
  }, [token, load]);

  async function changePlan(plan: Plan) {
    if (!token) return;
    setActionLoading(plan.id);
    try {
      if (plan.amount > 0) {
        // Initiate Paystack Payment
        const res = await axios.post(`${API_URL}/platform/payment/initiate`, { planId: plan.id }, { headers: authHeaders(token) });
        if (res.data?.authorization_url) {
          window.location.href = res.data.authorization_url;
        } else {
          alert("Failed to initiate payment session.");
        }
      } else {
        // Free plan change directly
        await axios.post(`${API_URL}/platform/subscription/change`, { planId: plan.id }, { headers: authHeaders(token) });
        await load();
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || "Could not switch plan.");
    } finally {
      setActionLoading(null);
    }
  }

  if (!billing) return <div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-zinc-500">View your current subscription, next renewal date, plan options, and payment history.</p>
      </div>

      {verifying && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-750 dark:border-indigo-950/20 dark:bg-indigo-950/20 dark:text-indigo-300 animate-pulse">
          <p className="text-sm font-medium">{verifyMessage}</p>
        </div>
      )}

      <section className="rounded-lg border border-[var(--border)] bg-white p-6 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500">Current Subscription</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">{billing.subscription.planName}</h2>
            <div className="mt-3 text-xs text-zinc-500 flex flex-col gap-1.5">
              <div>
                <span className="font-semibold text-zinc-650 dark:text-zinc-400">Current Plan:</span> {billing.subscription.planName}
              </div>
              <div>
                <span className="font-semibold text-zinc-650 dark:text-zinc-400">Next Billing Date:</span> {billing.subscription.renewalDate ? formatDateOnly(billing.subscription.renewalDate) : "Continuous Access"} ({billing.subscription.status})
              </div>
            </div>
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
                <button 
                  disabled={active || actionLoading !== null} 
                  onClick={() => changePlan(plan)} 
                  className="mt-5 w-full rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {active ? "Current Plan" : actionLoading === plan.id ? "Processing..." : "Switch Plan"}
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
