'use client';

import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { gsap } from 'gsap';

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
  lastFrameTime: number | null;
  isModel1Loaded: boolean;
  isModel2Loaded: boolean;
  isModelLoading: boolean;
  isGsapAnimationComplete: boolean;
  isModel1AnimationComplete: boolean;
  isModel2AnimationStarted: boolean;
  currentPhase: 'loading' | 'gsap' | 'model1_anim' | 'transition' | 'model2_anim';
  preloadedModel2Gltf: any;
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
  triggerModelMovement: () => void;
  startModel1AnimationsFromCardSelection: () => void;
}

interface ThreeViewerProps {
  modelPath?: string;
  className?: string;
  height?: string;
  onModelLoaded?: () => void;
}

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1025,
  xl: 1280,
  xxl: 1440
};

const CAMERA_CONFIG = {
  positions: { sm: 2, md: 2.5, lg: 2.5, xl: 2.5, xxl: 2.5, desktop: 2.5 },
  fov: { sm: 50, md: 40, lg: 30, xl: 25, xxl: 20, desktop: 20 },
  targetY: { sm: -1.8, md: -0.85, lg: -0.85, xl: -0.5, xxl: -0.5, desktop: -0.2 }
};

const ANIMATION_CONFIG = {
  duration: 3,
  ease: "sine.inOut",
  initialDelay: 0,
  targetX: 0.05
};

const SHADOW_MAP_SIZE = 512;
const MAX_PIXEL_RATIO = 2;
const TARGET_FPS = 16;

class AssetsManager {
  assets: Map<string, any>;
  loaders: { gltf: GLTFLoader; texture: THREE.TextureLoader };
  draco: DRACOLoader;
  
  constructor() {
    this.assets = new Map();
    this.draco = new DRACOLoader();
    this.draco.setDecoderPath('/draco/gltf/');
    this.draco.setDecoderConfig({ type: 'wasm' });
    this.loaders = { gltf: new GLTFLoader(), texture: new THREE.TextureLoader() };
    this.loaders.gltf.setDRACOLoader(this.draco);
  }
  
  async loadAsset(type: 'gltf' | 'texture', url: string, onProgress?: (event: ProgressEvent) => void): Promise<any> {
    if (this.assets.has(url)) return this.assets.get(url);
    return new Promise((resolve, reject) => {
      this.loaders[type].load(url, (asset) => {
        this.assets.set(url, asset);
        resolve(asset);
      }, onProgress, reject);
    });
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
    castShadow: true
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
    material.metalness = Math.max(material.metalness, 0.2);
    material.roughness = Math.min(material.roughness, 0.7);
    if (material.normalMap) material.normalScale.set(0.7, 0.7);
    material.envMapIntensity = 0.8;
    if (material.map) {
      // Mipmaps stay disabled (Safari has trouble generating them for these
      // webp textures), but WebGL still needs a non-mipmap filter here.
      // Without this, the sampler is left expecting mip levels that were
      // never built, so it falls back to raw/unfiltered sampling — visible
      // as a pixelated record label that "pops" clean the instant the
      // model/camera framing changes.
      material.map.generateMipmaps = false;
      material.map.minFilter = THREE.LinearFilter;
      material.map.magFilter = THREE.LinearFilter;
      material.map.anisotropy = maxAnisotropy;
    }
  }
  
  if (material instanceof THREE.MeshPhysicalMaterial) {
    Object.assign(material, { clearcoat: 0.3, clearcoatRoughness: 0.4, reflectivity: 0.5 });
  }
};

const getScreenSize = (width: number) => {
  if (width < BREAKPOINTS.sm) return 'sm';
  if (width < BREAKPOINTS.md) return 'md';
  if (width < BREAKPOINTS.lg) return 'lg';
  if (width < BREAKPOINTS.xl) return 'xl';
  if (width < BREAKPOINTS.xxl) return 'xxl';
  return 'desktop';
};

const ThreeViewer = forwardRef<ThreeViewerRef, ThreeViewerProps>(({
  modelPath = '/models/music_in_fix2_webp.glb',
  className = 'bg-telepathic-beige',
  height = 'h-screen',
  onModelLoaded
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<SceneRefs>({
    renderer: null, scene: null, camera: null, controls: null,
    mixer1: null, mixer2: null, clock: null, frameId: null,
    model1: null, model2: null, modelSize: null, modelCenter: null,
    isMobile: false, tweens: [], animationActions1: [], animationActions2: [],
    animationEnabled: false, modelLayer: 1, backgroundLayer: 0,
    assetsManager: null, lastFrameTime: null,
    isModel1Loaded: false, isModel2Loaded: false, isModelLoading: false,
    isGsapAnimationComplete: false, isModel1AnimationComplete: false,
    isModel2AnimationStarted: false, currentPhase: 'loading',
    preloadedModel2Gltf: null, lights: null, needsRender: true
  });
  
  const [isRendererReady, setIsRendererReady] = useState(false);
  
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
        node.castShadow = true;
        node.receiveShadow = true;
        node.layers.set(layer);
        if (node.material) {
          (Array.isArray(node.material) ? node.material : [node.material])
            .forEach(mat => enhanceMaterial(mat, maxAnisotropy));
        }
      }
    });
  }, []);

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
    if (!refs.assetsManager || refs.preloadedModel2Gltf) return;

    refs.assetsManager.loadAsset('gltf', '/models/modern_turntable_webp.glb')
      .then((gltf2) => {
        refs.preloadedModel2Gltf = gltf2;

        if (!refs.scene || !refs.renderer || !refs.camera) return;

        // Prepare model 2 fully — materials, animation clips, and GPU shader
        // compilation — while model 1's needle-drop animation is still
        // playing. Without this, the swap below would compile shaders and
        // upload textures for the first time on the very frame the needle
        // touches down, causing the visible stutter/quality "re-jig".
        const model2 = gltf2.scene;
        model2.scale.set(1, 1, 1);
        model2.visible = false;
        model2.renderOrder = 1;

        setupModelMaterials(model2, refs.modelLayer, refs.renderer);
        setupAnimations(gltf2, model2, 'mixer2', 'animationActions2', THREE.LoopRepeat, Number.POSITIVE_INFINITY);

        refs.scene.add(model2);

        const warmUp = typeof refs.renderer.compileAsync === 'function'
          ? refs.renderer.compileAsync(refs.scene, refs.camera)
          : Promise.resolve(refs.renderer.compile(refs.scene, refs.camera));

        warmUp
          .catch((error: unknown) => console.error('Error warming up model 2:', error))
          .finally(() => {
            refs.model2 = model2;
          });
      })
      .catch((error) => {
        console.error('Error preloading model 2:', error);
      });
  }, [setupModelMaterials, setupAnimations]);
  
  const startModel1Animations = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.isGsapAnimationComplete || refs.currentPhase === 'model1_anim') return;
    
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
      refs.animationActions1.forEach(action => {
        action.reset();
        action.paused = false;
        action.play();
      });
      refs.clock?.getDelta();
    }
  }, [loadModel2]);
  
  const disposeMaterial = useCallback((material: THREE.Material) => {
    const maps = ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap', 
                  'alphaMap', 'aoMap', 'displacementMap', 'emissiveMap', 'gradientMap', 
                  'metalnessMap', 'roughnessMap'];
    const mat = material as any;
    maps.forEach(mapName => mat[mapName]?.dispose());
    material.dispose();
  }, []);
  
  const disposeModel1Completely = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.scene || !refs.model1) return;
    
    if (refs.mixer1) {
      refs.mixer1.stopAllAction();
      refs.mixer1.uncacheRoot(refs.model1);
      refs.mixer1 = null;
    }
    refs.animationActions1 = [];
    
    refs.model1.traverse((node: THREE.Object3D) => {
      if (node instanceof THREE.Mesh) {
        node.geometry?.dispose();
        if (node.material) {
          (Array.isArray(node.material) ? node.material : [node.material]).forEach(disposeMaterial);
        }
      }
    });
    
    refs.scene.remove(refs.model1);
    refs.model1 = null;
    refs.needsRender = true;
  }, [disposeMaterial]);

  const loadModel2AndTransition = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.scene || !refs.assetsManager || !refs.preloadedModel2Gltf || !refs.renderer) return;

    const model1Position = refs.model1?.position.clone() || new THREE.Vector3(0, 0.2, 0);
    const gltf = refs.preloadedModel2Gltf;
    // If loadModel2() finished warming it up (materials + shaders compiled,
    // textures uploaded) reuse that exact object — it's already in the
    // scene, just hidden. Otherwise (very slow connection) fall back to
    // setting it up now, same as before.
    const isPrewarmed = !!refs.model2 && refs.animationActions2.length > 0;
    const model2 = isPrewarmed ? refs.model2! : gltf.scene;

    model2.position.copy(model1Position);
    model2.scale.set(1, 1, 1);
    model2.renderOrder = 1;
    if (refs.model1) refs.model1.renderOrder = 0;

    if (!isPrewarmed) {
      refs.scene.add(model2);
      setupModelMaterials(model2, refs.modelLayer, refs.renderer);
      setupAnimations(gltf, model2, 'mixer2', 'animationActions2', THREE.LoopRepeat, Number.POSITIVE_INFINITY);
    }

    refs.model2 = model2;

    // Hide model 1 and reveal model 2 together with no render() call in
    // between, so the two models never appear on screen at the same time
    // and the swap paints as a single atomic frame on the next tick.
    disposeModel1Completely();
    model2.visible = true;

    Object.assign(refs, {
      isModel2Loaded: true,
      currentPhase: 'model2_anim' as const,
      isModel2AnimationStarted: true,
      animationEnabled: true,
      needsRender: true
    });
    
    refs.animationActions2.forEach(action => action.play());
  }, [disposeModel1Completely, setupModelMaterials, setupAnimations]);
  const loadModel = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.scene || !refs.camera || !refs.controls || !refs.assetsManager || 
        refs.isModelLoading || !refs.renderer) return;
    
    refs.isModelLoading = true;
    refs.isGsapAnimationComplete = false;
    refs.animationEnabled = false;

    // โหลดเฉพาะโมเดลตัวที่ 1 ก่อน
    refs.assetsManager.loadAsset('gltf', modelPath)
    .then((gltf1) => {
      if (!refs.scene || !refs.renderer) return;
      
      const model = gltf1.scene;
      model.scale.set(1, 1, 1);
      model.position.set(0, 0.2, 0);
      model.visible = false;
      refs.scene.add(model);
      refs.model1 = model;
      
      const box = new THREE.Box3().setFromObject(model);
      refs.modelSize = box.getSize(new THREE.Vector3());
      refs.modelCenter = box.getCenter(new THREE.Vector3());
      
      setupModelMaterials(model, refs.modelLayer, refs.renderer);
      setupAnimations(gltf1, model, 'mixer1', 'animationActions1', THREE.LoopOnce, 1);
      
      refs.animationActions1.forEach(action => {
        action.paused = true;
        action.play();
        action.paused = true;
      });
      
      refs.clock?.start();
      refs.isModel1Loaded = true;
      refs.isModelLoading = false;
      
      if (refs.model1) {
        refs.model1.visible = true;
        refs.currentPhase = 'gsap';
        setTimeout(() => adjustCameraForMobile(), 100);
      }
      
      onModelLoaded?.();
    })
    .catch((error) => {
      console.error('Error loading model:', error);
      refs.isModelLoading = false;
      alert('ไม่สามารถโหลดโมเดลได้ กรุณาลองใหม่ภายหลัง');
    });
  }, [modelPath, onModelLoaded, setupModelMaterials, setupAnimations]);
  
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
    
    const width = window.innerWidth;
    const screenSize = getScreenSize(width);
    const { camera, controls, modelCenter: center, modelSize: size, model1: model, scene } = refs;
    
    refs.isMobile = width < BREAKPOINTS.sm;
    
    model.position.y = width < BREAKPOINTS.sm ? -1.8 : -0.5;
    
    const cameraY = center.y + size.y * (width < BREAKPOINTS.sm ? 2 : 2.5);
    camera.position.set(center.x, cameraY, center.z);
    camera.fov = width < BREAKPOINTS.sm ? 50 : 40;
    camera.updateProjectionMatrix();
    
    const newCenter = center.clone();
    if (width < BREAKPOINTS.sm) newCenter.y -= 0.5;
    
    camera.lookAt(newCenter);
    controls.target.copy(newCenter);
    controls.update();
    
    const dummyObj = { x: model.position.x, y: model.position.y };
    const targetY = CAMERA_CONFIG.targetY[screenSize];
    
    const modelTween = gsap.to(dummyObj, {
      x: ANIMATION_CONFIG.targetX,
      y: targetY,
      duration: ANIMATION_CONFIG.duration,
      ease: ANIMATION_CONFIG.ease,
      delay: ANIMATION_CONFIG.initialDelay,
      onUpdate: () => {
        model.position.set(dummyObj.x, dummyObj.y, model.position.z);
        if (refs.lights?.ringLight) {
          refs.lights.ringLight.position.set(model.position.x, model.position.y - 0.5, model.position.z);
        }
        refs.needsRender = true;
      },
      onComplete: () => { refs.isGsapAnimationComplete = true; }
    });
    
    const cameraPosMultiplier = width < BREAKPOINTS.sm ? 2 : 2.5;
    const cameraTween = gsap.to(camera.position, {
      x: center.x,
      y: center.y + size.y * cameraPosMultiplier,
      z: center.z + size.z * 2.5,
      duration: ANIMATION_CONFIG.duration,
      ease: ANIMATION_CONFIG.ease,
      delay: ANIMATION_CONFIG.initialDelay
    });
    
    const fovTween = gsap.to({ value: camera.fov }, {
      value: CAMERA_CONFIG.fov[screenSize],
      duration: ANIMATION_CONFIG.duration,
      ease: ANIMATION_CONFIG.ease,
      delay: ANIMATION_CONFIG.initialDelay,
      onUpdate: function() {
        camera.fov = this.targets()[0].value;
        camera.updateProjectionMatrix();
      }
    });
    
    refs.tweens = [modelTween, cameraTween, fovTween];
    
    const spotLight = scene.children.find(child => child instanceof THREE.SpotLight) as THREE.SpotLight;
    if (spotLight) {
      spotLight.position.set(model.position.x, model.position.y + 5, model.position.z);
      spotLight.target = model;
    }
  }, [killAllTweens]);
  
  useImperativeHandle(ref, () => ({
    triggerModelMovement,
    startModel1AnimationsFromCardSelection: startModel1Animations
  }));
  
  const handleResize = useCallback(() => {
    const refs = sceneRefs.current;
    if (!containerRef.current || !refs.renderer || !refs.camera) return;

    const { offsetWidth: width, offsetHeight: height } = containerRef.current;
    refs.camera.aspect = width / height;
    refs.camera.updateProjectionMatrix();
    refs.renderer.setSize(width, height);
    
    if (refs.isModel1Loaded && refs.modelCenter && refs.modelSize && refs.model1) {
      if (refs.currentPhase === 'gsap' && !refs.isGsapAnimationComplete) {
        adjustCameraForMobile();
      } else if (refs.camera && refs.modelCenter) {
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
    
    Object.assign(renderer, {
      shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap },
      outputColorSpace: THREE.SRGBColorSpace,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 0.4
    });
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
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
      
      setIsRendererReady(true);
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
      if (document.hidden) return;
      
      const now = performance.now();
      const delta = now - (refs.lastFrameTime || now);
      
      if (delta < TARGET_FPS && !refs.tweens.length && !refs.needsRender && !refs.animationEnabled) {
        return;
      }
      refs.lastFrameTime = now;

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
    
    if (isRendererReady) animate();

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

    window.addEventListener('resize', debouncedResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', debouncedResize);
      killAllTweens();
      
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
      
      refs.assetsManager?.draco.dispose();

      Object.assign(refs, {
        renderer: null, scene: null, camera: null, controls: null,
        mixer1: null, mixer2: null, clock: null, frameId: null,
        model1: null, model2: null, modelSize: null, modelCenter: null,
        isMobile: false, tweens: [], animationActions1: [], animationActions2: [],
        animationEnabled: false, assetsManager: null, lastFrameTime: null,
        isModel1Loaded: false, isModel2Loaded: false, isModelLoading: false,
        isGsapAnimationComplete: false, isModel1AnimationComplete: false,
        isModel2AnimationStarted: false, currentPhase: 'loading' as const,
        preloadedModel2Gltf: null
      });
      
      containerRef.current?.querySelectorAll('canvas').forEach(canvas => 
        containerRef.current?.removeChild(canvas)
      );
    };
  }, [handleResize, killAllTweens, isRendererReady]);
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
