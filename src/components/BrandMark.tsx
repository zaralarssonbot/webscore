import { useId } from "react";

interface BrandMarkProps {
  /** Sizing/utility classes, e.g. "w-7 h-7". */
  className?: string;
  /** Accessible label; set to "" to mark purely decorative. */
  title?: string;
}

/**
 * Webscore brand mark — the "score-ring": a gauge arc in the brand gradient
 * (teal→blue→purple) with a purple indicator dot, echoing the 87 meter.
 *
 * This is the EXACT same mark as `public/favicon.svg` (which is what
 * scripts/generate-favicon.mjs rasterizes into favicon.png/.ico). Keep the two
 * in sync: same viewBox, gradient, arc path and dot — so the in-app mark
 * matches the favicon (the favicon adds the dark rounded tile behind it).
 */
const BrandMark = ({ className, title = "Webscore" }: BrandMarkProps) => {
  // Unique per render so multiple marks on a page don't share/clobber the id.
  const gradId = `brandmark-ring-${useId()}`;
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2DE2C8" />
          <stop offset="0.5" stopColor="#36A0F0" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d="M15.03 48.97 A24 24 0 1 1 48.97 48.97" fill="none" stroke={`url(#${gradId})`} strokeWidth="7" strokeLinecap="round" />
      <circle cx="48.97" cy="48.97" r="4.6" fill="#8B5CF6" />
    </svg>
  );
};

export default BrandMark;
