import BackgroundEffect from "@/components/BackgroundEffect";
import Navbar from "@/components/Navbar";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const Pricing = () => {
  useDocumentMeta({
    title: "Priser – Webscore",
    description:
      "Se vad det kostar att få en hemsida som syns, bygger förtroende och konverterar. Tydliga priser från Webscore.",
    canonical: "https://webscore.se/pricing",
  });
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <BackgroundEffect />
      <Navbar />
      <div className="pt-20">
        <PricingSection />
      </div>
      <Footer />
    </div>
  );
};

export default Pricing;
