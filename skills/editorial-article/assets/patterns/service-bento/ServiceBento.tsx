"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/Language";
import { BentoArtScene, ART_WIDTH } from "@/components/ServiceBentoArt";
import { BENTO_TABS } from "@/lib/serviceBento";
import { CAPABILITY_CATEGORIES, categoryHref, getCategory } from "@/lib/capabilityCategories";
import { EBI_HREF } from "@/lib/aiCapabilities";
import { leaveEbiPrompt } from "@/lib/ebiPrompt";
import "./ServiceBento.css";

const STAGE_H = 260;
/* Wide scenes never shrink below this much of their width; the rest pans with the story on narrow cells. */
const MIN_VISIBLE = 440;

/*
 * Service bento on /uslugi/dzial-ai: a tab per area, four flagship services per tab, each with a live mini-UI.
 * Motion runs only when allowed (no reduced motion), while the section is on screen and the browser tab is visible;
 * without JS or with reduced motion every scene shows its final state.
 */
export function ServiceBento() {
  const { locale } = useLanguage();
  const pl = locale === "pl";
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Motion on/off and live/paused are written to data attributes, so nothing re-renders while scenes play.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = false;
    const sync = () => {
      node.dataset.motion = media.matches ? "off" : "on";
      node.dataset.live = onScreen && document.visibilityState === "visible" ? "true" : "false";
    };
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; sync(); }, { threshold: 0.15 });
    observer.observe(node);
    sync();
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); media.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);

  // Scale every stage to its cell; wide scenes keep a readable size and pan instead.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const fit = (art: HTMLElement) => {
      const w = Number(art.dataset.w) || 420;
      const avail = art.clientWidth;
      if (!avail) return;
      const z = Math.min(1, Math.max(avail / w, Math.min(1, avail / MIN_VISIBLE)));
      const pan = Math.max(0, (w * z - avail) / 2 + (w * z > avail ? 14 : 0));
      art.style.setProperty("--z", z.toFixed(4));
      art.style.setProperty("--pan", `${Math.round(pan)}px`);
      art.style.height = `${Math.round(STAGE_H * z)}px`;
      art.toggleAttribute("data-pan", pan > 0);
    };
    const observer = new ResizeObserver(entries => entries.forEach(entry => fit(entry.target as HTMLElement)));
    node.querySelectorAll<HTMLElement>(".bx-art").forEach(art => { observer.observe(art); fit(art); });
    return () => observer.disconnect();
  }, [active]);

  const select = (i: number, focus = false) => {
    const next = (i + BENTO_TABS.length) % BENTO_TABS.length;
    setActive(next);
    if (focus) tabs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: BENTO_TABS.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    select(keys[event.key], true);
  };

  return (
    <div ref={root} className="bento site-container" data-motion="off" data-live="false">
      <div className="bx-tabs-wrap">
        <div className="bx-tabs" role="tablist" aria-label={pl ? "Obszary usług" : "Service areas"} onKeyDown={onKeyDown}>
          {BENTO_TABS.map((tab, i) => (
            <button
              key={tab.id}
              ref={el => { tabs.current[i] = el; }}
              type="button"
              role="tab"
              id={`bx-tab-${tab.id}`}
              aria-controls={`bx-panel-${tab.id}`}
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              className={`bx-tab${i === active ? " is-active" : ""}`}
              onClick={() => select(i)}
            >
              {tab.label[locale]}
            </button>
          ))}
        </div>
      </div>

      {BENTO_TABS.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`bx-panel-${tab.id}`}
          aria-labelledby={`bx-tab-${tab.id}`}
          className="bx-grid"
          hidden={i !== active}
        >
          {tab.cells.map((cell, c) => {
            const category = getCategory(cell.category);
            const bottom = c >= 2;
            return (
              <article
                key={cell.art}
                className={`bx-cell${cell.wide ? " is-wide" : ""}${bottom ? " is-art-first" : ""}`}
              >
                <div className="bx-text">
                  <h3>{cell.item.title[locale]}</h3>
                  <p>{cell.item.desc[locale]}</p>
                  <div className="bx-links">
                    {category && (
                      <Link className="bx-ask-ebi" href={EBI_HREF} onClick={() => leaveEbiPrompt(category.prompt[locale])}>
                        {pl ? "Zapytaj Ebi" : "Ask Ebi"}<span className="sr-only">{`: ${category.name[locale]}`}</span>
                        <span aria-hidden="true" className="bx-arrow">→</span>
                      </Link>
                    )}
                    {category && (
                      <Link href={categoryHref(category.slug)}>
                        {pl ? "Przewodnik" : "Guide"}<span className="sr-only">{`: ${category.name[locale]}`}</span>
                        <span aria-hidden="true" className="bx-arrow">→</span>
                      </Link>
                    )}
                    {cell.caseStudy && (
                      <Link href={cell.caseStudy}>
                        {pl ? "Zobacz realizację" : "See the case study"}<span aria-hidden="true" className="bx-arrow">→</span>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="bx-art" data-w={ART_WIDTH[cell.art]} aria-hidden="true">
                  <div className={`bx-stage is-${cell.art}`} style={{ width: ART_WIDTH[cell.art] }}>
                    <div className="bx-lift">
                      <BentoArtScene art={cell.art} pl={pl} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ))}

      <div className="bx-after">
        <p className="bx-note">{pl ? "Ilustracje pokazują przykładowe dane." : "Illustrations use sample data."}</p>
        <nav className="bx-all" aria-label={pl ? "Wszystkie kategorie usług" : "All service categories"}>
          <span className="bx-all-title">{pl ? `Wszystkie kategorie (${CAPABILITY_CATEGORIES.length})` : `All categories (${CAPABILITY_CATEGORIES.length})`}</span>
          <ul>
            {CAPABILITY_CATEGORIES.map(category => (
              <li key={category.slug}><Link href={categoryHref(category.slug)}>{category.name[locale]}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
