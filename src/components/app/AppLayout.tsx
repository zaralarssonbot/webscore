import { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Globe, History, Settings, LogOut, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import GlobalSearch from "./GlobalSearch";
import NotificationsBell from "./NotificationsBell";

const NAV = [
  { to: "/app", label: "Översikt", icon: LayoutDashboard, end: true },
  { to: "/app/domains", label: "Domäner", icon: Globe, end: false },
  { to: "/app/history", label: "Historik", icon: History, end: false },
  { to: "/app/settings", label: "Inställningar", icon: Settings, end: false },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/15" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`
          }
        >
          <Icon className="w-4 h-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    qc.clear();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border px-4 py-6 gap-8">
        <Link to="/app" className="px-3 text-lg font-bold font-display tracking-tight">
          Web<span className="text-neon-cyan">score</span>
        </Link>
        <NavItems />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-background border-r border-border px-4 py-6 flex flex-col gap-8">
            <div className="flex items-center justify-between px-3">
              <span className="text-lg font-bold font-display">
                Web<span className="text-neon-cyan">score</span>
              </span>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Stäng">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavItems onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-16 border-b border-border flex items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5"
              onClick={() => setMobileOpen(true)}
              aria-label="Meny"
            >
              <Menu className="w-5 h-5" />
            </button>
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full bg-neon-cyan/10 border border-neon-cyan/15 text-neon-cyan text-xs font-bold flex items-center justify-center"
                  aria-label="Konto"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                  <Settings className="w-4 h-4 mr-2" /> Inställningar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" /> Logga ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 md:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
