import { motion } from "framer-motion";
import { Play } from "lucide-react";
import LazyVideo from "@/components/LazyVideo";
import SectionHeading from "@/components/SectionHeading";

// 4-col grid, 3 rows — all 12 cells filled perfectly
const videos = [
  { src: "/videos/branding-1.mp4", label: "Cinematic Web Design", span: "sm:col-span-2 sm:row-span-2" },
  { src: "/videos/branding-10.mp4", label: "Automotive", span: "sm:col-span-1 sm:row-span-2" },
  { src: "/videos/branding-3.mp4", label: "Product Branding", span: "sm:col-span-1 sm:row-span-1" },
  { src: "/videos/branding-4.mp4", label: "Food & Lifestyle", span: "sm:col-span-1 sm:row-span-1" },
  { src: "/videos/branding-12.mp4", label: "Lifestyle & Storytelling", span: "sm:col-span-2 sm:row-span-1" },
  { src: "/videos/branding-11.mp4", label: "Bold & Cinematic", span: "sm:col-span-1 sm:row-span-1" },
  { src: "/videos/branding-7.mp4", label: "Retro & Editorial", span: "sm:col-span-1 sm:row-span-1" },
];

const VideoShowcaseSection = () => {
  return (
    <section className="relative z-10 py-24 sm:py-32 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="KREATIVT INNEHÅLL"
          title={<>Vi skapar innehåll som{" "}<span className="gradient-text">fångar blicken</span></>}
          subtitle="Från filmiskt webbinnehåll till produktvideos — vi ger ditt varumärke visuell kraft."
          className="mb-14 sm:mb-16"
        />

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 grid-rows-none sm:grid-rows-[200px_200px_200px] md:grid-rows-[200px_200px_200px] gap-3 sm:gap-4">
          {videos.map((video, i) => (
            <motion.div
              key={video.src}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`${video.span} relative group cursor-pointer min-h-[180px] sm:min-h-0`}
            >
              {/* Video — edges feathered with a soft mask so each clip melts
                  into the dark page instead of sitting in a hard box. */}
              <LazyVideo
                src={video.src}
                poster={video.src.replace(/\.mp4$/, "-poster.webp")}
                className="absolute inset-0 w-full h-full object-cover rounded-2xl transition-transform duration-700 group-hover:scale-[1.04]"
                style={{
                  maskImage: "radial-gradient(125% 125% at 50% 50%, #000 70%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(125% 125% at 50% 50%, #000 70%, transparent 100%)",
                }}
              />

              {/* Soft hover lift — outer glow only, no hard outline */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ boxShadow: "0 0 40px hsla(175,90%,55%,0.12)" }}
              />

              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 via-background/40 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center">
                    <Play className="w-3 h-3 text-primary fill-primary" />
                  </div>
                  <span className="data-label text-[0.72rem] text-foreground/90">
                    {video.label}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoShowcaseSection;
