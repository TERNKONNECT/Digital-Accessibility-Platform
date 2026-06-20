import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Globe2,
  KeyRound,
  Monitor,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

const platformStats = [
  { label: "Active subscription", value: "Pro", detail: "Renews Jul 19, 2026" },
  { label: "Tools enabled", value: "2", detail: "Extension and widget" },
  { label: "Chrome profiles", value: "18", detail: "25 profile limit" },
  { label: "Widget websites", value: "6", detail: "10 website limit" },
];

const toolCards = [
  {
    title: "Chrome Extension",
    description: "Issue one integration code, track connected Chrome profiles, and monitor last active times.",
    status: "Active",
    icon: Monitor,
    metrics: ["18 connected profiles", "ACCESS-EXT-928182", "Last active 12 min ago"],
  },
  {
    title: "Website Widget",
    description: "Generate widget IDs, embed scripts, activation states, and website-level analytics.",
    status: "Active",
    icon: Globe2,
    metrics: ["6 websites connected", "42,810 monthly uses", "4 active installs"],
  },
];

const workflow = [
  { title: "Subscribe", detail: "Plans define extension access, widget access, website limits, and Chrome profile limits." },
  { title: "Integrate", detail: "Users generate integration codes for the extension and embed scripts for websites." },
  { title: "Track", detail: "Usage events capture logins, profile activity, widget loads, activations, and plan changes." },
];

const adminMetrics = [
  { label: "Total users", value: "1,284", icon: Users },
  { label: "Active subscriptions", value: "932", icon: CreditCard },
  { label: "Active integrations", value: "718", icon: KeyRound },
  { label: "Monthly revenue", value: "$84.6k", icon: BarChart3 },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--border)] bg-white dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-5">
          <Link href="/" className="flex items-center gap-3" aria-label="Ternkonnect home">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--primary)] text-base font-bold text-white">
              TK
            </span>
            <span>
              <span className="block text-lg font-semibold leading-5">Ternkonnect</span>
              <span className="block text-xs font-medium text-zinc-500">Accessibility Tools Platform</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-300 md:flex">
            <a href="#tools" className="hover:text-[var(--foreground)]">Tools</a>
            <a href="#subscriptions" className="hover:text-[var(--foreground)]">Subscriptions</a>
            <a href="#admin" className="hover:text-[var(--foreground)]">Admin</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              Login
            </Link>
            <Link
              href="/dashboard"
              className="hidden rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 sm:inline-flex"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1fr_520px] lg:items-center lg:py-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            MVP control center for accessibility tooling
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-normal text-zinc-950 dark:text-white sm:text-5xl">
            Manage accessibility subscriptions, integrations, and usage from one dashboard.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            Ternkonnect gives customers a central place to activate the Chrome Extension and Website Widget, manage plan limits, monitor usage, and keep billing status visible.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-600"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/tools"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              View tools
              <Wrench className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-sm font-medium text-zinc-500">Dashboard overview</p>
              <h2 className="mt-1 text-2xl font-semibold">Customer workspace</h2>
            </div>
            <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Active
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {platformStats.map((item) => (
              <div key={item.label} className="rounded-lg border border-[var(--border)] p-4">
                <p className="text-sm font-medium text-zinc-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold">{item.value}</p>
                <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--accent)]" />
              <h3 className="font-semibold">Recent activity</h3>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <p className="flex items-center justify-between gap-4">
                <span>Widget activated on docs.ternkonnect.app</span>
                <span className="text-zinc-500">9:42 AM</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span>Chrome profile connected: QA-Laptop-07</span>
                <span className="text-zinc-500">8:16 AM</span>
              </p>
              <p className="flex items-center justify-between gap-4">
                <span>Plan changed from Starter to Pro</span>
                <span className="text-zinc-500">Yesterday</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="tools" className="border-y border-[var(--border)] bg-white py-12 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-[var(--primary)]">Tool integrations</p>
              <h2 className="mt-2 text-3xl font-bold">Chrome Extension and Website Widget access</h2>
            </div>
            <Link href="/dashboard/tools" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
              Manage tools
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {toolCards.map(({ title, description, status, icon: Icon, metrics }) => (
              <article key={title} className="rounded-lg border border-[var(--border)] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-900">
                      <Icon className="h-5 w-5 text-[var(--primary)]" />
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold">{title}</h3>
                      <p className="text-sm text-zinc-500">{status}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-300">{description}</p>
                <div className="mt-5 grid gap-2">
                  {metrics.map((metric) => (
                    <p key={metric} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm font-medium dark:bg-zinc-900">
                      {metric}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="subscriptions" className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-12 lg:grid-cols-[420px_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-[var(--accent)]">Subscription system</p>
          <h2 className="mt-2 text-3xl font-bold">Plans control access without hiding usage.</h2>
          <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-300">
            Starter, Pro, and Enterprise plans define product access, billing cycle, maximum websites, and maximum Chrome profiles. Over-limit usage can be tracked before enforcement.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {workflow.map((item, index) => (
            <div key={item.title} className="rounded-lg border border-[var(--border)] bg-white p-5 dark:bg-zinc-950">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="admin" className="bg-zinc-950 py-12 text-white">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_520px] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-indigo-300">Admin monitoring</p>
              <h2 className="mt-2 text-3xl font-bold">Monitor users, subscriptions, integrations, and revenue.</h2>
              <p className="mt-4 leading-7 text-zinc-300">
                Admins can manage plans, suspend or reactivate users, inspect connected profiles, review widget installs, and track platform analytics.
              </p>
              <Link
                href="/dashboard/admin"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
              >
                Open admin dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {adminMetrics.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-zinc-300">{label}</p>
                    <Icon className="h-5 w-5 text-indigo-300" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
