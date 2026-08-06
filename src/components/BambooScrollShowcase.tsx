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
//      zone; text fades in at the same time in the text zone. Kept very
//      short — this and the crossfade below used to eat a big chunk of
//      the scroll track before anything interesting happened.
//   2. The boxed photo grows slightly, then crossfades into the live 3D
//      scene at the same position/zone.
//   3. The camera dollies in continuously until it fills the object zone
//      edge to edge — sized against the zone's own real aspect ratio, not
//      a fixed distance, so it fills the zone on any screen without
//      clipping. Rotation and rise (step 4) start mid-dolly, not after it
//      finishes, so the zoom and the spin overlap rather than handing off
//      with a hard cut.
//   4. The object rotates AND rises continuously from partway through the
//      dolly all the way to the section's end — camera distance holds
//      once the dolly finishes, but its lookAt target keeps tracking the
//      rising object, so there is never a point where the screen just
//      holds still; something is always visibly moving in direct
//      response to scroll, right up until the section hands off.
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
// VERY tight in the early phases (box grow, crossfade, dolly-in) — that's
// where the visitor feels like nothing worthwhile is happening yet — so
// the object reaches its final size almost immediately and nearly all of
// the scroll track is spent on continuous rotate+rise, which is the part
// that's actually supposed to hold attention.
const SECTION_HEIGHT_VH = 200;
const PHOTO_GROW_END = 0.04;
const CROSSFADE_END = 0.09;
// Zoom (camera dolly-in) and rotate+rise now OVERLAP rather than running
// as strictly separate phases: zoom starts right after the crossfade,
// rotation/rise kick in partway through that zoom (while it's still
// closing in), and then continue alone once the zoom finishes. That
// overlap — not a hard handoff — is what keeps the screen from ever
// reading as "stopped" between the zoom and the spin.
const ZOOM_END = 0.4; // camera reaches its final, tightest framing here
const ROTATE_START = 0.2; // rotation/rise begin mid-zoom, continue to progress=1

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

  // Engraved-plate band — measured directly off the real product photo
  // (/images/4.webp) rather than guessed: there, the plate sits high on
  // the shaft (just under the cap seam, not mid-body), is noticeably
  // narrower than the shaft itself, and is a tall rounded rectangle (its
  // own aspect ratio is ~2.05 height:width). A curved band matching the
  // cylinder's actual local radius at that height — not a flat plane
  // floating in front of it — is what actually reads as "wrapped onto"
  // the surface instead of a sticker glued on top of it.
  const PLATE_CENTER_Y = 1.2; // high on the shaft, just below the cap seam
  const PLATE_HEIGHT = 0.48;
  const PLATE_WIDTH = 0.233; // arc width, matches the photo's plate proportions
  // Cylinder tapers (radiusTop 0.34 at y=1.65 → radiusBottom 0.4 at y=-1.65);
  // interpolate the local radius at the plate's height so the band sits
  // flush against the surface instead of floating off it or cutting in.
  const taperT = (PLATE_CENTER_Y + 1.65) / 3.3;
  const plateRadius = THREE.MathUtils.lerp(0.4, 0.34, taperT) + 0.004;
  const plateAngularWidth = PLATE_WIDTH / plateRadius;
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(
      plateRadius, plateRadius, PLATE_HEIGHT,
      16, 1, true,
      -plateAngularWidth / 2, plateAngularWidth
    ),
    new THREE.MeshStandardMaterial({ map: plateTexture, roughness: 0.85, side: THREE.DoubleSide })
  );
  plate.position.y = PLATE_CENTER_Y;
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
      // A tight fill margin, not a cautious one: the object should end up
      // filling its zone edge to edge (this is a cylinder rotating purely
      // about its own vertical axis, so its silhouette width is the same
      // at every rotation angle — there's no risk of it "growing" wider
      // mid-spin and clipping after this distance is chosen). Still a
      // hair of margin (6%), not zero, so antialiasing at the true edge
      // never reads as a hard clip.
      const MARGIN = 1.06;
      const zForHeight = (halfHeight * MARGIN) / halfHeightFactor;
      const zForWidth = (halfWidth * MARGIN) / (halfHeightFactor * camera.aspect);
      const fitZ = Math.max(zForHeight, zForWidth);

      // Zoom continues smoothly from the crossfade until ZOOM_END — and
      // rotation/rise (below) start mid-zoom, at ROTATE_START, rather than
      // waiting for the zoom to finish first. That overlap is what keeps
      // the screen from ever holding a static frame between "zooming in"
      // and "spinning" — the previous version handed off from one to the
      // other with a hard cut, which read as the motion briefly stopping.
      const zoomT = THREE.MathUtils.clamp(
        (progress - CROSSFADE_END) / (ZOOM_END - CROSSFADE_END),
        0,
        1
      );
      const eased = 1 - (1 - zoomT) * (1 - zoomT);
      const cameraZ = THREE.MathUtils.lerp(fitZ * 1.5, fitZ, eased);

      const spinT = THREE.MathUtils.clamp((progress - ROTATE_START) / (1 - ROTATE_START), 0, 1);
      // Rotation AND rise run together continuously from ROTATE_START all
      // the way to the section's end — every bit of scroll from there on
      // still visibly moves something. A bit over 1 full turn (not the
      // ~2.2 turns this had before): with the rise now also carrying the
      // motion, that much spin read as excessive once it was no longer
      // the only thing moving.
      bamboo.rotation.y = -spinT * Math.PI * 2.4;
      bamboo.position.y = spinT * 1.4;

      // Camera keeps looking at the object's true center as it rises —
      // since lookAt always recenters the frame on that target, the same
      // fit-distance math above still guarantees no clipping regardless
      // of how high the object has risen or how close the zoom has
      // gotten.
      const objectCenterY = bamboo.position.y + (bamboo.userData.centerY as number);
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
    <div ref={sectionRef} className="relative bg-[#181818]" style={{ height: `${SECTION_HEIGHT_VH}vh` }}>
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
            <p className="uppercase tracking-widest text-xs sm:text-base text-[#F5F1E6]/60 mb-2 sm:mb-3 font-label-mono">
              {subtitle}
            </p>
            <h2 className="font-silver-garden text-4xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl font-black text-[#F5F1E6] leading-[1.05] tracking-tight">
              {title}
            </h2>
            <p className="mt-3 sm:mt-5 text-[#F5F1E6]/80 font-roboto-medium text-sm sm:text-lg leading-relaxed">
              {description}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
