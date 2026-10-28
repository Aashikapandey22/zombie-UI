"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import createGlobe from "cobe";

interface CdnMarker {
  id: string;
  location: [number, number];
  region: string;
}

interface CdnArc {
  id: string;
  from: [number, number];
  to: [number, number];
}

interface GlobeCdnProps {
  markers?: CdnMarker[];
  arcs?: CdnArc[];
  className?: string;
  speed?: number;
}

const defaultMarkers: CdnMarker[] = [
  { id: "cdn-iad", location: [38.95, -77.45], region: "iad1" },
  { id: "cdn-sfo", location: [37.62, -122.38], region: "sfo1" },
  { id: "cdn-cdg", location: [49.01, 2.55], region: "cdg1" },
  { id: "cdn-hnd", location: [35.55, 139.78], region: "hnd1" },
  { id: "cdn-syd", location: [-33.95, 151.18], region: "syd1" },
  { id: "cdn-gru", location: [-23.43, -46.47], region: "gru1" },
  { id: "cdn-sin", location: [1.36, 103.99], region: "sin1" },
  { id: "cdn-arn", location: [59.65, 17.93], region: "arn1" },
  { id: "cdn-dub", location: [53.43, -6.25], region: "dub1" },
  { id: "cdn-bom", location: [19.09, 72.87], region: "bom1" },
];

const defaultArcs: CdnArc[] = [
  { id: "cdn-arc-1", from: [38.95, -77.45], to: [49.01, 2.55] },
  { id: "cdn-arc-2", from: [37.62, -122.38], to: [35.55, 139.78] },
  { id: "cdn-arc-3", from: [49.01, 2.55], to: [1.36, 103.99] },
  { id: "cdn-arc-4", from: [38.95, -77.45], to: [-23.43, -46.47] },
  { id: "cdn-arc-5", from: [35.55, 139.78], to: [-33.95, 151.18] },
  { id: "cdn-arc-6", from: [49.01, 2.55], to: [19.09, 72.87] },
];

export function GlobeCdn({
  markers = defaultMarkers,
  arcs = defaultArcs,
  className = "",
  speed = 0.003,
}: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const [traffic, setTraffic] = useState(() =>
    defaultArcs.map((arc, index) => ({
      id: arc.id,
      value: [420, 380, 290, 185, 156, 134][index] ?? 100,
    })),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTraffic((data) =>
        data.map((entry) => ({
          ...entry,
          value: Math.max(50, entry.value + Math.floor(Math.random() * 21) - 10),
        })),
      );
    }, 250);
    return () => window.clearInterval(interval);
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    pointerInteracting.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.style.cursor = "grabbing";
    isPausedRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const handlePointerUp = useCallback((event?: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (event?.currentTarget) event.currentTarget.style.cursor = "grab";
    isPausedRef.current = false;
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerInteracting.current !== null) {
      dragOffset.current = {
        phi: (event.clientX - pointerInteracting.current.x) / 300,
        theta: (event.clientY - pointerInteracting.current.y) / 1000,
      };
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId = 0;
    let fadeTimeout = 0;
    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (!width || disposed) return;
      if (!globe) {
        init();
      } else if (Math.abs(width - renderedWidth) > 1) {
        destroyGlobe();
        init();
      }
    });
    let disposed = false;
    let phi = 0;
    let renderedWidth = 0;

    const destroyGlobe = () => {
      cancelAnimationFrame(animationId);
      animationId = 0;
      globe?.destroy();
      globe = null;
    };

    const init = () => {
      if (disposed || globe) return;
      const width = canvas.offsetWidth;
      if (!width) return;
      renderedWidth = width;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor: [1, 1, 1],
        markerColor: [0, 0, 0],
        glowColor: [0.94, 0.93, 0.91],
        markerElevation: 0.02,
        markers: markers.map((marker) => ({ location: marker.location, size: 0.012, id: marker.id })),
        arcs: arcs.map((arc) => ({ from: arc.from, to: arc.to, id: arc.id })),
        arcColor: [0, 0, 0],
        arcWidth: 0.5,
        arcHeight: 0.25,
        opacity: 0.7,
      });

      const animate = () => {
        if (disposed || !globe) return;
        if (!isPausedRef.current) phi += speed;
        globe.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        });
        animationId = requestAnimationFrame(animate);
      };

      animate();
      fadeTimeout = window.setTimeout(() => {
        if (!disposed) canvas.style.opacity = "1";
      }, 40);
    };

    resizeObserver.observe(canvas);
    init();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      window.clearTimeout(fadeTimeout);
      destroyGlobe();
    };
  }, [arcs, markers, speed]);

  const pyramidFaceStyle = (nth: number): React.CSSProperties => {
    const transforms = [
      "rotateY(0deg) translateZ(4px) rotateX(19.5deg)",
      "rotateY(120deg) translateZ(4px) rotateX(19.5deg)",
      "rotateY(240deg) translateZ(4px) rotateX(19.5deg)",
      "rotateX(-90deg) rotateZ(60deg) translateY(4px)",
    ];
    const colors = ["#111", "#333", "#555", "#222"];
    return {
      position: "absolute",
      left: -0.5,
      top: 0,
      width: 0,
      height: 0,
      borderLeft: "6.5px solid transparent",
      borderRight: "6.5px solid transparent",
      borderBottom: `13px solid ${colors[nth]}`,
      transformOrigin: "center bottom",
      transform: transforms[nth],
    };
  };

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <style>{`@keyframes pyramid-spin { 0% { transform: rotateX(20deg) rotateY(0deg); } 100% { transform: rotateX(20deg) rotateY(360deg); } }`}</style>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ width: "100%", height: "100%", cursor: "grab", opacity: 0, transition: "opacity 1.2s ease", borderRadius: "50%", touchAction: "none" }}
      />
      {markers.map((marker) => (
        <div
          key={marker.id}
          style={{ position: "absolute", positionAnchor: `--cobe-${marker.id}`, bottom: "anchor(top)", left: "anchor(center)", translate: "-50% 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none", opacity: `var(--cobe-visible-${marker.id}, 0)`, filter: `blur(calc((1 - var(--cobe-visible-${marker.id}, 0)) * 8px))`, transition: "opacity 0.3s, filter 0.3s" } as React.CSSProperties}
        >
          <div style={{ width: 12, height: 12, position: "relative", transformStyle: "preserve-3d", animation: "pyramid-spin 4s linear infinite" }}>
            {[0, 1, 2, 3].map((face) => <div key={face} style={pyramidFaceStyle(face)} />)}
          </div>
          <span style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#000", background: "#fff", padding: "2px 6px", borderRadius: 3, letterSpacing: "0.05em", whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>{marker.region}</span>
        </div>
      ))}
      {traffic.map((entry) => (
        <div
          key={entry.id}
          style={{ position: "absolute", positionAnchor: `--cobe-arc-${entry.id}`, bottom: "anchor(top)", left: "anchor(center)", translate: "-50% 0", fontFamily: "monospace", fontSize: "0.5rem", color: "#fff", background: "#000", padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap", pointerEvents: "none", opacity: `var(--cobe-visible-arc-${entry.id}, 0)`, filter: `blur(calc((1 - var(--cobe-visible-arc-${entry.id}, 0)) * 8px))`, transition: "opacity 0.3s, filter 0.3s" } as React.CSSProperties}
        >
          {entry.value}k req/s
        </div>
      ))}
    </div>
  );
}
