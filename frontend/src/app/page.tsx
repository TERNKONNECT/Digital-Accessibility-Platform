import Image from "next/image";

export default function Home() {
  const ternkonnectLogo = "https://res.cloudinary.com/pro-solve/image/upload/v1778026489/logo_jxfytc.png";

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-[var(--background)] font-sans dark:bg-[var(--background)]">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-[var(--background)] sm:items-start">
        <Image
          src={ternkonnectLogo}
          alt="Ternkonnect logo"
          width={170}
          height={60}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left mt-8">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-[var(--foreground)]">
            Welcome to Ternkonnect
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Digital Accessibility Platform. Edit <code>src/app/page.tsx</code> to start building.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row mt-12">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-white transition-colors hover:opacity-90 md:w-[200px]"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore Ternkonnect
          </a>
        </div>
      </main>
    </div>
  );
}
