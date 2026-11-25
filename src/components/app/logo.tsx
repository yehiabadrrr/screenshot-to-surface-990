/** Markazly mark: an M whose center point (teal) sits at the vertex. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="markazly-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.56 0.13 253)" />
          <stop offset="1" stopColor="oklch(0.42 0.11 255)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#markazly-logo-bg)" />
      <path d="M8.5 23V10L16 17.5L23.5 10V23" fill="none" stroke="white" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="24" r="2.6" fill="oklch(0.72 0.12 189)" />
    </svg>
  );
}
