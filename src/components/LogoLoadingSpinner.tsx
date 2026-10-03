"use client";

import LogoLoadingTrail from "./LogoLoadingTrail";

interface LogoLoadingSpinnerProps {
  className?: string;
  width?: number;
}

export default function LogoLoadingSpinner({ className = "", width = 220 }: LogoLoadingSpinnerProps) {
  return (
    <div className={`relative inline-block ${className}`} style={{ width, height: width * 652 / 2000 }}>
      <img src="/images/Grandma-Jazz-Logo-Heavier.webp" alt="Grandma Jazz"
        className="w-full h-full object-contain grayscale opacity-40" draggable={false} />
      <LogoLoadingTrail width={width} />
    </div>
  );
}
