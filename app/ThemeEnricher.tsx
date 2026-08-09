"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ShelfTheme = "classic" | "dark-academia";

const THEME_KEY = "shelf-of-fame-theme-v1";
const SPINE_LABELS_KEY = "shelf-of-fame-spine-labels-v1";

function applyTheme(theme: ShelfTheme) {
  document.documentElement.dataset.shelfTheme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
}

function applySpineLabels(enabled: boolean) {
  document.documentElement.dataset.spineLabels = enabled ? "on" : "off";
  window.localStorage.setItem(SPINE_LABELS_KEY, enabled ? "on" : "off");
}

const ASSETS = [
  "/themes/dark-academia/lux-candle-botanical.svg",
  "/themes/dark-academia/lux-apothecary-frame.svg",
  "/themes/dark-academia/lux-ivy-bust.svg",
  "/themes/dark-academia/lux-vintage-books.svg",
];

function ensureDecor() {
  const rows = [...document.querySelectorAll<HTMLElement>(".shelf-row")];
  rows.forEach((row, index) => {
    if (row.querySelector(".asset-decor-set")) return;

    row.querySelectorAll(".shelf-decor-set:not(.asset-decor-set)").forEach((node) => node.remove());

    const set = document.createElement("div");
    set.className = `shelf-decor-set asset-decor-set asset-layout-${index % 6}`;
    set.setAttribute("aria-hidden", "true");

    if (index % 4 !== 2) {
      const first = document.createElement("img");
      first.className = `asset-decor asset-decor-primary asset-kind-${index % ASSETS.length}`;
      first.src = ASSETS[index % ASSETS.length];
      first.alt = "";
      set.appendChild(first);
    }

    if (index % 6 === 1) {
      const secondIndex = (index + 2) % ASSETS.length;
      const second = document.createElement("img");
      second.className = `asset-decor asset-decor-secondary asset-kind-${secondIndex}`;
      second.src = ASSETS[secondIndex];
      second.alt = "";
      set.appendChild(second);
    }

    row.appendChild(set);
  });
}

export default function ThemeEnricher() {
  const [theme, setTheme] = useState<ShelfTheme>("classic");
  const [spineLabels, setSpineLabels] = useState(true);
  const [toolbar, setToolbar] = useState<Element | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY);
    const initial: ShelfTheme = saved === "dark-academia" ? "dark-academia" : "classic";
    setTheme(initial);
    applyTheme(initial);

    const savedLabels = window.localStorage.getItem(SPINE_LABELS_KEY);
    const labelsEnabled = savedLabels !== "off";
    setSpineLabels(labelsEnabled);
    applySpineLabels(labelsEnabled);

    let scheduled = false;
    const sync = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        setToolbar(document.querySelector(".toolbar"));
        ensureDecor();
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function choose(next: ShelfTheme) {
    setTheme(next);
    applyTheme(next);
    ensureDecor();
  }

  function toggleSpineLabels() {
    const next = !spineLabels;
    setSpineLabels(next);
    applySpineLabels(next);
  }

  if (!toolbar) return null;

  return createPortal(
    <div className="theme-picker" role="group" aria-label="Bookshelf appearance">
      <span className="theme-picker-label">Theme</span>
      <button type="button" className={theme === "classic" ? "active" : ""} onClick={() => choose("classic")} aria-pressed={theme === "classic"}>Classic</button>
      <button type="button" className={theme === "dark-academia" ? "active" : ""} onClick={() => choose("dark-academia")} aria-pressed={theme === "dark-academia"}>Dark Academia</button>
      <span className="theme-picker-label spine-labels-label">Spines</span>
      <button
        type="button"
        className={spineLabels ? "active" : ""}
        onClick={toggleSpineLabels}
        aria-pressed={spineLabels}
        aria-label={`Spine labels ${spineLabels ? "on" : "off"}. Tap to turn ${spineLabels ? "off" : "on"}.`}
      >
        Labels {spineLabels ? "On" : "Off"}
      </button>
    </div>,
    toolbar,
  );
}
