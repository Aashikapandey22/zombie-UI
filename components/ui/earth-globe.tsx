"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";

export interface EarthGlobeProps {
  className?: string;
  intro?: boolean;
  introDurationMs?: number;
  introDelayMs?: number;
  onReady?: () => void;
  onIntroComplete?: () => void;
}

const TEXTURES = {
  color: "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
  normal: "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg",
  specular: "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg",
  clouds: "https://threejs.org/examples/textures/planets/earth_clouds_1024.png",
};

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((entry) => {
    Object.values(entry).forEach((value) => {
      if (value instanceof THREE.Texture) value.dispose();
    });
    entry.dispose();
  });
}

export function EarthGlobe({
  className,
  intro = false,
  introDurationMs = 5600,
  introDelayMs = 0,
  onReady,
  onIntroComplete,
}: EarthGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, intro ? 4.8 : 3.2);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      container.dataset.webglFallback = "true";
      onReady?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x000000, 0);
    container.replaceChildren(renderer.domElement);

    const root = new THREE.Group();
    root.rotation.z = THREE.MathUtils.degToRad(-6);
    scene.add(root);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const textureCache = new Map<string, THREE.Texture>();
    let disposed = false;
    let loadedTextures = 0;
    const totalTextures = Object.keys(TEXTURES).length;
    const markTextureReady = () => {
      loadedTextures += 1;
      if (loadedTextures >= totalTextures) onReady?.();
    };

    const loadTexture = (url: string, colorSpace = false) => {
      const texture = loader.load(
        url,
        (loaded) => {
          if (colorSpace) loaded.colorSpace = THREE.SRGBColorSpace;
          loaded.anisotropy = renderer.capabilities.getMaxAnisotropy();
          markTextureReady();
        },
        undefined,
        markTextureReady,
      );
      textureCache.set(url, texture);
      return texture;
    };

    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x6d87a7,
      shininess: 18,
      specular: new THREE.Color(0x334455),
      map: loadTexture(TEXTURES.color, true),
      normalMap: loadTexture(TEXTURES.normal),
      specularMap: loadTexture(TEXTURES.specular),
      normalScale: new THREE.Vector2(0.65, 0.65),
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), earthMaterial);
    root.add(earth);

    const cloudMaterial = new THREE.MeshPhongMaterial({
      alphaMap: loadTexture(TEXTURES.clouds),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 72, 72), cloudMaterial);
    root.add(clouds);

    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x4c9dff,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.09, 64, 64), atmosphereMaterial);
    root.add(atmosphere);

    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(900 * 3);
    for (let index = 0; index < starPositions.length; index += 3) {
      const radius = 9 + Math.random() * 16;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[index] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[index + 1] = radius * Math.cos(phi);
      starPositions[index + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.68 });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    scene.add(new THREE.AmbientLight(0x223044, 0.28));
    const sun = new THREE.DirectionalLight(0xfff1d2, 3.4);
    sun.position.set(-4, 2, 5);
    scene.add(sun);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let frame = 0;
    let reducedMotionTimeout: number | undefined;
    let introTween: gsap.core.Tween | undefined;
    const introState = { cameraZ: intro ? 4.8 : 3.2 };

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    if (intro && !reducedMotion) {
      introTween = gsap.to(introState, {
        cameraZ: 2.35,
        duration: introDurationMs / 1000,
        delay: introDelayMs / 1000,
        ease: "power3.inOut",
        onComplete: onIntroComplete,
      });
    } else if (intro) {
      introState.cameraZ = 2.35;
      if (onIntroComplete) {
        reducedMotionTimeout = window.setTimeout(onIntroComplete, 80);
      }
    }

    const render = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();
      camera.position.z = introState.cameraZ;
      if (!reducedMotion) {
        earth.rotation.y = elapsed * 0.075;
        clouds.rotation.y = elapsed * 0.09;
        stars.rotation.y = elapsed * 0.003;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      introTween?.kill();
      if (reducedMotionTimeout) window.clearTimeout(reducedMotionTimeout);
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          if (object.material) disposeMaterial(object.material);
        }
      });
      textureCache.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [intro, introDurationMs, introDelayMs, onIntroComplete, onReady]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} aria-label="Rotating Earth" role="img" />;
}
