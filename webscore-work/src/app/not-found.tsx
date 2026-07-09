import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Logo size={40} />
      <div className="mt-6 flex size-14 items-center justify-center rounded-full bg-accent text-primary">
        <Compass className="size-7" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">
        Sidan hittades inte
      </h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Sidan du letar efter finns inte eller har flyttats. Den kan också ha
        tagits bort.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/dashboard">Till översikten</Link>
        </Button>
      </div>
    </div>
  );
}
