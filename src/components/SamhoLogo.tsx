import React from 'react';

interface SamhoLogoProps {
  className?: string;
  variant?: 'mark' | 'badge' | 'badge-light';
  size?: number | string;
  title?: string;
}

/**
 * Authentic Logo of Samho (Vietnam Samho Co. Ltd)
 * Rendered accurately from official brand asset (111813smalogoonly-01.png)
 * Brand Red: #C8102E
 */
export const SamhoLogo: React.FC<SamhoLogoProps> = ({
  className = 'w-10 h-10',
  variant = 'mark',
  title = 'Samho Logo',
}) => {
  const svgContent = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      className="w-full h-full object-contain"
      aria-label={title}
      role="img"
    >
      <g fill="currentColor">
        {/* Left Crescent Outer Ring Arc */}
        <path d="M 235,72 C 120,72 44,146 44,250 C 44,354 120,428 235,428 C 140,418 96,346 96,250 C 96,154 140,82 235,72 Z" />

        {/* Right Crescent Outer Ring Arc */}
        <path d="M 265,428 C 380,428 456,354 456,250 C 456,146 380,72 265,72 C 360,82 404,154 404,250 C 404,346 360,418 265,428 Z" />

        {/* Central Stylized S Scroll / Ribbon */}
        <path d="
          M 255,138
          L 345,138
          A 22 22 0 1 1 324.5,168
          L 245,362
          L 155,362
          A 22 22 0 1 1 175.5,332
          Z
        " />
      </g>
    </svg>
  );

  if (variant === 'badge') {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-white p-1.5 shadow-sm border border-slate-200 text-[#C8102E] shrink-0 ${className}`}
        title={title}
      >
        {svgContent}
      </div>
    );
  }

  if (variant === 'badge-light') {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-slate-900/90 p-1.5 shadow-sm border border-slate-700 text-[#C8102E] shrink-0 ${className}`}
        title={title}
      >
        {svgContent}
      </div>
    );
  }

  return (
    <div className={`text-[#C8102E] shrink-0 inline-flex items-center justify-center ${className}`} title={title}>
      {svgContent}
    </div>
  );
};

export default SamhoLogo;
