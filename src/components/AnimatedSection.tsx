'use client';

import type React from 'react';
import { type ReactNode, useEffect, useState, useRef, isValidElement } from 'react'
import { motion, useAnimation, Variant } from 'framer-motion';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
  as?: React.ElementType;
  animation?: 'fadeIn' | 'fadeInUp' | 'fadeInLeft' | 'fadeInRight' | 'zoom';
}

export const animations = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  },
  fadeInUp: {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 }
  },
  fadeInLeft: {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 }
  },
  fadeInRight: {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 }
  },
  zoom: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  }
};

export function AnimatedSection({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  once = true,
  as: Component = 'div',
  animation = 'fadeIn'
}: AnimatedSectionProps) {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // เพิ่ม state เพื่อตรวจสอบว่าคอมโพเนนต์ได้ mount เรียบร้อยแล้ว
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isMounted) return; // ตรวจสอบว่า mount แล้วก่อนทำงานกับ IntersectionObserver

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementInView = entry.isIntersecting;
        setIsInView(isElementInView);

        if (isElementInView) {
          controls.start('visible');
        } else if (!once) {
          controls.start('hidden');
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [controls, once, isMounted]); // เพิ่ม isMounted เป็น dependency

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={animations[animation]}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}

// แก้ไข StaggerAnimationContainer เช่นเดียวกัน
export function StaggerAnimationContainer({
  children,
  className = '',
  staggerDelay = 0.1,
  containerAnimation = 'fadeIn',
  itemAnimation = 'fadeInUp',
  once = true
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  containerAnimation?: keyof typeof animations;
  itemAnimation?: keyof typeof animations;
  once?: boolean;
}) {
  const containerControls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // เพิ่ม state เพื่อตรวจสอบว่าคอมโพเนนต์ได้ mount เรียบร้อยแล้ว
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isMounted) return; // ตรวจสอบว่า mount แล้วก่อนทำงานกับ IntersectionObserver

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementInView = entry.isIntersecting;
        setIsInView(isElementInView);

        if (isElementInView) {
          containerControls.start('visible');
        } else if (!once) {
          containerControls.start('hidden');
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [containerControls, once, isMounted]); // เพิ่ม isMounted เป็น dependency

  const containerVariants = {
    hidden: animations[containerAnimation].hidden,
    visible: {
      ...animations[containerAnimation].visible,
      transition: {
        staggerChildren: staggerDelay,
        ease: 'easeOut',
        when: 'beforeChildren'
      }
    }
  };

  const itemVariants = {
    hidden: animations[itemAnimation].hidden,
    visible: animations[itemAnimation].visible
  };

  const childrenWithKeys = Array.isArray(children)
    ? children.map((child, index) => {
        if (isValidElement(child) && child.key != null) {
          return (
            <motion.div
              key={child.key}
              variants={itemVariants}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {child}
            </motion.div>
          );
        }

        return (
          <motion.div
            key={`staggered-${Math.random().toString(36).substring(2, 9)}-${index}`}
            variants={itemVariants}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {child}
          </motion.div>
        );
      })
    : children;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={containerControls}
      variants={containerVariants}
      className={className}
    >
      {childrenWithKeys}
    </motion.div>
  );
}