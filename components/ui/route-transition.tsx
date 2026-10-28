"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.fromTo(
      stage,
      { x: "7%", opacity: 0.35 },
      { x: "0%", opacity: 1, duration: 0.65, ease: "power3.out", clearProps: "transform,opacity" },
    );
  }, [pathname]);

  return <div ref={stageRef} className="route-stage">{children}</div>;
}
