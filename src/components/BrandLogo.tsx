import React from 'react';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 34,
  showText = true,
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Ecosystem & lens outer ring */}
        <circle
          cx="21"
          cy="21"
          r="17"
          className="stroke-[#14532D] dark:stroke-[#4ADE80]"
          strokeWidth="2.4"
          fill="none"
        />
        <circle
          cx="21"
          cy="21"
          r="14"
          className="fill-[#DCFCE7]/60 dark:fill-[#14532D]/40"
        />

        {/* DNA double helix inside lens */}
        <path
          d="M14 11C14 15.5 28 16.5 28 21C28 25.5 14 26.5 14 31"
          className="stroke-[#102A43] dark:stroke-[#E2E8F0]"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M28 11C28 15.5 14 16.5 14 21C14 25.5 28 26.5 28 31"
          className="stroke-[#16A34A] dark:stroke-[#4ADE80]"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        {/* Base-pair rungs */}
        <line x1="16" y1="14.5" x2="26" y2="14.5" className="stroke-[#14532D] dark:stroke-[#86EFAC]" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="16.5" y1="21" x2="25.5" y2="21" className="stroke-[#14532D] dark:stroke-[#86EFAC]" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="16" y1="27.5" x2="26" y2="27.5" className="stroke-[#14532D] dark:stroke-[#86EFAC]" strokeWidth="1.6" strokeLinecap="round" />

        {/* Botanical leaf emerging from ecosystem curve */}
        <path
          d="M25.5 11.5C30 9.5 34.5 11.5 35 16C30.5 16.5 26.5 14.5 25.5 11.5Z"
          className="fill-[#16A34A] dark:fill-[#22C55E]"
        />
        <path
          d="M26.5 14.5L32.5 12.5"
          className="stroke-white dark:stroke-[#0B1410]"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Magnifying glass handle */}
        <path
          d="M33.5 33.5L42.5 42.5"
          className="stroke-[#14532D] dark:stroke-[#4ADE80]"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className="font-bold tracking-tight text-[#102A43] dark:text-[#F0F7F2] whitespace-nowrap shrink-0 text-lg">
          eDNA Explorer
        </span>
      )}
    </span>
  );
};
