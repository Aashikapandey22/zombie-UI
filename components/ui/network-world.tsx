"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface NetworkWorldProps {
  progress?: number;
  active?: boolean;
  durationMs?: number;
  onReady?: () => void;
  onComplete?: () => void;
}

const COLORS = [0xf04444, 0x35c978, 0xf2c94c, 0x4289cb];
const TEXTURES = {
  color: "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
  normal: "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg",
  specular: "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg",
  clouds: "https://threejs.org/examples/textures/planets/earth_clouds_1024.png",
};

type Location = [number, number];
type NetworkArc = { from: Location; to: Location; color: number; lift: number; phase: number };

const LOCATIONS: Location[] = [
  [38.9, -77.4],
  [37.6, -122.4],
  [49, 2.5],
  [35.6, 139.8],
  [-33.9, 151.2],
  [1.4, 104],
  [19.1, 72.9],
  [-23.4, -46.5],
  [59.7, 17.9],
  [25.2, 55.3],
];

const FEATURED_ARCS: NetworkArc[] = [
  { from: LOCATIONS[0], to: LOCATIONS[2], color: COLORS[0], lift: 0.34, phase: 0.1 },
  { from: LOCATIONS[1], to: LOCATIONS[3], color: COLORS[3], lift: 0.24, phase: 0.32 },
  { from: LOCATIONS[2], to: LOCATIONS[5], color: COLORS[1], lift: 0.3, phase: 0.58 },
  { from: LOCATIONS[3], to: LOCATIONS[4], color: COLORS[2], lift: 0.22, phase: 0.76 },
  { from: LOCATIONS[0], to: LOCATIONS[7], color: COLORS[1], lift: 0.38, phase: 0.92 },
  { from: LOCATIONS[2], to: LOCATIONS[6], color: COLORS[2], lift: 0.2, phase: 0.19 },
  { from: LOCATIONS[5], to: LOCATIONS[8], color: COLORS[3], lift: 0.34, phase: 0.47 },
  { from: LOCATIONS[6], to: LOCATIONS[9], color: COLORS[0], lift: 0.18, phase: 0.68 },
  { from: LOCATIONS[7], to: LOCATIONS[4], color: COLORS[3], lift: 0.28, phase: 0.81 },
];

// Deterministic secondary routes keep the network geographically coherent while
// avoiding a random redraw every time React mounts the scene.
const NETWORK_NODES: Location[] = [
  ...LOCATIONS,
  [51.5, -0.1], [52.5, 13.4], [41.9, 12.5], [40.4, -3.7], [55.7, 12.6],
  [30, 31.2], [6.5, 3.4], [-1.3, 36.8], [-26.2, 28], [-34.6, -58.4],
  [4.7, -74.1], [19.4, -99.1], [21.3, -157.9], [25.8, -80.2], [43.7, -79.4],
  [35.7, 51.4], [31.2, 121.5], [22.3, 114.2], [13.7, 100.5], [28.6, 77.2],
  [-6.2, 106.8], [-37.8, 144.9], [-41.3, 174.8], [35.1, 33.4], [64.1, -21.9],
  [59.9, 10.7], [45.5, 9.2], [50.1, 14.4], [50.4, 30.5], [38.7, 35.2],
  [24.7, 46.7], [14.7, -17.5], [-8.8, 13.2], [33.9, -6.8], [36.8, -3.7],
  [34.1, -118.2], [45.5, -122.7], [19.4, -99.1], [35.7, -78.6], [42.4, -71.1],
];

const ARCS: NetworkArc[] = [
  ...FEATURED_ARCS,
  ...Array.from({ length: 156 }, (_, index) => {
    const fromIndex = (index * 7 + 3) % NETWORK_NODES.length;
    const toIndex = (fromIndex + 3 + (index % 11)) % NETWORK_NODES.length;
    return {
      from: NETWORK_NODES[fromIndex],
      to: NETWORK_NODES[toIndex],
      color: COLORS[(index + 1) % COLORS.length],
      lift: 0.08 + ((index * 13) % 25) / 100,
      phase: ((index * 17) % 100) / 100,
    };
  }),
];

function pointOnGlobe([latitude, longitude]: Location, radius: number) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.sin(lon),
  );
}

export function NetworkWorld({ progress = 0, active = false, durationMs = 6800, onReady, onComplete }: NetworkWorldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  const activeRef = useRef(active);
  const activeStartedAtRef = useRef<number | null>(null);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => {
    activeRef.current = active;
    activeStartedAtRef.current = active ? performance.now() : null;
  }, [active]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      container.dataset.webglFallback = "true";
      onReady?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.setClearColor(0x010307, 1);
    container.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0.08, 5.2);
    const planet = new THREE.Group();
    planet.rotation.z = THREE.MathUtils.degToRad(-7);
    scene.add(planet);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const textures: THREE.Texture[] = [];
    let readyCount = 0;
    let readySent = false;
    let disposed = false;
    let readyTimeout: number | undefined;
    const markReady = () => {
      readyCount += 1;
      if (!readySent && readyCount >= 4) {
        readySent = true;
        onReady?.();
      }
    };
    const load = (url: string, color = false) => {
      const texture = loader.load(url, (loaded) => {
        if (color) loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = renderer.capabilities.getMaxAnisotropy();
        markReady();
      }, undefined, markReady);
      textures.push(texture);
      return texture;
    };

    const earthTexture = load(TEXTURES.color, true);
    const earthNormalTexture = load(TEXTURES.normal);
    const earthSpecularTexture = load(TEXTURES.specular);
    const cloudTexture = load(TEXTURES.clouds);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1.16, 96, 96), new THREE.MeshPhongMaterial({
      color: 0x7894ae,
      map: earthTexture,
      normalMap: earthNormalTexture,
      specularMap: earthSpecularTexture,
      normalScale: new THREE.Vector2(0.48, 0.48),
      shininess: 16,
      specular: new THREE.Color(0x263c50),
    }));
    planet.add(earth);

    const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.174, 72, 72), new THREE.MeshPhongMaterial({
      alphaMap: cloudTexture,
      transparent: true,
      opacity: 0.27,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    planet.add(clouds);

    planet.add(new THREE.Mesh(new THREE.SphereGeometry(1.25, 64, 64), new THREE.MeshBasicMaterial({
      color: 0x4b9fe0,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })));

    const networkGroup = new THREE.Group();
    planet.add(networkGroup);
    const pulseGroup = new THREE.Group();
    planet.add(pulseGroup);
    const arcObjects: Array<{ curve: THREE.CatmullRomCurve3; line: THREE.Line; glow: THREE.Line; pulse: THREE.Mesh; arc: NetworkArc }> = [];

    ARCS.forEach((arc) => {
      const start = pointOnGlobe(arc.from, 1.185);
      const end = pointOnGlobe(arc.to, 1.185);
      const middle = start.clone().add(end).normalize().multiplyScalar(1.185 + arc.lift);
      const curve = new THREE.CatmullRomCurve3([start, middle, end]);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(36));
      const material = new THREE.LineBasicMaterial({ color: arc.color, transparent: true, opacity: 0.55 });
      const glow = new THREE.Line(geometry.clone(), new THREE.LineBasicMaterial({ color: arc.color, transparent: true, opacity: 0.08 }));
      const line = new THREE.Line(geometry, material);
      networkGroup.add(line, glow);
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: arc.color, transparent: true, opacity: 0.9 }));
      pulseGroup.add(pulse);
      arcObjects.push({ curve, line, glow, pulse, arc });
    });

    const crackGroup = new THREE.Group();
    planet.add(crackGroup);
    const crackMaterial = new THREE.LineBasicMaterial({ color: 0xffc8a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    for (let index = 0; index < 7; index += 1) {
      const points: THREE.Vector3[] = [];
      const longitude = -1.7 + index * 0.56;
      for (let step = 0; step < 6; step += 1) {
        const latitude = -0.72 + step * 0.28;
        points.push(new THREE.Vector3(
          1.185 * Math.cos(latitude) * Math.cos(longitude + Math.sin(step * 2.1 + index) * 0.06),
          1.185 * Math.sin(latitude),
          1.185 * Math.cos(latitude) * Math.sin(longitude + Math.sin(step * 2.1 + index) * 0.06),
        ));
      }
      crackGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), crackMaterial.clone()));
    }

    const fragmentGroup = new THREE.Group();
    fragmentGroup.visible = false;
    planet.add(fragmentGroup);
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const latitude = -0.72 + (index % 4) * 0.48;
      const origin = pointOnGlobe([THREE.MathUtils.radToDeg(latitude), THREE.MathUtils.radToDeg(angle)], 1.08);
      const fragment = new THREE.Mesh(new THREE.TetrahedronGeometry(0.28 + (index % 3) * 0.08, 1), new THREE.MeshPhongMaterial({
        color: 0x7194ad,
        map: earthTexture,
        normalMap: earthNormalTexture,
        normalScale: new THREE.Vector2(0.35, 0.35),
        emissive: new THREE.Color(0x24130d),
        emissiveIntensity: 0.38,
        transparent: true,
        opacity: 0.98,
      }));
      fragment.position.copy(origin);
      fragment.userData.origin = fragment.position.clone();
      fragment.userData.direction = fragment.position.clone().normalize().add(new THREE.Vector3(
        Math.sin(index * 2.3) * 0.35,
        Math.cos(index * 1.7) * 0.25,
        Math.sin(index * 1.1) * 0.35,
      )).normalize();
      fragmentGroup.add(fragment);
    }

    const debrisCount = 180;
    const debrisPositions = new Float32Array(debrisCount * 3);
    const debrisOrigins: THREE.Vector3[] = [];
    const debrisDirections: THREE.Vector3[] = [];
    for (let index = 0; index < debrisCount; index += 1) {
      const seed = index * 12.9898;
      const origin = pointOnGlobe([
        -80 + ((Math.sin(seed) + 1) * 0.5) * 160,
        -180 + ((Math.sin(seed * 1.73) + 1) * 0.5) * 360,
      ], 1.24 + (index % 7) * 0.015);
      const direction = origin.clone().normalize().add(new THREE.Vector3(
        Math.sin(seed * 0.7) * 0.35,
        Math.cos(seed * 0.9) * 0.32,
        Math.sin(seed * 1.2) * 0.35,
      )).normalize();
      debrisOrigins.push(origin);
      debrisDirections.push(direction);
      debrisPositions[index * 3] = origin.x;
      debrisPositions[index * 3 + 1] = origin.y;
      debrisPositions[index * 3 + 2] = origin.z;
    }
    const debrisGeometry = new THREE.BufferGeometry();
    debrisGeometry.setAttribute("position", new THREE.BufferAttribute(debrisPositions, 3));
    const debris = new THREE.Points(debrisGeometry, new THREE.PointsMaterial({
      color: 0xffc8a0,
      size: 0.035,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    planet.add(debris);

    const shockwave = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.64, 96), new THREE.MeshBasicMaterial({
      color: 0xffd7b0,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    shockwave.rotation.x = Math.PI / 2;
    scene.add(shockwave);

    const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xb8c9d2, size: 0.018, transparent: true, opacity: 0.38 }));
    const positions = new Float32Array(420 * 3);
    for (let index = 0; index < positions.length; index += 3) {
      const radius = 6 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index + 1] = radius * Math.cos(phi);
      positions[index + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    stars.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    scene.add(stars);
    scene.add(new THREE.AmbientLight(0x17283a, 0.3));
    const sun = new THREE.DirectionalLight(0xffe9cf, 2.8);
    sun.position.set(-4, 2, 5);
    scene.add(sun);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let frame = 0;
    let completeSent = false;
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

    const render = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();
      const activeElapsed = activeStartedAtRef.current === null ? 0 : (performance.now() - activeStartedAtRef.current) / 1000;
      const intensity = progressRef.current / 100;
      const explosionStart = durationMs / 1000 * 0.48;
      const fracture = activeRef.current && intensity >= 0.9 ? Math.min(1, Math.max(0, (activeElapsed - explosionStart) / (durationMs / 1000 * 0.34))) : 0;
      planet.rotation.y = reducedMotion ? 0.25 : elapsed * 0.045;
      stars.rotation.y = reducedMotion ? 0 : elapsed * 0.002;
      camera.position.z = 5.2 - (activeRef.current ? Math.min(1.25, activeElapsed * 0.12) : 0);
      camera.lookAt(0, 0, 0);
      earth.scale.setScalar(1 - fracture * 0.28);
      earth.visible = fracture < 0.78;
      clouds.rotation.y = planet.rotation.y * 1.12;
      clouds.visible = fracture < 0.58;
      crackGroup.children.forEach((crack) => { ((crack as THREE.Line).material as THREE.LineBasicMaterial).opacity = fracture * 0.8; });
      fragmentGroup.visible = fracture > 0.08;
      fragmentGroup.children.forEach((fragment, index) => {
        const direction = fragment.userData.direction as THREE.Vector3;
        const origin = fragment.userData.origin as THREE.Vector3;
        fragment.position.copy(origin).addScaledVector(direction, fracture * (0.8 + (index % 3) * 0.28));
        fragment.scale.setScalar(1 + fracture * 0.18);
        fragment.rotation.x += reducedMotion ? 0 : 0.009;
        fragment.rotation.y += reducedMotion ? 0 : 0.013;
      });
      const debrisAttribute = debris.geometry.getAttribute("position") as THREE.BufferAttribute;
      debrisOrigins.forEach((origin, index) => {
        debrisAttribute.setXYZ(index, origin.x + debrisDirections[index].x * fracture * (0.7 + (index % 9) * 0.12), origin.y + debrisDirections[index].y * fracture * (0.7 + (index % 9) * 0.12), origin.z + debrisDirections[index].z * fracture * (0.7 + (index % 9) * 0.12));
      });
      debrisAttribute.needsUpdate = true;
      debris.material.opacity = fracture > 0.1 ? Math.min(0.9, (fracture - 0.1) * 1.8) : 0;
      shockwave.scale.setScalar(0.7 + fracture * 2.9);
      (shockwave.material as THREE.MeshBasicMaterial).opacity = fracture > 0.08 ? Math.max(0, 0.7 - fracture * 0.62) : 0;
      const visibleArcs = Math.max(1, Math.ceil(intensity * arcObjects.length));
      arcObjects.forEach((entry, index) => {
        const visible = index < visibleArcs;
        entry.line.visible = visible;
        entry.glow.visible = visible;
        entry.pulse.visible = visible && !reducedMotion;
        const material = entry.line.material as THREE.LineBasicMaterial;
        material.opacity = visible ? 0.32 + intensity * 0.35 : 0;
        entry.glow.material = entry.glow.material as THREE.LineBasicMaterial;
        (entry.glow.material as THREE.LineBasicMaterial).opacity = visible ? 0.035 + intensity * 0.07 : 0;
        const t = reducedMotion ? 0.5 : (elapsed * (0.07 + index * 0.006) + entry.arc.phase) % 1;
        entry.pulse.position.copy(entry.curve.getPoint(t));
        entry.pulse.scale.setScalar(0.7 + intensity * 0.8);
      });
      renderer.render(scene, camera);
      if (activeRef.current && intensity >= 1 && activeElapsed >= (reducedMotion ? 0.3 : durationMs / 1000) && !completeSent) {
        completeSent = true;
        onComplete?.();
        disposed = true;
        return;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    if (!readySent) {
      readyTimeout = window.setTimeout(() => {
        if (!readySent) { readySent = true; onReady?.(); }
      }, 2500);
    }

    return () => {
      disposed = true;
      if (readyTimeout !== undefined) window.clearTimeout(readyTimeout);
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          }
        }
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [durationMs, onComplete, onReady]);

  return <div ref={containerRef} className="absolute inset-0" aria-label="Rotating Earth with global network" role="img" />;
}
