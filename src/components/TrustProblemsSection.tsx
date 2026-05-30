import { motion } from "framer-motion";
import { TrendingDown, Eye, ThumbsDown, MessageCircleX } from "lucide-react";

const problems = [
  { icon: TrendingDown, text: "Låg konvertering", desc: "Besökare lämnar utan att agera", hue: 175 },
  { icon: Eye, text: "Dålig Google-synlighet", desc: "Dina kunder hittar konkurrenterna först", hue: 215 },
  { icon: ThumbsDown, text: "Svagt första intryck", desc: "3 sekunder avgör om de stannar", hue: 260 },
  { icon: MessageCircleX, text: "Otydligt budskap", desc: "Ingen förstår vad ni erbjuder", hue: 25 },
];

const TrustProblemsSection = () => {
  return (
    <section className="relative z-10 py-24 sm:py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-medium tracking-[0.2em] uppercase text-neon-orange mb-4 block">Vanliga problem</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold font-display mb-5 tracking-[-0.02em] leading-[1.2]">
            Företag tappar kunder varje dag
            <br />
            <span className="gradient-text">på grund av sin hemsida</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto font-normal leading-[1.75] text-[0.9375rem]">
            De flesta hemsidor ser okej ut – men konverterar dåligt. Vi visar varför, och fixar det.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          {problems.map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-card rounded-2xl p-6 flex items-start gap-4 group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
            >
              {/* Subtle glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(ellipse at 30% 50%, hsla(${item.hue},90%,55%,0.06) 0%, transparent 70%)` }}
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 relative"
                style={{
                  background: `hsla(${item.hue},90%,55%,0.1)`,
                  borderColor: `hsla(${item.hue},90%,55%,0.2)`,
                  boxShadow: `0 0 20px hsla(${item.hue},90%,55%,0.08)`,
                }}
              >
                <item.icon className="w-5 h-5" style={{ color: `hsl(${item.hue} 90% 60%)` }} />
              </div>
              <div className="relative">
                <span className="font-semibold font-display text-[0.9375rem] block mb-1">{item.text}</span>
                <span className="text-muted-foreground text-[0.8125rem] leading-[1.6]">{item.desc}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustProblemsSection;
