"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EarthGlobe } from "@/components/ui/earth-globe";
import { GlobeCdn } from "@/components/ui/globe-cdn";

const INTRO_SEEN_KEY = "earth-intro-seen";
type TransitionMode = "earth" | "cinematic";
type TransitionStage = "earth" | "globe" | "title";

export function PageTransition({
  children,
  forceIntro = false,
  mode = "earth",
}: {
  children: React.ReactNode;
  forceIntro?: boolean;
  mode?: TransitionMode;
}) {
  const [showIntro, setShowIntro] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<TransitionStage>("earth");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const hasSeenIntro = window.sessionStorage.getItem(INTRO_SEEN_KEY) === "true";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setShowIntro(!reducedMotion && (forceIntro || !hasSeenIntro));
    setMounted(true);

    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
  }, [forceIntro]);

  const finishIntro = useCallback(() => {
    if (mode === "cinematic") {
      setStage("globe");
      return;
    }
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "true");
    timers.current.push(window.setTimeout(() => setShowIntro(false), 650));
  }, [mode]);

  useEffect(() => {
    if (!showIntro || mode !== "cinematic") return;
    if (stage === "globe") {
      timers.current.push(window.setTimeout(() => setStage("title"), 2600));
    }
    if (stage === "title") {
      timers.current.push(window.setTimeout(() => {
        window.sessionStorage.setItem(INTRO_SEEN_KEY, "true");
        setShowIntro(false);
      }, 2200));
    }
  }, [mode, showIntro, stage]);

  return (
    <>
      {children}
      {mounted && showIntro ? (
        <div className={`cinematic-intro cinematic-intro--${stage}`} aria-label="Cinematic introduction" aria-live="polite">
          {stage === "earth" ? (
            <div className="absolute inset-0 bg-[#02040a]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,rgba(14,53,91,0.35),transparent_42%)]" />
              <EarthGlobe className="absolute inset-0" intro onIntroComplete={finishIntro} />
              <div className="pointer-events-none absolute inset-x-0 bottom-10 text-center text-[10px] uppercase tracking-[0.45em] text-white/50">Entering atmosphere</div>
            </div>
          ) : null}
          {stage === "globe" ? (
            <div className="absolute inset-0 grid place-items-center bg-[#e8e8e3]">
              <GlobeCdn className="w-[min(76vw,780px)]" />
              <p className="pointer-events-none absolute bottom-10 text-[10px] uppercase tracking-[0.45em] text-neutral-500">Routing the signal</p>
            </div>
          ) : null}
          {stage === "title" ? (
            <div className="absolute inset-0 grid place-items-center overflow-hidden bg-[#070707]">
              <div className="download-wordmark" aria-label="Download">DOWNLOAD</div>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_35%)]" />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
