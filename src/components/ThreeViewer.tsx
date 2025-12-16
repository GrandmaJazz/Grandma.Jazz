// frontend/src/components/ThreeViewer.tsx
'use client';

import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { gsap } from 'gsap';

// สร้าง type เพื่อรวม refs ไว้ด้วยกัน
type SceneRefs = {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControls | null;
  mixer1: THREE.AnimationMixer | null; // mixer สำหรับโมเดล 1
  mixer2: THREE.AnimationMixer | null; // mixer สำหรับโมเดล 2
  clock: THREE.Clock | null;
  frameId: number | null;
  model1: THREE.Object3D | null; // โมเดล 1: music_in_fix.glb
  model2: THREE.Object3D | null; // โมเดล 2: modern_turntable.glb
  modelSize: THREE.Vector3 | null;
  modelCenter: THREE.Vector3 | null;
  isMobile: boolean;
  tweens: gsap.core.Tween[];
  animationActions1: THREE.AnimationAction[]; // แอนิเมชั่นของโมเดล 1
  animationActions2: THREE.AnimationAction[]; // แอนิเมชั่นของโมเดล 2
  animationEnabled: boolean;
  modelLayer: number;
  backgroundLayer: number;
  assetsManager: AssetsManager | null;
  lastFrameTime: number | null;
  isModel1Loaded: boolean; // สถานะการโหลดโมเดล 1
  isModel2Loaded: boolean; // สถานะการโหลดโมเดล 2
  isModelLoading: boolean;
  isGsapAnimationComplete: boolean; // แอนิเมชั่น GSAP เสร็จแล้วหรือไม่
  isModel1AnimationComplete: boolean; // แอนิเมชั่นโมเดล 1 เสร็จแล้วหรือไม่
  isModel2AnimationStarted: boolean; // แอนิเมชั่นโมเดล 2 เริ่มแล้วหรือไม่
  currentPhase: 'loading' | 'gsap' | 'model1_anim' | 'transition' | 'model2_anim'; // ระยะการทำงานปัจจุบัน
  preloadedModel2Gltf: any; // Add a new ref property to store preloaded model2 gltf
  lights: {
    spotLight: THREE.SpotLight | null;
    ringLight: THREE.PointLight | null;
    mainLight: THREE.DirectionalLight | null;
    ambientLight: THREE.AmbientLight | null;
    rimLight: THREE.DirectionalLight | null;
    frontLight: THREE.DirectionalLight | null;
    backLight: THREE.DirectionalLight | null;
  } | null; // cache for lights
  needsRender: boolean; // flag for when to render
}

// เพิ่ม interface สำหรับ ref
interface ThreeViewerRef {
  triggerModelMovement: () => void;
  startModel1AnimationsFromCardSelection: () => void;
}

// เพิ่ม interface สำหรับ props
interface ThreeViewerProps {
  modelPath?: string;
  className?: string;
  height?: string;
  onModelLoaded?: () => void; // Callback เมื่อโมเดลโหลดเสร็จ
}

// สร้าง AssetsManager (จัดการแคช)
class AssetsManager {
  assets: Map<string, any>;
  loaders: {
    gltf: GLTFLoader;
    texture: THREE.TextureLoader;
  };
  draco: DRACOLoader;
  
  constructor() {
    this.assets = new Map();
    
    // ตั้งค่า Draco Loader - ใช้ไฟล์ Wasm จะเร็วกว่า JS
    this.draco = new DRACOLoader();
    this.draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
    this.draco.setDecoderConfig({ type: 'wasm' }); // เปลี่ยนจาก 'js' เป็น 'wasm'
    
    // ตั้งค่า loaders
    this.loaders = {
      gltf: new GLTFLoader(),
      texture: new THREE.TextureLoader()
    };
    
    this.loaders.gltf.setDRACOLoader(this.draco);
  }
  
  // โหลด assets และจัดการแคช
  async loadAsset(type: 'gltf' | 'texture', url: string, onProgress?: (event: ProgressEvent) => void): Promise<any> {
    // ตรวจสอบว่ามีในแคชหรือไม่
    if (this.assets.has(url)) {
      return this.assets.get(url);
    }
    
    // ถ้าไม่พบในแคช โหลดจาก URL
    return new Promise((resolve, reject) => {
      this.loaders[type].load(
        url, 
        (asset) => {
          this.assets.set(url, asset);
          resolve(asset);
        },
        onProgress,
        reject
      );
    });
  }
}

// แยกการสร้างแสงออกมาเป็นฟังก์ชันแยก ใช้ useMemo ในคอมโพเนนต์หลัก
const createLights = (scene: THREE.Scene, modelLayer: number) => {
  // แสงรอบทิศทาง
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // แสงหลักจากด้านบน - ลดความซับซ้อนของเงา
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
  mainLight.position.set(3, 5, 2);
  mainLight.castShadow = true;
  mainLight.shadow.bias = -0.0001;
  mainLight.shadow.mapSize.width = 512; // ลดจาก 2048
  mainLight.shadow.mapSize.height = 512; // ลดจาก 2048
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -10;
  mainLight.shadow.camera.right = 10;
  mainLight.shadow.camera.top = 10;
  mainLight.shadow.camera.bottom = -10;
  mainLight.layers.set(modelLayer);
  scene.add(mainLight);

  // แสงเสริมด้านข้าง
  const rimLight = new THREE.DirectionalLight(0xe8f1ff, 1.5);
  rimLight.position.set(-5, 3, -5);
  rimLight.layers.set(modelLayer);
  scene.add(rimLight);

  // แสงด้านหน้า
  const frontLight = new THREE.DirectionalLight(0xffffff, 1.32);
  frontLight.position.set(0, 0, 5);
  frontLight.layers.set(modelLayer);
  scene.add(frontLight);

  // ไฟสปอตไลท์ - ลดความซับซ้อน
  const spotLight = new THREE.SpotLight(0xffffff, 1);
  spotLight.position.set(0, 10, 0);
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 100;
  spotLight.decay = 1.0;
  spotLight.distance = 30;
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 512; // ลดจาก 1024
  spotLight.shadow.mapSize.height = 512; // ลดจาก 1024
  spotLight.layers.set(modelLayer);
  scene.add(spotLight);

  // ไฟวงกลมด้านล่าง
  const ringLight = new THREE.PointLight(0xf0f8ff, 1.5);
  ringLight.position.set(0, -0.5, 0);
  ringLight.distance = 8;
  ringLight.decay = 1.5;
  ringLight.layers.set(modelLayer);
  scene.add(ringLight);
  
  // แสงเสริมด้านหลัง
  const backLight = new THREE.DirectionalLight(0xf5f5f5, 1.2);
  backLight.position.set(0, 3, -5);
  backLight.layers.set(modelLayer);
  scene.add(backLight);
  
  return { spotLight, ringLight, mainLight, ambientLight, rimLight, frontLight, backLight };
};

// แยกฟังก์ชันปรับแต่งวัสดุออกมา
const enhanceMaterial = (material: THREE.Material, maxAnisotropy: number) => {
  if (!material) return;
  
  if (material instanceof THREE.MeshStandardMaterial) {
    material.metalness = Math.max(material.metalness, 0.2);
    material.roughness = Math.min(material.roughness, 0.7);
    
    if (material.normalMap) {
      material.normalScale.set(0.7, 0.7);
    }
    
    material.envMapIntensity = 0.8;
    
    if (material.map) {
      material.map.generateMipmaps = true;
      material.map.anisotropy = maxAnisotropy;
    }
  }
  
  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.clearcoat = 0.3;
    material.clearcoatRoughness = 0.4;
    material.reflectivity = 0.5;
  }
};

// ThreeViewer Component
const ThreeViewer = forwardRef<ThreeViewerRef, ThreeViewerProps>(({
  modelPath = '/models/music_in_fix2_webp.glb',
  className = 'bg-telepathic-beige',
  height = 'h-screen',
  onModelLoaded
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ใช้ useRef เพื่อเก็บอ้างอิง
  const sceneRefs = useRef<SceneRefs>({
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    mixer1: null,
    mixer2: null,
    clock: null,
    frameId: null,
    model1: null,
    model2: null,
    modelSize: null,
    modelCenter: null,
    isMobile: false,
    tweens: [],
    animationActions1: [],
    animationActions2: [],
    animationEnabled: false,
    modelLayer: 1,
    backgroundLayer: 0,
    assetsManager: null,
    lastFrameTime: null,
    isModel1Loaded: false,
    isModel2Loaded: false,
    isModelLoading: false,
    isGsapAnimationComplete: false,
    isModel1AnimationComplete: false,
    isModel2AnimationStarted: false,
    currentPhase: 'loading',
    preloadedModel2Gltf: null, // Add a new ref property to store preloaded model2 gltf
    lights: null, // cache for lights
    needsRender: true // flag for when to render
  });
  
  // เก็บสถานะการเรนเดอร์
  const [isRendererReady, setIsRendererReady] = useState(false);
  
  // ฟังก์ชันยกเลิก GSAP tweens ทั้งหมด
  const killAllTweens = useCallback(() => {
    const refs = sceneRefs.current;
    if (refs.tweens.length > 0) {
      refs.tweens.forEach(tween => tween.kill());
      refs.tweens = [];
    }
  }, []);
  
  // ฟังก์ชันเริ่มเล่นแอนิเมชันทั้งหมด
  const startAllAnimations = useCallback((delay = 0) => {
    const refs = sceneRefs.current;
    
    if (delay > 0) {
      setTimeout(() => {
        refs.animationEnabled = true;
        
        if (refs.animationActions1.length > 0 && refs.mixer1) {
          refs.animationActions1.forEach(action => {
            if (action.paused) action.paused = false;
            if (!action.isRunning()) action.play();
          });
          
          if (refs.clock) refs.clock.getDelta(); // รีเซ็ต delta
        }
      }, delay * 1000);
    } else {
      refs.animationEnabled = true;
      
      if (refs.animationActions1.length > 0 && refs.mixer1) {
        refs.animationActions1.forEach(action => {
          if (action.paused) action.paused = false;
          if (!action.isRunning()) action.play();
        });
        
        if (refs.clock) refs.clock.getDelta();
      }
    }
  }, []);
  
  // ฟังก์ชันหยุดแอนิเมชันทั้งหมด
  const pauseAllAnimations = useCallback(() => {
    const refs = sceneRefs.current;
    refs.animationEnabled = false;
    
    if (refs.animationActions1.length > 0 && refs.mixer1) {
      refs.animationActions1.forEach(action => {
        action.paused = true;
      });
    }
  }, []);
  
  // ฟังก์ชันเริ่มเล่นแอนิเมชั่นโมเดล 1
  const startModel1Animations = useCallback(() => {
    const refs = sceneRefs.current;
    
    // ตรวจสอบว่า GSAP animation เสร็จแล้วและยังไม่ได้เล่นแอนิเมชั่นโมเดล 1
    if (!refs.isGsapAnimationComplete) {
      return;
    }
    
    if (refs.currentPhase === 'model1_anim') {
      return;
    }
    
    refs.currentPhase = 'model1_anim';
    refs.animationEnabled = true;
    
    if (refs.animationActions1.length > 0 && refs.mixer1) {
      let completedAnimations = 0;
      const totalAnimations = refs.animationActions1.length;
      
      refs.animationActions1.forEach(action => {
        // Reset แอนิเมชั่นก่อนเล่นใหม่
        action.reset();
        action.paused = false;
        
        // เพิ่ม event listener สำหรับการเสร็จสิ้นแอนิเมชั่น
        const onFinished = (event: any) => {
          if (event.action === action) {
            completedAnimations++;
            
            // เมื่อแอนิเมชั่นทั้งหมดเสร็จสิ้น
            if (completedAnimations >= totalAnimations && !refs.isModel1AnimationComplete) {
              refs.isModel1AnimationComplete = true;
              refs.currentPhase = 'transition';
              loadModel2AndTransition();
            }
          }
        };
        
        refs.mixer1?.addEventListener('finished', onFinished);
        
        action.play();
      });
      
      if (refs.clock) refs.clock.getDelta();
    }
  }, []);
  
  // ฟังก์ชัน helper สำหรับ dispose material
  const disposeMaterial = useCallback((material: THREE.Material) => {
    // Dispose textures
    const materialWithMaps = material as any;
    if (materialWithMaps.map) materialWithMaps.map.dispose();
    if (materialWithMaps.lightMap) materialWithMaps.lightMap.dispose();
    if (materialWithMaps.bumpMap) materialWithMaps.bumpMap.dispose();
    if (materialWithMaps.normalMap) materialWithMaps.normalMap.dispose();
    if (materialWithMaps.specularMap) materialWithMaps.specularMap.dispose();
    if (materialWithMaps.envMap) materialWithMaps.envMap.dispose();
    if (materialWithMaps.alphaMap) materialWithMaps.alphaMap.dispose();
    if (materialWithMaps.aoMap) materialWithMaps.aoMap.dispose();
    if (materialWithMaps.displacementMap) materialWithMaps.displacementMap.dispose();
    if (materialWithMaps.emissiveMap) materialWithMaps.emissiveMap.dispose();
    if (materialWithMaps.gradientMap) materialWithMaps.gradientMap.dispose();
    if (materialWithMaps.metalnessMap) materialWithMaps.metalnessMap.dispose();
    if (materialWithMaps.roughnessMap) materialWithMaps.roughnessMap.dispose();
    
    // Dispose material itself
    material.dispose();
  }, []);
  
  // ฟังก์ชัน dispose โมเดล 1 อย่างสมบูรณ์
  const disposeModel1Completely = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.scene || !refs.model1) return;
    
    // หยุดและ dispose แอนิเมชั่นก่อน
    if (refs.mixer1) {
      refs.mixer1.stopAllAction();
      refs.mixer1.uncacheRoot(refs.model1);
      refs.mixer1 = null;
    }
    refs.animationActions1 = [];
    
    // Traverse และ dispose ทุก material, geometry, texture
    refs.model1.traverse((node: THREE.Object3D) => {
      if (node instanceof THREE.Mesh) {
        // Dispose geometry
        if (node.geometry) {
          node.geometry.dispose();
        }
        
        // Dispose materials
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach(material => {
              disposeMaterial(material);
            });
          } else {
            disposeMaterial(node.material);
          }
        }
      }
    });
    
    // ลบออกจาก scene
    refs.scene.remove(refs.model1);
    refs.model1 = null;
    
    // Force render เพื่อให้แน่ใจว่า scene อัปเดต
    refs.needsRender = true;
  }, [disposeMaterial]);
  
  // ฟังก์ชันโหลดโมเดล 2 และจัดการการเปลี่ยนผ่าน
  const loadModel2AndTransition = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.scene || !refs.assetsManager || !refs.preloadedModel2Gltf) return;
    
    // บันทึกตำแหน่งของโมเดล 1
    const model1Position = refs.model1 ? refs.model1.position.clone() : new THREE.Vector3(0, 0.2, 0);
    
    // 1. เพิ่มโมเดล 2 เข้ามาก่อน (ทับโมเดล 1 ทันที)
    const gltf = refs.preloadedModel2Gltf;
    const model2 = gltf.scene;
    
    // วางโมเดล 2 ในตำแหน่งเดียวกับโมเดล 1 (ซ้อนทับกัน)
    model2.position.copy(model1Position);
    model2.scale.set(1, 1, 1);
    
    // ตั้งค่า renderOrder ให้โมเดล 2 แสดงทับโมเดล 1
    model2.renderOrder = 1;
    if (refs.model1) {
      refs.model1.renderOrder = 0;
    }
    
    // เพิ่มโมเดล 2 เข้าสู่ scene ทันที
    refs.scene.add(model2);
    refs.model2 = model2;
    
    // Force render ทันทีเพื่อให้โมเดล 2 แสดงก่อนลบโมเดล 1
    refs.needsRender = true;
    if (refs.renderer && refs.scene && refs.camera) {
      refs.renderer.render(refs.scene, refs.camera);
    }
    
    // ปรับปรุงวัสดุและกำหนดเลเยอร์
    model2.traverse((node: THREE.Object3D) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.layers.set(refs.modelLayer);
        
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach(mat => enhanceMaterial(mat, refs.renderer?.capabilities.getMaxAnisotropy() || 1));
          } else {
            enhanceMaterial(node.material, refs.renderer?.capabilities.getMaxAnisotropy() || 1);
          }
        }
      }
    });
    
    // สร้างแอนิเมชั่นสำหรับโมเดล 2
    if (gltf.animations && gltf.animations.length > 0) {
      refs.mixer2 = new THREE.AnimationMixer(model2);
      
      const mainAnimations = gltf.animations.slice(0, 2);
      
      mainAnimations.forEach((clip: THREE.AnimationClip) => {
        try {
          const action = refs.mixer2!.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
          action.clampWhenFinished = true;
          
          refs.animationActions2.push(action);
        } catch (error) {
          console.error('Failed to prepare model 2 animation:', error instanceof Error ? error.message : 'Unknown error');
        }
      });
    }
    
    // 2. Dispose โมเดล 1 ทันทีหลังจากโมเดล 2 แสดงแล้ว (ไม่มี delay)
    disposeModel1Completely();
    
    refs.isModel2Loaded = true;
    refs.currentPhase = 'model2_anim';
    refs.isModel2AnimationStarted = true;
    refs.animationEnabled = true;
    
    // เริ่มเล่นแอนิเมชั่นโมเดล 2 ทันที
    if (refs.animationActions2.length > 0 && refs.mixer2) {
      refs.animationActions2.forEach(action => {
        action.play();
      });
    }
    
    refs.needsRender = true;
  }, [disposeModel1Completely]);
  

  
  // ฟังก์ชันสำหรับโหลดโมเดล
  const loadModel = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.scene || !refs.camera || !refs.controls || !refs.assetsManager || refs.isModelLoading) return;
    
    // กำหนดว่ากำลังโหลดโมเดล
    refs.isModelLoading = true;
    
    // รีเซ็ตสถานะแอนิเมชัน
    refs.isGsapAnimationComplete = false;
    
    // ตั้งค่าให้ไม่เล่นแอนิเมชันตั้งแต่เริ่มต้น
    refs.animationEnabled = false;

    // โหลดทั้งสองโมเดลพร้อมกัน
    const loadModel1Promise = refs.assetsManager.loadAsset('gltf', modelPath);
    const loadModel2Promise = refs.assetsManager.loadAsset('gltf', '/models/modern_turntable_webp.glb');
    
    // รอให้โหลดเสร็จทั้งคู่
    Promise.all([loadModel1Promise, loadModel2Promise])
    .then(([gltf1, gltf2]) => {
      if (!refs.scene) return;
      
      // เก็บโมเดล 2 ไว้ก่อน (preload)
      refs.preloadedModel2Gltf = gltf2;
      
      // ตั้งค่าโมเดล 1
      const model = gltf1.scene;
      model.scale.set(1, 1, 1);
      model.position.set(0, 0.2, 0);
      
      // เพิ่มโมเดลเข้าสู่ scene แต่ซ่อนไว้ก่อน
      model.visible = false; // ซ่อนโมเดลก่อนจนกว่าจะมีการเรียก adjustCameraForMobile
      refs.scene.add(model);
      refs.model1 = model;
      
      // คำนวณขนาดและตำแหน่งทันที
      const box = new THREE.Box3().setFromObject(model);
      refs.modelSize = box.getSize(new THREE.Vector3());
      refs.modelCenter = box.getCenter(new THREE.Vector3());
      
      // ปรับปรุงวัสดุและกำหนดเลเยอร์
      model.traverse((node: THREE.Object3D) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          node.layers.set(refs.modelLayer);
          
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach(mat => enhanceMaterial(mat, refs.renderer?.capabilities.getMaxAnisotropy() || 1));
            } else {
              enhanceMaterial(node.material, refs.renderer?.capabilities.getMaxAnisotropy() || 1);
            }
          }
        }
      });
      
      // สร้างแอนิเมชัน
      if (gltf1.animations && gltf1.animations.length > 0) {
        refs.mixer1 = new THREE.AnimationMixer(model);
        
        // เลือกเล่นเฉพาะแอนิเมชันที่สำคัญ ไม่ต้องเล่นทุกแอนิเมชัน
        const mainAnimations = gltf1.animations.slice(0, 2); // เลือกแค่ 2 แอนิเมชันแรก
        
        mainAnimations.forEach((clip: THREE.AnimationClip) => {
          try {
            const action = refs.mixer1!.clipAction(clip);
            action.setLoop(THREE.LoopOnce, 1); // เล่นครั้งเดียวแล้วหยุด
            action.clampWhenFinished = true;
            
            // สร้างแอนิเมชันแต่ไม่เล่นทันที
            action.paused = true;
            action.play();
            action.paused = true;
            
            refs.animationActions1.push(action);
          } catch (error) {
            console.error('Failed to play animation:', error instanceof Error ? error.message : 'Unknown error');
          }
        });
        
        if (refs.clock) refs.clock.start();
      }
      
      // กำหนดว่าโหลดโมเดลเสร็จแล้ว
      refs.isModel1Loaded = true;
      refs.isModelLoading = false;
      
      // เริ่ม GSAP animation ทันทีที่โมเดลโหลดเสร็จ
      if (refs.model1) {
        refs.model1.visible = true;
        refs.currentPhase = 'gsap';
        
        // เริ่ม GSAP animation ทันที
        setTimeout(() => {
          adjustCameraForMobile();
        }, 100); // delay เล็กน้อยเพื่อให้โมเดลแสดงผลก่อน
      }
      
      // เรียก callback เมื่อโมเดลโหลดเสร็จ
      if (onModelLoaded) {
        onModelLoaded();
      }
    })
    .catch((error) => {
      console.error('Error loading model:', error);
      refs.isModelLoading = false;
      
      // แสดงข้อความแจ้งเตือน
      alert('ไม่สามารถโหลดโมเดลได้ กรุณาลองใหม่ภายหลัง');
    });
  }, [modelPath, onModelLoaded]);
  
  // เพิ่มฟังก์ชันเพื่อเรียกใช้ adjustCameraForMobile โดยตรง
  const triggerModelMovement = useCallback(() => {
    const refs = sceneRefs.current;
    
    // ตั้งค่าให้รอโมเดล 2 ก่อนเล่นเพลง
    refs.currentPhase = 'loading';
    
    // ตรวจสอบ phase ปัจจุบัน
      if (refs.isModel1Loaded) {
        // ถ้าโหลดโมเดล 1 แล้ว ให้แสดงและเริ่ม GSAP animation
        if (refs.model1) {
          refs.model1.visible = true;
        }
        refs.currentPhase = 'gsap';
        adjustCameraForMobile();
      } else if (!refs.isModelLoading) {
        // ถ้ายังไม่ได้โหลดและไม่ได้กำลังโหลดอยู่ ให้โหลดโมเดล 1
        loadModel();
      }
  }, [loadModel]);
  
  // ฟังก์ชันปรับตำแหน่งกล้องตามขนาดหน้าจอ
  const adjustCameraForMobile = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.camera || !refs.controls || !refs.modelCenter || 
        !refs.modelSize || !refs.model1 || !refs.scene) return;
    
    // ตรวจสอบว่าแอนิเมชันเสร็จสมบูรณ์แล้วหรือไม่
    if (refs.isGsapAnimationComplete) {
      return;
    }
    
    // ทำให้โมเดลมองเห็นได้ (กรณีที่ก่อนหน้านี้ถูกซ่อนไว้)
    refs.model1.visible = true;
    
    // ยกเลิก tweens เดิมทั้งหมดก่อน
    killAllTweens();
    
    // ตั้งค่า animationEnabled เป็น false ก่อน
    refs.animationEnabled = false;
    
    // หยุดแอนิเมชันทั้งหมด
    if (refs.mixer1) {
      refs.mixer1.stopAllAction();
      
      // เริ่มแอนิเมชันใหม่แต่ให้หยุดเล่น
      refs.animationActions1.forEach(action => {
        action.reset();
        action.play();
        action.paused = true;
      });
    }
    
    const width = window.innerWidth;
    const camera = refs.camera;
    const controls = refs.controls;
    const center = refs.modelCenter.clone();
    const size = refs.modelSize;
    const model = refs.model1;
    const scene = refs.scene;
    
    refs.isMobile = width < 640;
    
    // ปรับตำแหน่งเริ่มต้น
    model.position.y = width < 640 ? -1.8 : -0.5;
    
    camera.position.set(
      center.x + size.x * 0,
      center.y + size.y * (width < 640 ? 2 : 2.5),
      center.z + size.z * 0
    );
    
    camera.fov = width < 640 ? 50 : 40;
    camera.updateProjectionMatrix();
    
    const newCenter = center.clone();
    if (width < 640) {
      newCenter.y -= 0.5;
    }
    
    camera.lookAt(newCenter);
    controls.target.copy(newCenter);
    controls.update();
    
    // สร้าง tweens
    const dummyObj = { x: model.position.x, y: model.position.y };
    
    // กำหนดค่า targetY ตามขนาดหน้าจอ
    let targetY;
    if (width < 640) {      // sm
      targetY = -1.8;
    } else if (width < 768) { // md
      targetY = -0.85;
    } else if (width < 1025) { // lg
      targetY = -0.85;
    } else if (width < 1280) { // xl
      targetY = -0.5; 
    } else if (width < 1440) { // 2xl
      targetY = -0.5;
    } else {                 // 2xl และใหญ่กว่า
      targetY = -0.2;
    }

    // กำหนดค่า targetX ตามขนาดหน้าจอ
    let targetX = 0.05;

    // ใช้ค่าคงที่แทนการสร้างตัวแปรใหม่ตลอด
    const initialDelay = 0;
    const transitionDuration = 3;
    const easingFunction = "sine.inOut";
    
    // ตำแหน่ง Y ของโมเดล - ใช้ will-change
    const modelTween = gsap.to(dummyObj, {
      x: targetX,
      y: targetY, 
      duration: transitionDuration,
      ease: easingFunction,
      delay: initialDelay,
      onUpdate: () => {
        model.position.x = dummyObj.x;
        model.position.y = dummyObj.y;
        
        // อัปเดตตำแหน่งไฟตามโมเดล
        if (refs.lights && refs.lights.ringLight) {
          refs.lights.ringLight.position.set(
            model.position.x,
            model.position.y - 0.5,
            model.position.z
          );
        }
        refs.needsRender = true;
      },
      onComplete: () => {
        // กำหนดให้แอนิเมชั่น GSAP เสร็จสมบูรณ์แล้ว
        refs.isGsapAnimationComplete = true;
        
        // ไม่เริ่มเล่นแอนิเมชั่นโมเดล 1 ทันที แต่ค้างไว้รอ
      }
    });
    
    // ตำแหน่งกล้อง - ใช้ easing function เดียวกัน
    const cameraTween = gsap.to(camera.position, {
      x: width < 640 ? center.x : center.x,
      y: width < 640 ? center.y + size.y * 2 : center.y + size.y * 2.5,
      z: width < 640 ? center.z + size.z * 2.5 : center.z + size.z * 2.5,
      duration: transitionDuration,
      ease: easingFunction,
      delay: initialDelay
    });
    
    // กำหนดค่า FOV ตามขนาดหน้าจอ
    let targetFOV;
    if (width < 640) {      // sm
      targetFOV = 50;
    } else if (width < 768) { // md
      targetFOV = 40;
    } else if (width < 1025) { // lg
      targetFOV = 30;
    } else if (width < 1280) { // xl
      targetFOV = 25;
    } else if (width < 1440) { // 2xl
      targetFOV = 20;
    } else {                 // 2xl และใหญ่กว่า
      targetFOV = 20;
    }

    // FOV
    const fovTween = gsap.to({value: camera.fov}, {
      value: targetFOV,
      duration: transitionDuration,
      ease: easingFunction,
      delay: initialDelay,
      onUpdate: function() {
        camera.fov = this.targets()[0].value;
        camera.updateProjectionMatrix();
      }
    });
    
    refs.tweens = [modelTween, cameraTween, fovTween];
    
    // อัปเดตตำแหน่งไฟสปอตไลท์
    const spotLight = scene.children.find(child => child instanceof THREE.SpotLight);
    if (spotLight && spotLight instanceof THREE.SpotLight) {
      spotLight.position.set(model.position.x, model.position.y + 5, model.position.z);
      spotLight.target = model;
    }
  }, [killAllTweens, startAllAnimations]);
  
  // เปิดให้ parent component เรียกใช้ฟังก์ชัน triggerModelMovement ผ่าน ref
  useImperativeHandle(ref, () => ({
    triggerModelMovement,
    startModel1AnimationsFromCardSelection: startModel1Animations
  }));
  
  // ฟังก์ชันปรับตำแหน่งกล้องตามขนาดหน้าจอ
  const handleResize = useCallback(() => {
    const refs = sceneRefs.current;
    if (!containerRef.current || !refs.renderer || !refs.camera) return;

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;

    refs.camera.aspect = width / height;
    refs.camera.updateProjectionMatrix();

    refs.renderer.setSize(width, height);
    
    // แก้ไขตรงนี้: ปรับการเรียกใช้งาน adjustCameraForMobile โดยตรวจสอบสถานะ isGsapAnimationComplete
    if (refs.isModel1Loaded && refs.modelCenter && refs.modelSize && refs.model1) {
      if (refs.currentPhase === 'gsap' && !refs.isGsapAnimationComplete) {
        // ถ้าอยู่ใน GSAP phase และยังไม่เสร็จ ให้ปรับตำแหน่งกล้องและโมเดล
        adjustCameraForMobile();
      } else if (refs.camera && refs.modelCenter) {
        // ถ้าอยู่ใน phase อื่นๆ ให้ปรับเฉพาะมุมมองกล้องเท่านั้น
        const width = window.innerWidth;
        const center = refs.modelCenter.clone();
        const newCenter = center.clone();
        
        if (width < 640) {
          newCenter.y -= 0.5;
        }
        
        refs.camera.lookAt(newCenter);
        if (refs.controls) {
          refs.controls.target.copy(newCenter);
          refs.controls.update();
        }
      }
    }
    refs.needsRender = true;
  }, []);
  
  // สร้าง scene, camera, renderer และ AssetsManager
  useEffect(() => {
    if (!containerRef.current) return;
    
    const refs = sceneRefs.current;

    // ทำความสะอาด canvas ที่มีอยู่
    const existingCanvases = containerRef.current.querySelectorAll('canvas');
    existingCanvases.forEach(canvas => {
      containerRef.current?.removeChild(canvas);
    });

    refs.isMobile = window.innerWidth < 640;
    
    // สร้าง AssetsManager
    refs.assetsManager = new AssetsManager();

    // สร้าง scene
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = null;
    refs.scene = scene;

    // สร้างกล้อง - ปรับค่า near/far ให้เหมาะสม
    const { offsetWidth, offsetHeight } = containerRef.current;
    const camera = new THREE.PerspectiveCamera(40, offsetWidth / offsetHeight, 0.1, 50);
    camera.position.set(0, 0.5, 3);
    camera.layers.enableAll();
    refs.camera = camera;

    // ตรวจสอบความสามารถของการ์ดจอ
    const canvas = document.createElement('canvas');
    const contextAttributes = {
      alpha: true, 
      antialias: true,
      powerPreference: 'high-performance' as WebGLPowerPreference,
      // ไม่ใช้ precision หรือ failIfMajorPerformanceCaveat ให้ Three.js ปรับเองอัตโนมัติ
    };
    
    // สร้าง renderer ที่รองรับความโปร่งใส
    const renderer = new THREE.WebGLRenderer({
      canvas,
      ...contextAttributes
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // จำกัด pixel ratio สูงสุดที่ 2
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.4;
    renderer.setSize(offsetWidth, offsetHeight);
    renderer.setClearColor(0x000000, 0);
    
    if (containerRef.current && document.body.contains(containerRef.current)) {
      containerRef.current.appendChild(renderer.domElement);
      refs.renderer = renderer;
      
      // เพิ่มการจัดการ WebGL context lost (สำคัญสำหรับมือถือ)
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        console.error('WebGL context lost! หยุด animation loop');
        // หยุด animation loop
        if (refs.frameId) {
          cancelAnimationFrame(refs.frameId);
          refs.frameId = null;
        }
      };
      
      const handleContextRestored = () => {
        // รีสตาร์ท animation loop
        if (refs.frameId === null && refs.clock) {
          refs.clock.start();
          animate();
        }
      };
      
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);
      
      // เก็บ reference สำหรับ cleanup
      (renderer as any)._handleContextLost = handleContextLost;
      (renderer as any)._handleContextRestored = handleContextRestored;
      
      // ตั้งค่าว่า renderer พร้อมใช้งาน
      setIsRendererReady(true);
    } else {
      renderer.dispose();
      return;
    }

    // สร้าง controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableRotate = false;
    controls.autoRotate = false;
    refs.controls = controls;

    // สร้างแสง
    refs.lights = createLights(scene, refs.modelLayer);

    // สร้าง clock
    refs.clock = new THREE.Clock();

    // สร้าง animate loop ช่วยลด CPU usage
    const animate = () => {
      refs.frameId = requestAnimationFrame(animate);
      
      // ลด CPU usage ถ้า document ไม่แอคทีฟ
      if (document.hidden) {
        return;
      }
      
      // ปรับ FPS ตามแต่ละเฟรม ช่วยลดการทำงานเมื่อไม่จำเป็น
      const now = performance.now();
      const lastFrameTime = refs.lastFrameTime || now;
      const delta = now - lastFrameTime;
      
      // ลดอัตราการอัพเดตเมื่อไม่จำเป็น (ไม่มีการเคลื่อนไหว)
      if (delta < 16 && refs.tweens.length === 0 && !refs.needsRender && !refs.animationEnabled) { // ประมาณ 60fps
        return;
      }
      refs.lastFrameTime = now;

      if (refs.controls && (refs.needsRender || refs.animationEnabled)) {
        refs.controls.update();
      }

      // อัปเดต animation mixer
      if (refs.clock && refs.animationEnabled) {
        const delta = refs.clock.getDelta();
        // ป้องกันค่า delta ที่ผิดปกติ
        const safeDelta = (delta > 0 && delta < 0.2) ? delta : 0.016;
        
        // อัปเดต mixer ตาม phase ปัจจุบัน
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
    
    // เริ่ม animation ถ้า renderer พร้อม
    if (isRendererReady) {
      animate();
    }

    // จัดการ visibility change และ resize
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (refs.frameId !== null) {
          cancelAnimationFrame(refs.frameId);
          refs.frameId = null;
        }
      } else {
        if (refs.frameId === null) {
          refs.clock?.start();
          animate();
        }
      }
    };
    
    // ฟังก์ชันรับมือกับการเปลี่ยนขนาดหน้าจอ ใช้ debounce
    const debounce = (func: Function, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(), delay);
      };
    };
    
    // ใช้ debounce สำหรับ resize
    const debouncedResize = debounce(handleResize, 200);

    // เพิ่ม event listeners
    window.addEventListener('resize', debouncedResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      killAllTweens();
      
      if (refs.frameId) {
        cancelAnimationFrame(refs.frameId);
        refs.frameId = null;
      }

      window.removeEventListener('resize', debouncedResize);

      // ทำความสะอาด Three.js objects
      if (refs.scene) {
        refs.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
        
        while (refs.scene.children.length > 0) {
          refs.scene.remove(refs.scene.children[0]);
        }
      }

      if (refs.controls) {
        refs.controls.dispose();
      }

      if (refs.renderer) {
        // ลบ WebGL context event listeners
        if (refs.renderer.domElement) {
          const handleContextLost = (refs.renderer as any)._handleContextLost;
          const handleContextRestored = (refs.renderer as any)._handleContextRestored;
          
          if (handleContextLost) {
            refs.renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
          }
          if (handleContextRestored) {
            refs.renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
          }
        }
        
        refs.renderer.dispose();
      }
      
      // ทำความสะอาด Draco Loader
      if (refs.assetsManager) {
        refs.assetsManager.draco.dispose();
      }

      // รีเซ็ต refs
      refs.renderer = null;
      refs.scene = null;
      refs.camera = null;
      refs.controls = null;
      refs.mixer1 = null;
      refs.mixer2 = null;
      refs.clock = null;
      refs.frameId = null;
      refs.model1 = null;
      refs.model2 = null;
      refs.modelSize = null;
      refs.modelCenter = null;
      refs.isMobile = false;
      refs.tweens = [];
      refs.animationActions1 = [];
      refs.animationActions2 = [];
      refs.animationEnabled = false;
      refs.assetsManager = null;
      refs.lastFrameTime = null;
      refs.isModel1Loaded = false;
      refs.isModel2Loaded = false;
      refs.isModelLoading = false;
      refs.isGsapAnimationComplete = false;
      refs.isModel1AnimationComplete = false;
      refs.isModel2AnimationStarted = false;
      refs.currentPhase = 'loading';
      refs.preloadedModel2Gltf = null; // Reset preloaded model2 gltf
      
      // ลบ canvas ที่เหลือ
      if (containerRef.current) {
        const remainingCanvases = containerRef.current.querySelectorAll('canvas');
        remainingCanvases.forEach(canvas => {
          containerRef.current?.removeChild(canvas);
        });
      }
    };
  }, [adjustCameraForMobile, killAllTweens, isRendererReady]);

  // Effect สำหรับการจัดการ touch events
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // ฟังก์ชันส่งต่อการสัมผัสเพื่อให้สามารถเลื่อนได้
    const handleTouchStart = (e: TouchEvent) => {
      e.stopPropagation();
    };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  // ใช้ useMemo เพื่อลดการคำนวณซ้ำสำหรับ style props
  const containerStyle = useMemo(() => ({
    cursor: 'default',
    pointerEvents: 'none' as const,
    touchAction: 'auto' as const,
    overflow: 'visible' as const,
    willChange: 'transform' as const // เพิ่ม will-change เพื่อช่วยในการแสดงผล
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

export default ThreeViewer;