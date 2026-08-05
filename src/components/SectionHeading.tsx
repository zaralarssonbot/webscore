import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  /**
   * Heading level. Defaults to h2 — a section heading inside a page that already
   * has an h1. Pass "h1" only where this heading IS the page title (a route whose
   * hero is this block), and only once per page.
   */
  as?: "h1" | "h2";
}

/**
 * One cohesive section header used identically across the site:
 * mono eyebrow → tight display title → optional muted subtitle.
 * Reveals once on scroll with the shared easing.
 */
const SectionHeading = ({ eyebrow, title, subtitle, className = "", as: Heading = "h2" }: SectionHeadingProps) => (
  <motion.div
    initial={{ opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    className={`text-center max-w-2xl mx-auto ${className}`}
  >
    {eyebrow && <span className="data-label text-[0.74rem] text-neon-blue mb-3.5 inline-block">{eyebrow}</span>}
    <Heading className="font-display font-semibold tracking-[-0.035em] leading-[1.07] text-[2rem] sm:text-[2.5rem] md:text-[2.9rem]">
      {title}
    </Heading>
    {subtitle && <p className="text-muted-foreground/80 mt-5 leading-[1.65] text-base sm:text-[1.0625rem] max-w-xl mx-auto">{subtitle}</p>}
  </motion.div>
);

export default SectionHeading;
