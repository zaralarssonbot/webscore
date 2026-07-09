import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { store } from "@/lib/db/store";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";
import { LogoWordmark, WebscoreMark } from "@/components/app/logo";
import { CheckCircle2 } from "lucide-react";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const supabaseEnabled = isSupabaseEnabled();
  // Demo user picker is only meaningful in demo mode.
  const users = supabaseEnabled
    ? []
    : store.users.map((u) => ({
        id: u.id,
        name: u.name,
        title: u.title,
        role: u.role,
        color: u.color,
      }));

  const highlights = [
    "Offerter som kunden godkänner med ett klick",
    "Arbetsorder, tid och material på ett ställe",
    "Färdigt fakturaunderlag — enklare än Excel",
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.21_0.018_274)] p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "30px 30px",
          }}
        />
        {/* soft accent glow, top-left */}
        <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[oklch(0.55_0.19_278)] opacity-25 blur-[90px]" />
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
            <WebscoreMark size={19} color="currentColor" trackOpacity={0.35} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Webscore Work
          </span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight">
            Hela arbetsflödet, från förfrågan till faktura.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            Ett modernt system för svenska serviceföretag. Enklare än Excel och
            WhatsApp — men kraftfullt nog att driva hela verksamheten.
          </p>
          <ul className="mt-8 space-y-3.5">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 text-sm text-white/85">
                <CheckCircle2 className="size-[18px] shrink-0 text-[oklch(0.74_0.13_282)]" />
                {h}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-white/45">
          © {new Date().getFullYear()} Webscore Work · Demo-miljö
        </p>
      </div>

      {/* Login panel */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <LogoWordmark />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Välkommen tillbaka
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {supabaseEnabled
              ? "Logga in med din e-post och ditt lösenord."
              : "Välj en användare för att utforska demon. Varje roll ser sin egen vy."}
          </p>
          <div className="mt-8">
            <LoginForm users={users} supabaseEnabled={supabaseEnabled} />
          </div>
        </div>
      </div>
    </div>
  );
}
