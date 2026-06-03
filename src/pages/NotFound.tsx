import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackgroundEffect from "@/components/BackgroundEffect";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const NotFound = () => {
  const navigate = useNavigate();

  useDocumentMeta({
    title: "Sidan hittades inte – Webscore",
    description: "Sidan du letar efter finns inte. Gå tillbaka till startsidan eller analysera din hemsida gratis.",
    noindex: true,
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundEffect />
      <Navbar onAnalyze={() => navigate("/")} />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="data-label text-[0.74rem] text-neon-blue mb-5">FEL · 404</span>
        <h1
          className="font-mono font-bold tabular-nums leading-none text-7xl sm:text-8xl gradient-text"
          style={{ textShadow: "0 0 60px hsla(175,90%,55%,0.25)" }}
        >
          404
        </h1>
        <h2 className="font-display font-semibold tracking-[-0.02em] text-2xl sm:text-3xl mt-6 mb-3">
          Sidan hittades inte
        </h2>
        <p className="text-muted-foreground/80 max-w-md leading-[1.7] text-[0.95rem] mb-9">
          Länken är trasig eller så har sidan flyttat. Inga problem – hitta tillbaka nedan, eller testa din hemsida direkt.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="glow-gradient" size="lg" className="group glow-precision" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
            Till startsidan
          </Button>
          <Button variant="glow-outline" size="lg" asChild className="group">
            <Link to="/guider">
              Läs våra guider
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
