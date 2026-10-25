'use client';

import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { gsap } from 'gsap';
import { fitRecordCamera } from '@/lib/recordViewport';
import { applyRecordAccent } from '@/lib/recordAccent';
import { applyRecordMetallic } from '@/lib/recordMetallic';
import { assembleRecordScene, filterRecordTexture, recordFramingBox, recordPixelRatio, SharedRecordTextureLoader } from '@/lib/recordRendering';

type SceneRefs = {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControls | null;
  mixer1: THREE.AnimationMixer | null;
  mixer2: THREE.AnimationMixer | null;
  clock: THREE.Clock | null;
  frameId: number | null;
  model1: THREE.Object3D | null;
  model2: THREE.Object3D | null;
  modelSize: THREE.Vector3 | null;
  modelCenter: THREE.Vector3 | null;
  isMobile: boolean;
  tweens: gsap.core.Tween[];
  animationActions1: THREE.AnimationAction[];
  animationActions2: THREE.AnimationAction[];
  animationEnabled: boolean;
  modelLayer: number;
  backgroundLayer: number;
  assetsManager: AssetsManager | null;
  isModel1Loaded: boolean;
  isModel2Loaded: boolean;
  isModel2Loading: boolean;
  isModelLoading: boolean;
  isGsapAnimationComplete: boolean;
  isModel1AnimationComplete: boolean;
  isModel2AnimationStarted: boolean;
  currentPhase: 'loading' | 'gsap' | 'model1_anim' | 'transition' | 'model2_anim';
  preloadedModel2Gltf: any;
  model2Warmup: Promise<void> | null;
  lights: {
    spotLight: THREE.SpotLight | null;
    ringLight: THREE.PointLight | null;
    mainLight: THREE.DirectionalLight | null;
    ambientLight: THREE.AmbientLight | null;
    rimLight: THREE.DirectionalLight | null;
    frontLight: THREE.DirectionalLight | null;
    backLight: THREE.DirectionalLight | null;
  } | null;
  needsRender: boolean;
}

interface ThreeViewerRef {
  preloadModel: () => void;
  triggerModelMovement: () => void;
  playRecordIntro: () => void;
  startModel1AnimationsFromCardSelection: () => void;
}

interface ThreeViewerProps {
  modelPath?: string;
  className?: string;
  height?: string;
  onModelLoaded?: () => void;
  onModel2Started?: () => void;
  accentColor?: string;
  artworkSrc?: string;
}

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1025,
  xl: 1280,
  xxl: 1440
};

const ANIMATION_CONFIG = {
  duration: 3,
  ease: "sine.inOut",
  initialDelay: 0,
  targetX: 0.05
};

const SHADOW_MAP_SIZE = 1024;

class AssetsManager {
  assets: Map<string, any>;
  loaders: { gltf: GLTFLoader; texture: THREE.TextureLoader };
  draco: DRACOLoader;
  sharedTextures: SharedRecordTextureLoader;
  pending = new Map<string, Promise<any>>();
  
  constructor() {
    this.assets = new Map();
    this.draco = new DRACOLoader();
    this.draco.setDecoderPath('/draco/gltf/');
    this.draco.setDecoderConfig({ type: 'wasm' });
    const manager = new THREE.LoadingManager();
    this.sharedTextures = new SharedRecordTextureLoader(manager);
    manager.addHandler(/surface-[a-f0-9]+\.webp$/, this.sharedTextures);
    this.loaders = { gltf: new GLTFLoader(manager), texture: new THREE.TextureLoader(manager) };
    this.loaders.gltf.setDRACOLoader(this.draco);
  }
  
  async loadAsset(type: 'gltf' | 'texture', url: string, onProgress?: (event: ProgressEvent) => void): Promise<any> {
    if (this.assets.has(url)) return this.assets.get(url);
    const pending = this.pending.get(url);
    if (pending) return pending;
    const request = new Promise((resolve, reject) => {
      this.loaders[type].load(url, (asset) => {
        this.assets.set(url, asset);
        resolve(asset);
      }, onProgress, reject);
    });
    this.pending.set(url, request);
    try { return await request; }
    finally { this.pending.delete(url); }
  }

  dispose() {
    this.sharedTextures.dispose();
    this.draco.dispose();
    this.assets.clear();
  }
}

const createLight = (
  type: 'ambient' | 'directional' | 'spot' | 'point',
  color: number,
  intensity: number,
  position?: [number, number, number],
  options?: any
) => {
  const lights = {
    ambient: () => new THREE.AmbientLight(color, intensity),
    directional: () => {
      const light = new THREE.DirectionalLight(color, intensity);
      if (position) light.position.set(...position);
      return light;
    },
    spot: () => {
      const light = new THREE.SpotLight(color, intensity);
      if (position) light.position.set(...position);
      if (options) Object.assign(light, options);
      return light;
    },
    point: () => {
      const light = new THREE.PointLight(color, intensity);
      if (position) light.position.set(...position);
      if (options) Object.assign(light, options);
      return light;
    }
  };
  return lights[type]();
};

const createLights = (scene: THREE.Scene, modelLayer: number) => {
  const ambientLight = createLight('ambient', 0xffffff, 0.6) as THREE.AmbientLight;
  scene.add(ambientLight);

  const mainLight = createLight('directional', 0xffffff, 0.7, [3, 5, 2]) as THREE.DirectionalLight;
  mainLight.castShadow = true;
  mainLight.shadow.bias = -0.0001;
  mainLight.shadow.mapSize.setScalar(SHADOW_MAP_SIZE);
  Object.assign(mainLight.shadow.camera, { near: 0.5, far: 50, left: -10, right: 10, top: 10, bottom: -10 });
  mainLight.layers.set(modelLayer);
  scene.add(mainLight);

  const rimLight = createLight('directional', 0xe8f1ff, 1.5, [-5, 3, -5]) as THREE.DirectionalLight;
  rimLight.layers.set(modelLayer);
  scene.add(rimLight);

  const frontLight = createLight('directional', 0xffffff, 1.32, [0, 0, 5]) as THREE.DirectionalLight;
  frontLight.layers.set(modelLayer);
  scene.add(frontLight);

  const spotLight = createLight('spot', 0xffffff, 1, [0, 10, 0], {
    angle: Math.PI / 6,
    penumbra: 100,
    decay: 1.0,
    distance: 30,
    castShadow: false
  }) as THREE.SpotLight;
  spotLight.shadow.mapSize.setScalar(SHADOW_MAP_SIZE);
  spotLight.layers.set(modelLayer);
  scene.add(spotLight);

  const ringLight = createLight('point', 0xf0f8ff, 1.5, [0, -0.5, 0], { distance: 8, decay: 1.5 }) as THREE.PointLight;
  ringLight.layers.set(modelLayer);
  scene.add(ringLight);

  const backLight = createLight('directional', 0xf5f5f5, 1.2, [0, 3, -5]) as THREE.DirectionalLight;
  backLight.layers.set(modelLayer);
  scene.add(backLight);

  return { spotLight, ringLight, mainLight, ambientLight, rimLight, frontLight, backLight };
};

const enhanceMaterial = (material: THREE.Material, maxAnisotropy: number) => {
  if (!material) return;
  
  if (material instanceof THREE.MeshStandardMaterial) {
    // Retain the artist's roughness, metalness and normal strength. Flattening
    // them loses the fine machining around the platter and tonearm base.
    material.envMapIntensity = 0.8;
    // All maps need stable minification, including the 4K roughness/AO maps.
    // Filtering just the colour map leaves moving metal details shimmering.
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) filterRecordTexture(value, maxAnisotropy);
    }
  }
  
  if (material instanceof THREE.MeshPhysicalMaterial) {
    Object.assign(material, { clearcoat: 0.3, clearcoatRoughness: 0.4, reflectivity: 0.5 });
  }
};

const ThreeViewer = forwardRef<ThreeViewerRef, ThreeViewerProps>(({
  modelPath = '/models/record-quality-v1/needle.glb',
  className = 'bg-telepathic-beige',
  height = 'h-screen',
  onModelLoaded,
  onModel2Started,
  accentColor = '#B49B73',
  artworkSrc,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<SceneRefs>({
    renderer: null, scene: null, camera: null, controls: null,
    mixer1: null, mixer2: null, clock: null, frameId: null,
    model1: null, model2: null, modelSize: null, modelCenter: null,
    isMobile: false, tweens: [], animationActions1: [], animationActions2: [],
    animationEnabled: false, modelLayer: 1, backgroundLayer: 0,
    assetsManager: null,
    isModel1Loaded: false, isModel2Loaded: false, isModel2Loading: false, isModelLoading: false,
    isGsapAnimationComplete: false, isModel1AnimationComplete: false,
    isModel2AnimationStarted: false, currentPhase: 'loading',
    preloadedModel2Gltf: null, model2Warmup: null, lights: null, needsRender: true
  });
  
  const accentUniform = useMemo(() => ({ value: new THREE.Color() }), []);
  const blankArtwork = useMemo(() => {
    const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    texture.needsUpdate = true;
    return texture;
  }, []);
  const artworkUniform = useMemo(() => ({ value: blankArtwork as THREE.Texture }), [blankArtwork]);

  useEffect(() => {
    let active = true;
    artworkUniform.value = blankArtwork;
    sceneRefs.current.needsRender = true;
    if (!artworkSrc) return;
    // The picker has already downloaded/decoded this 1024px cover. Reuse its
    // cache entry; upload it once, shared by needle-drop and spinning models.
    const texture = new THREE.TextureLoader().load(artworkSrc, loaded => {
      if (!active) { loaded.dispose(); return; }
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.flipY = true; // Standalone covers read upright on the record face.
      filterRecordTexture(loaded, sceneRefs.current.renderer?.capabilities.getMaxAnisotropy() ?? 1);
      sceneRefs.current.renderer?.initTexture(loaded);
      artworkUniform.value = loaded;
      sceneRefs.current.needsRender = true;
    }, undefined, () => { /* Leave a black label if an unavailable upload fails. */ });
    return () => {
      active = false;
      if (artworkUniform.value === texture) artworkUniform.value = blankArtwork;
      texture.dispose();
    };
  }, [artworkSrc, artworkUniform, blankArtwork]);

  useEffect(() => () => blankArtwork.dispose(), [blankArtwork]);

  // A colour change updates one uniform; it never reloads the scene, textures
  // or shaders, including the prewarmed spinning model.
  useEffect(() => {
    accentUniform.value.set(accentColor);
    sceneRefs.current.needsRender = true;
  }, [accentColor, accentUniform]);

  // Intro choreography flags:
  // - deferReveal: model loads but stays hidden until an album is picked, so
  //   the camera reveal plays on a clean black stage (not behind the carousel).
  // - autoStartModel1: after that reveal completes, roll into the needle-drop.
  const deferRevealRef = useRef(false);
  const autoStartModel1Ref = useRef(false);
  const startModel1AnimationsRef = useRef<() => void>(() => {});
  const transitionRef = useRef<() => void>(() => {});
  // Guarantees the reveal -> needle-drop handoff fires even if GSAP's
  // onComplete doesn't (see playRecordIntro).
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const killAllTweens = useCallback(() => {
    const refs = sceneRefs.current;
    refs.tweens.forEach(tween => tween.kill());
    refs.tweens = [];
  }, []);
  
  const playAnimations = useCallback((actions: THREE.AnimationAction[], mixer: THREE.AnimationMixer | null) => {
    if (actions.length > 0 && mixer) {
      actions.forEach(action => {
        if (action.paused) action.paused = false;
        if (!action.isRunning()) action.play();
      });
    }
  }, []);
  
  const startAllAnimations = useCallback((delay = 0) => {
    const refs = sceneRefs.current;
    const execute = () => {
      refs.animationEnabled = true;
      playAnimations(refs.animationActions1, refs.mixer1);
      refs.clock?.getDelta();
    };
    delay > 0 ? setTimeout(execute, delay * 1000) : execute();
  }, [playAnimations]);
  
  const pauseAllAnimations = useCallback(() => {
    const refs = sceneRefs.current;
    refs.animationEnabled = false;
    refs.animationActions1.forEach(action => action.paused = true);
  }, []);
  
  const setupModelMaterials = useCallback((model: THREE.Object3D, layer: number, renderer: THREE.WebGLRenderer) => {
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    model.traverse((node: THREE.Object3D) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = !(node.material instanceof THREE.MeshBasicMaterial);
        node.receiveShadow = true;
        node.layers.set(layer);
        if (node.material) {
          (Array.isArray(node.material) ? node.material : [node.material])
            .forEach(mat => {
              enhanceMaterial(mat, maxAnisotropy);
              applyRecordAccent(mat, accentUniform, artworkUniform);
              Object.values(mat).forEach(value => {
                if (value instanceof THREE.Texture) renderer.initTexture(value);
              });
            });
        }
      }
    });
    applyRecordMetallic(model);
  }, [accentUniform, artworkUniform]);

  const setupAnimations = useCallback((
    gltf: any,
    model: THREE.Object3D,
    mixerRef: 'mixer1' | 'mixer2',
    actionsRef: 'animationActions1' | 'animationActions2',
    loopType: THREE.AnimationActionLoopStyles,
    loopCount: number
  ) => {
    const refs = sceneRefs.current;
    if (!gltf.animations?.length) return;

    refs[mixerRef] = new THREE.AnimationMixer(model);
    const mainAnimations = gltf.animations.slice(0, 2);

    mainAnimations.forEach((clip: THREE.AnimationClip) => {
      try {
        const action = refs[mixerRef]!.clipAction(clip);
        action.setLoop(loopType, loopCount);
        action.clampWhenFinished = true;
        refs[actionsRef].push(action);
      } catch (error) {
        console.error(`Failed to prepare animation:`, error instanceof Error ? error.message : 'Unknown error');
      }
    });
  }, []);

  const loadModel2 = useCallback(() => {
    const refs = sceneRefs.current;
    if (refs.model2Warmup) return refs.model2Warmup;
    if (!refs.assetsManager || refs.model2) return Promise.resolve();
    const manager = refs.assetsManager;
    refs.isModel2Loading = true;

    const request = manager.loadAsset('gltf', '/models/record-quality-v1/spin.glb')
      .then(async (gltf2) => {
        if (refs.assetsManager !== manager) return;
        refs.preloadedModel2Gltf = gltf2;

        if (!refs.scene || !refs.renderer || !refs.camera) return;

        // One persistent deck, platter and animated arm: changing playback
        // phase must never replace geometry, materials or tangent bases.
        const model = refs.model1;
        if (!model) return;
        assembleRecordScene(model, gltf2.scene);
        const box = recordFramingBox(model);
        refs.modelSize = box.getSize(new THREE.Vector3());
        refs.modelCenter = box.getCenter(new THREE.Vector3());
        setupModelMaterials(model, refs.modelLayer, refs.renderer);
        setupAnimations(gltf2, model, 'mixer2', 'animationActions2', THREE.LoopRepeat, Number.POSITIVE_INFINITY);
        // Establish the exact first spin pose while hidden, before the reveal.
        refs.animationActions2.forEach(action => { action.play(); action.paused = true; });
        refs.mixer2?.update(0);

        const warmScene = refs.scene.clone(true);
        warmScene.traverse(object => { object.visible = true; });
        const renderer = refs.renderer;
        const camera = refs.camera.clone();
        if (refs.modelCenter && refs.modelSize) {
          camera.position.copy(refs.modelCenter).add(new THREE.Vector3(0, refs.modelSize.y * 3.3, refs.modelSize.z * 2.5));
          camera.lookAt(refs.modelCenter);
        }
        camera.clearViewOffset();
        camera.fov = 40;
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        if (typeof renderer.compileAsync === 'function') await renderer.compileAsync(warmScene, camera);
        else renderer.compile(warmScene, camera);
        if (refs.assetsManager !== manager) return;

        // Prime depth/shadow programs too. Their first draw otherwise pauses
        // the visible reveal even after the colour shaders are compiled.
        // A tiny off-screen target cannot flash a frame over the album fan.
        const target = new THREE.WebGLRenderTarget(16, 16);
        const previousTarget = renderer.getRenderTarget();
        try {
          renderer.setRenderTarget(target);
          renderer.render(warmScene, camera);
        } finally {
          renderer.setRenderTarget(previousTarget);
          target.dispose();
          warmScene.traverse(object => {
            if (object instanceof THREE.DirectionalLight || object instanceof THREE.SpotLight) object.shadow.dispose();
          });
        }
        refs.model2 = model;
      })
      .catch((error) => {
        if (refs.assetsManager !== manager) return;
        refs.isModel2Loading = false;
        console.error('Error preloading model 2:', error);
      })
      .finally(() => {
        if (refs.assetsManager !== manager) return;
        refs.isModel2Loading = false;
        refs.model2Warmup = null;
        if (refs.currentPhase === 'transition') transitionRef.current();
      });
    refs.model2Warmup = request;
    return request;
  }, [setupModelMaterials, setupAnimations]);
  
  const startModel1Animations = useCallback(() => {
    const refs = sceneRefs.current;
    // Idempotent: only bail if the needle-drop/transition/spin already began.
    // (Previously also required isGsapAnimationComplete, which made this a
    // no-op whenever the reveal's onComplete failed to set that flag — the
    // handoff now sets it explicitly before calling.)
    if (refs.currentPhase === 'model1_anim' || refs.currentPhase === 'transition' || refs.currentPhase === 'model2_anim') return;

    refs.currentPhase = 'model1_anim';
    refs.animationEnabled = true;
    
    // เริ่มโหลดโมเดลที่ 2 เมื่อเลือกการ์ด
    loadModel2();
    
    if (refs.animationActions1.length > 0 && refs.mixer1) {
      let completedAnimations = 0;
      const totalAnimations = refs.animationActions1.length;
      
      const onFinished = (event: any) => {
        if (refs.animationActions1.includes(event.action)) {
          completedAnimations++;
          if (completedAnimations >= totalAnimations && !refs.isModel1AnimationComplete) {
            refs.isModel1AnimationComplete = true;
            refs.currentPhase = 'transition';
            loadModel2AndTransition();
          }
        }
      };
      
      refs.mixer1.addEventListener('finished', onFinished);
      // Guaranteed needle-drop -> spin handoff: the transition normally fires
      // from the mixer 'finished' event; this timer makes the spinning turntable
      // ALWAYS appear (the record is seen through reveal, needle-drop AND spin)
      // even if that event is missed. 4.2s ~= the 3.75s needle clip + a buffer.
      setTimeout(() => {
        if (refs.currentPhase === 'model1_anim' && !refs.isModel1AnimationComplete) {
          refs.isModel1AnimationComplete = true;
          refs.currentPhase = 'transition';
          loadModel2AndTransition();
        }
      }, 4200);
      refs.animationActions1.forEach(action => {
        action.reset();
        action.paused = false;
        action.play();
      });
      refs.clock?.getDelta();
    }
  }, [loadModel2]);
  
  // Stable ref to startModel1Animations so adjustCameraForMobile can chain into
  // it from a GSAP onComplete WITHOUT taking it as a dependency (which would
  // ripple through handleResize and needlessly rebuild the whole 3D scene).
  useEffect(() => { startModel1AnimationsRef.current = startModel1Animations; }, [startModel1Animations]);

  const loadModel2AndTransition = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.model1 || !refs.model2 || !refs.mixer2 || refs.isModel2Loading || refs.isModel2AnimationStarted) return;

    // Leave the needle at its clamped final pose. Stopping/uncaching its mixer
    // would restore the raised arm. The deck and arm remain the same objects;
    // only the already-prepared record/platter rotation starts here.
    refs.animationActions1.forEach(action => { action.paused = true; });
    refs.animationActions2.forEach(action => { action.paused = false; action.play(); });
    refs.clock?.getDelta();
    Object.assign(refs, {
      isModel2Loaded: true,
      currentPhase: 'model2_anim' as const,
      isModel2AnimationStarted: true,
      animationEnabled: true,
      needsRender: true
    });
    onModel2Started?.();
  }, [onModel2Started]);
  useEffect(() => { transitionRef.current = loadModel2AndTransition; }, [loadModel2AndTransition]);
  const loadModel = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.scene || !refs.camera || !refs.controls || !refs.assetsManager || 
        refs.isModelLoading || !refs.renderer) return;
    
    refs.isModelLoading = true;
    refs.isGsapAnimationComplete = false;
    refs.animationEnabled = false;

    // โหลดเฉพาะโมเดลตัวที่ 1 ก่อน
    const manager = refs.assetsManager;
    const spinAsset = manager.loadAsset('gltf', '/models/record-quality-v1/spin.glb');
    // Attach a rejection handler immediately; loadModel2 reports the error.
    void spinAsset.catch(() => {});
    manager.loadAsset('gltf', modelPath)
    .then(async (gltf1) => {
      if (refs.assetsManager !== manager || !refs.scene || !refs.renderer) return;
      
      const model = gltf1.scene;
      model.scale.set(1, 1, 1);
      model.position.set(0, 0.2, 0);
      model.visible = false;
      refs.scene.add(model);
      refs.model1 = model;
      
      const box = recordFramingBox(model);
      refs.modelSize = box.getSize(new THREE.Vector3());
      refs.modelCenter = box.getCenter(new THREE.Vector3());
      
      setupAnimations(gltf1, model, 'mixer1', 'animationActions1', THREE.LoopOnce, 1);
      
      refs.animationActions1.forEach(action => {
        action.paused = true;
        action.play();
        action.paused = true;
      });

      // The visible sequence begins only after both stages and their shadow
      // programs are ready; selection can still happen during a slow load.
      await loadModel2();
      if (refs.assetsManager !== manager) return;
      
      refs.clock?.start();
      refs.isModel1Loaded = true;
      refs.isModelLoading = false;
      
      if (refs.model1) {
        refs.currentPhase = 'gsap';
        if (deferRevealRef.current) {
          // Loaded but held hidden until album selection triggers the reveal.
          refs.model1.visible = false;
        } else {
          refs.model1.visible = true;
          setTimeout(() => adjustCameraForMobile(), 100);
        }
      }
      
      onModelLoaded?.();
    })
    .catch((error) => {
      if (refs.assetsManager !== manager) return;
      console.error('Error loading model:', error);
      refs.isModelLoading = false;
      alert('ไม่สามารถโหลดโมเดลได้ กรุณาลองใหม่ภายหลัง');
    });
  }, [modelPath, onModelLoaded, setupModelMaterials, setupAnimations, loadModel2]);
  
  const triggerModelMovement = useCallback(() => {
    const refs = sceneRefs.current;
    refs.currentPhase = 'loading';
    
    if (refs.isModel1Loaded) {
      if (refs.model1) refs.model1.visible = true;
      refs.currentPhase = 'gsap';
      adjustCameraForMobile();
    } else if (!refs.isModelLoading) {
      loadModel();
    }
  }, [loadModel]);
  
  const adjustCameraForMobile = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.camera || !refs.controls || !refs.modelCenter || 
        !refs.modelSize || !refs.model1 || !refs.scene) return;
    if (refs.isGsapAnimationComplete) return;
    
    refs.model1.visible = true;
    killAllTweens();
    refs.animationEnabled = false;
    
    if (refs.mixer1) {
      refs.mixer1.stopAllAction();
      refs.animationActions1.forEach(action => {
        action.reset();
        action.play();
        action.paused = true;
      });
    }
    
    const width = containerRef.current?.clientWidth || window.innerWidth;
    const height = containerRef.current?.clientHeight || window.innerHeight;
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ANIMATION_CONFIG.duration;
    const { camera, controls, model1: model, scene } = refs;
    // Always fit from the neutral source pose, never the previous reveal offset.
    model.position.set(ANIMATION_CONFIG.targetX, .2, 0);
    const box = new THREE.Box3().setFromObject(model);
    const target = fitRecordCamera(camera, box, width, height);
    const settled = camera.position.clone();
    controls.target.copy(target);
    controls.update();
    const distance = camera.position.distanceTo(target);
    camera.position.copy(target).add(new THREE.Vector3(0, distance, .001));
    model.position.y = -.8;
    const modelTween = gsap.to(model.position, {
      y: .2, duration, ease: ANIMATION_CONFIG.ease,
      onUpdate: () => { refs.needsRender = true; },
      onComplete: () => {
        refs.isGsapAnimationComplete = true;
        if (autoStartModel1Ref.current) {
          autoStartModel1Ref.current = false;
          startModel1AnimationsRef.current();
        }
      }
    });
    const cameraTween = gsap.to(camera.position, {
      x: settled.x, y: settled.y, z: settled.z, duration, ease: ANIMATION_CONFIG.ease,
      onUpdate: () => { camera.lookAt(target); refs.needsRender = true; }
    });
    refs.tweens = [modelTween, cameraTween];

    const spotLight = scene.children.find(child => child instanceof THREE.SpotLight) as THREE.SpotLight;
    if (spotLight) {
      spotLight.position.set(model.position.x, model.position.y + 5, model.position.z);
      spotLight.target = model;
    }
  }, [killAllTweens]);
  
  const preloadModel = useCallback(() => {
    const refs = sceneRefs.current;
    deferRevealRef.current = true;
    autoStartModel1Ref.current = false;
    if (!refs.isModel1Loaded && !refs.isModelLoading) {
      loadModel();
    }
  }, [loadModel]);

  // Full post-selection choreography: reveal (camera move) -> needle-drop
  // (model 1) -> spinning turntable (model 2). Works whether the model has
  // finished loading yet or not.
  const playRecordIntro = useCallback(() => {
    const refs = sceneRefs.current;
    // Keep the GSAP onComplete path as a SECONDARY trigger too — the phase
    // guard in startModel1Animations makes a double call a harmless no-op, so
    // whichever fires first (onComplete or the timer below) wins.
    autoStartModel1Ref.current = true;

    const startReveal = () => {
      deferRevealRef.current = false;
      if (refs.model1) refs.model1.visible = true;
      refs.currentPhase = 'gsap';
      refs.isGsapAnimationComplete = false;
      // Camera "reveal": the record player eases into frame.
      adjustCameraForMobile();
      // GUARANTEED handoff. Previously the needle-drop (model 1) and the
      // spinning turntable (model 2) were kicked off only from
      // adjustCameraForMobile's GSAP onComplete. When that callback didn't
      // fire, the sequence stalled on a frozen first frame (the record player
      // just sat there — no reveal, no needle, no spin) and the hero waited
      // out the full MAX_SEQUENCE_DELAY fallback before sliding on. Driving
      // the handoff from an explicit timer keyed to the reveal duration makes
      // "reveal -> needle -> spin" always play, right after album selection.
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(() => {
        refs.isGsapAnimationComplete = true;
        startModel1Animations();
      }, (ANIMATION_CONFIG.duration + 0.5) * 1000);
    };

    if (refs.isModel1Loaded) {
      deferRevealRef.current = false;
      startReveal();
    } else {
      // Picked before the model finished loading. This is NOT rare: the
      // carousel can appear via the model-load-timeout fallback while the ~4MB
      // model is still downloading, so a quick pick lands here. Hold the model
      // hidden until it arrives, then reveal — previously this path did nothing
      // at all, leaving a black screen with no reveal/needle/spin.
      deferRevealRef.current = true;
      if (!refs.isModelLoading) loadModel();
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      let waited = 0;
      const waitForLoad = setInterval(() => {
        if (refs.isModel1Loaded) {
          clearInterval(waitForLoad);
          startReveal();
        } else if ((waited += 100) > 20000) {
          clearInterval(waitForLoad); // give up after 20s so we never leak the interval
        }
      }, 100);
    }
  }, [loadModel, startModel1Animations, adjustCameraForMobile]);

  useImperativeHandle(ref, () => ({
    preloadModel,
    triggerModelMovement,
    playRecordIntro,
    startModel1AnimationsFromCardSelection: startModel1Animations
  }));
  
  const handleResize = useCallback(() => {
    const refs = sceneRefs.current;
    if (!containerRef.current || !refs.renderer || !refs.camera) return;

    const { offsetWidth: width, offsetHeight: height } = containerRef.current;
    const previousSize = refs.renderer.getSize(new THREE.Vector2());
    const pixelRatio = recordPixelRatio(width, height, window.devicePixelRatio);
    if (previousSize.x === width && previousSize.y === height && refs.renderer.getPixelRatio() === pixelRatio) return;
    refs.camera.aspect = width / height;
    if (refs.isGsapAnimationComplete && refs.model1 && refs.controls) {
      const target = fitRecordCamera(refs.camera, new THREE.Box3().setFromObject(refs.model1), width, height);
      refs.controls.target.copy(target);
      refs.controls.update();
    }
    refs.camera.updateProjectionMatrix();
    refs.renderer.setPixelRatio(pixelRatio);
    refs.renderer.setSize(width, height);
    
    if (refs.isModel1Loaded && refs.modelCenter && refs.modelSize && refs.model1) {
      if (refs.currentPhase === 'gsap' && !refs.isGsapAnimationComplete && !deferRevealRef.current) {
        adjustCameraForMobile();
      } else if (refs.currentPhase === 'loading' && refs.camera && refs.modelCenter) {
        const width = window.innerWidth;
        const newCenter = refs.modelCenter.clone();
        if (width < BREAKPOINTS.sm) newCenter.y -= 0.5;
        
        refs.camera.lookAt(newCenter);
        refs.controls?.target.copy(newCenter);
        refs.controls?.update();
      }
    }
    refs.needsRender = true;
  }, [adjustCameraForMobile]);
  
  useEffect(() => {
    if (!containerRef.current) return;
    const refs = sceneRefs.current;

    containerRef.current.querySelectorAll('canvas').forEach(canvas => 
      containerRef.current?.removeChild(canvas)
    );

    refs.isMobile = window.innerWidth < BREAKPOINTS.sm;
    refs.assetsManager = new AssetsManager();

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = null;
    refs.scene = scene;

    const { offsetWidth, offsetHeight } = containerRef.current;
    const camera = new THREE.PerspectiveCamera(40, offsetWidth / offsetHeight, 0.1, 50);
    camera.position.set(0, 0.5, 3);
    camera.layers.enableAll();
    refs.camera = camera;

    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance' as WebGLPowerPreference
    });
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.4;
    
    renderer.setPixelRatio(recordPixelRatio(offsetWidth, offsetHeight, window.devicePixelRatio));
    renderer.setSize(offsetWidth, offsetHeight);
    renderer.setClearColor(0x000000, 0);
    
    if (containerRef.current && document.body.contains(containerRef.current)) {
      containerRef.current.appendChild(renderer.domElement);
      refs.renderer = renderer;
      
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        console.error('WebGL context lost!');
        if (refs.frameId) {
          cancelAnimationFrame(refs.frameId);
          refs.frameId = null;
        }
      };
      
      const handleContextRestored = () => {
        if (refs.frameId === null && refs.clock) {
          refs.clock.start();
          animate();
        }
      };
      
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);
      (renderer as any)._handleContextLost = handleContextLost;
      (renderer as any)._handleContextRestored = handleContextRestored;
      
    } else {
      renderer.dispose();
      return;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, {
      enableDamping: true,
      dampingFactor: 0.05,
      enableZoom: false,
      enablePan: false,
      enableRotate: false,
      autoRotate: false
    });
    refs.controls = controls;

    refs.lights = createLights(scene, refs.modelLayer);
    refs.clock = new THREE.Clock();

    const animate = () => {
      refs.frameId = requestAnimationFrame(animate);
      if (document.hidden || !containerRef.current?.getClientRects().length) return;
      // A phase marker makes the real reveal/handoff observable in browser
      // checks without exposing scene internals or re-rendering React.
      if (containerRef.current.dataset.recordPhase !== refs.currentPhase) {
        containerRef.current.dataset.recordPhase = refs.currentPhase;
      }

      if (!refs.needsRender && !refs.animationEnabled) return;

      if (refs.controls && (refs.needsRender || refs.animationEnabled)) {
        refs.controls.update();
      }

      if (refs.clock && refs.animationEnabled) {
        const clockDelta = refs.clock.getDelta();
        const safeDelta = (clockDelta > 0 && clockDelta < 0.2) ? clockDelta : 0.016;
        
        if (refs.currentPhase === 'model1_anim' && refs.mixer1) {
          refs.mixer1.update(safeDelta);
        } else if (refs.currentPhase === 'model2_anim' && refs.mixer2) {
          refs.mixer2.update(safeDelta);
        }
      }

      if (refs.renderer && refs.scene && refs.camera && (refs.needsRender || refs.animationEnabled)) {
        refs.renderer.render(refs.scene, refs.camera);
        refs.needsRender = false;
      }
    };
    
    animate();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (refs.frameId !== null) {
          cancelAnimationFrame(refs.frameId);
          refs.frameId = null;
        }
      } else if (refs.frameId === null) {
        refs.clock?.start();
        animate();
      }
    };
    
    const debounce = (func: Function, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(), delay);
      };
    };
    
    const debouncedResize = debounce(handleResize, 200);
    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    window.addEventListener('resize', debouncedResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', debouncedResize);
      observer.disconnect();
      killAllTweens();
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

      if (refs.frameId) {
        cancelAnimationFrame(refs.frameId);
        refs.frameId = null;
      }

      if (refs.scene) {
        refs.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            if (object.material) {
              (Array.isArray(object.material) ? object.material : [object.material])
                .forEach(material => material.dispose());
            }
          }
        });
        while (refs.scene.children.length > 0) {
          refs.scene.remove(refs.scene.children[0]);
        }
      }

      refs.controls?.dispose();

      if (refs.renderer) {
        const { _handleContextLost, _handleContextRestored } = refs.renderer as any;
        if (refs.renderer.domElement) {
          if (_handleContextLost) {
            refs.renderer.domElement.removeEventListener('webglcontextlost', _handleContextLost);
          }
          if (_handleContextRestored) {
            refs.renderer.domElement.removeEventListener('webglcontextrestored', _handleContextRestored);
          }
        }
        refs.renderer.dispose();
      }
      
      refs.assetsManager?.dispose();

      Object.assign(refs, {
        renderer: null, scene: null, camera: null, controls: null,
        mixer1: null, mixer2: null, clock: null, frameId: null,
        model1: null, model2: null, modelSize: null, modelCenter: null,
        isMobile: false, tweens: [], animationActions1: [], animationActions2: [],
        animationEnabled: false, assetsManager: null,
        isModel1Loaded: false, isModel2Loaded: false, isModel2Loading: false, isModelLoading: false,
        isGsapAnimationComplete: false, isModel1AnimationComplete: false,
        isModel2AnimationStarted: false, currentPhase: 'loading' as const,
        preloadedModel2Gltf: null, model2Warmup: null
      });
      
      containerRef.current?.querySelectorAll('canvas').forEach(canvas => 
        containerRef.current?.removeChild(canvas)
      );
    };
  }, [handleResize, killAllTweens]);
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const handleTouchStart = (e: TouchEvent) => e.stopPropagation();
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => container.removeEventListener('touchstart', handleTouchStart);
  }, []);

  const containerStyle = useMemo(() => ({
    cursor: 'default',
    pointerEvents: 'none' as const,
    touchAction: 'auto' as const,
    overflow: 'visible' as const,
    willChange: 'transform' as const
  }), []);

  return (
    <div 
      ref={containerRef} 
      className={`w-full ${height} relative ${className}`}
      id="three-viewer-container"
      style={containerStyle}
    />
  );
});

ThreeViewer.displayName = 'ThreeViewer';
export default ThreeViewer;
