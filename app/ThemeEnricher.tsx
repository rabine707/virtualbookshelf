"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ShelfTheme = "classic" | "dark-academia" | "botanical" | "fantasy" | "cozy" | "gothic" | "celestial";

const THEME_KEY = "shelf-of-fame-theme-v1";
const SPINE_LABELS_KEY = "shelf-of-fame-spine-labels-v1";

const THEMES: { id: ShelfTheme; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "dark-academia", label: "Dark Academia" },
  { id: "botanical", label: "Botanical" },
  { id: "fantasy", label: "Fantasy" },
  { id: "cozy", label: "Cozy Cottage" },
  { id: "gothic", label: "Gothic Romance" },
  { id: "celestial", label: "Celestial" },
];

const THEME_ASSETS: Record<Exclude<ShelfTheme, "classic">, string[]> = {
  "dark-academia": [
    "/themes/dark-academia/lux-candle-botanical.svg",
    "/themes/dark-academia/lux-apothecary-frame.svg",
    "/themes/dark-academia/lux-ivy-bust.svg",
    "/themes/dark-academia/lux-vintage-books.svg",
  ],
  botanical: ["/themes/botanical/botanical-shelf.svg"],
  fantasy: ["/themes/fantasy/fantasy-shelf.svg"],
  cozy: ["/themes/cozy/cozy-shelf.svg"],
  gothic: ["/themes/gothic/gothic-shelf.svg"],
  celestial: ["/themes/celestial/celestial-shelf.svg"],
};

function isShelfTheme(value: string | null): value is ShelfTheme {
  return THEMES.some((theme) => theme.id === value);
}

function applyTheme(theme: ShelfTheme) {
  document.documentElement.dataset.shelfTheme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
}

function applySpineLabels(enabled: boolean) {
  document.documentElement.dataset.spineLabels = enabled ? "on" : "off";
  window.localStorage.setItem(SPINE_LABELS_KEY, enabled ? "on" : "off");
}

function syncDecor(theme: ShelfTheme) {
  const rows = [...document.querySelectorAll<HTMLElement>(".shelf-row")];

  rows.forEach((row, index) => {
    row.querySelectorAll(".asset-decor-set").forEach((node) => node.remove());
    row.querySelectorAll(".shelf-decor-set:not(.asset-decor-set)").forEach((node) => node.remove());

    if (theme === "classic") return;

    const assets = THEME_ASSETS[theme];
    // Keep breathing room on dense mobile shelves and avoid making every row identical.
    if (index % 4 === 2 && theme !== "dark-academia") return;

    const set = document.createElement("div");
    set.className = `shelf-decor-set asset-decor-set asset-layout-${index % 6} asset-theme-${theme}`;
    set.setAttribute("aria-hidden", "true");

    const firstIndex = index % assets.length;
    const first = document.createElement("img");
    first.className = `asset-decor asset-decor-primary asset-kind-${firstIndex}`;
    first.src = assets[firstIndex];
    first.alt = "";
    first.loading = "lazy";
    set.appendChild(first);

    if (theme === "dark-academia" && index % 6 === 1 && assets.length > 1) {
      const secondIndex = (index + 2) % assets.length;
      const second = document.createElement("img");
      second.className = `asset-decor asset-decor-secondary asset-kind-${secondIndex}`;
      second.src = assets[secondIndex];
      second.alt = "";
      second.loading = "lazy";
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
    const initial: ShelfTheme = isShelfTheme(saved) ? saved : "classic";
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
        const current = document.documentElement.dataset.shelfTheme;
        syncDecor(isShelfTheme(current ?? null) ? current : "classic");
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
    requestAnimationFrame(() => syncDecor(next));
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
      {THEMES.map((option) => (
        <button
          key={option.id}
          type="button"
          className={theme === option.id ? "active" : ""}
          onClick={() => choose(option.id)}
          aria-pressed={theme === option.id}
        >
          {option.label}
        </button>
      ))}
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
