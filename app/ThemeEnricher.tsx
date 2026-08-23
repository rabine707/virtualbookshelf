"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ShelfTheme = "classic" | "dark-academia" | "botanical" | "fantasy" | "cozy" | "gothic" | "celestial";

const THEME_KEY = "shelf-of-fame-theme-v1";
const SPINE_LABELS_KEY = "shelf-of-fame-spine-labels-v1";
const SIDEWAYS_TITLES_KEY = "shelf-of-fame-sideways-titles-v1";

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
    "/themes/dark-academia/cinematic-candle-ivy.webp",
    "/themes/dark-academia/cinematic-globe-candle.webp",
  ],
  botanical: ["/themes/botanical/botanical-shelf.svg"],
  fantasy: ["/themes/fantasy/fantasy-shelf.svg"],
  cozy: ["/themes/cozy/cozy-shelf.svg"],
  gothic: ["/themes/gothic/gothic-shelf.svg"],
  celestial: ["/themes/celestial/celestial-shelf.svg"],
};

function isShelfTheme(value: string | null | undefined): value is ShelfTheme {
  return typeof value === "string" && THEMES.some((theme) => theme.id === value);
}

function applyTheme(theme: ShelfTheme) {
  document.documentElement.dataset.shelfTheme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
}

function applySpineLabels(enabled: boolean) {
  document.documentElement.dataset.spineLabels = enabled ? "on" : "off";
  window.localStorage.setItem(SPINE_LABELS_KEY, enabled ? "on" : "off");
}

function applySidewaysTitles(enabled: boolean) {
  document.documentElement.dataset.sidewaysTitles = enabled ? "on" : "off";
  window.localStorage.setItem(SIDEWAYS_TITLES_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent<boolean>("shelf-sideways-titles-changed", { detail: enabled }));
}

function syncDecor(theme: ShelfTheme, force = false) {
  const rows = [...document.querySelectorAll<HTMLElement>(".shelf-row")];

  rows.forEach((row, index) => {
    const current = row.querySelector<HTMLElement>(".asset-decor-set");
    if (!force && current?.dataset.theme === theme) return;

    if (current) current.remove();
    row.querySelectorAll(".shelf-decor-set:not(.asset-decor-set)").forEach((node) => node.remove());

    // Botanical v3 has a dedicated scene compositor with real cabinet/window assets.
    if (theme === "classic" || theme === "botanical") return;

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

    if (theme === "dark-academia" && index % 3 === 1 && assets.length > 1) {
      const secondIndex = (index + 1) % assets.length;
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
  const [sidewaysTitles, setSidewaysTitles] = useState(true);
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

    const sidewaysEnabled = window.localStorage.getItem(SIDEWAYS_TITLES_KEY) !== "off";
    setSidewaysTitles(sidewaysEnabled);
    applySidewaysTitles(sidewaysEnabled);

    const onSidewaysTitlesChanged = (event: Event) => {
      setSidewaysTitles((event as CustomEvent<boolean>).detail !== false);
    };
    window.addEventListener("shelf-sideways-titles-changed", onSidewaysTitlesChanged);

    let scheduled = false;
    const sync = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        setToolbar(document.querySelector(".toolbar"));
        const currentTheme = document.documentElement.dataset.shelfTheme;
        syncDecor(isShelfTheme(currentTheme) ? currentTheme : "classic");
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("shelf-sideways-titles-changed", onSidewaysTitlesChanged);
    };
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

  useEffect(() => {
    const openPersonalization = () => setPickerOpen(true);
    window.addEventListener("shelf-open-personalization", openPersonalization);
    return () => window.removeEventListener("shelf-open-personalization", openPersonalization);
  }, []);

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

  function toggleSidewaysTitles() {
    const next = !sidewaysTitles;
    setSidewaysTitles(next);
    applySidewaysTitles(next);
  }

  const controls = toolbar ? createPortal(
    <>
      <button type="button" className="theme-picker-trigger" onClick={() => setPickerOpen(true)}>
        Theme
      </button>
      <button type="button" className="spine-label-toggle" onClick={toggleSpineLabels}>
        {spineLabels ? "Hide spine text" : "Show spine text"}
      </button>
    </>,
    toolbar,
  ) : null;

  const picker = pickerOpen
    ? createPortal(
        <div className="theme-picker-backdrop" onClick={() => setPickerOpen(false)}>
          <div
            className="theme-picker"
            role="dialog"
            aria-modal="true"
            aria-label="Personalize your shelf"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="theme-picker-close" onClick={() => setPickerOpen(false)} aria-label="Close theme picker">×</button>
            <h2>Personalize your shelf</h2>
            <button
              type="button"
              className="theme-picker-spine-setting"
              onClick={toggleSpineLabels}
              aria-pressed={spineLabels}
            >
              <span>
                <strong>Spine text</strong>
                <small>Show book title and author labels on the shelf</small>
              </span>
              <b>{spineLabels ? "On" : "Off"}</b>
            </button>
            <button
              type="button"
              className="theme-picker-spine-setting"
              onClick={toggleSidewaysTitles}
              aria-pressed={sidewaysTitles}
            >
              <span>
                <strong>Sideways spine titles</strong>
                <small>Use vertical titles when they fit, or keep every title upright</small>
              </span>
              <b>{sidewaysTitles ? "On" : "Off"}</b>
            </button>
            <div className="theme-picker-grid">
              {THEMES.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`theme-option${theme === option.id ? " active" : ""}`}
                  onClick={() => choose(option.id)}
                >
                  <span className="theme-option-icon">{option.icon}</span>
                  <span className="theme-option-copy">
                    <strong>{option.label}</strong>
                    <small>{option.subtitle}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return <>{controls}{picker}</>;
}
