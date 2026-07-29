'use client';

// ─────────────────────────────────────────────────────────────────────────
// Scroll-driven 3D product showcase for the bamboo joint holder ("The
// Promise" section).
//
// LAYOUT (fixed for the entire pin duration, every breakpoint including
// mobile — not just sm: and up): the section is split into two permanent,
// non-overlapping zones — the object lives in the LEFT zone, the text
// lives in the RIGHT zone. Neither zone's content can ever visually enter
// the other: each zone clips its own contents (overflow-hidden), so even
// a transform that pushes something further than intended gets cut off at
// the zone boundary rather than bleeding across it. This replaces an
// earlier approach (screen-relative drift + a shared centered stack) that
// produced two separate reported bugs: the object drifting off-frame
// before the section's scroll distance ran out, and text overlapping the
// object directly.
//
// CHOREOGRAPHY (driven by scroll progress through this pinned section):
//   1. Starts as a flat photo in a rounded box, centered in the object
//      zone; text fades in at the same time in the text zone.
//   2. The boxed photo grows slightly, then crossfades into the live 3D
//      scene at the same position/zone.
//   3. The camera dollies in once to a fixed, final framing — chosen
//      conservatively against the object zone's own aspect ratio so the
//      object's full height always stays inside that zone, never the
//      full screen.
//   4. From there the object only rotates in place — no further zoom, no
//      rise, no horizontal drift — for the remainder of the scroll, while
//      the text stays fully visible and static in its own zone. Motion
//      stays tied to scroll the whole time, so there's no dead stretch
//      where nothing on screen is changing.
//
// Raw Three.js (not @react-three/fiber — see git history: R3F v8 crashes
// under this project's React 18.3.1, a known upstream incompatibility).
// Matches the pattern already used in src/components/ThreeViewer.tsx.
//
// ── SWAP POINT — Brad's real model ─────────────────────────────────────
// The real bamboo joint-holder scan/model isn't ready yet. As an interim
// placeholder, the real product photo (/images/4.webp) is used both for
// the flat "box" phase below and — cropped into two small texture assets
// under /public/textures/ — as actual image textures on the 3D placeholder
// itself, so the rotating object reads as genuine bamboo rather than a
// flat-colored stand-in. Once Brad delivers a .glb export:
//   1. Drop it at /public/models/bamboo-holder.glb
//   2. Replace `buildPlaceholderBamboo()` with a GLTFLoader load (see
//      ThreeViewer.tsx for the loader/DRACO setup already used here) and
//      add the loaded scene to `group` in its place.
//   3. Delete buildPlaceholderBamboo(), the texture-load code, and the
//      two /public/textures/bamboo-*.webp crops.
// The choreography below doesn't need to change — it drives `group`/
// `camera`, not the specific mesh inside it.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import * as THREE from 'three';
import { useScroll, useTransform, motion } from 'framer-motion';

const BAMBOO_PHOTO_SRC = '/images/4.webp';
const BAMBOO_GRAIN_TEXTURE_SRC = '/textures/bamboo-grain-tile.webp';
const BAMBOO_PLATE_TEXTURE_SRC = '/textures/bamboo-plate.webp';

// Section height + phase breakpoints along scroll progress (0 → 1). Kept
// tight in the early phases (box grow, crossfade) — that's where the
// visitor feels like nothing is happening yet — and rotation runs
// continuously across the entire remainder, so there's no point in the
// scroll track where the object just sits idle.
const SECTION_HEIGHT_VH = 200;
const PHOTO_GROW_END = 0.08;
const CROSSFADE_END = 0.18;
// From CROSSFADE_END → 1: camera dollies to its final framing quickly,
// then holds fixed while the object rotates for the rest of the scroll.
const DOLLY_END = 0.32;

function buildPlaceholderBamboo(grainTexture: THREE.Texture, plateTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.4, 3.3, 48),
    new THREE.MeshStandardMaterial({ map: grainTexture, roughness: 0.8, metalness: 0.02 })
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
    new THREE.MeshStandardMaterial({ map: plateTexture, roughness: 0.85 })
  );
  plate.position.set(0, 0.15, 0.406);
  group.add(plate);

  // Object's local vertical center isn't 0 — the cap sits on top, so the
  // combined body+cap span is roughly [-1.65, 1.89]. Exposed so the render
  // loop can frame on the object's true center rather than an approximate
  // multiplier (getting this wrong is what caused a previous clipping bug),
  // and its half-extents are exposed too so the camera distance can be
  // solved for directly against whichever zone aspect it ends up in — the
  // object's own zone is a full-height column that's normal-ish on desktop
  // but very tall and narrow on a mobile portrait screen, so a single
  // fixed "looks right on my screen" distance clips on other aspects.
  group.userData.centerY = 0.12;
  group.userData.halfHeight = 1.77;
  group.userData.halfWidth = 0.4;

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

  const photoScale = useTransform(scrollYProgress, [0, PHOTO_GROW_END], [1, 1.3]);
  const photoOpacity = useTransform(scrollYProgress, [0, PHOTO_GROW_END, CROSSFADE_END], [1, 1, 0]);

  // Text fades in early (same time as the photo box) and simply stays put
  // — no rise, no drift — until it clears just before the next section.
  const textOpacity = useTransform(scrollYProgress, [0, 0.06, 0.94, 1], [0, 1, 1, 0]);
  const textEntranceY = useTransform(scrollYProgress, [0, 0.06], [16, 0]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0.2, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.85;
    ground.receiveShadow = true;
    scene.add(ground);

    const textureLoader = new THREE.TextureLoader();
    let bamboo: THREE.Group | null = null;

    Promise.all([
      textureLoader.loadAsync(BAMBOO_GRAIN_TEXTURE_SRC),
      textureLoader.loadAsync(BAMBOO_PLATE_TEXTURE_SRC),
    ]).then(([grainTexture, plateTexture]) => {
      grainTexture.colorSpace = THREE.SRGBColorSpace;
      grainTexture.wrapS = THREE.RepeatWrapping;
      grainTexture.wrapT = THREE.ClampToEdgeWrapping;
      grainTexture.repeat.set(7, 1);

      plateTexture.colorSpace = THREE.SRGBColorSpace;

      bamboo = buildPlaceholderBamboo(grainTexture, plateTexture);
      scene.add(bamboo);
      renderFrame();
    });

    const renderFrame = () => {
      if (!bamboo || renderer.getSize(new THREE.Vector2()).x === 0) {
        renderer.render(scene, camera);
        return;
      }

      const progress = scrollYProgress.get();

      const fadeT = THREE.MathUtils.clamp(
        (progress - PHOTO_GROW_END) / (CROSSFADE_END - PHOTO_GROW_END),
        0,
        1
      );
      container.style.opacity = String(fadeT);

      // The "fits without clipping" camera distance, solved directly from
      // the object's real half-height/half-width against the CURRENT
      // camera aspect — not a fixed magic number. The object's own zone is
      // a full-height column that's roughly landscape on desktop but very
      // tall and narrow on a mobile portrait screen, so whichever axis
      // (vertical or horizontal) is tighter for the current aspect decides
      // the distance; a fixed distance tuned on one aspect clips on others.
      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const halfHeightFactor = Math.tan(vFovRad / 2);
      const halfHeight = bamboo.userData.halfHeight as number;
      const halfWidth = bamboo.userData.halfWidth as number;
      const MARGIN = 1.2;
      const zForHeight = (halfHeight * MARGIN) / halfHeightFactor;
      const zForWidth = (halfWidth * MARGIN) / (halfHeightFactor * camera.aspect);
      const fitZ = Math.max(zForHeight, zForWidth);

      // Dolly in once, early, from further out down to that fit distance —
      // then hold completely still for the rest of the scroll. Only
      // rotation is still tied to progress past this point, which is what
      // actually guarantees the object can never drift out of its zone:
      // nothing about its position or the camera's position changes
      // anymore once the dolly finishes.
      const dollyT = THREE.MathUtils.clamp(
        (progress - CROSSFADE_END) / (DOLLY_END - CROSSFADE_END),
        0,
        1
      );
      const eased = 1 - (1 - dollyT) * (1 - dollyT);
      const cameraZ = THREE.MathUtils.lerp(fitZ * 1.55, fitZ, eased);

      const spinT = THREE.MathUtils.clamp((progress - DOLLY_END) / (1 - DOLLY_END), 0, 1);
      // A little over 2 full turns across the whole remaining scroll —
      // always visibly moving, never a jarring instant snap.
      bamboo.rotation.y = spinT * Math.PI * 4.4;

      const objectCenterY = bamboo.userData.centerY as number;
      camera.position.set(0, 0.2, cameraZ);
      camera.lookAt(0, objectCenterY, 0);

      renderer.render(scene, camera);
    };

    // Robust sizing: a ResizeObserver — not a one-time clientWidth/Height
    // read at mount plus a window 'resize' listener. The one-time read was
    // a real, confirmed bug: this container sits inside a sticky/flex
    // layout with percentage heights, and its first-paint size can
    // genuinely be 0×0 for a frame before that layout settles. When that
    // happened, the renderer permanently rendered into a 0×0 buffer since
    // nothing ever re-measured it afterward — the object was there, just
    // rendered into nothing. A ResizeObserver re-fires with the container's
    // real size as soon as layout stabilizes, and again on every genuine
    // size change (orientation change, breakpoint change, etc).
    const applySize = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderFrame();
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      applySize(width, height);
    });
    resizeObserver.observe(container);
    // Also apply immediately in case ResizeObserver's first callback is
    // deferred a tick and the container already has a real size now.
    applySize(container.clientWidth, container.clientHeight);

    let frameId: number;
    const tick = () => {
      renderFrame();
      frameId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial;
            mat.map?.dispose();
            mat.dispose();
          });
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scrollYProgress]);

  return (
    // Height driven by SECTION_HEIGHT_VH via inline style rather than a
    // Tailwind h-[...] class — Tailwind's build-time scanner can't see a
    // runtime-interpolated class name, so a template-literal class here
    // would silently compile to no CSS at all.
    <div ref={sectionRef} className="relative bg-[#b88c41]" style={{ height: `${SECTION_HEIGHT_VH}vh` }}>
      {/* Two permanent zones, side by side at EVERY breakpoint (including
          mobile — deliberately not stacked) — object left, text right.
          Each zone clips its own content, so neither can ever visually
          reach into the other regardless of any in-zone transform. */}
      <div className="sticky top-0 h-screen w-full flex flex-row">
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
        }} />

        {/* Object zone — left. */}
        <div className="relative w-[42%] sm:w-1/2 h-full overflow-hidden flex items-center justify-center">
          <motion.div
            className="absolute z-20 w-[88%] aspect-[3/4] sm:w-[74%] sm:aspect-[16/10] max-w-sm sm:max-w-md rounded-[12px] sm:rounded-[15px] xl:rounded-[20px] overflow-hidden shadow-2xl shadow-black/30"
            style={{ scale: photoScale, opacity: photoOpacity }}
          >
            <Image
              src={BAMBOO_PHOTO_SRC}
              alt="An engraved bamboo joint holder, one of Grandma Jazz's plastic-free touches since 2023"
              fill
              className="object-cover"
              sizes="45vw"
              quality={85}
            />
          </motion.div>

          <div ref={canvasContainerRef} className="absolute inset-0 z-10" />
        </div>

        {/* Text zone — right. */}
        <div className="relative w-[58%] sm:w-1/2 h-full overflow-hidden flex items-center px-4 sm:px-8 md:px-12">
          <motion.div
            style={{ opacity: textOpacity, y: textEntranceY }}
            className="relative z-30 max-w-md pointer-events-none"
          >
            <p className="uppercase tracking-widest text-xs sm:text-base text-[#3d2612] mb-2 sm:mb-3 font-roboto-medium drop-shadow-[0_1px_1px_rgba(255,255,255,0.25)]">
              {subtitle}
            </p>
            <h2 className="font-silver-garden text-4xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl font-black text-[#0A0A0A] leading-[1.05] tracking-tight drop-shadow-[0_2px_2px_rgba(255,255,255,0.2)]">
              {title}
            </h2>
            <p className="mt-3 sm:mt-5 text-[#0A0A0A] font-roboto-medium text-sm sm:text-lg leading-relaxed">
              {description}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
