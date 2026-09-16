"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

export interface LegacyLinkAttrs {
  rel?: string;
  href?: string;
  crossOrigin?: string;
  [key: string]: unknown;
}

export interface LegacyPageProps {
  css: string;
  bodyHtml: string;
  links?: LegacyLinkAttrs[];
  /** External same-origin scripts the body depends on (e.g. a data file) — must run before the body's own inline scripts. */
  externalScripts?: string[];
}

/**
 * Renders a legacy single-file HTML dashboard's extracted <style>/<body>
 * as a real Next.js page, while preserving exact behavior.
 *
 * Why this exists: these dashboards interleave markup and <script> blocks
 * (e.g. a modal's HTML sits between two <script> tags), so splitting
 * "markup" from "scripts" into separate buckets isn't safe — order matters.
 * Instead the whole body is inserted as one HTML blob (dangerouslySetInnerHTML),
 * then on mount every <script> tag found inside it is replaced with a fresh
 * <script> element in the same document position. Browsers never execute
 * <script> tags created via innerHTML, but they do execute freshly created
 * script elements inserted into a live document — this is the standard
 * workaround, and it runs the scripts in the same order they appear in the
 * original file.
 *
 * (The per-page data-theme attribute is handled by the root layout, not
 * here — that needs to be present in the server-rendered <html> tag itself
 * to avoid a flash of the wrong theme, which a client effect can't do.)
 */
export function LegacyPage({ css, bodyHtml, links = [], externalScripts = [] }: LegacyPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current || !containerRef.current) return;
    executedRef.current = true;

    // In Next.js SSR, browsers parse and execute all inline <script> tags delivered
    // in the initial server HTML payload. Re-executing them on initial client hydration
    // causes duplicate listeners, duplicate network calls, and syntax errors.
    // We only need to replace and execute scripts if the page was rendered via client navigation.
    if (typeof window !== "undefined" && !(window as any).__SSR_SCRIPTS_HYDRATED__) {
      (window as any).__SSR_SCRIPTS_HYDRATED__ = true;
      return;
    }

    const scripts = Array.from(containerRef.current.querySelectorAll("script"));
    for (const oldScript of scripts) {
      const newScript = document.createElement("script");
      for (const attr of Array.from(oldScript.attributes)) {
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.textContent = oldScript.textContent;
      try {
        oldScript.replaceWith(newScript);
      } catch (err) {
        console.warn("LegacyPage script execution warning:", err);
      }
    }
  }, []);

  return (
    <>
      {links.map((link, i) => (
        // eslint-disable-next-line react/jsx-key
        <link key={link.href ? String(link.href) + i : i} {...(link as Record<string, string>)} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {externalScripts.map((src) => (
        <Script key={src} src={src} strategy="beforeInteractive" />
      ))}
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}
