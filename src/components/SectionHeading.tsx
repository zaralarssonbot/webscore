import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

/**
 * One cohesive section header used identically across the site:
 * mono eyebrow → tight display title → optional muted subtitle.
 * Reveals once on scroll with the shared easing.
 */
const SectionHeading = ({ eyebrow, title, subtitle, className = "" }: SectionHeadingProps) => (
  <motion.div
    initial={{ opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    className={`text-center max-w-2xl mx-auto ${className}`}
  >
    {eyebrow && <span className="data-label text-[0.6rem] text-neon-cyan/70 mb-4 inline-block">{eyebrow}</span>}
    <h2 className="font-display font-semibold tracking-[-0.035em] leading-[1.06] text-3xl sm:text-4xl md:text-[2.75rem]">
      {title}
    </h2>
    {subtitle && <p className="text-muted-foreground/80 mt-4 leading-[1.7] text-[0.95rem] max-w-xl mx-auto">{subtitle}</p>}
  </motion.div>
);

export default SectionHeading;
