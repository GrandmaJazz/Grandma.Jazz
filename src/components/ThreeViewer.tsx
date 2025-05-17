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
  isLowEndDevice: boolean; // เพิ่มการตรวจสอบอุปกรณ์สเปคต่ำ
  fpsStats: {
    current: number;
    samples: number[];
    average: number;
    lastTime: number;
  };
  tweens: gsap.core.Tween[];
  animationActions: THREE.AnimationAction[];
  fallbackAnimation: boolean;
  animationEnabled: boolean;
  modelLayer: number;
  backgroundLayer: number;
  loadingProgress: number; // เพิ่มการติดตามความคืบหน้าการโหลด
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
  
  // ฟังก์ชันตรวจสอบอุปกรณ์สเปคต่ำ
  const detectLowEndDevice = useCallback(() => {
    // ตรวจสอบอุปกรณ์เคลื่อนที่
    const isMobile = window.innerWidth < 640 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // ตรวจสอบ RAM (ถ้ามี)
    let isLowMemory = false;
    if ('deviceMemory' in navigator) {
      // @ts-ignore - deviceMemory เป็น API ที่ไม่รองรับในทุกเบราว์เซอร์
      isLowMemory = navigator.deviceMemory < 4;
    }
    
    // ตรวจสอบโปรเซสเซอร์ (ถ้ามี)
    let isSlowProcessor = false;
    if ('hardwareConcurrency' in navigator) {
      isSlowProcessor = navigator.hardwareConcurrency < 4;
    }
    
    return isMobile && (isLowMemory || isSlowProcessor);
  }, []);
  
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
    isLowEndDevice: detectLowEndDevice(), // เพิ่มการตรวจสอบอุปกรณ์สเปคต่ำ
    fpsStats: {
      current: 60,
      samples: [],
      average: 60,
      lastTime: 0
    },
    tweens: [],
    animationActions: [],
    fallbackAnimation: false,
    animationEnabled: false,
    modelLayer: 1,
    backgroundLayer: 0,
    loadingProgress: 0
  });
  
  // ฟังก์ชันยกเลิก GSAP tweens ทั้งหมด
  const killAllTweens = useCallback(() => {
    const refs = sceneRefs.current;
    if (refs.tweens.length > 0) {
      refs.tweens.forEach(tween => tween.kill());
      refs.tweens = [];
    }
  }, []);
  
  // ฟังก์ชันวัด FPS และปรับคุณภาพอัตโนมัติ
  const measureFPS = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.renderer) return;
    
    const now = performance.now();
    if (refs.fpsStats.lastTime) {
      const delta = now - refs.fpsStats.lastTime;
      const currentFPS = 1000 / delta;
      
      // กรองค่า FPS ที่ผิดปกติ
      if (currentFPS > 0 && currentFPS < 120) {
        refs.fpsStats.samples.push(currentFPS);
        if (refs.fpsStats.samples.length > 10) refs.fpsStats.samples.shift();
        refs.fpsStats.average = refs.fpsStats.samples.reduce((sum, val) => sum + val, 0) / refs.fpsStats.samples.length;
        
        // ปรับคุณภาพอัตโนมัติเมื่อ FPS ต่ำ
        if (refs.fpsStats.average < 30) {
          // ลด pixel ratio
          if (refs.renderer.getPixelRatio() > 1) {
            console.log("Performance: FPS ต่ำ, ลด pixel ratio");
            refs.renderer.setPixelRatio(1);
          }
          
          // ปิด shadows
          if (refs.renderer.shadowMap.enabled) {
            console.log("Performance: FPS ต่ำ, ปิด shadows");
            refs.renderer.shadowMap.enabled = false;
          }
          
          // เปลี่ยน tone mapping เป็นแบบเรียบง่าย
          if (refs.renderer.toneMapping !== THREE.NoToneMapping) {
            console.log("Performance: FPS ต่ำ, ปิด tone mapping");
            refs.renderer.toneMapping = THREE.NoToneMapping;
          }
          
          // ลดคุณภาพโมเดล (ถ้าเป็นไปได้)
          if (refs.model) {
            refs.model.traverse((node) => {
              if (node instanceof THREE.Mesh && node.material) {
                if (Array.isArray(node.material)) {
                  node.material.forEach(mat => {
                    if (mat instanceof THREE.MeshStandardMaterial) {
                      if (mat.envMapIntensity > 0) {
                        console.log("Performance: FPS ต่ำ, ลดคุณภาพ material");
                        mat.envMapIntensity = 0;
                      }
                    }
                  });
                } else if (node.material instanceof THREE.MeshStandardMaterial) {
                  if (node.material.envMapIntensity > 0) {
                    node.material.envMapIntensity = 0;
                  }
                }
              }
            });
          }
        }
      }
    }
    refs.fpsStats.lastTime = now;
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

  // ฟังก์ชันสร้างแสงที่ปรับตามประเภทอุปกรณ์
  const createLights = useCallback((scene: THREE.Scene) => {
    const refs = sceneRefs.current;
    const modelLayer = refs.modelLayer;
    const isMobile = refs.isMobile;
    const isLowEndDevice = refs.isLowEndDevice;
    
    // ลดความสว่างสำหรับมือถือ
    const intensityMultiplier = isLowEndDevice ? 0.4 : (isMobile ? 0.6 : 1.0);
    
    // แสงรอบทิศทาง (ลดลงสำหรับมือถือ)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6 * intensityMultiplier);
    scene.add(ambientLight);

    // แสงหลักจากด้านบน
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.7 * intensityMultiplier);
    mainLight.position.set(3, 5, 2);
    
    // ตั้งค่า shadow ตามประเภทอุปกรณ์
    if (!isLowEndDevice) {
      mainLight.castShadow = true;
      mainLight.shadow.bias = -0.0001;
      // ลดขนาด shadow map สำหรับมือถือ
      mainLight.shadow.mapSize.width = isMobile ? 512 : 2048;
      mainLight.shadow.mapSize.height = isMobile ? 512 : 2048;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 50;
      mainLight.shadow.camera.left = -10;
      mainLight.shadow.camera.right = 10;
      mainLight.shadow.camera.top = 10;
      mainLight.shadow.camera.bottom = -10;
    }
    
    mainLight.layers.set(modelLayer);
    scene.add(mainLight);

    // แสงเสริมด้านข้าง
    const rimLight = new THREE.DirectionalLight(0xe8f1ff, 1.5 * intensityMultiplier);
    rimLight.position.set(-5, 3, -5);
    rimLight.layers.set(modelLayer);
    scene.add(rimLight);

    // แสงด้านหน้า
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.32 * intensityMultiplier);
    frontLight.position.set(0, 0, 5);
    frontLight.layers.set(modelLayer);
    scene.add(frontLight);

    // ไฟสปอตไลท์ - ใช้เฉพาะเมื่อไม่ใช่อุปกรณ์สเปคต่ำ
    let spotLight: THREE.SpotLight | null = null;
    if (!isLowEndDevice) {
      spotLight = new THREE.SpotLight(0xffffff, 1 * intensityMultiplier);
      spotLight.position.set(0, 10, 0);
      spotLight.angle = Math.PI / 6;
      spotLight.penumbra = 100;
      spotLight.decay = 1.0;
      spotLight.distance = 30;
      
      if (!isMobile) {
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
      }
      
      spotLight.layers.set(modelLayer);
      scene.add(spotLight);
    }

    // ไฟวงกลมด้านล่าง - ใช้เฉพาะเมื่อไม่ใช่อุปกรณ์สเปคต่ำ
    let ringLight: THREE.PointLight | null = null;
    if (!isLowEndDevice) {
      ringLight = new THREE.PointLight(0xf0f8ff, 1.5 * intensityMultiplier);
      ringLight.position.set(0, -0.5, 0);
      ringLight.distance = 8;
      ringLight.decay = 1.5;
      ringLight.layers.set(modelLayer);
      scene.add(ringLight);
    }
    
    // แสงเสริมด้านหลัง - ใช้แม้บนอุปกรณ์สเปคต่ำเพราะสำคัญต่อการมองเห็น
    const backLight = new THREE.DirectionalLight(0xf5f5f5, 1.2 * intensityMultiplier);
    backLight.position.set(0, 3, -5);
    backLight.layers.set(modelLayer);
    scene.add(backLight);
    
    return { spotLight, ringLight };
  }, []);
  
  // ฟังก์ชันปรับแต่งวัสดุตามประเภทอุปกรณ์
  const enhanceMaterial = useCallback((material: THREE.Material) => {
    if (!material) return;
    
    const refs = sceneRefs.current;
    const isLowEndDevice = refs.isLowEndDevice;
    const isMobile = refs.isMobile;
    
    if (material instanceof THREE.MeshStandardMaterial) {
      if (isLowEndDevice) {
        // อุปกรณ์สเปคต่ำ: ลดคุณภาพอย่างมาก
        material.metalness = 0; // ปิด metalness
        material.roughness = 1.0; // roughness สูงสุด
        material.envMapIntensity = 0; // ปิด env map
        
        // ปิด normal map บนอุปกรณ์สเปคต่ำ
        if (material.normalMap) {
          material.normalMap = null;
        }
      } else if (isMobile) {
        // มือถือทั่วไป: ลดคุณภาพปานกลาง
        material.metalness = Math.max(material.metalness * 0.2, 0.02);
        material.roughness = Math.min(material.roughness * 2, 0.95);
        material.envMapIntensity = 0.3;
        
        if (material.normalMap) {
          material.normalScale.set(0.4, 0.4);
        }
      } else {
        // Desktop: ลดเล็กน้อย
        material.metalness = Math.max(material.metalness * 0.5, 0.1);
        material.roughness = Math.min(material.roughness * 1.5, 0.9);
        material.envMapIntensity = 0.8;
      }
    }
    
    if (material instanceof THREE.MeshPhysicalMaterial) {
      if (isLowEndDevice) {
        material.clearcoat = 0;
        material.clearcoatRoughness = 1;
        material.reflectivity = 0; 
      } else if (isMobile) {
        material.clearcoat = 0.04;
        material.clearcoatRoughness = 0.95;
        material.reflectivity = 0.1;
      } else {
        material.clearcoat = 0.1;
        material.clearcoatRoughness = 0.8;
        material.reflectivity = 0.2;
      }
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
    
    // ปรับ FOV ตามขนาดหน้าจอ
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
    
    // ปรับความเร็วแอนิเมชันสำหรับอุปกรณ์สเปคต่ำ
    const initialDelay = 0;
    const transitionDuration = refs.isLowEndDevice ? 1.5 : 3;
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
  
  // ฟังก์ชันสร้าง fallback model ที่มีการปรับขนาดตามอุปกรณ์
  const createFallbackModel = useCallback(() => {
    const refs = sceneRefs.current;
    if (!refs.scene) return null;
    
    // ลดความซับซ้อนสำหรับอุปกรณ์สเปคต่ำ
    const segmentCount = refs.isLowEndDevice ? 32 : (refs.isMobile ? 64 : 128);
    const tubeSegmentCount = refs.isLowEndDevice ? 8 : (refs.isMobile ? 16 : 32);
    
    const geometry = new THREE.TorusKnotGeometry(1, 0.3, segmentCount, tubeSegmentCount);
    
    // สร้าง material ที่เรียบง่ายสำหรับอุปกรณ์สเปคต่ำ
    let material;
    if (refs.isLowEndDevice) {
      material = new THREE.MeshBasicMaterial({ color: 0xff7d33 });
    } else {
      material = new THREE.MeshPhysicalMaterial({ 
        color: 0xff7d33,
        metalness: refs.isMobile ? 0.3 : 0.8,
        roughness: refs.isMobile ? 0.8 : 0.2,
        clearcoat: refs.isMobile ? 0.1 : 0.5,
        clearcoatRoughness: refs.isMobile ? 0.9 : 0.3,
        reflectivity: refs.isMobile ? 0.2 : 1.0,
        emissive: 0x220000,
        emissiveIntensity: 0.1,
        envMapIntensity: refs.isMobile ? 0.3 : 1.0
      });
    }
    
    const fallbackModel = new THREE.Mesh(geometry, material);
    
    // ตั้งค่า shadow เฉพาะเมื่อไม่ใช่อุปกรณ์สเปคต่ำ
    if (!refs.isLowEndDevice) {
      fallbackModel.castShadow = true;
      fallbackModel.receiveShadow = true;
    }
    
    fallbackModel.layers.set(refs.modelLayer);
    
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

    // ตรวจสอบอุปกรณ์
    refs.isMobile = window.innerWidth < 640;
    refs.isLowEndDevice = detectLowEndDevice();

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

    // สร้าง renderer ที่รองรับความโปร่งใส และปรับตั้งค่าตามประเภทอุปกรณ์
    const renderer = new THREE.WebGLRenderer({
      antialias: !refs.isLowEndDevice, // ปิด antialiasing สำหรับอุปกรณ์สเปคต่ำ
      alpha: true,
      powerPreference: refs.isLowEndDevice ? 'low-power' : 'high-performance',
      precision: refs.isLowEndDevice ? 'lowp' : 'highp'
    });
    
    // ปรับตั้งค่า pixel ratio ตามประเภทอุปกรณ์
    const pixelRatio = window.devicePixelRatio || 1;
    const targetPixelRatio = refs.isLowEndDevice ? 1 : (refs.isMobile ? Math.min(pixelRatio, 1.5) : Math.min(pixelRatio, 2));
    renderer.setPixelRatio(targetPixelRatio);
    
    // ตั้งค่า shadow ตามประเภทอุปกรณ์
    renderer.shadowMap.enabled = !refs.isLowEndDevice;
    renderer.shadowMap.type = refs.isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // ปรับตั้งค่า tone mapping ตามประเภทอุปกรณ์
    if (refs.isLowEndDevice) {
      renderer.toneMapping = THREE.NoToneMapping;
    } else if (refs.isMobile) {
      renderer.toneMapping = THREE.ReinhardToneMapping;
      renderer.toneMappingExposure = 0.6;
    } else {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.4;
    }
    
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

    // ฟังก์ชัน animate ที่มีการตรวจสอบประสิทธิภาพ
    const animate = () => {
      refs.frameId = requestAnimationFrame(animate);

      // ถ้าแท็บไม่แอคทีฟหรือไม่มองเห็น ให้ลดการอัพเดทลง
      if (document.hidden) {
        return;
      }
      
      if (refs.controls) {
        refs.controls.update();
      }

      // วัด FPS และปรับคุณภาพ
      measureFPS();

      // อัปเดต animation mixer เมื่อกำลังเล่น
      if (refs.mixer && refs.clock && refs.animationEnabled) {
        const delta = refs.clock.getDelta();
        // ป้องกันค่า delta ที่ผิดปกติ
        if (delta > 0 && delta < 0.2) {
          refs.mixer.update(delta);
        } else {
          refs.mixer.update(0.016);
        }
      }
      
      // fallback animation - ปรับลดความซับซ้อนสำหรับอุปกรณ์สเปคต่ำ
      if (refs.model && refs.fallbackAnimation) {
        // ลดความเร็วการหมุนสำหรับอุปกรณ์สเปคต่ำ
        const rotationSpeed = refs.isLowEndDevice ? 0.001 : (refs.isMobile ? 0.003 : 0.005);
        refs.model.rotation.y += rotationSpeed;
        
        // ลดความซับซ้อนการเคลื่อนที่สำหรับอุปกรณ์สเปคต่ำ
        if (!refs.isLowEndDevice) {
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
  }, [adjustCameraForMobile, createLights, killAllTweens, measureFPS, detectLowEndDevice]);

  // Effect สำหรับการโหลดโมเดล
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs.scene || !refs.camera || !refs.controls) return;

    // ตั้งค่าให้ไม่เล่นแอนิเมชันตั้งแต่เริ่มต้น
    refs.fallbackAnimation = false;
    refs.animationEnabled = false;
    refs.loadingProgress = 0;

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
    
    // ตั้งเวลาสำหรับ fallback
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    
    // โหลดโมเดล
    const loader = new GLTFLoader();
    
    const onProgress = (xhr: { loaded: number; total: number }) => {
      const percent = (xhr.loaded / xhr.total) * 100;
      refs.loadingProgress = percent;
      console.log(`กำลังโหลดโมเดล: ${percent.toFixed(0)}%`);
      
      // ยกเลิก fallback timer ถ้าการโหลดคืบหน้า
      if (fallbackTimer && percent > 20) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };
    
    loader.load(
      modelPath,
      (gltf) => {
        if (!refs.scene) return;
        
        console.log("โหลดโมเดลเสร็จแล้ว");
        refs.loadingProgress = 100;
        
        // ยกเลิก fallback timer
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        
        const model = gltf.scene;
        
        // ปรับขนาดโมเดลตามประเภทอุปกรณ์
        const scaleFactor = refs.isLowEndDevice ? 0.8 : (refs.isMobile ? 0.9 : 1);
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        model.position.set(0, 0.2, 0);
        
        // ปรับปรุงวัสดุและกำหนดเลเยอร์
        model.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            // ตั้งค่า shadow เฉพาะเมื่อไม่ใช่อุปกรณ์สเปคต่ำ
            node.castShadow = !refs.isLowEndDevice;
            node.receiveShadow = !refs.isLowEndDevice;
            node.layers.set(refs.modelLayer);
            
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
          
          // ถ้าเป็นอุปกรณ์สเปคต่ำ ให้เล่นเฉพาะแอนิเมชันแรก
          const animationsToPlay = refs.isLowEndDevice && gltf.animations.length > 1 ? 
            [gltf.animations[0]] : gltf.animations;
          
          animationsToPlay.forEach((clip) => {
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
      onProgress,
      (error) => {
        console.error('Error loading model:', error);
        
        // สร้าง fallback model เมื่อเกิดข้อผิดพลาด
        createFallbackModel();
        
        // ตั้งค่า animationEnabled เป็น false ก่อนปรับกล้อง
        refs.animationEnabled = false;
        adjustCameraForMobile();
      }
    );
    
    // ตั้งค่า fallback timer
    fallbackTimer = setTimeout(() => {
      if (refs.loadingProgress < 20) {
        console.log("โหลดโมเดลช้าเกินไป สร้าง fallback model");
        createFallbackModel();
        
        // ตั้งค่า animationEnabled เป็น false ก่อนปรับกล้อง
        refs.animationEnabled = false;
        adjustCameraForMobile();
      }
    }, 5000); // รอ 5 วินาที
    
    return () => {
      killAllTweens();
      if (fallbackTimer) clearTimeout(fallbackTimer);
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