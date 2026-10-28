"use client";

import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";

interface CrowdCanvasProps {
  src: string;
  rows?: number;
  cols?: number;
  onReady?: () => void;
  progress?: number;
}

const THREAD_COLORS = ["#F04444", "#35C978", "#F2C94C", "#4289CB"];

const CrowdCanvas = ({ src, rows = 15, cols = 7, onReady, progress = 0 }: CrowdCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = { src, rows, cols };

    // UTILS
    const randomRange = (min: number, max: number) =>
      min + Math.random() * (max - min);
    const randomIndex = <T,>(array: T[]) => randomRange(0, array.length) | 0;
    const removeFromArray = <T,>(array: T[], i: number) => array.splice(i, 1)[0];
    const removeItemFromArray = <T,>(array: T[], item: T) => {
      const index = array.indexOf(item);
      return index >= 0 ? removeFromArray(array, index) : undefined;
    };
    const removeRandomFromArray = <T,>(array: T[]) => removeFromArray(array, randomIndex(array));
    const getRandomFromArray = <T,>(array: T[]) => array[randomIndex(array)];

    type Stage = { width: number; height: number };
    type Peep = {
      image: HTMLImageElement;
      rect: number[];
      width: number;
      height: number;
      x: number;
      y: number;
      anchorY: number;
      scaleX: number;
      walk: gsap.core.Timeline | null;
      setRect: (rect: number[]) => void;
      render: (ctx: CanvasRenderingContext2D) => void;
    };

    type Thread = {
      from: Peep;
      to: Peep;
      color: string;
      bend: number;
      phase: number;
      width: number;
    };

    // TWEEN FACTORIES
    const resetPeep = ({ stage, peep }: { stage: Stage; peep: Peep }) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const offsetY = 100 - 250 * gsap.parseEase("power2.in")(Math.random());
      const startY = stage.height - peep.height + offsetY;
      let startX: number;
      let endX: number;

      if (direction === 1) {
        startX = -peep.width;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + peep.width;
        endX = 0;
        peep.scaleX = -1;
      }

      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;

      return { startY, endX };
    };

    const normalWalk = ({ peep, props }: { peep: Peep; props: { startY: number; endX: number } }) => {
      const { startY, endX } = props;
      const xDuration = 10;
      const yDuration = 0.25;

      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.5, 1.5));
      tl.to(
        peep,
        {
          duration: xDuration,
          x: endX,
          ease: "none",
        },
        0,
      );
      tl.to(
        peep,
        {
          duration: yDuration,
          repeat: xDuration / yDuration,
          yoyo: true,
          y: startY - 10,
        },
        0,
      );

      return tl;
    };

    const walks = [normalWalk];

    // FACTORY FUNCTIONS
    const createPeep = ({
      image,
      rect,
    }: {
      image: HTMLImageElement;
      rect: number[];
    }): Peep => {
      const peep: Peep = {
        image,
        rect: [],
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        anchorY: 0,
        scaleX: 1,
        walk: null,
        setRect: (rect: number[]) => {
          peep.rect = rect;
          peep.width = rect[2];
          peep.height = rect[3];
        },
        render: (ctx: CanvasRenderingContext2D) => {
          ctx.save();
          ctx.translate(peep.x, peep.y);
          ctx.scale(peep.scaleX, 1);
          ctx.drawImage(peep.image, peep.rect[0], peep.rect[1], peep.rect[2], peep.rect[3], 0, 0, peep.width, peep.height);
          ctx.restore();
        },
      };

      peep.setRect(rect);
      return peep;
    };

    // MAIN
    const img = document.createElement("img");
    const stage = {
      width: 0,
      height: 0,
    };

    const allPeeps: Peep[] = [];
    const availablePeeps: Peep[] = [];
    const crowd: Peep[] = [];
    const threads: Thread[] = [];

    const createPeeps = () => {
      const { rows, cols } = config;
      const { naturalWidth: width, naturalHeight: height } = img;
      const total = rows * cols;
      const rectWidth = width / rows;
      const rectHeight = height / cols;

      for (let i = 0; i < total; i++) {
        allPeeps.push(
          createPeep({
            image: img,
            rect: [
              (i % rows) * rectWidth,
              ((i / rows) | 0) * rectHeight,
              rectWidth,
              rectHeight,
            ],
          }),
        );
      }
    };

    const createThreads = () => {
      threads.length = 0;
      const candidates = [...allPeeps];
      for (let index = 0; index < Math.min(42, candidates.length * 2); index += 1) {
        const from = candidates[(index * 7 + 3) % candidates.length];
        const targetIndex = (index * 11 + 9) % candidates.length;
        const to = candidates[targetIndex];
        if (!from || !to || from === to) continue;
        threads.push({
          from,
          to,
          color: THREAD_COLORS[index % THREAD_COLORS.length],
          bend: (index % 2 === 0 ? 1 : -1) * (28 + (index % 5) * 12),
          phase: (index * 0.19) % 1,
          width: 0.7 + (index % 3) * 0.18,
        });
      }
    };

    const initCrowd = () => {
      while (availablePeeps.length) {
        addPeepToCrowd()?.walk?.progress(Math.random());
      }
    };

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      if (!peep) return null;
      const walk = getRandomFromArray(walks)({
        peep,
        props: resetPeep({
          peep,
          stage,
        }),
      }).eventCallback("onComplete", () => {
        removePeepFromCrowd(peep);
        addPeepToCrowd();
      });

      peep.walk = walk;

      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);

      return peep;
    };

    const removePeepFromCrowd = (peep: Peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const getAnchor = (peep: Peep) => ({
      x: peep.x + (peep.scaleX > 0 ? peep.width * 0.56 : -peep.width * 0.56),
      y: peep.y + peep.height * 0.2,
    });

    const cubicPoint = (t: number, p0: number, p1: number, p2: number, p3: number) => {
      const inverse = 1 - t;
      return inverse ** 3 * p0 + 3 * inverse ** 2 * t * p1 + 3 * inverse * t ** 2 * p2 + t ** 3 * p3;
    };

    const renderThreads = (time: number) => {
      const visibleCount = Math.ceil((progressRef.current / 100) * threads.length);
      threads.slice(0, visibleCount).forEach((thread, index) => {
        const from = getAnchor(thread.from);
        const to = getAnchor(thread.to);
        const distance = Math.abs(to.x - from.x);
        const controlOffset = Math.min(180, 45 + distance * 0.22);
        const control1X = from.x + (to.x - from.x) * 0.28;
        const control2X = to.x - (to.x - from.x) * 0.28;
        const control1Y = from.y + thread.bend - controlOffset;
        const control2Y = to.y - thread.bend - controlOffset * 0.4;
        const fadeIn = Math.min(1, Math.max(0.08, (progressRef.current - index * 1.4) / 18));
        const pulse = (time * 0.22 + thread.phase) % 1;
        const pulseX = cubicPoint(pulse, from.x, control1X, control2X, to.x);
        const pulseY = cubicPoint(pulse, from.y, control1Y, control2Y, to.y);

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.12 * fadeIn;
        ctx.strokeStyle = thread.color;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(control1X, control1Y, control2X, control2Y, to.x, to.y);
        ctx.stroke();
        ctx.globalAlpha = 0.68 * fadeIn;
        ctx.lineWidth = thread.width;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(control1X, control1Y, control2X, control2Y, to.x, to.y);
        ctx.stroke();
        ctx.globalAlpha = 0.9 * fadeIn;
        ctx.fillStyle = thread.color;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 1.6 + Math.sin(time * 4 + index) * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    const render = (time = 0) => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);

      renderThreads(time);
      crowd.forEach((peep) => {
        peep.render(ctx);
      });

      ctx.restore();
    };

    const resize = () => {
      if (!canvas) return;
      stage.width = canvas.clientWidth;
      stage.height = canvas.clientHeight;
      canvas.width = stage.width * devicePixelRatio;
      canvas.height = stage.height * devicePixelRatio;

      crowd.forEach((peep) => {
        peep.walk?.kill();
      });

      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);

      initCrowd();
    };

    const init = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) return;
      createPeeps();
      createThreads();
      resize();
      gsap.ticker.add(render);
      onReady?.();
    };

    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = init;
    img.onerror = () => {
      if (img.src.startsWith("data:")) return;
      img.src = createFallbackSprite(rows, cols);
    };
    img.src = config.src;

    const resizeObserver = new ResizeObserver(() => {
      if (img.complete && img.naturalWidth > 0) resize();
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      img.onload = null;
      img.onerror = null;
      gsap.ticker.remove(render);
      crowd.forEach((peep) => {
        peep.walk?.kill();
      });
    };
  }, [cols, onReady, rows, src]);
  return (
    <canvas ref={canvasRef} className="absolute bottom-0 h-[90vh] w-full" aria-label="Animated crowd canvas" />
  );
};

function createFallbackSprite(rows: number, cols: number) {
  const cellWidth = 100;
  const cellHeight = 140;
  const figures = Array.from({ length: rows * cols }, (_, index) => {
    const x = (index % rows) * cellWidth;
    const y = Math.floor(index / rows) * cellHeight;
    const shade = 25 + (index % 5) * 12;
    return `<g transform="translate(${x} ${y})" fill="rgb(${shade},${shade},${shade})"><circle cx="50" cy="30" r="17"/><path d="M24 126c2-35 13-54 26-54s24 19 26 54z"/></g>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rows * cellWidth}" height="${cols * cellHeight}" viewBox="0 0 ${rows * cellWidth} ${cols * cellHeight}">${figures}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface Skiper39Props {
  onReady?: () => void;
  progress?: number;
}

const Skiper39 = ({ onReady, progress = 0 }: Skiper39Props) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white text-black">
      <div className="absolute left-1/2 top-8 z-10 grid -translate-x-1/2 content-start justify-items-center gap-6 text-center text-black">
        <span className="relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:from-white after:to-black after:content-['']">
          Crowd Canvas
        </span>
      </div>
      <div className="absolute bottom-0 h-full w-screen">
        <CrowdCanvas
          src="https://cdn.21st.dev/assets/localized/abdb8990a7bef8c2f5af3e45f0a3c969c4b0603fba8be92e81347de4ea4e1ed7.png"
          rows={15}
          cols={7}
          onReady={onReady}
          progress={progress}
        />
      </div>
    </div>
  );
};

export { CrowdCanvas, Skiper39 };
export default Skiper39;

/**
 * Skiper 39 Canvas_Landing_004 — React + Canvas
 * Inspired by and adapted from https://codepen.io/zadvorsky/pen/xxwbBQV
 * illustration by https://www.openpeeps.com/
 * We respect the original creators. This is an inspired rebuild with our own taste and does not claim any ownership.
 * These animations aren’t associated with the codepen.io . They’re independent recreations meant to study interaction design
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Feedback and contributions are welcome.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
