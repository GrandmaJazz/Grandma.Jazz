'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { assembleRecordScene, filterRecordTexture, recordFramingBox, recordPixelRatio, SharedRecordTextureLoader } from '@/lib/recordRendering';
import { prepareRecordGeometry } from '@/lib/recordDetails';
import { applyRecordAccent } from '@/lib/recordAccent';
import { applyRecordMetallic } from '@/lib/recordMetallic';
import { createRecordCameraFlight, FLIGHT_DURATION } from '@/lib/recordCameraFlight';
import { addRecordMacroDetails } from '@/lib/recordMacroDetails';
import LogoLoadingTrail from './LogoLoadingTrail';

type Playback = { seek: (time: number) => void; play: () => void; pause: () => void };

export default function RecordFlightPreview() {
  const host = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const clockText = useRef<HTMLOutputElement>(null);
  const chapter = useRef<HTMLParagraphElement>(null);
  const playback = useRef<Playback | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [playing, setPlaying] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let active = true, frame = 0, running = false, time = 0, previous = 0;
    let renderAt: ((seconds: number) => void) | undefined;
    let model: THREE.Object3D | undefined;
    let needleMixer: THREE.AnimationMixer | undefined, spinMixer: THREE.AnimationMixer | undefined;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, .008, 30);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .52;
    renderer.setClearColor(0x0a0a0a, 0);
    container.appendChild(renderer.domElement);
    const manager = new THREE.LoadingManager();
    const shared = new SharedRecordTextureLoader(manager);
    manager.addHandler(/surface-[a-f0-9]+\.webp$/, shared);
    const draco = new DRACOLoader(); draco.setDecoderPath('/draco/gltf/');
    const loader = new GLTFLoader(manager).setDRACOLoader(draco);
    const textures = new Set<THREE.Texture>();
    const light = (color: number, intensity: number, x: number, y: number, z: number) => {
      const l = new THREE.DirectionalLight(color, intensity); l.position.set(x, y, z); scene.add(l);
    };
    scene.add(new THREE.AmbientLight(0xffffff, .6));
    light(0xffffff, .7, 3, 5, 2);
    light(0xe8f1ff, 1.5, -5, 3, -5);
    light(0xffffff, 1.32, 0, 0, 5);
    light(0xf5f5f5, 1.2, 0, 3, -5);
    const glow = new THREE.PointLight(0xf0f8ff, 1.5, 8, 1.5); glow.position.set(.05, -.7, 0); scene.add(glow);

    const showTime = () => {
      if (slider.current) slider.current.value = String(time);
      if (clockText.current) clockText.current.value = `${time.toFixed(1)} / ${FLIGHT_DURATION.toFixed(1)}s`;
      if (container) container.dataset.flightTime = time.toFixed(2);
    };
    const tick = (now: number) => {
      if (!active || !running) return;
      if (previous) time = Math.min(FLIGHT_DURATION, time + Math.min((now - previous) / 1000, .05));
      previous = now;
      renderAt?.(time); showTime();
      if (time < FLIGHT_DURATION) frame = requestAnimationFrame(tick);
      else { running = false; setPlaying(false); }
    };
    const pause = () => { running = false; previous = 0; cancelAnimationFrame(frame); setPlaying(false); };
    const play = () => {
      if (!renderAt || running) return;
      if (time >= FLIGHT_DURATION) time = 0;
      running = true; previous = 0; setPlaying(true); frame = requestAnimationFrame(tick);
    };
    const seek = (seconds: number) => { pause(); time = THREE.MathUtils.clamp(seconds, 0, FLIGHT_DURATION); renderAt?.(time); showTime(); };
    playback.current = { seek, play, pause };
    const visibility = () => { if (document.hidden) pause(); };
    const contextLost = (event: Event) => { event.preventDefault(); pause(); setStatus('error'); };
    document.addEventListener('visibilitychange', visibility);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    const resize = () => { renderAt?.(time); };
    const observer = new ResizeObserver(resize); observer.observe(container);

    const disposeModel = () => {
      if (model) {
        const materials = new Set<THREE.Material>();
        model.traverse(node => { if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          for (const m of Array.isArray(node.material) ? node.material : [node.material]) materials.add(m);
        }});
        materials.forEach(m => { for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value); m.dispose(); });
      }
      textures.forEach(t => { if (!shared.owns(t)) t.dispose(); });
      model = undefined; textures.clear();
    };

    async function load() {
      try {
        const [needle, spin, cover] = await Promise.all([
          loader.loadAsync('/models/record-quality-v1/needle.glb'),
          loader.loadAsync('/models/record-quality-v1/spin.glb'),
          new THREE.TextureLoader().loadAsync('/images/records/965f3b262e52c6.webp'),
        ]);
        model = assembleRecordScene(needle.scene, spin.scene);
        textures.add(cover);
        if (!active) { disposeModel(); shared.dispose(); return; }
        // Measure the original resting shot before changing the coordinate origin.
        model.position.y = .2;
        const box = recordFramingBox(model), center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
        model.position.y = 0;
        if (!await prepareRecordGeometry(model, () => active)) { disposeModel(); return; }
        cover.colorSpace = THREE.SRGBColorSpace; cover.flipY = true;
        filterRecordTexture(cover, renderer.capabilities.getMaxAnisotropy());
        const accent = { value: new THREE.Color('#019457') }, artwork = { value: cover };
        model.traverse(node => {
          if (!(node instanceof THREE.Mesh)) return;
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            if (material instanceof THREE.MeshStandardMaterial) material.envMapIntensity = .8;
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) {
              filterRecordTexture(value, renderer.capabilities.getMaxAnisotropy()); textures.add(value);
            }
            applyRecordAccent(material, accent, artwork);
          }
        });
        applyRecordMetallic(model); addRecordMacroDetails(model); scene.add(model);
        needleMixer = new THREE.AnimationMixer(model); spinMixer = new THREE.AnimationMixer(model);
        const needleAction = needleMixer.clipAction(needle.animations[0]);
        needleAction.setLoop(THREE.LoopOnce, 1); needleAction.clampWhenFinished = true; needleAction.play();
        const spinAction = spinMixer.clipAction(spin.animations[0]); spinAction.play();
        let width = 0, height = 0, sample = createRecordCameraFlight(1440, 900, center, size);
        renderAt = seconds => {
          if (!active || !needleMixer || !spinMixer) return;
          const w = container!.clientWidth, h = container!.clientHeight;
          if (w !== width || h !== height) {
            width = w; height = h; camera.aspect = w / h;
            renderer.setPixelRatio(recordPixelRatio(w, h, window.devicePixelRatio)); renderer.setSize(w, h);
            sample = createRecordCameraFlight(w, h, center, size);
          }
          const state = sample(seconds);
          needleAction.paused = false; needleAction.enabled = true;
          needleMixer.setTime(Math.min(state.needleTime, 3.74999));
          spinMixer.setTime(state.spinTime);
          camera.position.copy(state.position); camera.lookAt(state.target); camera.fov = state.fov;
          if (state.viewOffset) camera.setViewOffset(width, height, 0, height * state.viewOffset, width, height);
          else camera.clearViewOffset();
          camera.updateProjectionMatrix(); renderer.toneMappingExposure = state.exposure;
          if (logo.current) logo.current.style.opacity = String(state.logoOpacity);
          if (chapter.current) chapter.current.textContent = state.chapter;
          renderer.render(scene, camera);
        };
        renderAt(0);
        if (typeof renderer.compileAsync === 'function') await renderer.compileAsync(scene, camera);
        if (!active) return;
        setStatus('ready');
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) seek(FLIGHT_DURATION);
        else seek(0);
      } catch (error) {
        if (active) { console.error('Record flight preview failed', error); setStatus('error'); }
      }
    }
    void load();
    return () => {
      active = false; running = false; cancelAnimationFrame(frame); playback.current = null;
      observer.disconnect(); document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      needleMixer?.stopAllAction(); spinMixer?.stopAllAction();
      disposeModel(); shared.dispose(); draco.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [run]);

  return <main className="fixed inset-0 z-[10000] overflow-hidden bg-[#0a0a0a] text-[#f3eee6]" aria-label="Under the Needle animation preview">
    <div ref={logo} className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 max-sm:-translate-y-24" aria-hidden="true">
      <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 flex justify-center">
        <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[450px] md:max-w-[600px] lg:max-w-[750px] xl:max-w-[900px] 2xl:max-w-[1100px] aspect-[3/1] -mt-[120px] xs:-mt-[140px] sm:-mt-[180px] md:-mt-[250px] lg:-mt-[280px] xl:-mt-[300px] 2xl:-mt-[350px]">
          <img src="/images/Grandma-Jazz-Logo-Heavier.webp" alt="" className="h-full w-full object-contain" />
        </div>
      </div>
    </div>
    <div ref={host} className="absolute inset-0" />
    <header className="absolute left-5 right-5 top-5 flex items-start justify-between gap-4 pointer-events-none">
      <div><p className="text-[10px] uppercase tracking-[.25em] text-[#b49b73]">Sessions with grandma · motion study 02</p><h1 className="mt-2 text-xl sm:text-2xl font-light">Under the Needle</h1></div>
      <a href="/" className="pointer-events-auto text-xs border border-white/25 rounded-full px-4 py-2 bg-black/60 hover:border-[#b49b73]">Website ↗</a>
    </header>
    {status !== 'ready' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#0a0a0a]" role="status">
      {status === 'loading' ? <><div className="relative w-[220px] h-[72px]"><img src="/images/Grandma-Jazz-Logo-Heavier.webp" alt="Grandma Jazz" className="w-full h-full object-contain opacity-40" /><LogoLoadingTrail /></div><p className="text-xs text-white/60">Preparing the close-up…</p></> : <><p>The preview couldn’t load on this device.</p><button onClick={() => { setStatus('loading'); setRun(r => r + 1); }} className="border rounded px-4 py-2">Try again</button><a href="/">Back to the website</a></>}
    </div>}
    <section className="absolute bottom-0 inset-x-0 px-5 pt-10 pb-[max(20px,env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/80 to-transparent" aria-label="Preview playback">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-4"><div><p ref={chapter} className="text-sm text-[#b49b73]">Under the needle</p><p className="mt-1 text-[10px] text-white/50">9-second camera study · silent preview</p></div>
          <button disabled={status !== 'ready'} onClick={() => playing ? playback.current?.pause() : playback.current?.play()} className="min-w-28 min-h-11 rounded-full border border-[#b49b73]/60 px-5 py-2 text-sm bg-black/60 hover:bg-[#b49b73]/15 disabled:opacity-40">{playing ? 'Pause' : 'Play film'}</button>
        </div>
        <div className="flex gap-4 items-center"><input ref={slider} aria-label="Film position" type="range" min="0" max={FLIGHT_DURATION} step=".01" defaultValue="0" disabled={status !== 'ready'} onInput={e => playback.current?.seek(Number(e.currentTarget.value))} className="w-full accent-[#b49b73] h-6" /><output ref={clockText} className="font-mono text-[10px] tabular-nums whitespace-nowrap text-white/60">0.0 / 9.0s</output></div>
      </div>
    </section>
  </main>;
}
