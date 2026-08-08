"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ShelfTheme = "classic" | "dark-academia";

const THEME_KEY = "shelf-of-fame-theme-v1";

function applyTheme(theme: ShelfTheme) {
  document.documentElement.dataset.shelfTheme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
}

function ensureDecor() {
  const rows = [...document.querySelectorAll<HTMLElement>(".shelf-row")];
  rows.forEach((row, index) => {
    if (row.querySelector(".shelf-decor-set")) return;
    const set = document.createElement("div");
    set.className = `shelf-decor-set decor-layout-${index % 4}`;
    set.setAttribute("aria-hidden", "true");
    set.innerHTML = [
      '<span class="decor decor-candle"><i></i></span>',
      '<span class="decor decor-bottle"><i></i></span>',
      '<span class="decor decor-plant"><i></i><b></b></span>',
      '<span class="decor decor-frame"><i></i></span>',
    ].join("");
    row.appendChild(set);
  });
}

export default function ThemeEnricher() {
  const [theme, setTheme] = useState<ShelfTheme>("classic");
  const [toolbar, setToolbar] = useState<Element | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_KEY);
    const initial: ShelfTheme = saved === "dark-academia" ? "dark-academia" : "classic";
    setTheme(initial);
    applyTheme(initial);

    const sync = () => {
      setToolbar(document.querySelector(".toolbar"));
      ensureDecor();
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function choose(next: ShelfTheme) {
    setTheme(next);
    applyTheme(next);
  }

  if (!toolbar) return null;

  return createPortal(
    <div className="theme-picker" role="group" aria-label="Bookshelf theme">
      <span className="theme-picker-label">Theme</span>
      <button
        type="button"
        className={theme === "classic" ? "active" : ""}
        onClick={() => choose("classic")}
        aria-pressed={theme === "classic"}
      >
        Classic
      </button>
      <button
        type="button"
        className={theme === "dark-academia" ? "active" : ""}
        onClick={() => choose("dark-academia")}
        aria-pressed={theme === "dark-academia"}
      >
        Dark Academia
      </button>
    </div>,
    toolbar,
  );
}
