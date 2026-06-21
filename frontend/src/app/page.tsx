import Link from "next/link";
import { ArrowRight, Eye, Keyboard, Volume2 } from "lucide-react";

const features = [
  {
    title: "AI Voice Screen Reader",
    description: "Gemini-powered text-to-speech engine reads screen contents dynamically, enabling visually impaired users to browse effortlessly.",
    icon: Volume2,
  },
  {
    title: "Visual Adaptations",
    description: "Modify font scaling, adjust colors, toggle high contrast modes, and customize website visuals to match reading preferences.",
    icon: Eye,
  },
  {
    title: "Adaptive Keyboard Control",
    description: "Enable full screen navigation, quick accessibility shortcuts, and focus tracking for motor-impaired individuals.",
    icon: Keyboard,
  },
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
              <span className="block text-xs font-medium text-zinc-500">Digital Accessibility Tools</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-650 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </section>
 
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-20 text-center lg:py-28">
        <h1 className="text-4xl font-bold tracking-normal text-zinc-950 dark:text-white sm:text-5xl">
          Where accessibility meets every platform, and every person.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
          Ternkonnect offers powerful accessibility features including an interactive Chrome Extension for personalized reading, text-to-speech navigation, and an embeddable Website Widget to automatically optimize site compliance.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-650 transition-colors"
        >
          Get started for free
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
 
      <section id="features" className="border-y border-[var(--border)] bg-white py-16 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <article key={title}>
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-900">
                   <Icon className="h-5 w-5 text-[var(--primary)]" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-300">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
 
      <section className="bg-zinc-50 py-16 text-center dark:bg-zinc-900">
        <div className="mx-auto w-full max-w-2xl px-6">
          <h2 className="text-2xl font-bold">Experience web accessibility today</h2>
          <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-300">
            Sign up to get instant access to our accessibility tools, set up custom profiles, and activate website integrations.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-650 transition-colors"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
