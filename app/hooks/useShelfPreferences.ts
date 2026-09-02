"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CloudSettings } from "../cloud-sync";

export type ShelfTheme = "botanical";
export type TitleOrientation = "auto" | "upright" | "sideways";

export type ShelfPreferences = {
  theme: ShelfTheme;
  spineLabels: boolean;
  titleOrientation: TitleOrientation;
};

const THEME_KEY = "shelf-of-fame-theme-v1";
const SPINE_LABELS_KEY = "shelf-of-fame-spine-labels-v1";
const SIDEWAYS_TITLES_KEY = "shelf-of-fame-sideways-titles-v1";
const TITLE_ORIENTATION_KEY = "shelf-of-fame-title-orientation-v1";
const DEFAULT_PREFERENCES: ShelfPreferences = { theme: "botanical", spineLabels: true, titleOrientation: "auto" };

function validOrientation(value: unknown): value is TitleOrientation {
  return value === "auto" || value === "upright" || value === "sideways";
}

function storedPreferences(): ShelfPreferences {
  const storedOrientation = window.localStorage.getItem(TITLE_ORIENTATION_KEY);
  const legacySideways = window.localStorage.getItem(SIDEWAYS_TITLES_KEY);
  const titleOrientation = validOrientation(storedOrientation)
    ? storedOrientation
    : legacySideways === "off" ? "upright" : legacySideways === "on" ? "sideways" : "auto";
  return {
    theme: "botanical",
    spineLabels: window.localStorage.getItem(SPINE_LABELS_KEY) !== "off",
    titleOrientation,
  };
}

function persist(preferences: ShelfPreferences) {
  window.localStorage.setItem(THEME_KEY, preferences.theme);
  window.localStorage.setItem(SPINE_LABELS_KEY, preferences.spineLabels ? "on" : "off");
  window.localStorage.setItem(TITLE_ORIENTATION_KEY, preferences.titleOrientation);
  window.localStorage.setItem(SIDEWAYS_TITLES_KEY, preferences.titleOrientation === "upright" ? "off" : "on");
  document.documentElement.dataset.shelfTheme = preferences.theme;
  document.documentElement.dataset.spineLabels = preferences.spineLabels ? "on" : "off";
  document.documentElement.dataset.titleOrientation = preferences.titleOrientation;
}

export function useShelfPreferences() {
  const [preferences, setPreferences] = useState<ShelfPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const cloudApplied = useRef(false);

  useEffect(() => {
    if (cloudApplied.current) return;
    const initial = storedPreferences();
    setPreferences(initial);
    persist(initial);
    setReady(true);
  }, []);

  const updatePreferences = useCallback((update: Partial<ShelfPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...update };
      persist(next);
      return next;
    });
  }, []);

  const applyCloudPreferences = useCallback((settings: CloudSettings) => {
    cloudApplied.current = true;
    const titleOrientation = validOrientation(settings.title_orientation)
      ? settings.title_orientation
      : settings.sideways_titles === false ? "upright" : settings.sideways_titles === true ? "sideways" : "auto";
    const next: ShelfPreferences = {
      theme: "botanical",
      spineLabels: settings.spine_labels !== false,
      titleOrientation,
    };
    persist(next);
    setPreferences(next);
  }, []);

  return { preferences, ready, updatePreferences, applyCloudPreferences };
}
