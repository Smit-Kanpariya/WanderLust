export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#0b1b2e" />
      <path d="M8.5 11.5h11a4.5 4.5 0 0 1 0 9H14" fill="none" stroke="#5eead4" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="m16.5 17-3 3.5 3 3.5"
        fill="none"
        stroke="#5eead4"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="11.5" r="2.2" fill="#ffffff" />
    </svg>
  );
}
