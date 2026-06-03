import { Link } from "react-router-dom";
import BrandMark from "./BrandMark";

// Every link points to a real route — no dead "#" placeholders.
const columns = [
  {
    heading: "TJÄNSTER",
    links: [
      { label: "Hemsidor", href: "/tjanster/hemsidor" },
      { label: "SEO & synlighet", href: "/tjanster/seo" },
      { label: "Branding & design", href: "/tjanster/branding" },
      { label: "Drift & support", href: "/tjanster/drift" },
    ],
  },
  {
    heading: "FÖRETAG",
    links: [
      { label: "Guider", href: "/guider" },
      { label: "Priser", href: "/pricing" },
      { label: "Gör testet", href: "/" },
      { label: "Integritetspolicy", href: "/integritetspolicy" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-border mt-16">
      <div className="max-w-5xl mx-auto px-6 py-14 sm:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <BrandMark className="w-7 h-7" />
              <span className="font-display font-semibold text-base tracking-[-0.02em]">
                Web<span className="gradient-text">score</span>
              </span>
            </div>
            <p className="text-[0.8125rem] text-muted-foreground/70 leading-[1.7] max-w-xs">
              Vi hjälper företag att synas, övertyga och växa online genom hemsida, SEO och branding.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading}>
              <h4 className="data-label text-[0.55rem] text-muted-foreground/50 mb-4">{col.heading}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.href} className="inline-flex items-center min-h-[44px] min-w-[44px] py-2 text-[0.8125rem] text-muted-foreground/80 hover:text-neon-cyan transition-colors duration-300">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="data-label text-[0.55rem] text-muted-foreground/40">
            © {new Date().getFullYear()} WEBSCORE · ALLA RÄTTIGHETER FÖRBEHÅLLNA
          </p>
          <p className="data-label text-[0.55rem] text-muted-foreground/40">SVERIGE</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
