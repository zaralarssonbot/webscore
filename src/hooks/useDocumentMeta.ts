import { useEffect } from "react";

interface DocumentMeta {
  /** Page title — set verbatim on document.title */
  title: string;
  /** Meta description */
  description?: string;
  /** Absolute canonical URL for this route */
  canonical?: string;
  /** When true, adds <meta name="robots" content="noindex,nofollow"> */
  noindex?: boolean;
}

const SITE_ORIGIN = "https://webscore.se";

/** Upsert a <meta name=...> or <meta property=...> tag in <head>. */
function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Upsert <link rel="canonical">. */
function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Dependency-free per-route SEO metadata. Sets the document title, description,
 * canonical and Open Graph / Twitter mirrors, plus optional noindex. Restores
 * the previous title on unmount so route changes stay consistent.
 */
export function useDocumentMeta({ title, description, canonical, noindex }: DocumentMeta) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    upsertMeta("property", "og:title", title);
    upsertMeta("name", "twitter:title", title);

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }

    const url = canonical ?? SITE_ORIGIN + "/";
    upsertCanonical(url);
    upsertMeta("property", "og:url", url);

    const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      upsertMeta("name", "robots", "noindex,nofollow");
    } else if (robots) {
      robots.remove();
    }

    return () => {
      document.title = previousTitle;
      // Leave the noindex tag out of indexable routes after leaving /admin.
      const r = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (noindex && r) r.remove();
    };
  }, [title, description, canonical, noindex]);
}

export default useDocumentMeta;
