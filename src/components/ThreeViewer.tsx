'use client';

import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';

// สร้าง type เพื่อรวม refs ไว้ด้วยกัน
type SceneRefs = {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControls | null;
  mixer: THREE.AnimationMixer | null;
  clock: THREE.Clock | null;
  frameId: number | null;
  model: THREE.Object3D | null;
  modelSize: THREE.Vector3 | null;
  modelCenter: THREE.Vector3 | null;
  isMobile: boolean;
  tweens: gsap.core.Tween[];
  animationActions: THREE.AnimationAction[];
  fallbackAnimation: boolean;
  animationEnabled: boolean; // เพิ่มตัวแปรเพื่อควบคุมสถานะการเล่นแอนิเมชัน
  modelLayer: number; // เพิ่มเลเยอร์สำหรับโมเดล
  backgroundLayer: number; // เพิ่มเลเยอร์สำหรับพื้นหลัง
}

// เพิ่ม interface สำหรับ ref
interface ThreeViewerRef {
  triggerModelMovement: () => void;
}

interface ThreeViewerProps {
  modelPath?: string;
  className?: string;
  height?: string;
}

// เปลี่ยนเป็น forwardRef เพื่อรับ ref จาก parent
const ThreeViewer = forwardRef<ThreeViewerRef, ThreeViewerProps>(({
  modelPath = '/models/modern_turntable.glb',
  className = 'bg-telepathic-beige',
  height = 'h-screen'
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ใช้ useRef เพื่อเก็บอ้างอิง
  const sceneRefs = useRef<SceneRefs>({
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    mixer: null,
    clock: null,
    frameId: null,
    model: null,
    modelSize: null,
    modelCenter: null,
    isMobile: false,
    tweens: [],
    animationActions: [],
    fallbackAnimation: false,
    animationEnabled: false,
    modelLayer: 1, // กำหนดค่าเริ่มต้นเลเยอร์สำหรับโมเดล
    backgroundLayer: 0 // กำหนดค่าเริ่มต้นเลเยอร์สำหรับพื้นหลัง
  });
  
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
    
    // ถ้ามี delay ให้รอก่อนเริ่มเล่นแอนิเมชัน
    if (delay > 0) {
      console.log(`จะเริ่มเล่นแอนิเมชันใน ${delay} วินาที`);
      setTimeout(() => {
        console.log("เริ่มเล่นแอนิเมชันแล้ว");
        refs.animationEnabled = true;
        
        if (refs.animationActions.length > 0 && refs.mixer) {
          refs.animationActions.forEach(action => {
            if (action.paused) action.paused = false;
            if (!action.isRunning()) action.play();
          });
          
          if (refs.clock) refs.clock.getDelta(); // รีเซ็ต delta
        }
      }, delay * 1000);
    } else {
      // เริ่มเล่นทันที
      console.log("เริ่มเล่นแอนิเมชันทันที");
      refs.animationEnabled = true;
      
      if (refs.animationActions.length > 0 && refs.mixer) {
        refs.animationActions.forEach(action => {
          if (action.paused) action.paused = false;
          if (!action.isRunning()) action.play();
        });
        
        if (refs.clock) refs.clock.getDelta(); // รีเซ็ต delta
      }
    }
  }, []);
  
  // ฟังก์ชันหยุดแอนิเมชันทั้งหมด
  const pauseAllAnimations = useCallback(() => {
    const refs = sceneRefs.current;
    console.log("หยุดเล่นแอนิเมชันทั้งหมด");
    refs.animationEnabled = false;
    
    if (refs.animationActions.length > 0 && refs.mixer) {
      refs.animationActions.forEach(action => {
        action.paused = true;
      });
    }
  }, []);

// ฟังก์ชันสร้างแสงที่ลดความสว่างลง 40%
const createLights = useCallback((scene: THREE.Scene) => {
  const refs = sceneRefs.current;
  const modelLayer = refs.modelLayer;
  
  // แสงรอบทิศทาง (ลดลง 40%)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // แสงหลักจากด้านบน (ลดลง 40%)
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
  mainLight.position.set(3, 5, 2);
  mainLight.castShadow = true;
  mainLight.shadow.bias = -0.0001;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -10;
  mainLight.shadow.camera.right = 10;
  mainLight.shadow.camera.top = 10;
  mainLight.shadow.camera.bottom = -10;
  mainLight.layers.set(modelLayer);
  scene.add(mainLight);

  // แสงเสริมด้านข้าง (ลดลง 40%)
  const rimLight = new THREE.DirectionalLight(0xe8f1ff, 1.5);
  rimLight.position.set(-5, 3, -5);
  rimLight.layers.set(modelLayer);
  scene.add(rimLight);

  // แสงด้านหน้า (ลดลง 40%)
  const frontLight = new THREE.DirectionalLight(0xffffff, 1.32);
  frontLight.position.set(0, 0, 5);
  frontLight.layers.set(modelLayer);
  scene.add(frontLight);

  // ไฟสปอตไลท์ (ลดลง 40%)
  const spotLight = new THREE.SpotLight(0xffffff, 1);
  spotLight.position.set(0, 10, 0);
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 100;
  spotLight.decay = 1.0;
  spotLight.distance = 30;
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.layers.set(modelLayer);
  scene.add(spotLight);

  // ไฟวงกลมด้านล่าง (ลดลง 40%)
  const ringLight = new THREE.PointLight(0xf0f8ff, 1.5);
  ringLight.position.set(0, -0.5, 0);
  ringLight.distance = 8;
  ringLight.decay = 1.5;
  ringLight.layers.set(modelLayer);
  scene.add(ringLight);
  
  // แสงเสริมด้านหลัง (ลดลง 40%)
  const backLight = new THREE.DirectionalLight(0xf5f5f5, 1.2);
  backLight.position.set(0, 3, -5);
  backLight.layers.set(modelLayer);
  scene.add(backLight);
  
  return { spotLight, ringLight };
}, []);
  
// ฟังก์ชันปรับแต่งวัสดุที่ลดการสะท้อนแสงลง 90%
const enhanceMaterial = useCallback((material: THREE.Material) => {
  if (!material) return;
  
  if (material instanceof THREE.MeshStandardMaterial) {
    // ลดค่า metalness ลงเกือบหมด
    material.metalness = Math.max(material.metalness * 0.1, 0.02); // เหลือเพียง 10%
    
    // เพิ่มค่า roughness สูงมาก
    material.roughness = Math.min(material.roughness * 4, 0.98); // เพิ่มค่าขึ้นเกือบสูงสุด
    
    if (material.normalMap) {
      material.normalScale.set(0.4, 0.4); // ลดความชัดของ normal map ลงมาก
    }
    
    // ลดความเข้มของการสะท้อนแสงลง 90%
    material.envMapIntensity = 0.15; // จาก 1.5 เหลือ 0.15
  }
  
  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.clearcoat = 0.04; // ลดจาก 0.4 เหลือเพียง 0.04
    material.clearcoatRoughness = 0.95; // เพิ่มเกือบสูงสุด
    material.reflectivity = 0.1; // ลดการสะท้อนเหลือเพียง 10%
  }
}, []);
  
// แก้ไขฟังก์ชัน adjustCameraForMobile
const adjustCameraForMobile = useCallback(() => {
  const refs = sceneRefs.current;
  if (!refs.camera || !refs.controls || !refs.modelCenter || 
      !refs.modelSize || !refs.model || !refs.scene) return;
  
  // ยกเลิก tweens เดิมทั้งหมดก่อน
  killAllTweens();
  
  // ตั้งค่า animationEnabled เป็น false ก่อน
  refs.animationEnabled = false;
  
  // หยุดแอนิเมชันทั้งหมด
  if (refs.mixer) {
    refs.mixer.stopAllAction();
    
    // เริ่มแอนิเมชันใหม่แต่ให้หยุดเล่น
    refs.animationActions.forEach(action => {
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
  const model = refs.model;
  const scene = refs.scene;
  
  // เก็บอ้างอิงโมเดลปัจจุบันไว้ เพื่อลบออกเมื่อเคลื่อนที่เสร็จ
  const oldModel = model;
  
  refs.isMobile = width < 640;
  
  // ปรับตำแหน่งเริ่มต้นตามคำแนะนำ
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
  const dummyObj = { y: model.position.y };
    // กำหนดค่า targetY ตามขนาดหน้าจอ
  let targetY;
  if (width < 640) {      // sm
    targetY = -1.8;
  } else if (width < 768) { // md
    targetY = -0.85;
  } else if (width < 1024) { // lg
    targetY = -0.85;
  } else if (width < 1280) { // xl
    targetY = -0.9; 
  } else if (width < 1440) { // 2xl
    targetY = -0.9;
  } else {                 // 2xl และใหญ่กว่า
    targetY = -0.2;
  }
  
  const initialDelay = 0;
  const transitionDuration = 3;
  const easingFunction = "sine.inOut";
  
  // ตำแหน่ง Y ของโมเดล
  const modelTween = gsap.to(dummyObj, {
    y: targetY, 
    duration: transitionDuration,
    ease: easingFunction,
    delay: initialDelay,
    onUpdate: () => {
      model.position.y = dummyObj.y;
      
      // อัปเดตตำแหน่งไฟตามโมเดล
      const ringLight = scene.children.find(child => 
        child instanceof THREE.PointLight && (child as THREE.PointLight).distance === 8
      );
      
      if (ringLight && ringLight instanceof THREE.PointLight) {
        ringLight.position.set(
          model.position.x,
          model.position.y - 0.5,
          model.position.z
        );
      }
    },
    onComplete: () => {
      
      // ค้นหาโมเดลทั้งหมดในฉาก ยกเว้นโมเดลปัจจุบัน
      const otherModels = scene.children.filter(
        obj => obj !== model && // ไม่ใช่โมเดลปัจจุบัน
              !(obj instanceof THREE.AmbientLight || 
              obj instanceof THREE.DirectionalLight || 
              obj instanceof THREE.PointLight || 
              obj instanceof THREE.SpotLight) &&
              !(obj instanceof THREE.Mesh && obj.geometry instanceof THREE.PlaneGeometry)
      );
      
      // ลบโมเดลอื่นทั้งหมดออก
      console.log(`พบโมเดลอื่น ${otherModels.length} ตัว กำลังลบโมเดลอื่นทั้งหมดออก...`);
      
      otherModels.forEach(otherModel => {
        // ทำความสะอาด geometry และ material ก่อนลบออกจาก scene
        otherModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) {
              child.geometry.dispose();
            }
            
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        
        // ลบโมเดลออกจาก scene
        scene.remove(otherModel);
      });

      // เริ่มเล่นแอนิเมชันเมื่อถึงเป้าหมาย
      startAllAnimations();
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
  
  // FOV
// กำหนดค่า FOV ตามขนาดหน้าจอ
let targetFOV;
if (width < 640) {      // sm
  targetFOV = 50;
} else if (width < 768) { // md
  targetFOV = 40;
} else if (width < 1024) { // lg
  targetFOV = 40;
} else if (width < 1280) { // xl
  targetFOV = 40;
} else if (width < 1440) { // 2xl
  targetFOV = 50;
} else {                 // 2xl และใหญ่กว่า
  targetFOV = 25;
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
  
  // เพิ่มฟังก์ชันเพื่อเรียกใช้ adjustCameraForMobile โดยตรง
  const triggerModelMovement = useCallback(() => {
    console.log("เรียกใช้งาน triggerModelMovement จากการเลือกการ์ด");
    adjustCameraForMobile();
  }, [adjustCameraForMobile]);
  
  // เปิดให้ parent component เรียกใช้ฟังก์ชัน triggerModelMovement ผ่าน ref
  useImperativeHandle(ref, () => ({
    triggerModelMovement
  }));
  
  // ฟังก์ชันสร้าง fallback model
  const createFallbackModel = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.scene) return null;
    
    const geometry = new THREE.TorusKnotGeometry(1, 0.3, 128, 32);
    const material = new THREE.MeshPhysicalMaterial({ 
      color: 0xff7d33,
      metalness: 0.8,
      roughness: 0.2,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
      reflectivity: 1.0,
      emissive: 0x220000,
      emissiveIntensity: 0.1,
      envMapIntensity: 1.0
    });
    
    const fallbackModel = new THREE.Mesh(geometry, material);
    fallbackModel.castShadow = true;
    fallbackModel.receiveShadow = true;
    fallbackModel.layers.set(refs.modelLayer); // เซ็ตเลเยอร์ให้กับโมเดล fallback
    
    const isMobile = window.innerWidth < 640;
    fallbackModel.position.y = isMobile ? -0.5 : 0.2;
    
    refs.scene.add(fallbackModel);
    refs.model = fallbackModel;
    
    refs.modelCenter = new THREE.Vector3(0, 0, 0);
    refs.modelSize = new THREE.Vector3(2, 2, 2);
    refs.fallbackAnimation = true;
    
    return fallbackModel;
  }, []);
  
  // เพิ่ม Effect สำหรับการจัดการ touch events
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
  
  // Effect สำหรับการสร้าง scene, camera, renderer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const refs = sceneRefs.current;

    // ทำความสะอาด canvas ที่มีอยู่
    const existingCanvases = containerRef.current.querySelectorAll('canvas');
    existingCanvases.forEach(canvas => {
      containerRef.current?.removeChild(canvas);
    });

    refs.isMobile = window.innerWidth < 640;

    // สร้าง scene
    const scene = new THREE.Scene();
    // เปลี่ยนพื้นหลังเป็น transparent ตั้งค่าเป็น null แทนที่จะเป็นสี
    scene.background = null;
    // ลบหมอกออกเพื่อให้มองเห็นพื้นหลังได้ชัดเจน
    scene.fog = null;
    refs.scene = scene;

    // สร้างกล้อง
    const { offsetWidth, offsetHeight } = containerRef.current;
    const camera = new THREE.PerspectiveCamera(40, offsetWidth / offsetHeight, 0.1, 100);
    camera.position.set(0, 0.5, 3);
    camera.layers.enableAll(); // กล้องมองเห็นทุกเลเยอร์
    refs.camera = camera;

    // สร้าง renderer ที่รองรับความโปร่งใส
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // เปลี่ยนเป็น true เพื่อรองรับความโปร่งใส
      powerPreference: 'high-performance',
      precision: 'highp'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.4; // คงค่า exposure สูงไว้สำหรับโมเดล
    renderer.setSize(offsetWidth, offsetHeight);
    // ตั้งค่าให้ renderer มีพื้นหลังโปร่งใส
    renderer.setClearColor(0x000000, 0);
    
    if (containerRef.current && document.body.contains(containerRef.current)) {
      containerRef.current.appendChild(renderer.domElement);
      refs.renderer = renderer;
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
    // สร้างพื้น - ใช้ MeshBasicMaterial ที่ไม่ตอบสนองต่อแสง
    // ลบพื้นออกเพราะไม่จำเป็นต้องมีเมื่อพื้นหลังเป็นแบบโปร่งใส

    // สร้างแสง
    createLights(scene);
    
    // สร้าง clock
    refs.clock = new THREE.Clock();

    // ฟังก์ชันรับมือกับการเปลี่ยนขนาดหน้าจอ
    const handleResize = () => {
      if (!containerRef.current || !refs.renderer || !refs.camera) return;

      const width = containerRef.current.offsetWidth;
      const height = containerRef.current.offsetHeight;

      refs.camera.aspect = width / height;
      refs.camera.updateProjectionMatrix();

      refs.renderer.setSize(width, height);
      
      if (refs.modelCenter && refs.modelSize && refs.model) {
        adjustCameraForMobile();
      }
    };

    // ฟังก์ชัน animate
    const animate = () => {
      refs.frameId = requestAnimationFrame(animate);

      if (refs.controls) {
        refs.controls.update();
      }

      // อัปเดต animation mixer
      if (refs.mixer && refs.clock) {
        const delta = refs.clock.getDelta();
        // ป้องกันค่า delta ที่ผิดปกติ
        if (delta > 0 && delta < 0.2) {
          refs.mixer.update(delta);
        } else {
          refs.mixer.update(0.016);
        }
      }
      
      // fallback animation
      if (refs.model && refs.fallbackAnimation) {
        refs.model.rotation.y += 0.005;
        
        const time = Date.now() * 0.001;
        const baseY = refs.isMobile ? -0.5 : 0.2;
        refs.model.position.y = baseY + Math.sin(time * 1.5) * 0.05;
        
        // อัปเดตตำแหน่งของ ringLight
        const ringLight = refs.scene?.children.find(child => 
          child instanceof THREE.PointLight && (child as THREE.PointLight).distance === 5
        );
        
        if (ringLight && ringLight instanceof THREE.PointLight) {
          ringLight.position.set(
            refs.model.position.x,
            refs.model.position.y - 0.5,
            refs.model.position.z
          );
        }
      }

      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera);
      }
    };

    // เริ่ม animation loop
    const startAnimation = () => {
      if (refs.frameId === null) {
        refs.clock?.start();
        animate();
      }
    };
    
    // หยุด animation loop
    const stopAnimation = () => {
      if (refs.frameId !== null) {
        cancelAnimationFrame(refs.frameId);
        refs.frameId = null;
      }
    };

    // จัดการกับ visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    // เพิ่ม event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // เริ่ม animation
    startAnimation();

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      killAllTweens();
      
      if (refs.frameId) {
        cancelAnimationFrame(refs.frameId);
        refs.frameId = null;
      }

      window.removeEventListener('resize', handleResize);

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
        refs.renderer.dispose();
      }

      // รีเซ็ต refs แบบปลอดภัยตาม type
      refs.renderer = null;
      refs.scene = null;
      refs.camera = null;
      refs.controls = null;
      refs.mixer = null;
      refs.clock = null;
      refs.frameId = null;
      refs.model = null;
      refs.modelSize = null;
      refs.modelCenter = null;
      refs.isMobile = false;
      refs.tweens = [];
      refs.animationActions = [];
      refs.fallbackAnimation = false;
      refs.animationEnabled = false;
      
      // ลบ canvas ที่เหลือ
      if (containerRef.current) {
        const remainingCanvases = containerRef.current.querySelectorAll('canvas');
        remainingCanvases.forEach(canvas => {
          containerRef.current?.removeChild(canvas);
        });
      }
    };
  }, [adjustCameraForMobile, createLights, killAllTweens]);

  // Effect สำหรับการโหลดโมเดล
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs.scene || !refs.camera || !refs.controls) return;

    // ตั้งค่าให้ไม่เล่นแอนิเมชันตั้งแต่เริ่มต้น
    refs.fallbackAnimation = false;
    refs.animationEnabled = false;

    // ลบโมเดลเก่า
    const nonLightObjects = refs.scene.children.filter(
      obj => !(obj instanceof THREE.AmbientLight || obj instanceof THREE.DirectionalLight || 
              obj instanceof THREE.PointLight || obj instanceof THREE.SpotLight) &&
              !(obj instanceof THREE.Mesh && obj.geometry instanceof THREE.PlaneGeometry)
    );
    nonLightObjects.forEach(obj => refs.scene!.remove(obj));

    // เคลียร์แอนิเมชัน
    refs.animationActions = [];
    
    if (refs.mixer) {
      refs.mixer.stopAllAction();
      refs.mixer.uncacheRoot(refs.mixer.getRoot());
      refs.mixer = null;
    }
    
    console.log("เริ่มโหลดโมเดล");
    
    // โหลดโมเดล
    const loader = new GLTFLoader();
    
    loader.load(
      modelPath,
      (gltf) => {
        if (!refs.scene) return;
        
        console.log("โหลดโมเดลเสร็จแล้ว");
        
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0, 0.2, 0);
        
        // ปรับปรุงวัสดุและกำหนดเลเยอร์
        model.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            node.layers.set(refs.modelLayer); // กำหนดให้ mesh ทุกชิ้นอยู่ในเลเยอร์โมเดล
            
            if (node.material) {
              if (Array.isArray(node.material)) {
                node.material.forEach(mat => enhanceMaterial(mat));
              } else {
                enhanceMaterial(node.material);
              }
            }
          }
        });
        
        // เพิ่มโมเดลเข้าสู่ scene
        refs.scene!.add(model);
        refs.model = model;
        
        // คำนวณขนาดและตำแหน่ง
        const box = new THREE.Box3().setFromObject(model);
        refs.modelSize = box.getSize(new THREE.Vector3());
        refs.modelCenter = box.getCenter(new THREE.Vector3());
        
        // สร้างแอนิเมชันแต่ยังไม่เล่น
        if (gltf.animations && gltf.animations.length > 0) {
          console.log(`พบแอนิเมชัน ${gltf.animations.length} แอนิเมชัน`);
          refs.mixer = new THREE.AnimationMixer(model);
          
          gltf.animations.forEach((clip) => {
            try {
              const action = refs.mixer!.clipAction(clip);
              action.setLoop(THREE.LoopRepeat, Infinity);
              action.clampWhenFinished = true;
              
              // สร้างแอนิเมชันแต่ไม่เล่นทันที
              action.paused = true;
              action.play();
              action.paused = true;
              
              refs.animationActions.push(action);
              console.log(`เตรียมแอนิเมชัน: ${clip.name || 'Unnamed'}`);
            } catch (error) {
              console.error('Failed to play animation:', error instanceof Error ? error.message : 'Unknown error');
            }
          });
          
          if (refs.clock) refs.clock.start();
        } else {
          refs.fallbackAnimation = true;
          console.log("ไม่พบแอนิเมชัน ใช้ fallback animation");
        }
        
        // ตั้งค่า animationEnabled เป็น false ก่อนปรับกล้อง
        refs.animationEnabled = false;
        
        // ปรับกล้อง
        adjustCameraForMobile();
      },
      (xhr) => {
        const percent = (xhr.loaded / xhr.total) * 100;
        console.log(`กำลังโหลดโมเดล: ${percent.toFixed(0)}%`);
      },
      (error) => {
        console.error('Error loading model:', error);
      }
    );
    
    // ถ้าโหลดไม่สำเร็จให้สร้าง fallback model
    const fallbackTimer = setTimeout(() => {
      if (!refs.scene) return;
      
      const hasModel = refs.scene.children.some(
        obj => !(obj instanceof THREE.AmbientLight || obj instanceof THREE.DirectionalLight || 
                obj instanceof THREE.PointLight || obj instanceof THREE.SpotLight) &&
                !(obj instanceof THREE.Mesh && obj.geometry instanceof THREE.PlaneGeometry)
      );
      
      if (!hasModel) {
        console.log("โหลดโมเดลไม่สำเร็จ สร้าง fallback model");
        createFallbackModel();
        
        // ตั้งค่า animationEnabled เป็น false ก่อนปรับกล้อง
        refs.animationEnabled = false;
        adjustCameraForMobile();
      }
    }, 5000);
    
    return () => {
      killAllTweens();
      clearTimeout(fallbackTimer);
    };
  }, [modelPath, adjustCameraForMobile, createFallbackModel, enhanceMaterial, killAllTweens, pauseAllAnimations]);

  return (
    <div 
      ref={containerRef} 
      className={`w-full ${height} relative ${className}`}
      id="three-viewer-container"
      style={{ 
        cursor: 'default',
        pointerEvents: 'none',
        touchAction: 'auto',
        overflow: 'visible'
      }}
    />
  );
});

export default ThreeViewer;