import { motion } from "framer-motion";
import { Play } from "lucide-react";
import LazyVideo from "@/components/LazyVideo";

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-3 block">
            Kreativt innehåll
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold font-display tracking-[-0.02em] leading-[1.15] mb-4">
            Vi skapar innehåll som{" "}
            <span className="gradient-text">fångar blicken</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-[0.9375rem] leading-[1.75]">
            Från filmiskt webbinnehåll till produktvideos — vi ger ditt varumärke visuell kraft.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 grid-rows-none sm:grid-rows-[200px_200px_200px] md:grid-rows-[200px_200px_200px] gap-3 sm:gap-4">
          {videos.map((video, i) => (
            <motion.div
              key={video.src}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`${video.span} relative rounded-2xl overflow-hidden group cursor-pointer min-h-[180px] sm:min-h-0`}
            >
              {/* Video */}
              <LazyVideo
                src={video.src}
                poster={video.src.replace(/\.mp4$/, "-poster.webp")}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-background/30 group-hover:bg-background/10 transition-all duration-500" />

              {/* Glow border on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  boxShadow: "inset 0 0 0 1px hsla(175,90%,55%,0.3), 0 0 30px hsla(175,90%,55%,0.1)",
                }}
              />

              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 via-background/40 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center">
                    <Play className="w-3 h-3 text-primary fill-primary" />
                  </div>
                  <span className="text-[0.8125rem] font-medium text-foreground/90">
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
