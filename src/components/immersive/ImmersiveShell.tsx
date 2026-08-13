import { Link } from "react-router-dom";
import "./immersive.css";

/**
 * Minimal chrome for secondary pages that sit inside the studio journey.
 *
 * The homepage is the argument the site is making; a visitor who steps out of it
 * for something like the privacy policy should not land on what looks like a
 * different company. The old marketing Navbar/Footer carry the previous brand —
 * cyan-to-purple gradient CTA, the ring wordmark, an "Analysera nu" action and a
 * nav pointing at the analysis product — so pages in the investor path use this
 * instead.
 *
 * Deliberately smaller than the homepage nav: one wordmark home, one action. A
 * legal page is somewhere you leave, not somewhere to be sold to.
 */
export default function ImmersiveShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="imm imm-page">
      <a className="skip" href="#main">Hoppa till innehåll</a>

      <header className="nav-wrap">
        <nav className="nav" aria-label="Huvudmeny">
          <Link className="brand" to="/">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">webscore</span>
          </Link>
          <Link className="nav-cta nav-cta-back" to="/">
            Till startsidan
          </Link>
        </nav>
      </header>

      <main id="main">{children}</main>

      <footer className="foot">
        <p>© {new Date().getFullYear()} Webscore — kreativ teknikstudio</p>
        <div className="foot-links">
          <a href="mailto:info@webscore.se">info@webscore.se</a>
        </div>
      </footer>
    </div>
  );
}
