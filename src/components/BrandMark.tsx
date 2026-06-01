interface BrandMarkProps {
  /** Sizing/utility classes, e.g. "w-7 h-7". The rounded tile is part of the art. */
  className?: string;
  /** Accessible label; set to "" to mark purely decorative. */
  title?: string;
}

/**
 * Webscore brand mark — the teal→blue "W" in a rounded gradient tile.
 *
 * This is the EXACT same artwork as `public/favicon.svg` (which is what
 * scripts/generate-favicon.mjs rasterizes into favicon.png/.ico). Keep the two
 * in sync: same viewBox, rounded tile, inner border, gradient and "W" path —
 * so the in-app mark matches the favicon pixel for pixel.
 */
const BrandMark = ({ className, title = "Webscore" }: BrandMarkProps) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    role={title ? "img" : "presentation"}
    aria-label={title || undefined}
    aria-hidden={title ? undefined : true}
  >
    <defs>
      <linearGradient id="brandmark-w" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#2DE2C8" />
        <stop offset="1" stopColor="#36A0F0" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill="#0a0a0f" />
    <rect x="1.25" y="1.25" width="61.5" height="61.5" rx="12.75" fill="none" stroke="#2DE2C8" strokeOpacity="0.22" strokeWidth="1.5" />
    <path d="M13 18 L23 46 L32 29 L41 46 L51 18" fill="none" stroke="url(#brandmark-w)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default BrandMark;
