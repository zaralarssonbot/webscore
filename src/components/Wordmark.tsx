interface WordmarkProps {
  /** Sizing/utility classes for the text, e.g. "text-xl". Font size is set here. */
  className?: string;
}

/**
 * Webscore wordmark — geometric, lowercase, set in Space Grotesk (the brand
 * display font) with a tight optical tracking and a single brand-gradient
 * period as the only accent.
 *
 * The gradient period uses the EXACT same teal→blue→purple flow as the
 * indicator dot in <BrandMark/>, so the icon and wordmark read as one system
 * (the dot "is" the score). Lowercase + tight tracking gives the calm,
 * self-assured feel of a premium SaaS wordmark (Stripe/Linear/Vercel).
 *
 * Text colour inherits `text-foreground`, so it stays crisp on the dark navbar
 * and legible on light backgrounds with no changes.
 */
const Wordmark = ({ className }: WordmarkProps) => (
  <span className={`font-display font-semibold leading-none tracking-[-0.03em] text-foreground select-none ${className ?? ""}`}>
    webscore
    <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple bg-clip-text text-transparent">.</span>
  </span>
);

export default Wordmark;
