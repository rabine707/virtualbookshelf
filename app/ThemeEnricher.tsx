"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AUTH_CHANGED_EVENT, readStoredShelfSession } from "./auth-client";

type ShelfTheme = "classic" | "dark-academia" | "botanical" | "fantasy" | "cozy" | "gothic" | "celestial";

const THEME_KEY = "shelf-of-fame-theme-v1";
const SPINE_LABELS_KEY = "shelf-of-fame-spine-labels-v1";
const SIDEWAYS_TITLES_KEY = "shelf-of-fame-sideways-titles-v1";
const TITLE_ORIENTATION_KEY = "shelf-of-fame-title-orientation-v1";
type TitleOrientation = "auto" | "upright" | "sideways";

const THEMES: { id: ShelfTheme; label: string; subtitle: string; icon: string; available: boolean }[] = [
  { id: "classic", label: "Classic", subtitle: "Clean warm wood", icon: "▤", available: false },
  { id: "dark-academia", label: "Dark Academia", subtitle: "Walnut, candles & antiques", icon: "♜", available: false },
  { id: "botanical", label: "Botanical", subtitle: "Plants, glass & soft green light", icon: "❧", available: true },
  { id: "fantasy", label: "Fantasy", subtitle: "Crystals, runes & magic glow", icon: "✦", available: false },
  { id: "cozy", label: "Cozy Cottage", subtitle: "Warm pine, flowers & lamplight", icon: "⌂", available: false },
  { id: "gothic", label: "Gothic Romance", subtitle: "Black wood, roses & candlelight", icon: "♠", available: false },
  { id: "celestial", label: "Celestial", subtitle: "Midnight blue, stars & brass", icon: "☾", available: false },
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

function applyTitleOrientation(orientation: TitleOrientation) {
  document.documentElement.dataset.titleOrientation = orientation;
  window.localStorage.setItem(TITLE_ORIENTATION_KEY, orientation);
  window.localStorage.setItem(SIDEWAYS_TITLES_KEY, orientation === "upright" ? "off" : "on");
  window.dispatchEvent(new CustomEvent<TitleOrientation>("shelf-title-orientation-changed", { detail: orientation }));
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
  const [theme, setTheme] = useState<ShelfTheme>("botanical");
  const [spineLabels, setSpineLabels] = useState(true);
  const [titleOrientation, setTitleOrientation] = useState<TitleOrientation>("auto");
  const [toolbar, setToolbar] = useState<Element | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isCurator, setIsCurator] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY);
    const savedTheme = isShelfTheme(saved) ? THEMES.find((option) => option.id === saved) : undefined;
    const initial: ShelfTheme = savedTheme?.available ? savedTheme.id : "botanical";
    setTheme(initial);
    applyTheme(initial);

    const savedLabels = window.localStorage.getItem(SPINE_LABELS_KEY);
    const labelsEnabled = savedLabels !== "off";
    setSpineLabels(labelsEnabled);
    applySpineLabels(labelsEnabled);

    const storedOrientation = window.localStorage.getItem(TITLE_ORIENTATION_KEY);
    const legacySideways = window.localStorage.getItem(SIDEWAYS_TITLES_KEY);
    const initialOrientation: TitleOrientation = storedOrientation === "upright" || storedOrientation === "sideways" || storedOrientation === "auto"
      ? storedOrientation
      : legacySideways === "off"
        ? "upright"
        : legacySideways === "on"
          ? "sideways"
          : "auto";
    setTitleOrientation(initialOrientation);
    applyTitleOrientation(initialOrientation);

    const onTitleOrientationChanged = (event: Event) => {
      const next = (event as CustomEvent<TitleOrientation>).detail;
      if (next === "auto" || next === "upright" || next === "sideways") setTitleOrientation(next);
    };
    window.addEventListener("shelf-title-orientation-changed", onTitleOrientationChanged);

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
      window.removeEventListener("shelf-title-orientation-changed", onTitleOrientationChanged);
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

  useEffect(() => {
    const syncCurator = () => setIsCurator(readStoredShelfSession()?.profile?.trusted_curator === true);
    syncCurator();
    window.addEventListener(AUTH_CHANGED_EVENT, syncCurator);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncCurator);
  }, []);

  function choose(next: ShelfTheme) {
    if (!THEMES.find((option) => option.id === next)?.available) return;
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

  function chooseTitleOrientation(next: TitleOrientation) {
    setTitleOrientation(next);
    applyTitleOrientation(next);
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
            <section className="theme-picker-spine-setting theme-picker-orientation" aria-label="Spine title orientation">
              <span>
                <strong>Spine title direction</strong>
                <small>Choose a varied shelf or force one direction when titles fit</small>
              </span>
              <span className="theme-picker-orientation-options">
                {(["auto", "upright", "sideways"] as TitleOrientation[]).map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={titleOrientation === option ? "active" : ""}
                    onClick={() => chooseTitleOrientation(option)}
                    aria-pressed={titleOrientation === option}
                  >
                    {option === "auto" ? "Automatic" : option === "upright" ? "Upright" : "Sideways"}
                  </button>
                ))}
              </span>
            </section>
            <div className="theme-picker-grid">
              {THEMES.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`theme-option${theme === option.id ? " active" : ""}`}
                  onClick={() => choose(option.id)}
                  disabled={!option.available}
                >
                  <span className="theme-option-icon">{option.icon}</span>
                  <span className="theme-option-copy">
                    <strong>{option.label}{option.available ? null : <span className="theme-option-soon"> (Soon)</span>}</strong>
                    <small>{option.subtitle}</small>
                  </span>
                </button>
              ))}
            </div>
            {isCurator ? <a className="theme-picker-library-link" href="/engravings">View all engravings <span aria-hidden="true">→</span></a> : null}
          </div>
        </div>,
        document.body,
      )
    : null;

  return <>{controls}{picker}</>;
}
