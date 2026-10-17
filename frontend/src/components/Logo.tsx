export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-accent/10" />
      <path
        d="M9 12V10a1 1 0 0 1 1-1h2M20 9h2a1 1 0 0 1 1 1v2M23 20v2a1 1 0 0 1-1 1h-2M12 23h-2a1 1 0 0 1-1-1v-2"
        className="stroke-accent"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="15" r="3.2" className="stroke-accent" strokeWidth="1.8" />
      <path d="M11.5 21.5c1-1.8 2.6-2.7 4.5-2.7s3.5.9 4.5 2.7" className="stroke-accent" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
