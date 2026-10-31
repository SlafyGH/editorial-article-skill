"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/components/Language";
import "./CaseStudyArticle.css"; // written by scripts/embed_site.mjs

type Content = { html: string; data: unknown };

const readStored = () => {
  try { return window.localStorage.getItem("efb-locale") === "pl" ? "pl" : "en"; } catch { return "en"; }
};

// Mounts a case study rendered by the editorial-article skill inside the site shell.
// Its scripts are plain IIFEs that bind to the markup once, so a language switch reloads
// the page instead of mounting the article twice.
export function CaseStudyArticle({ pl, en, assets }: { pl: Content; en: Content; assets: string }) {
  const { locale } = useLanguage();
  const root = useRef<HTMLDivElement>(null);
  const mounted = useRef<string | null>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    // During hydration the context still reports the server default, so read the stored choice.
    if (mounted.current) {
      if (locale !== mounted.current && locale === readStored()) window.location.reload();
      return;
    }
    mounted.current = readStored();
    const content = mounted.current === "pl" ? pl : en;
    // Only checked-in, reviewed article markup; never accepts CMS or user HTML.
    node.innerHTML = content.html;
    const data = document.createElement("script");
    data.type = "application/json"; data.id = "article-data";
    data.textContent = JSON.stringify(content.data);
    node.append(data);
    const load = (name: string) => new Promise<void>((resolve) => {
      const script = document.createElement("script");
      script.src = `${assets}/${name}`; script.onload = () => resolve(); script.onerror = () => resolve();
      node.append(script);
    });
    load("article.js").then(() => load("figures.js"));
  }, [locale, pl, en, assets]);

  return <div ref={root} className="ea" />;
}
