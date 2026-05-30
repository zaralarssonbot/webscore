import { Suspense, lazy, useEffect, useState } from "react";
import CSSAuroraBackground from "@/components/background/CSSAuroraBackground";

// Lazy so three.js never enters the bundle for users on the CSS fallback.
const WebGLBackground = lazy(() => import("@/components/background/WebGLBackground"));

/** Cheap one-off WebGL capability probe. */
const detectWebGL = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
};

type Mode = "probing" | "webgl" | "css-animated" | "css-static";

/**
 * Site-wide generative background. Fixed full-screen, behind all content.
 *
 *  - WebGL available + motion allowed → Three.js aurora (WebGLBackground)
 *  - prefers-reduced-motion          → static CSS gradient
 *  - no WebGL                         → animated CSS aurora fallback
 */
const BackgroundEffect = () => {
  const [mode, setMode] = useState<Mode>("probing");

  useEffect(() => {
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    if (reduced) {
      setMode("css-static");
      return;
    }
    setMode(detectWebGL() ? "webgl" : "css-animated");
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {mode === "webgl" ? (
        // CSS aurora paints instantly underneath while the WebGL chunk loads.
        <Suspense fallback={<CSSAuroraBackground animated />}>
          <WebGLBackground animated />
        </Suspense>
      ) : (
        <CSSAuroraBackground animated={mode !== "css-static"} />
      )}
    </div>
  );
};

export default BackgroundEffect;
