"use client";

import { useEffect, useRef } from "react";
import { GlobeCdn } from "@/components/ui/globe-cdn";
import { PageTransition } from "@/components/ui/page-transition";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function GlobeCdnPage() {
  const router = useRouter();
  const redirectStarted = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (redirectStarted.current) return;
      redirectStarted.current = true;
      router.replace("/");
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <PageTransition forceIntro>
      <main className="min-h-screen overflow-hidden bg-[#f5f5f2] px-6 py-12 text-neutral-950 sm:px-10 lg:px-16">
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col justify-between gap-10">
          <header className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.35em] text-neutral-500">GlobeCDN</p>
              <h1 className="mt-4 max-w-xl text-4xl font-medium tracking-[-0.04em] sm:text-6xl">The network, in motion.</h1>
            </div>
            <p className="max-w-xs text-right text-sm leading-6 text-neutral-500">Live edge locations, routes, and request throughput across the globe.</p>
          </header>
          <section className="grid flex-1 place-items-center">
            <GlobeCdn className="w-[min(78vw,760px)]" />
          </section>
          <footer className="flex items-center justify-between border-t border-neutral-300 pt-4 text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            <span>Global edge network</span>
            <Link className="text-neutral-950 transition hover:opacity-60" href="/download">Continue to ZOMBIE API</Link>
          </footer>
        </div>
      </main>
    </PageTransition>
  );
}
