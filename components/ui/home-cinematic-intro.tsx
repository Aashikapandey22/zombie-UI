"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NetworkWorld } from "@/components/ui/network-world";
import { Skiper39 } from "@/components/ui/skiper39";

type IntroScene = "crowd" | "network" | "complete";
const INTRO_SEEN_KEY = "zombie-home-intro-seen";

export function HomeCinematicIntro({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [scene, setScene] = useState<IntroScene>("crowd");
  const [progress, setProgress] = useState(1);
  const [crowdReady, setCrowdReady] = useState(false);
  const [networkReady, setNetworkReady] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const completionTimer = useRef<number | undefined>(undefined);
  const navigationStarted = useRef(false);
  const handleCrowdReady = useCallback(() => setCrowdReady(true), []);
  const handleNetworkReady = useCallback(() => setNetworkReady(true), []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = window.sessionStorage.getItem(INTRO_SEEN_KEY) === "true";
    if (reducedMotion || seen) {
      setEnabled(false);
      setScene("complete");
    }

    return () => {
      if (completionTimer.current) window.clearTimeout(completionTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled || scene !== "crowd") return;
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        const ready = crowdReady && networkReady;
        return Math.min(current + (current < 70 ? 2 : 1), ready ? 100 : 96);
      });
    }, 55);
    return () => window.clearInterval(progressTimer);
  }, [crowdReady, networkReady, enabled, scene]);

  useEffect(() => {
    if (!enabled || scene !== "crowd" || !crowdReady || !networkReady || progress < 96) return;
    setProgress(100);
    completionTimer.current = window.setTimeout(() => setScene("network"), 500);
  }, [crowdReady, networkReady, enabled, progress, scene]);

  const finishNetwork = useCallback(() => {
    if (navigationStarted.current) return;
    navigationStarted.current = true;
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "true");
    setFinishing(true);
    completionTimer.current = window.setTimeout(() => router.replace("/globe-cdn"), 720);
  }, [router]);

  return (
    <>
      {children}
      {enabled && scene !== "complete" ? (
        <div className={`home-intro home-intro--${scene} ${finishing ? "home-intro--finishing" : ""}`} aria-label="Zombie API cinematic intro">
          <div className="home-intro__network">
            <NetworkWorld progress={progress} active={scene === "network"} onReady={handleNetworkReady} onComplete={finishNetwork} />
          </div>
          {scene === "crowd" ? (
            <div className="home-intro__crowd">
              <Skiper39 onReady={handleCrowdReady} progress={progress} />
              <div className="home-intro__shade" />
              <div className="home-intro__progress" aria-live="polite">
                <span>{progress}%</span>
                <small>Initializing the network</small>
                <i aria-hidden="true"><b style={{ width: `${progress}%` }} /></i>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
