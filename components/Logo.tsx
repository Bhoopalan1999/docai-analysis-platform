import { cn } from '@/lib/utils';

export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-foreground', className)}
      aria-label="DocAI Logo"
    >
      {/* Outer frame (document outline) */}
      <rect
        x="25"
        y="25"
        width="150"
        height="150"
        rx="18"
        stroke="currentColor"
        strokeWidth="12"
      />

      {/* AI nodes */}
      <circle
        cx="70"
        cy="80"
        r="10"
        fill="currentColor"
      />
      <circle
        cx="130"
        cy="70"
        r="10"
        fill="currentColor"
      />
      <circle
        cx="120"
        cy="130"
        r="10"
        fill="currentColor"
      />

      {/* Connecting vector lines */}
      <line
        x1="70"
        y1="80"
        x2="130"
        y2="70"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="130"
        y1="70"
        x2="120"
        y2="130"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="70"
        y1="80"
        x2="120"
        y2="130"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
