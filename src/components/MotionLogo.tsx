"use client";

interface MotionLogoProps {
  width?: number;
  className?: string;
}

/**
 * The Digital Logo's vinyl loop. MP4 covers Safari/iOS; WebM is retained as a
 * lighter alternative. Reduced-motion visitors receive the matching polished
 * still instead of an animation.
 */
export default function MotionLogo({
  width = 200,
  className = "",
}: MotionLogoProps) {
  return (
    <div
      className={`gj-motion-logo ${className}`}
      style={{ width, height: width }}
      role="img"
      aria-label="Grandma Jazz"
    >
      <video
        className="gj-motion-logo__video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/motion/Grandma-Jazz-Motion-Poster-v1.webp"
        role="presentation"
        tabIndex={-1}
      >
        <source src="/motion/Grandma-Jazz-Motion-v1.mp4" type="video/mp4" />
        <source src="/motion/Grandma-Jazz-Motion-v1.webm" type="video/webm" />
      </video>
      <img
        className="gj-motion-logo__poster"
        src="/motion/Grandma-Jazz-Motion-Poster-v1.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </div>
  );
}
