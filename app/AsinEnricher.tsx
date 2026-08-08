"use client";

import { useEffect } from "react";

const REGISTRY_KEY = "shelf-of-fame-asin-registry-v1";
const LIBRARY_KEY = "shelf-of-fame-library-v1";

type Registry = Record<string, string>;
type StoredBook = { title?: string; author?: string; asin?: string } & Record<string, unknown>;

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identity(title: string, author: string) {
  return `${normalize(title)}::${normalize(author)}`;
}

function loadRegistry(): Registry {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(REGISTRY_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed as Registry : {};
  } catch {
    return {};
  }
}

function saveAsin(title: string, author: string, asin: string) {
  const key = identity(title, author);
  const registry = loadRegistry();
  registry[key] = asin;
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    if (!Array.isArray(parsed)) return;
    const next = (parsed as StoredBook[]).map((book) => {
      if (identity(book.title || "", book.author || "") !== key || book.asin) return book;
      return { ...book, asin };
    });
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  } catch {
    // The separate ASIN registry remains the durable fallback.
  }
}

function storedAsin(title: string, author: string) {
  const key = identity(title, author);
  const registry = loadRegistry();
  if (registry[key]) return registry[key];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    if (!Array.isArray(parsed)) return undefined;
    const book = (parsed as StoredBook[]).find((item) => identity(item.title || "", item.author || "") === key);
    return typeof book?.asin === "string" && book.asin.trim() ? book.asin.trim() : undefined;
  } catch {
    return undefined;
  }
}

function ensureAsinRow(details: Element, value: string) {
  const dl = details.querySelector("dl");
  if (!dl) return;

  let dt = dl.querySelector<HTMLElement>('[data-shelf-asin-label="1"]');
  let dd = dl.querySelector<HTMLElement>('[data-shelf-asin-value="1"]');

  if (!dt || !dd) {
    const existingAudible = [...dl.querySelectorAll("dt")].find((node) => node.textContent?.trim() === "Audible ASIN");
    if (existingAudible) {
      const existingValue = existingAudible.nextElementSibling as HTMLElement | null;
      existingAudible.setAttribute("data-shelf-asin-label", "1");
      existingAudible.textContent = "ASIN";
      if (existingValue) {
        existingValue.setAttribute("data-shelf-asin-value", "1");
        dt = existingAudible as HTMLElement;
        dd = existingValue;
      }
    }
  }

  if (!dt || !dd) {
    dt = document.createElement("dt");
    dd = document.createElement("dd");
    dt.setAttribute("data-shelf-asin-label", "1");
    dd.setAttribute("data-shelf-asin-value", "1");
    dt.textContent = "ASIN";

    const isbnLabel = [...dl.querySelectorAll("dt")].find((node) => node.textContent?.trim() === "ISBN");
    if (isbnLabel) {
      dl.insertBefore(dt, isbnLabel);
      dl.insertBefore(dd, isbnLabel);
    } else {
      dl.append(dt, dd);
    }
  }

  dd.textContent = value;
}

export default function AsinEnricher() {
  useEffect(() => {
    const inFlight = new Set<string>();

    async function enrich() {
      const details = document.querySelector(".modal .details");
      if (!details) return;

      const title = details.querySelector("h2")?.textContent?.trim() || "";
      const authorText = details.querySelector(".author")?.textContent?.trim() || "";
      const author = authorText.replace(/^by\s+/i, "").trim();
      if (!title) return;

      const existing = storedAsin(title, author);
      if (existing) {
        ensureAsinRow(details, existing);
        return;
      }

      ensureAsinRow(details, "N/A");
      const key = identity(title, author);
      if (inFlight.has(key)) return;
      inFlight.add(key);

      try {
        const params = new URLSearchParams({ title, author });
        const response = await fetch(`/api/asin?${params.toString()}`, { cache: "no-store" });
        const result = response.ok ? await response.json() as { asin?: string | null } : null;
        if (!result?.asin) return;

        saveAsin(title, author, result.asin);
        const currentDetails = document.querySelector(".modal .details");
        if (currentDetails?.querySelector("h2")?.textContent?.trim() === title) {
          ensureAsinRow(currentDetails, result.asin);
        }
      } catch {
        // Missing ASINs stay N/A; cover behavior is intentionally untouched.
      } finally {
        inFlight.delete(key);
      }
    }

    const observer = new MutationObserver(() => { void enrich(); });
    observer.observe(document.body, { childList: true, subtree: true });
    void enrich();

    return () => observer.disconnect();
  }, []);

  return null;
}
