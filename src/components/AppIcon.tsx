import React from 'react';

export function AppIcon({ size = 64, className = "" }: { size?: number, className?: string }) {
  return (
    <svg
      className={className}
      style={{ width: size, height: size }}
      viewBox="0 0 512 512"
      role="img"
      aria-label="pontojs"
    >
      <defs>
        <linearGradient id="app-icon-bg" x1="86" y1="46" x2="426" y2="466" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#111827" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="app-icon-accent" x1="142" y1="116" x2="386" y2="398" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A5B4FC" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#app-icon-bg)" />
      <circle cx="256" cy="256" r="158" fill="#0F172A" stroke="#334155" strokeWidth="18" />
      <path d="M256 98a158 158 0 0 1 137 79" fill="none" stroke="url(#app-icon-accent)" strokeWidth="22" strokeLinecap="round" />
      <path d="M256 138v118l72 72" fill="none" stroke="#F8FAFC" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M184 254c0-40 32-72 72-72s72 32 72 72" fill="none" stroke="#818CF8" strokeWidth="18" strokeLinecap="round" />
      <path d="M214 254c0-23 19-42 42-42s42 19 42 42" fill="none" stroke="#CBD5E1" strokeWidth="14" strokeLinecap="round" />
      <path d="M236 256c0-11 9-20 20-20s20 9 20 20c0 22-13 35-34 44" fill="none" stroke="#38BDF8" strokeWidth="14" strokeLinecap="round" />
      <path d="M256 286c-13 14-30 24-52 31" fill="none" stroke="#CBD5E1" strokeWidth="14" strokeLinecap="round" />
      <path d="M282 286c-7 24-24 43-53 58" fill="none" stroke="#818CF8" strokeWidth="14" strokeLinecap="round" />
      <circle cx="256" cy="256" r="11" fill="#F8FAFC" />
    </svg>
  );
}
