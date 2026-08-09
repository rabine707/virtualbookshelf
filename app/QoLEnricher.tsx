"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ActiveBook = {
  button: HTMLButtonElement;
  title: string;
  author: string;
  hasCover: boolean;
  hasSpine: boolean;
};

const SERIES_KEY = "shelf-of-fame-series-mode-v1";
const FAVORITES_KEY = "shelf-of-fame-favorites-v1";

function bookInfo(button: HTMLButtonElement): ActiveBook {
  return {
    button,
    title: button.querySelector<HTMLElement>(".book-title")?.textContent?.trim() || button.title.split(" — ")[0] || "Book",
    author: button.querySelector<HTMLElement>(".book-author")?.textContent?.trim() || button.title.split(" — ")[1] || "",
    hasCover: button.classList.contains("has-cover"),
    hasSpine: button.dataset.generatedSpine === "1",
  };
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function seriesInfo(button: HTMLButtonElement) {
  const title = button.querySelector<HTMLElement>(".book-title")?.textContent?.trim() || "";
  const author = button.querySelector<HTMLElement>(".book-author")?.textContent?.trim() || "";

  const paren = title.match(/^(.*?)\s*[\[(]([^\)\]]+?)(?:,|\s)(?:#|book\s*|vol(?:ume)?\s*|part\s*)?(\d+(?:\.\d+)?)[\])]\s*$/i);
  if (paren) {
    const seriesName = normalized(paren[2].replace(/(?:#|book|volume|vol|part)\s*\d+(?:\.\d+)?/ig, ""));
    return { key: `${normalized(author)}::${seriesName || normalized(paren[1])}`, number: Number(paren[3]) };
  }

  const explicit = title.match(/^(.*?)(?:\s*[:\-–—]?\s*)(?:book|volume|vol\.?|part)\s*#?\s*(\d+(?:\.\d+)?)\s*$/i);
  if (explicit && normalized(explicit[1])) {
    return { key: `${normalized(author)}::${normalized(explicit[1])}`, number: Number(explicit[2]) };
  }

  const hash = title.match(/^(.*?)\s+#(\d+(?:\.\d+)?)\s*$/i);
  if (hash && normalized(hash[1])) {
    return { key: `${normalized(author)}::${normalized(hash[1])}`, number: Number(hash[2]) };
  }

  const trailing = title.match(/^(.*?\D)\s+(\d{2,3})\s*$/);
  if (trailing && normalized(trailing[1]).length >= 4) {
    return { key: `${normalized(author)}::${normalized(trailing[1])}`, number: Number(trailing[2]) };
  }

  return null;
}

function distribute(nodes: HTMLButtonElement[]) {
  const rows = [...document.querySelectorAll<HTMLElement>(".shelf-row .books")];
  if (!rows.length) return;
  rows.forEach((row) => row.querySelectorAll(":scope > .book").forEach((node) => node.remove()));
  nodes.forEach((node, index) => rows[Math.min(Math.floor(index / 8), rows.length - 1)]?.appendChild(node));
}

function groupSeriesInDom() {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>(".shelf-row .book")];
  if (buttons.length < 2) return;

  const groups = new Map<string, { button: HTMLButtonElement; number: number }[]>();
  for (const button of buttons) {
    const info = seriesInfo(button);
    if (!info) continue;
    const list = groups.get(info.key) || [];
    list.push({ button, number: info.number });
    groups.set(info.key, list);
  }

  const repeated = new Map([...groups].filter(([, members]) => members.length > 1));
  if (!repeated.size) return;

  const used = new Set<HTMLButtonElement>();
  const ordered: HTMLButtonElement[] = [];
  for (const button of buttons) {
    if (used.has(button)) continue;
    const info = seriesInfo(button);
    const group = info ? repeated.get(info.key) : undefined;
    if (!group) {
      ordered.push(button);
      used.add(button);
      continue;
    }
    [...group].sort((a, b) => a.number - b.number).forEach((member) => {
      ordered.push(member.button);
      used.add(member.button);
      member.button.dataset.seriesGrouped = "1";
    });
  }

  if (ordered.every((button, index) => button === buttons[index])) return;
  distribute(ordered);
}

function waitFor<T extends Element>(selector: string, timeout = 6000): Promise<T | null> {
  const existing = document.querySelector<T>(selector);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
    const observer = new MutationObserver(() => {
      const found = document.querySelector<T>(selector);
      if (!found) return;
      window.clearTimeout(timer);
      observer.disconnect();
      resolve(found);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "class", "data-generated-spine"] });
  });
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function QoLEnricher() {
  const [toolbar, setToolbar] = useState<Element | null>(null);
  const [active, setActive] = useState<ActiveBook | null>(null);
  const [fixOpen, setFixOpen] = useState(false);
  const [seriesMode, setSeriesMode] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const bypass = useRef(false);
  const originalOrder = useRef<HTMLButtonElement[]>([]);
  const cancelBulk = useRef(false);

  useEffect(() => {
    const savedSeries = window.localStorage.getItem(SERIES_KEY) === "on";
    setSeriesMode(savedSeries);

    const sync = () => {
      setToolbar(document.querySelector(".toolbar"));
      setVersion((value) => value + 1);
      if (savedSeries || window.localStorage.getItem(SERIES_KEY) === "on") {
        requestAnimationFrame(groupSeriesInDom);
      } else {
        originalOrder.current = [...document.querySelectorAll<HTMLButtonElement>(".shelf-row .book")];
      }
    };
    sync();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        sync();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-generated-spine"] });

    return () => {
      observer.disconnect();
      cancelBulk.current = true;
    };
  }, []);

  const counts = useMemo(() => {
    void version;
    const all = [...document.querySelectorAll<HTMLButtonElement>(".shelf-row .book")];
    return {
      covers: all.filter((button) => !button.classList.contains("has-cover")).length,
      spines: all.filter((button) => button.classList.contains("has-cover") && button.dataset.generatedSpine !== "1").length,
    };
  }, [version, fixOpen]);

  function openOriginal(button: HTMLButtonElement) {
    setActive(null);
    setFixOpen(false);
    bypass.current = true;
    button.click();
    window.setTimeout(() => { bypass.current = false; }, 0);
  }

  async function openAndFind(button: HTMLButtonElement, selector?: string) {
    openOriginal(button);
    const modal = await waitFor<HTMLElement>(".modal", 5000);
    if (!modal || !selector) return modal;
    const target = await waitFor<HTMLElement>(selector, 5000);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    return target;
  }

  async function generateOne(button: HTMLButtonElement) {
    await openAndFind(button);
    const generator = await waitFor<HTMLButtonElement>(".modal .generate-spine-button", 6000);
    generator?.click();
  }

  function toggleFavorite(book: ActiveBook) {
    const identity = `${book.title}::${book.author}`;
    const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]") as string[];
    const next = stored.includes(identity) ? stored.filter((value) => value !== identity) : [...stored, identity];
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    book.button.classList.toggle("qol-favorite", next.includes(identity));
    setVersion((value) => value + 1);
  }

  function toggleSeries() {
    const next = !seriesMode;
    setSeriesMode(next);
    window.localStorage.setItem(SERIES_KEY, next ? "on" : "off");
    if (next) {
      originalOrder.current = [...document.querySelectorAll<HTMLButtonElement>(".shelf-row .book")];
      requestAnimationFrame(groupSeriesInDom);
    } else if (originalOrder.current.length) {
      document.querySelectorAll<HTMLButtonElement>(".book[data-series-grouped]").forEach((button) => delete button.dataset.seriesGrouped);
      distribute(originalOrder.current.filter((button) => button.isConnected));
    }
  }

  async function fixMissingCovers() {
    if (bulkBusy) return;
    const targets = [...document.querySelectorAll<HTMLButtonElement>(".shelf-row .book:not(.has-cover)")];
    setBulkBusy(true);
    cancelBulk.current = false;
    let fixed = 0;

    for (let index = 0; index < targets.length && !cancelBulk.current; index += 1) {
      const button = targets[index];
      setBulkStatus(`Finding covers… ${index + 1} of ${targets.length}`);
      openOriginal(button);
      const modal = await waitFor<HTMLElement>(".modal", 5000);
      if (!modal) continue;

      let image = await waitFor<HTMLImageElement>(".modal .cover-image", 4500);
      if (!image) {
        const more = [...modal.querySelectorAll<HTMLButtonElement>("button")].find((candidate) => /search more covers/i.test(candidate.textContent || ""));
        more?.click();
        image = await waitFor<HTMLImageElement>(".modal .cover-image", 7000);
      }

      if (image) {
        const correct = [...modal.querySelectorAll<HTMLButtonElement>("button")].find((candidate) => /correct cover/i.test(candidate.textContent || ""));
        correct?.click();
        fixed += 1;
      }
      document.querySelector<HTMLButtonElement>(".modal .close")?.click();
      await delay(180);
    }

    setBulkStatus(`Finished — fixed ${fixed} of ${targets.length} missing cover${targets.length === 1 ? "" : "s"}.`);
    setBulkBusy(false);
    setVersion((value) => value + 1);
  }

  async function generateMissingSpines() {
    if (bulkBusy) return;
    const targets = [...document.querySelectorAll<HTMLButtonElement>(".shelf-row .book.has-cover")]
      .filter((button) => button.dataset.generatedSpine !== "1");
    setBulkBusy(true);
    cancelBulk.current = false;
    let done = 0;

    for (let index = 0; index < targets.length && !cancelBulk.current; index += 1) {
      setBulkStatus(`Generating spines… ${index + 1} of ${targets.length}`);
      const button = targets[index];
      openOriginal(button);
      const generator = await waitFor<HTMLButtonElement>(".modal .generate-spine-button", 6000);
      if (!generator) {
        document.querySelector<HTMLButtonElement>(".modal .close")?.click();
        continue;
      }
      generator.click();

      const started = Date.now();
      while (Date.now() - started < 45000 && !cancelBulk.current) {
        if (button.dataset.generatedSpine === "1") { done += 1; break; }
        const status = document.querySelector<HTMLElement>(".generate-spine-status")?.textContent || "";
        if (/failed|needs|could not|error/i.test(status)) break;
        await delay(500);
      }
      document.querySelector<HTMLButtonElement>(".modal .close")?.click();
      await delay(220);
    }

    setBulkStatus(`Finished — generated ${done} of ${targets.length} missing spine${targets.length === 1 ? "" : "s"}.`);
    setBulkBusy(false);
    setVersion((value) => value + 1);
  }

  if (!toolbar) return null;

  return (
    <>
      {createPortal(
        <div className="qol-toolbar" aria-label="Shelf quick actions">
          <button type="button" className="qol-fix-button" onClick={() => setFixOpen(true)}>
            <span aria-hidden="true">✦</span>
            <span><small>Library</small><strong>Fix Missing</strong></span>
            {(counts.covers + counts.spines) > 0 && <b>{counts.covers + counts.spines}</b>}
          </button>
          <button type="button" className={`qol-series-button ${seriesMode ? "active" : ""}`} onClick={toggleSeries} aria-pressed={seriesMode}>
            <span aria-hidden="true">▥</span>
            <span><small>Arrange</small><strong>Series {seriesMode ? "On" : "Off"}</strong></span>
          </button>
        </div>,
        toolbar,
      )}

      {active && createPortal(
        <div className="qol-backdrop" onClick={() => setActive(null)}>
          <section className="qol-sheet" role="dialog" aria-modal="true" aria-label={`Actions for ${active.title}`} onClick={(event) => event.stopPropagation()}>
            <div className="qol-grabber" />
            <header>
              <div><small>Book actions</small><h2>{active.title}</h2><p>{active.author}</p></div>
              <button type="button" className="qol-close" onClick={() => setActive(null)} aria-label="Close">×</button>
            </header>
            <div className="qol-actions-grid">
              <button type="button" onClick={() => openOriginal(active.button)}><span>☰</span><strong>Details</strong><small>Book info & covers</small></button>
              <button type="button" onClick={() => openAndFind(active.button, ".modal .cover-picker")}><span>▣</span><strong>Change Cover</strong><small>Browse alternatives</small></button>
              <button type="button" onClick={() => generateOne(active.button)} disabled={!active.hasCover}><span>✦</span><strong>{active.hasSpine ? "Regenerate Spine" : "Generate Spine"}</strong><small>{active.hasCover ? "AI spine artwork" : "Needs a cover first"}</small></button>
              <button type="button" onClick={() => toggleFavorite(active)}><span>★</span><strong>Favorite</strong><small>Mark this book</small></button>
            </div>
          </section>
        </div>,
        document.body,
      )}

      {fixOpen && createPortal(
        <div className="qol-backdrop" onClick={() => !bulkBusy && setFixOpen(false)}>
          <section className="qol-sheet qol-fix-sheet" role="dialog" aria-modal="true" aria-label="Fix missing book artwork" onClick={(event) => event.stopPropagation()}>
            <div className="qol-grabber" />
            <header><div><small>Library cleanup</small><h2>Fix Missing</h2><p>Run only the recovery jobs you need.</p></div><button type="button" className="qol-close" disabled={bulkBusy} onClick={() => setFixOpen(false)} aria-label="Close">×</button></header>
            <div className="qol-fix-options">
              <button type="button" disabled={bulkBusy || counts.covers === 0} onClick={fixMissingCovers}><span className="qol-count">{counts.covers}</span><span><strong>Find missing covers</strong><small>Search and save the strongest match automatically</small></span></button>
              <button type="button" disabled={bulkBusy || counts.spines === 0} onClick={generateMissingSpines}><span className="qol-count">{counts.spines}</span><span><strong>Generate missing spines</strong><small>Uses your configured FLUX generator</small></span></button>
            </div>
            {bulkStatus && <div className="qol-progress" role="status">{bulkBusy && <i />}<span>{bulkStatus}</span></div>}
            {bulkBusy && <button type="button" className="qol-stop" onClick={() => { cancelBulk.current = true; setBulkStatus("Stopping after the current book…"); }}>Stop after current book</button>}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
