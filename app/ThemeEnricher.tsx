"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ShelfTheme = "classic" | "dark-academia" | "botanical" | "fantasy" | "cozy" | "gothic" | "celestial";

const THEME_KEY = "shelf-of-fame-theme-v1";
const SPINE_LABELS_KEY = "shelf-of-fame-spine-labels-v1";

const THEMES: { id: ShelfTheme; label: string; subtitle: string; icon: string }[] = [
  { id: "classic", label: "Classic", subtitle: "Clean warm wood", icon: "▤" },
  { id: "dark-academia", label: "Dark Academia", subtitle: "Walnut, candles & antiques", icon: "♜" },
  { id: "botanical", label: "Botanical", subtitle: "Plants, glass & soft green light", icon: "❧" },
  { id: "fantasy", label: "Fantasy", subtitle: "Crystals, runes & magic glow", icon: "✦" },
  { id: "cozy", label: "Cozy Cottage", subtitle: "Warm pine, flowers & lamplight", icon: "⌂" },
  { id: "gothic", label: "Gothic Romance", subtitle: "Black wood, roses & candlelight", icon: "♠" },
  { id: "celestial", label: "Celestial", subtitle: "Midnight blue, stars & brass", icon: "☾" },
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

function syncDecor(theme: ShelfTheme, force = false) {
  const rows = [...document.querySelectorAll<HTMLElement>(".shelf-row")];

  rows.forEach((row, index) => {
    const current = row.querySelector<HTMLElement>(".asset-decor-set");
    if (!force && current?.dataset.theme === theme) return;

    if (current) current.remove();
    row.querySelectorAll(".shelf-decor-set:not(.asset-decor-set)").forEach((node) => node.remove());

    if (theme === "classic") return;

    const assets = THEME_ASSETS[theme];
    if (index % 4 === 2 && theme !== "dark-academia") return;

    const set = document.createElement("div");
    set.className = `shelf-decor-set asset-decor-set asset-layout-${index % 6} asset-theme-${theme}`;
    set.dataset.theme = theme;
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
  const [pickerOpen, setPickerOpen] = useState(false);

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
        const currentTheme = document.documentElement.dataset.shelfTheme;
        syncDecor(isShelfTheme(currentTheme ?? null) ? currentTheme : "classic");
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("theme-picker-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("theme-picker-open");
    };
  }, [pickerOpen]);

  function choose(next: ShelfTheme) {
    setTheme(next);
    applyTheme(next);
    setPickerOpen(false);
    requestAnimationFrame(() => syncDecor(next, true));
  }

  function toggleSpineLabels() {
    const next = !spineLabels;
    setSpineLabels(next);
    applySpineLabels(next);
  }

  if (!toolbar) return null;

  const activeTheme = THEMES.find((option) => option.id === theme) ?? THEMES[0];

  return (
    <>
      {createPortal(
        <div className="theme-picker-compact" role="group" aria-label="Bookshelf appearance">
          <button
            type="button"
            className="theme-picker-launch"
            onClick={() => setPickerOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
          >
            <span className={`theme-picker-swatch theme-picker-swatch-${theme}`} aria-hidden="true">{activeTheme.icon}</span>
            <span className="theme-picker-launch-copy">
              <small>Theme</small>
              <strong>{activeTheme.label}</strong>
            </span>
            <span className="theme-picker-chevron" aria-hidden="true">⌄</span>
          </button>
          <button
            type="button"
            className={`spine-label-toggle ${spineLabels ? "active" : ""}`}
            onClick={toggleSpineLabels}
            aria-pressed={spineLabels}
            aria-label={`Spine labels ${spineLabels ? "on" : "off"}. Tap to turn ${spineLabels ? "off" : "on"}.`}
          >
            Labels {spineLabels ? "On" : "Off"}
          </button>
        </div>,
        toolbar,
      )}

      {pickerOpen && createPortal(
        <div className="theme-gallery-backdrop" role="presentation" onClick={() => setPickerOpen(false)}>
          <section
            className="theme-gallery"
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-gallery-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="theme-gallery-header">
              <div>
                <p>Bookshelf appearance</p>
                <h2 id="theme-gallery-title">Choose your shelf</h2>
              </div>
              <button type="button" className="theme-gallery-close" onClick={() => setPickerOpen(false)} aria-label="Close theme picker">×</button>
            </header>

            <div className="theme-gallery-grid">
              {THEMES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`theme-card theme-card-${option.id} ${theme === option.id ? "active" : ""}`}
                  onClick={() => choose(option.id)}
                  aria-pressed={theme === option.id}
                >
                  <span className="theme-card-preview" aria-hidden="true">
                    <span className="theme-card-frame">
                      <span className="theme-card-shelf theme-card-shelf-one" />
                      <span className="theme-card-books theme-card-books-one" />
                      <span className="theme-card-shelf theme-card-shelf-two" />
                      <span className="theme-card-books theme-card-books-two" />
                      <span className="theme-card-prop">{option.icon}</span>
                    </span>
                  </span>
                  <span className="theme-card-copy">
                    <strong>{option.label}</strong>
                    <small>{option.subtitle}</small>
                  </span>
                  {theme === option.id && <span className="theme-card-check" aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
