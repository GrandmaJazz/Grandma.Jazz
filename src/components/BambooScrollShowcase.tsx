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
//      fills roughly half the screen, dead center — "beyond the box".
//   4. Only once it's that close does rotation start (not from the start —
//      zoom first, then spin), and as it spins it also drifts off-axis,
//      ending pushed in tight against the left side of the screen, past
//      where the box ever sat.
//   5. While it rotates and drifts left, it also rises, and the section's
//      text rises in sync alongside it.
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
// itself (see "Real-photo textures" below), so the rotating object reads
// as genuine bamboo rather than a flat-colored stand-in. Once Brad
// delivers a .glb export:
//   1. Drop it at /public/models/bamboo-holder.glb
//   2. Replace `buildPlaceholderBamboo()` with a GLTFLoader load (see
//      ThreeViewer.tsx for the loader/DRACO setup already used here) and
//      add the loaded scene to `group` in its place.
//   3. Delete buildPlaceholderBamboo(), the texture-load code, and the
//      two /public/textures/bamboo-*.webp crops (no longer needed once
//      the model carries its own materials).
// The scroll choreography below doesn't need to change — it drives
// `group`/`camera`, not the specific mesh inside it.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import * as THREE from 'three';
import { useScroll, useTransform, motion } from 'framer-motion';

const BAMBOO_PHOTO_SRC = '/images/4.webp';

// Real-photo textures — small crops crocked straight out of the actual
// product photo (see git history for the crop script), NOT the full photo
// wrapped around the cylinder. Wrapping the full studio shot around a 360°
// UV smears its black background across the surface (tried previously,
// looked worse than a flat color). Instead: a mirrored, tileable strip of
// clean grain repeats around the cylinder body, and the actual engraved
// "Grandma Jazz" plate crop sits on the flat plaque face — both real photo
// pixels, applied where a 2D image actually reads correctly on a curved
// placeholder.
const BAMBOO_GRAIN_TEXTURE_SRC = '/textures/bamboo-grain-tile.webp';
const BAMBOO_PLATE_TEXTURE_SRC = '/textures/bamboo-plate.webp';

// Section height + phase breakpoints along scroll progress (0 → 1). Kept
// tight: every extra vh here is scroll distance where the visitor feels
// like nothing is happening, surrounded by this section's amber
// background — minimized by keeping the "small, not-yet-dynamic" phases
// (box grow, crossfade) short and giving the dynamic zoom/rotate phases
// most of the budget.
const SECTION_HEIGHT_VH = 180;
const PHOTO_GROW_END = 0.08; // flat boxed photo has grown/centered
const CROSSFADE_END = 0.16; // 3D scene fully takes over from the photo
const ZOOM_END = 0.5; // camera has dollied in to "fills half the screen, beyond the box"
// From ZOOM_END → 1: rotation + leftward drift + upward rise + text rises alongside it.

// Where the object ends up horizontally at the end of the rotate phase,
// expressed as a fraction of the half-frame-width in NDC terms
// (0 = dead center, -1 = pinned to the left edge). Computed against the
// camera's actual fov/aspect each frame (not a fixed world-unit offset) so
// "pushed against the left side" holds true across phone/desktop aspect
// ratios alike, not just the one screen size it was tuned on.
const LEFT_TARGET_NDC_X = -0.72;

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

  // Flat photo box — grows/centers, then hands off to the 3D scene. Sized
  // large from the start (not a small card), and cropped taller on narrow
  // viewports (see the aspect-[...] classes below) so it actually fills a
  // meaningful share of a tall phone screen instead of sitting as a short
  // landscape strip with amber space stacked above and below it.
  const photoScale = useTransform(scrollYProgress, [0, PHOTO_GROW_END], [1, 1.35]);
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
  const textRiseY = useTransform(scrollYProgress, [ZOOM_END, 1], [0, -100]);

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

    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.85;
    ground.receiveShadow = true;
    scene.add(ground);

    // Load the two real-photo texture crops (grain wrap + engraved plate)
    // before building the placeholder mesh. Both are tiny local assets, so
    // this resolves essentially immediately, but the mesh is only added to
    // the scene once textures are ready to avoid a flash of the default
    // white material.
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
      // Textures resolve asynchronously, after the loop's first tick has
      // likely already fired with an empty scene — force one extra render
      // as soon as the object actually exists, instead of waiting for
      // whatever the next rAF tick happens to be.
      renderFrame();
    });

    // A continuous rAF loop (not a scroll 'change' listener) — this is
    // what every scroll-scrubbed 3D experience (Apple's product pages
    // included) actually uses, since it stays perfectly smooth under
    // momentum/inertial scrolling. A discrete change-event listener would
    // depend on the scroll library's own internal batching cadence, which
    // isn't guaranteed to keep up with fast flicks. Matches the pattern
    // already used in ThreeViewer.tsx elsewhere in this codebase.
    const renderFrame = () => {
      if (!bamboo) {
        renderer.render(scene, camera);
        return;
      }

      const progress = scrollYProgress.get();

      // Crossfade the canvas in as the flat photo hands off.
      const fadeT = THREE.MathUtils.clamp(
        (progress - PHOTO_GROW_END) / (CROSSFADE_END - PHOTO_GROW_END),
        0,
        1
      );
      container.style.opacity = String(fadeT);

      // Zoom: dolly in from far (matching where the flat photo left off)
      // down to a close "fills roughly half the screen, beyond the box"
      // framing — tuned against this camera's 32° FOV so the object's full
      // height stays inside the frame instead of overflowing.
      const zoomT = THREE.MathUtils.clamp(
        (progress - PHOTO_GROW_END) / (ZOOM_END - PHOTO_GROW_END),
        0,
        1
      );
      const eased = 1 - (1 - zoomT) * (1 - zoomT); // ease-out, fast start
      const zoomedInZ = THREE.MathUtils.lerp(8, 6.5, eased);

      // Rotation + leftward drift + rise only start once fully zoomed in —
      // not from the start — and the camera holds roughly steady while it
      // spins (barely creeping in further) rather than continuing to zoom
      // in on top of the object rising, which was pushing it out of frame
      // at the top by the end (the earlier "model exits off the top of the
      // screen" bug — a pure function of scroll position, so identical
      // from either scroll direction).
      const spinT = THREE.MathUtils.clamp((progress - ZOOM_END) / (1 - ZOOM_END), 0, 1);
      const cameraZ = zoomT < 1 ? zoomedInZ : THREE.MathUtils.lerp(6.5, 6.4, spinT);
      bamboo.rotation.y = spinT * Math.PI * 4;
      bamboo.position.y = spinT * 0.9;

      // The object's true vertical center (cylinder body + cap together
      // span roughly [-1.65, 1.89] locally — not symmetric about 0, since
      // the cap sits on top). Tracking this exact offset — rather than an
      // approximate multiplier on position.y — is what keeps the object's
      // full height inside frame as it rises and the camera moves in
      // close; getting this wrong is exactly what caused the object to
      // clip out the top of the screen in the previous pass.
      const objectCenterY = bamboo.position.y + 0.12;

      // Drift off-axis toward the left side of the frame as it spins —
      // computed from the camera's actual fov/aspect/distance each frame
      // (not a fixed world-unit offset) so it lands at the same *visual*
      // position — pinned against the left edge — on a narrow phone
      // screen and a wide desktop one alike. The camera's lookAt target
      // stays centered on x=0 (below), so this reads as the object
      // pushing off-center rather than the camera panning to follow it.
      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const halfHeightAtDepth = Math.tan(vFovRad / 2) * cameraZ;
      const halfWidthAtDepth = halfHeightAtDepth * camera.aspect;
      const leftTargetX = LEFT_TARGET_NDC_X * halfWidthAtDepth;
      bamboo.position.x = spinT * leftTargetX;

      camera.position.set(0, 0.2, cameraZ);
      camera.lookAt(0, objectCenterY, 0);

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
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
          backgroundRepeat: 'repeat',
        }} />

        {/* Flat boxed photo — the starting state, same rounded-corner
            treatment as the other story images — that grows/centers
            before handing off to the live 3D scene. Taller aspect on
            narrow viewports so it actually fills the screen instead of
            reading as a short landscape strip surrounded by background. */}
        <motion.div
          className="absolute z-20 w-[90%] aspect-[3/4] sm:w-[74%] sm:aspect-[16/10] max-w-lg rounded-[15px] xl:rounded-[20px] overflow-hidden shadow-2xl shadow-black/30"
          style={{ scale: photoScale, opacity: photoOpacity }}
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
