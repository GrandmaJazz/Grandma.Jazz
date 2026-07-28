'use client';

// ─────────────────────────────────────────────────────────────────────────
// Scroll-driven 3D product showcase for the bamboo joint holder ("The
// Promise" section). Choreography (all driven by scroll progress through
// this pinned section):
//   1. Starts as a flat photo in a rounded box — same treatment as the
//      other story images — sitting at rest.
//   2. As the visitor scrolls in, that boxed photo grows and converges to
//      screen-center ("zooms down").
//   3. It crossfades into the live 3D scene at roughly the same size/
//      position, which keeps dollying the camera in until the object
//      fills roughly half the screen in close-up.
//   4. Only once it's that close does rotation start (not from the start —
//      zoom first, then spin).
//   5. While it rotates, it also drifts upward, and the section's text
//      rises in sync alongside it.
//
// Raw Three.js (not @react-three/fiber — see git history: R3F v8 crashes
// under this project's React 18.3.1, a known upstream incompatibility).
// Matches the pattern already used in src/components/ThreeViewer.tsx.
//
// ── SWAP POINT — Brad's real model ─────────────────────────────────────
// The real bamboo joint-holder scan/model isn't ready yet. As an interim
// placeholder, the real product photo (/images/4.webp) is used for the
// flat "box" phase below (phase 1) so the high-detail moment is real —
// it's only the rotating 3D placeholder itself that's a plain-colored
// stand-in (photo-texture-wrapping a cylinder that was never shot for
// 360° UV mapping just smears the photo's black studio background across
// the surface — worse than plain color, so skipped). Once Brad delivers
// a .glb export:
//   1. Drop it at /public/models/bamboo-holder.glb
//   2. Replace `buildPlaceholderBamboo()` with a GLTFLoader load (see
//      ThreeViewer.tsx for the loader/DRACO setup already used here) and
//      add the loaded scene to `group` in its place.
//   3. Delete buildPlaceholderBamboo() and the texture-load code.
// The scroll choreography below doesn't need to change — it drives
// `group`/`camera`, not the specific mesh inside it.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import * as THREE from 'three';
import { useScroll, useTransform, motion } from 'framer-motion';

const BAMBOO_PHOTO_SRC = '/images/4.webp';

// Phase breakpoints along the section's scroll progress (0 → 1).
const PHOTO_GROW_END = 0.14; // flat boxed photo has grown/centered
const CROSSFADE_END = 0.26; // 3D scene fully takes over from the photo
const ZOOM_END = 0.58; // camera has dollied in to "fills half the screen"
// From ZOOM_END → 1: rotation + upward drift + text rises alongside it.

function buildPlaceholderBamboo(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.4, 3.3, 48),
    new THREE.MeshStandardMaterial({ color: '#8a7148', roughness: 0.75, metalness: 0.05 })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.22, 48),
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

  // Flat photo box — grows/centers, then hands off to the 3D scene.
  const photoScale = useTransform(scrollYProgress, [0, PHOTO_GROW_END], [1, 1.7]);
  const photoOpacity = useTransform(scrollYProgress, [0, PHOTO_GROW_END, CROSSFADE_END], [1, 1, 0]);

  // Text stays clear of the photo-box phase (it would just overlap that
  // image), fades in once the 3D scene has taken over, then rises in sync
  // with the object through the rotate phase and clears before the next
  // section.
  const textOpacity = useTransform(
    scrollYProgress,
    [CROSSFADE_END, CROSSFADE_END + 0.06, 0.92, 1],
    [0, 1, 1, 0]
  );
  const textEntranceY = useTransform(scrollYProgress, [CROSSFADE_END, CROSSFADE_END + 0.06], [24, 0]);
  const textRiseY = useTransform(scrollYProgress, [ZOOM_END, 1], [0, -170]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 0.2, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    container.style.opacity = '0';

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 5, 2);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe8c98a, 0.5);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xfff4e0, 0.3);
    fillLight.position.set(0, -2, 3);
    scene.add(fillLight);

    const bamboo = buildPlaceholderBamboo();
    scene.add(bamboo);

    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.85;
    ground.receiveShadow = true;
    scene.add(ground);

    // A continuous rAF loop (not a scroll 'change' listener) — this is
    // what every scroll-scrubbed 3D experience (Apple's product pages
    // included) actually uses, since it stays perfectly smooth under
    // momentum/inertial scrolling. A discrete change-event listener would
    // depend on the scroll library's own internal batching cadence, which
    // isn't guaranteed to keep up with fast flicks. Matches the pattern
    // already used in ThreeViewer.tsx elsewhere in this codebase.
    const renderFrame = () => {
      const progress = scrollYProgress.get();

      // Crossfade the canvas in as the flat photo hands off.
      const fadeT = THREE.MathUtils.clamp(
        (progress - PHOTO_GROW_END) / (CROSSFADE_END - PHOTO_GROW_END),
        0,
        1
      );
      container.style.opacity = String(fadeT);

      // Zoom: dolly in from far (matching where the flat photo left off)
      // down to a close "fills roughly half the screen" framing — tuned
      // against this camera's 32° FOV so the object's full height stays
      // inside the frame instead of overflowing into a flat color-fill.
      const zoomT = THREE.MathUtils.clamp(
        (progress - PHOTO_GROW_END) / (ZOOM_END - PHOTO_GROW_END),
        0,
        1
      );
      const eased = 1 - (1 - zoomT) * (1 - zoomT); // ease-out, fast start
      const zoomedInZ = THREE.MathUtils.lerp(9, 7.2, eased);

      // Rotation only starts once fully zoomed in — not from the start —
      // and the camera keeps easing in slightly further while it spins.
      const spinT = THREE.MathUtils.clamp((progress - ZOOM_END) / (1 - ZOOM_END), 0, 1);
      const cameraZ = zoomT < 1 ? zoomedInZ : THREE.MathUtils.lerp(7.2, 5.4, spinT);
      bamboo.rotation.y = spinT * Math.PI * 4;
      bamboo.position.y = spinT * 1.5;

      camera.position.set(0, 0.2, cameraZ);
      camera.lookAt(0, bamboo.position.y * 0.55, 0);

      renderer.render(scene, camera);
    };

    let frameId: number;
    const tick = () => {
      renderFrame();
      frameId = requestAnimationFrame(tick);
    };
    tick();

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

        {/* Flat boxed photo — the starting state, same rounded-corner
            treatment as the other story images — that grows/centers
            before handing off to the live 3D scene. */}
        <motion.div
          className="absolute z-20 w-[70%] sm:w-[60%] max-w-md rounded-[15px] xl:rounded-[20px] overflow-hidden shadow-2xl shadow-black/30"
          style={{ aspectRatio: '16/10', scale: photoScale, opacity: photoOpacity }}
        >
          <Image
            src={BAMBOO_PHOTO_SRC}
            alt="An engraved bamboo joint holder, one of Grandma Jazz's plastic-free touches since 2023"
            fill
            className="object-cover"
            sizes="60vw"
            quality={85}
          />
        </motion.div>

        <div ref={canvasContainerRef} className="absolute inset-0 z-10" />

        <motion.div
          style={{ opacity: textOpacity, y: useTransform([textEntranceY, textRiseY], ([a, b]) => (a as number) + (b as number)) }}
          className="relative z-30 max-w-lg px-6 text-center pointer-events-none"
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
