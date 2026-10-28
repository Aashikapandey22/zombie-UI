"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EarthGlobe } from "@/components/ui/earth-globe";

export function LoadingEarthIntro() {
  const router = useRouter();

  useEffect(() => {
    window.sessionStorage.setItem("earth-intro-seen", "true");
  }, []);

  const complete = useCallback(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#02040a]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,rgba(14,53,91,0.35),transparent_42%)]" />
      <EarthGlobe className="absolute inset-0" intro onIntroComplete={complete} />
      <p className="pointer-events-none absolute inset-x-0 bottom-10 text-center text-[10px] uppercase tracking-[0.45em] text-white/50">
        Entering atmosphere
      </p>
    </main>
  );
}
