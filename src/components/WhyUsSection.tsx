import { motion } from "framer-motion";
import { Check } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";

const reasons = [
  "Vi visar problemen innan vi säljer lösningen",
  "Vi bygger för resultat – inte bara design",
  "Vi tänker affär, inte bara teknik",
  "Snabb leverans & modern känsla",
  "Allt på ett ställe: hemsida, SEO, branding",
];

const WhyUsSection = () => {
  return (
    <section className="relative z-10 py-24 sm:py-32 px-6 overflow-hidden">
      <div className="max-w-2xl mx-auto relative">
        <SectionHeading
          eyebrow="VARFÖR OSS"
          title={<>Därför väljer företag <span className="gradient-text">Webscore</span></>}
          className="mb-12"
        />

        <div className="space-y-3">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason}
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="card-surface p-5 flex items-center gap-4"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-neon-cyan/20 bg-neon-cyan/[0.07] shrink-0">
                <Check className="w-4 h-4 text-neon-cyan" />
              </div>
              <span className="font-medium text-[0.9375rem] tracking-[-0.01em]">{reason}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;
