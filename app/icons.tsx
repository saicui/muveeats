/**
 * MuveEats v8 SVG icon set.
 * Outline style, 1.5px stroke, currentColor.
 *
 * Usage:  <Icon name="search" />
 *         <Icon name="search" size="sm" />
 */

export type IconName =
  | "menu"
  | "close"
  | "plus"
  | "minus"
  | "search"
  | "home"
  | "fork"
  | "dumbbell"
  | "run"
  | "scale"
  | "book"
  | "settings"
  | "camera"
  | "edit"
  | "clock"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "chevron-left"
  | "trash"
  | "heart"
  | "database"
  | "grid"
  | "user"
  | "bot"
  | "footprints"
  | "target";

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "ic ic-sm",
  md: "ic",
  lg: "ic ic-lg",
};

const PATHS: Record<IconName, React.ReactNode> = {
  menu: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </>
  ),
  close: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  minus: <line x1="5" y1="12" x2="19" y2="12" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="16" y1="16" x2="21" y2="21" />
    </>
  ),
  home: <path d="M3 11l9-7 9 7v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V11z" />,
  fork: <path d="M7 3v6a3 3 0 003 3h0v9M7 6h6M13 3v6a3 3 0 01-3 3" />,
  dumbbell: (
    <>
      <rect x="2" y="9" width="3" height="6" rx="1" />
      <rect x="19" y="9" width="3" height="6" rx="1" />
      <rect x="5" y="11" width="3" height="2" />
      <rect x="16" y="11" width="3" height="2" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  run: (
    <>
      <circle cx="14" cy="4" r="1.5" />
      <path d="M9 12l3-3 3 2 3 3M9 12l-2 4M12 9l-2 9M15 11l2 3M11 17h4" />
    </>
  ),
  scale: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <line x1="8" y1="9" x2="8" y2="11" />
      <line x1="12" y1="9" x2="12" y2="12" />
      <line x1="16" y1="9" x2="16" y2="11" />
    </>
  ),
  book: (
    <>
      <path d="M4 4h14a2 2 0 012 2v14H6a2 2 0 01-2-2V4z" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8h4l2-3h6l2 3h4v12H3V8z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  edit: <path d="M11 4h-7v16h16v-7M18 2l4 4-11 11h-4v-4z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12,7 12,12 15,14" />
    </>
  ),
  check: <polyline points="4,12 10,18 20,6" />,
  "chevron-down": <polyline points="6,9 12,15 18,9" />,
  "chevron-right": <polyline points="9,6 15,12 9,18" />,
  "chevron-left": <polyline points="15,6 9,12 15,18" />,
  trash: (
    <>
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  heart: (
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" />
    </>
  ),
  bot: (
    <>
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <circle cx="9" cy="13" r="1" />
      <circle cx="15" cy="13" r="1" />
      <line x1="12" y1="3" x2="12" y2="7" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  footprints: (
    <>
      <ellipse cx="8" cy="8.5" rx="2.3" ry="3.3" />
      <path d="M5.9 12.5c-.7 1.3-.5 2.6.7 3" />
      <ellipse cx="16" cy="14" rx="2.3" ry="3.3" />
      <path d="M18.1 18c.7-1.3.5-2.6-.7-3" />
    </>
  ),
};

export function Icon({
  name,
  size = "md",
  className = "",
  "aria-hidden": ariaHidden = true,
}: {
  name: IconName;
  size?: Size;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${SIZE_CLASS[size]} ${className}`}
      aria-hidden={ariaHidden}
    >
      {PATHS[name]}
    </svg>
  );
}
