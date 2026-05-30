const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-border/15 mt-16">
      <div className="max-w-5xl mx-auto px-6 py-14 sm:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <span className="text-primary font-bold text-xs font-display">W</span>
              </div>
              <span className="font-display font-semibold text-base tracking-[-0.01em]">
                Web<span className="text-primary">Score</span>
              </span>
            </div>
            <p className="text-[0.8125rem] text-muted-foreground leading-[1.7] max-w-xs">
              Vi hjälper företag att synas, övertyga och växa online genom hemsida, SEO och branding.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[0.8125rem] font-semibold font-display mb-4 tracking-[-0.01em]">Tjänster</h4>
            <ul className="space-y-2.5">
              <li><a href="#services" className="text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors">Hemsidor</a></li>
              <li><a href="#services" className="text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors">SEO & synlighet</a></li>
              <li><a href="#services" className="text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors">Branding</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[0.8125rem] font-semibold font-display mb-4 tracking-[-0.01em]">Företag</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors">Om oss</a></li>
              <li><a href="#" className="text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors">Kontakt</a></li>
              <li><a href="#webtest" className="text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors">Webbtest</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[0.8125rem] font-semibold font-display mb-4 tracking-[-0.01em]">Juridiskt</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors">Integritetspolicy</a></li>
              <li><a href="#" className="text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors">Villkor</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} WebScore. Alla rättigheter förbehållna.
          </p>
          <p className="text-xs text-muted-foreground/40">
            Sverige 🇸🇪
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
