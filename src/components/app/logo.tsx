/** Markazly mark: a flat navy tile with an M whose vertex points at the center (markaz) dot. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="oklch(0.3 0.064 256.5)" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="oklch(1 0 0 / 0.08)" />
      <path d="M8.5 23V10L16 17.5L23.5 10V23" fill="none" stroke="white" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="24" r="2.4" fill="white" />
    </svg>
  );
}
