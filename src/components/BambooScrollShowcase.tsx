'use client';

// ─────────────────────────────────────────────────────────────────────────
// Scroll-driven 3D product showcase for the bamboo joint holder ("The
// Promise" section). Modeled on the Apple product-page pattern: the section
// pins full-screen while the visitor scrolls, and that scroll progress
// drives the object's rotation and the camera's dolly-in — not a video, not
// a fixed render, an actual live Three.js scene reading scroll position
// every frame.
//
// This uses raw Three.js directly (matching src/components/ThreeViewer.tsx
// elsewhere in this codebase) rather than @react-three/fiber. R3F v8 (the
// version installed in this project) crashes on mount under this project's
// React 18.3.1 — a known upstream incompatibility (React 18.3 relocated
// internals R3F v8's reconciler bridge depends on; fixed in R3F v9, which
// is still pre-1.0). Raw Three.js sidesteps it entirely and is the pattern
// this codebase already relies on elsewhere.
//
// ── SWAP POINT — Brad's real model ─────────────────────────────────────
// The real bamboo joint-holder scan/model isn't ready yet, so the geometry
// built in `buildPlaceholderBamboo()` below is a procedural stand-in (two
// cylinders + an engraved plate) sized and lit to roughly match the real
// product's proportions. Once Brad delivers a .glb export:
//   1. Drop it at /public/models/bamboo-holder.glb
//   2. Replace the `buildPlaceholderBamboo()` call in the setup effect with
//      a GLTFLoader load (see ThreeViewer.tsx for the exact loader/DRACO
//      setup already used in this project) and add the loaded scene to
//      `group` in its place.
//   3. Delete buildPlaceholderBamboo().
// The scroll → rotation/zoom wiring doesn't need to change — it drives
// `group`, not the specific meshes inside it.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useScroll, useTransform, motion } from 'framer-motion';

function buildPlaceholderBamboo(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.4, 3.3, 32),
    new THREE.MeshStandardMaterial({ color: '#8a7148', roughness: 0.75, metalness: 0.05 })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.22, 32),
    new THREE.MeshStandardMaterial({ color: '#6b5636', roughness: 0.7 })
  );
  cap.position.y = 1.78;
  cap.castShadow = true;
  group.add(cap);

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.62),
    new THREE.MeshStandardMaterial({ color: '#2e2517', roughness: 0.9 })
  );
  plate.position.set(0, 0.15, 0.405);
  group.add(plate);

  return group;
}

interface BambooScrollShowcaseProps {
  title: string;
  subtitle: string;
  description: string;
}

export default function BambooScrollShowcase({ title, subtitle, description }: BambooScrollShowcaseProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });

  // Text leads the section, then steps aside once the object is close and
  // rotating in full detail — same beat Apple product pages use.
  const textOpacity = useTransform(scrollYProgress, [0, 0.18, 0.55, 0.75], [0, 1, 1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.18], [24, 0]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 0.3, 6.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(3, 5, 2);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe8c98a, 0.45);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xfff4e0, 0.25);
    fillLight.position.set(0, -2, 3);
    scene.add(fillLight);

    const bamboo = buildPlaceholderBamboo();
    scene.add(bamboo);

    const groundGeo = new THREE.PlaneGeometry(6, 6);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.85;
    ground.receiveShadow = true;
    scene.add(ground);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const progress = scrollYProgress.get();
      bamboo.rotation.y = progress * Math.PI * 4;
      camera.position.z = THREE.MathUtils.lerp(6.2, 2.3, progress);
      camera.position.y = THREE.MathUtils.lerp(0.3, -0.1, progress);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scrollYProgress]);

  return (
    <div ref={sectionRef} className="relative h-[280vh] bg-[#b88c41]">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
        }} />

        <div ref={canvasContainerRef} className="absolute inset-0" />

        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="relative z-10 max-w-lg px-6 text-center pointer-events-none"
        >
          <p className="uppercase tracking-widest text-xs sm:text-sm text-[#7c4d33] mb-3 font-roboto-light">
            {subtitle}
          </p>
          <h2 className="font-silver-garden text-3xl sm:text-4xl md:text-6xl font-bold text-[#0A0A0A] leading-tight">
            {title}
          </h2>
          <p className="mt-4 text-[#0A0A0A]/80 font-roboto-medium text-sm sm:text-base leading-relaxed">
            {description}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
