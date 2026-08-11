"use client";

import { useEffect } from "react";

const ADVANCED_LABELS = new Set([
  "audible asin",
  "romance.io id",
  "isbn",
  "isbn source",
  "isbn confidence",
  "cover source",
  "rejected covers",
  "wrong editions",
]);

function textButton(root: ParentNode, label: RegExp) {
  return [...root.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => label.test((button.textContent || "").trim()));
}

function addBooksTrigger(hero: HTMLElement) {
  if (hero.querySelector(".reader-add-books")) return;

  const goodreads = textButton(hero, /^Import Goodreads$/i);
  const audible = textButton(hero, /^Import Audible CSV$/i);
  if (!goodreads && !audible) return;

  goodreads?.classList.add("reader-original-import");
  audible?.classList.add("reader-original-import");

  const wrap = document.createElement("div");
  wrap.className = "reader-add-books";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "primary reader-add-books-trigger";
  trigger.textContent = "＋ Add books";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    window.dispatchEvent(new Event("shelf-open-book-search"));
  });

  const originalActions = goodreads?.parentElement || audible?.parentElement;
  if (originalActions) originalActions.appendChild(wrap);
  else hero.appendChild(wrap);
  wrap.appendChild(trigger);
}

function detailValue(modal: HTMLElement, label: string) {
  for (const dt of modal.querySelectorAll<HTMLElement>(".details dt")) {
    if ((dt.textContent || "").trim().toLowerCase() !== label.toLowerCase()) continue;
    return (dt.nextElementSibling?.textContent || "").trim();
  }
  return "";
}

function markAdvancedRows(modal: HTMLElement) {
  for (const dt of modal.querySelectorAll<HTMLElement>(".details dt")) {
    const label = (dt.textContent || "").trim().toLowerCase();
    if (!ADVANCED_LABELS.has(label)) continue;
    dt.classList.add("reader-advanced-row");
    dt.nextElementSibling?.classList.add("reader-advanced-row");
  }
}

function addBookSummary(modal: HTMLElement) {
  const details = modal.querySelector<HTMLElement>(".details");
  const author = details?.querySelector<HTMLElement>(".author");
  if (!details || !author || details.querySelector(".reader-book-summary")) return;

  const summary = document.createElement("div");
  summary.className = "reader-book-summary";

  const values = [
    ["★", detailValue(modal, "Your rating")],
    ["◷", detailValue(modal, "Published")],
    ["▤", detailValue(modal, "Goodreads shelf")],
  ].filter(([, value]) => Boolean(value));

  for (const [icon, value] of values) {
    const chip = document.createElement("span");
    chip.className = "reader-book-chip";
    chip.textContent = `${icon} ${value}`;
    summary.appendChild(chip);
  }

  author.insertAdjacentElement("afterend", summary);
}

function addBookActions(modal: HTMLElement) {
  const details = modal.querySelector<HTMLElement>(".details");
  if (!details || details.querySelector(".reader-book-actions")) return;

  const actions = document.createElement("div");
  actions.className = "reader-book-actions";

  const spine = document.createElement("button");
  spine.type = "button";
  spine.className = "reader-book-action reader-book-action-primary";
  spine.textContent = "✨ Customize spine";
  spine.addEventListener("click", () => {
    const target = modal.querySelector<HTMLElement>(".generate-spine-button")
      || modal.querySelector<HTMLElement>('[aria-label="Cover feedback"]');
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  const cover = document.createElement("button");
  cover.type = "button";
  cover.className = "reader-book-action";
  cover.textContent = "🖼 Change cover";
  cover.addEventListener("click", () => {
    modal.querySelector<HTMLElement>(".cover-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  const more = document.createElement("button");
  more.type = "button";
  more.className = "reader-book-action reader-book-action-more";
  more.textContent = "More book info";
  more.setAttribute("aria-expanded", "false");
  more.addEventListener("click", () => {
    const show = !modal.classList.contains("reader-show-advanced");
    modal.classList.toggle("reader-show-advanced", show);
    more.textContent = show ? "Hide book info" : "More book info";
    more.setAttribute("aria-expanded", String(show));
  });

  actions.append(spine, cover, more);
  const summary = details.querySelector(".reader-book-summary") || details.querySelector(".author");
  summary?.insertAdjacentElement("afterend", actions);
}

function simplifyCoverControls(modal: HTMLElement) {
  const feedback = modal.querySelector<HTMLElement>('[aria-label="Cover feedback"]');
  if (feedback) {
    const correct = textButton(feedback, /Correct cover/i);
    const wrong = textButton(feedback, /Wrong cover/i);
    const edition = textButton(feedback, /Different edition/i);
    if (correct) correct.textContent = "✓ Use this cover";
    if (wrong) wrong.textContent = "Not this one";
    if (edition) edition.textContent = "Another edition";
  }

  const picker = modal.querySelector<HTMLElement>(".cover-picker");
  if (!picker) return;
  const heading = picker.querySelector<HTMLElement>(".cover-picker-heading strong");
  if (heading) heading.textContent = "Pick a cover";
  const search = textButton(picker, /Search more covers|Searching more editions|More editions searched/i);
  if (search && /Search more covers/i.test(search.textContent || "")) search.textContent = "Find more covers";
  picker.querySelector<HTMLElement>(".cover-picker-note")?.classList.add("reader-technical-note");
}

function simplifyModal(modal: HTMLElement) {
  if (!modal.classList.contains("reader-modal")) modal.classList.add("reader-modal");
  const eyebrow = modal.querySelector<HTMLElement>(".details > .eyebrow");
  if (eyebrow) eyebrow.textContent = "YOUR BOOK";
  markAdvancedRows(modal);
  addBookSummary(modal);
  addBookActions(modal);
  simplifyCoverControls(modal);
}

function scan() {
  const hero = document.querySelector<HTMLElement>(".hero");
  if (hero) {
    hero.classList.add("reader-hero");
    addBooksTrigger(hero);
  }

  document.querySelector<HTMLElement>(".toolbar")?.classList.add("reader-toolbar");
  const modal = document.querySelector<HTMLElement>(".modal");
  if (modal) simplifyModal(modal);
}

export default function ReaderUiCleanup() {
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        scan();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();

    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
