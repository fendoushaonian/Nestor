/**
 * Hand-rolled SVG icon set for Nestor Studio. No external icon library —
 * every glyph here is drawn by hand so the look stays consistent and
 * dependency-free. All icons inherit `currentColor`.
 */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    ...props,
  }
}

export function AppleIcon(p: IconProps) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="M16.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.15-2.8.85-3.6.85-.75 0-1.85-.83-3.05-.8-1.6.02-3.05.92-3.86 2.34-1.64 2.85-.42 7.07 1.18 9.38.78 1.13 1.71 2.4 2.93 2.35 1.17-.05 1.62-.76 3.04-.76 1.42 0 1.82.76 3.06.74 1.27-.02 2.07-1.15 2.85-2.29.89-1.31 1.26-2.58 1.28-2.64-.03-.01-2.46-.94-2.46-3.55z" />
      <path d="M14.2 6.1c.65-.79 1.09-1.88.97-2.97-.94.04-2.07.63-2.74 1.41-.6.7-1.13 1.81-.99 2.88 1.05.08 2.11-.53 2.76-1.32z" />
    </svg>
  )
}

export function AndroidIcon(p: IconProps) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="M5 10.5a1 1 0 0 1 1 1V16a1 1 0 0 1-2 0v-4.5a1 1 0 0 1 1-1zm14 0a1 1 0 0 1 1 1V16a1 1 0 0 1-2 0v-4.5a1 1 0 0 1 1-1zM7 10h10v6.5a1 1 0 0 1-1 1h-1v2.5a1 1 0 0 1-2 0V17.5h-2V20a1 1 0 0 1-2 0v-2.5H8a1 1 0 0 1-1-1V10z" />
      <path d="M8.2 5.1 7.4 3.8a.4.4 0 0 1 .7-.4l.86 1.43A6.06 6.06 0 0 1 12 4.2c1.06 0 2.05.3 2.9.83l.85-1.43a.4.4 0 1 1 .7.4l-.82 1.36A5.3 5.3 0 0 1 18 9H6a5.3 5.3 0 0 1 2.2-3.9zM9.5 7.3a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6zm5 0a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6z" />
    </svg>
  )
}

export function CompassIcon(p: IconProps) {
  return (
    <svg
      {...base(p)}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.2 8.8 13.4 13l-4.2 1.8L11 10.6z" />
    </svg>
  )
}

export function LockIcon(p: IconProps) {
  return (
    <svg
      {...base(p)}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SparklesIcon(p: IconProps) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="M12 3.2l1.5 4.1 4.1 1.5-4.1 1.5L12 14.4l-1.5-4.1L6.4 8.8l4.1-1.5L12 3.2z" />
      <path d="M18.5 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2zM5.5 14.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6.6-1.5z" />
    </svg>
  )
}

export function CheckListIcon(p: IconProps) {
  return (
    <svg
      {...base(p)}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="4" width="14" height="16" rx="2.5" />
      <path d="M8.5 9l1.3 1.3L12 8" />
      <path d="M8.5 14.5l1.3 1.3L12 13.5" />
      <path d="M14 9.2h2.2M14 14.7h2.2" />
    </svg>
  )
}

export function BoltIcon(p: IconProps) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="M13 2 4.5 13.2h5.2L9 22l8.7-11.4H12L13 2z" />
    </svg>
  )
}

export function TemplatesIcon(p: IconProps) {
  return (
    <svg
      {...base(p)}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="4.5" rx="2" />
      <rect x="13" y="11" width="7" height="9" rx="2" />
      <rect x="4" y="13.5" width="7" height="6.5" rx="2" />
    </svg>
  )
}

export function PuzzleIcon(p: IconProps) {
  return (
    <svg {...base(p)} stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
      <path
        d="M9 5a1.6 1.6 0 0 1 3.2 0c0 .6-.4 1 .1 1.4.4.4 1 .1 1.6.1H16a1 1 0 0 1 1 1v2.1c0 .6-.3 1.2.1 1.6.4.4.8 0 1.4 0a1.6 1.6 0 0 1 0 3.2c-.6 0-1-.4-1.4 0-.4.4-.1 1-.1 1.6V19a1 1 0 0 1-1 1h-2.1c-.6 0-1.2.3-1.6-.1-.4-.4 0-.8 0-1.4a1.6 1.6 0 0 0-3.2 0c0 .6.4 1 0 1.4-.4.4-1 .1-1.6.1H5a1 1 0 0 1-1-1v-2.6c0-.6-.2-.8-.7-.8-.6 0-1 .4-1.6.4"
        transform="translate(0.5 0)"
      />
    </svg>
  )
}

export function GearIcon(p: IconProps) {
  return (
    <svg
      {...base(p)}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </svg>
  )
}

export function PlusIcon(p: IconProps) {
  return (
    <svg {...base(p)} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function CheckIcon(p: IconProps) {
  return (
    <svg
      {...base(p)}
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5l4 4 10-10" />
    </svg>
  )
}

export function GlobeIcon(p: IconProps) {
  return (
    <svg
      {...base(p)}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" />
    </svg>
  )
}

export function DeviceIcon(p: IconProps) {
  return (
    <svg
      {...base(p)}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="3" width="10" height="18" rx="2.6" />
      <path d="M10.5 18.2h3" />
    </svg>
  )
}

/** The Nestor "nest" mark — a small woven nest with an egg. */
export function NestLogo({ size = 22, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <ellipse cx="12" cy="14.5" rx="9" ry="5" fill="#a47b54" />
      <ellipse cx="12" cy="13.5" rx="6.4" ry="3.3" fill="#2b2b30" />
      <ellipse cx="12" cy="11.6" rx="3.1" ry="3.6" fill="#e9edf5" />
      <ellipse cx="11" cy="10.6" rx="1" ry="1.2" fill="#fff" opacity="0.8" />
      <path
        d="M3 14.5c2.5 1.2 6 1.9 9 1.9s6.5-.7 9-1.9"
        stroke="#7c5a3a"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}
