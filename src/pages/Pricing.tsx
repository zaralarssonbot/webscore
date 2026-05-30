import BackgroundEffect from "@/components/BackgroundEffect";
import Navbar from "@/components/Navbar";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";

const Pricing = () => {
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
