"use client";

import { useEffect } from "react";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const SAMPLE_IDS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MANUAL_COLORS = ["#6f4e37", "#8b5e3c", "#5a6b4f", "#8e3b46", "#46627f", "#aa7a3d", "#584b63", "#7b6f62"];
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

type StoredBook = {
  id?: string;
  title?: string;
  author?: string;
  color?: string;
} & Record<string, unknown>;

function textButton(root: ParentNode, label: RegExp) {
  return [...root.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => label.test((button.textContent || "").trim()));
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function readShelf(): StoredBook[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIBRARY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function looksLikeSampleShelf(books: StoredBook[]) {
  return books.length === SAMPLE_IDS.length && books.every((book, index) => book.id === SAMPLE_IDS[index]);
}

function addManualBook(title: string, author: string) {
  const cleanedTitle = title.replace(/\s+/g, " ").trim();
  const cleanedAuthor = author.replace(/\s+/g, " ").trim() || "Unknown author";
  if (!cleanedTitle) return { ok: false, message: "Enter a book title first." };

  const stored = readShelf();
  const base = looksLikeSampleShelf(stored) ? [] : stored;
  const duplicate = base.some((book) => normalize(book.title || "") === normalize(cleanedTitle)
    && normalize(book.author || "") === normalize(cleanedAuthor));
  if (duplicate) return { ok: false, message: "That book is already on your shelf." };

  const book: StoredBook = {
    id: `manual:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanedTitle,
    author: cleanedAuthor,
    importSource: "Added manually",
    color: MANUAL_COLORS[base.length % MANUAL_COLORS.length],
  };

  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify([...base, book]));
    return { ok: true, message: "Book added." };
  } catch {
    return { ok: false, message: "Could not save that book on this device." };
  }
}

function setAddDialogOpen(dialog: HTMLElement, trigger: HTMLElement, open: boolean) {
  dialog.hidden = !open;
  trigger.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("reader-add-books-open", open);
  if (open) requestAnimationFrame(() => dialog.querySelector<HTMLInputElement>('input[name="reader-title"]')?.focus());
}

function addBooksMenu(hero: HTMLElement) {
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
  trigger.setAttribute("aria-expanded", "false");

  const backdrop = document.createElement("div");
  backdrop.className = "reader-add-books-backdrop";
  backdrop.hidden = true;

  const dialog = document.createElement("section");
  dialog.className = "reader-add-books-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Add books to your shelf");

  const header = document.createElement("header");
  const headerCopy = document.createElement("div");
  headerCopy.innerHTML = "<small>YOUR LIBRARY</small><h2>Add books</h2><p>Add one title or bring in a library you already have.</p>";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "reader-add-books-close";
  close.setAttribute("aria-label", "Close add books");
  close.textContent = "×";
  header.append(headerCopy, close);

  const manual = document.createElement("form");
  manual.className = "reader-manual-add";
  manual.innerHTML = `
    <div class="reader-add-section-heading"><strong>Add one book</strong><span>We’ll look for the cover automatically.</span></div>
    <label><span>Title</span><input name="reader-title" autocomplete="off" placeholder="Book title" required /></label>
    <label><span>Author</span><input name="reader-author" autocomplete="off" placeholder="Author name" /></label>
    <div class="reader-manual-add-status" role="status"></div>
    <button type="submit" class="primary reader-manual-add-submit">Add to my shelf</button>
  `;

  const status = manual.querySelector<HTMLElement>(".reader-manual-add-status")!;
  manual.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(manual);
    const result = addManualBook(String(formData.get("reader-title") || ""), String(formData.get("reader-author") || ""));
    status.textContent = result.message;
    status.classList.toggle("error", !result.ok);
    if (result.ok) {
      setAddDialogOpen(backdrop, trigger, false);
      window.setTimeout(() => window.location.reload(), 80);
    }
  });

  const divider = document.createElement("div");
  divider.className = "reader-add-divider";
  divider.innerHTML = "<span>or</span>";

  const imports = document.createElement("div");
  imports.className = "reader-add-imports";
  const importHeading = document.createElement("div");
  importHeading.className = "reader-add-section-heading";
  importHeading.innerHTML = "<strong>Bring in a library</strong><span>Keep your shelf setup simple.</span>";
  imports.appendChild(importHeading);

  if (goodreads) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "reader-add-books-item reader-add-books-item-featured";
    item.innerHTML = "<span class=\"reader-add-icon\">📚</span><span><strong>Import Goodreads</strong><small>Upload your Goodreads CSV</small></span><b>›</b>";
    item.addEventListener("click", () => {
      setAddDialogOpen(backdrop, trigger, false);
      goodreads.click();
    });
    imports.appendChild(item);
  }

  const scan = document.createElement("button");
  scan.type = "button";
  scan.className = "reader-add-books-item reader-add-books-item-coming";
  scan.disabled = true;
  scan.innerHTML = "<span class=\"reader-add-icon\">📷</span><span><strong>Scan your bookshelf</strong><small>Photo import is coming soon</small></span><b>SOON</b>";
  imports.appendChild(scan);

  if (audible) {
    const advanced = document.createElement("details");
    advanced.className = "reader-add-advanced";
    const summary = document.createElement("summary");
    summary.textContent = "Advanced imports";
    const item = document.createElement("button");
    item.type = "button";
    item.className = "reader-add-books-item reader-add-books-item-secondary";
    item.innerHTML = "<span class=\"reader-add-icon\">🎧</span><span><strong>Import Audible CSV</strong><small>Merge an exported Audible library</small></span><b>›</b>";
    item.addEventListener("click", () => {
      setAddDialogOpen(backdrop, trigger, false);
      audible.click();
    });
    advanced.append(summary, item);
    imports.appendChild(advanced);
  }

  dialog.append(header, manual, divider, imports);
  backdrop.appendChild(dialog);
  wrap.append(trigger, backdrop);

  trigger.addEventListener("click", () => setAddDialogOpen(backdrop, trigger, backdrop.hidden));
  close.addEventListener("click", () => setAddDialogOpen(backdrop, trigger, false));
  backdrop.addEventListener("mousedown", (event) => {
    if (event.target === backdrop) setAddDialogOpen(backdrop, trigger, false);
  });

  const originalActions = goodreads?.parentElement || audible?.parentElement;
  if (originalActions) originalActions.appendChild(wrap);
  else hero.appendChild(wrap);
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
    const target = modal.querySelector<HTMLElement>(".reader-spine-tools")
      || modal.querySelector<HTMLElement>(".generate-spine-button")
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

function simplifySpineTools(modal: HTMLElement) {
  const feedback = modal.querySelector<HTMLElement>('[aria-label="Cover feedback"]');
  if (!feedback) return;

  const ai = feedback.querySelector<HTMLElement>(".generate-spine-button");
  const crop = feedback.querySelector<HTMLElement>(".spine-crop-button");
  const community = feedback.querySelector<HTMLElement>("[data-spine-community-tools]");
  const generationStatus = feedback.querySelector<HTMLElement>(".generate-spine-status");
  if (!ai && !crop && !community) return;

  let tools = feedback.querySelector<HTMLElement>(".reader-spine-tools");
  if (!tools) {
    tools = document.createElement("section");
    tools.className = "reader-spine-tools";
    const heading = document.createElement("div");
    heading.className = "reader-spine-tools-heading";
    heading.innerHTML = "<strong>Spine tools</strong><span>Make this book look right on your shelf.</span>";
    tools.appendChild(heading);
    feedback.appendChild(tools);
  }

  if (ai && ai.parentElement !== tools) tools.appendChild(ai);
  if (crop && crop.parentElement !== tools) tools.appendChild(crop);
  if (community && community.parentElement !== tools) tools.appendChild(community);
  if (generationStatus && generationStatus.parentElement !== tools) tools.appendChild(generationStatus);

  const google = tools.querySelector<HTMLButtonElement>(".spine-google-button");
  const upload = tools.querySelector<HTMLButtonElement>(".spine-upload-button");
  if (google) google.textContent = "🔎 Find real spine";
  if (upload && /Upload spine candidate/i.test(upload.textContent || "")) upload.textContent = "📷 Upload spine";
  if (generationStatus && /AI allows up to 3 generations per book/i.test(generationStatus.textContent || "")) {
    generationStatus.textContent = "Up to 3 AI tries per book.";
  }
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
  simplifySpineTools(modal);
}

function clickExisting(selector: string) {
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) return false;
  target.click();
  return true;
}

function addMobileNav() {
  if (document.querySelector(".reader-mobile-nav")) return;

  const nav = document.createElement("nav");
  nav.className = "reader-mobile-nav";
  nav.setAttribute("aria-label", "Main navigation");

  const make = (icon: string, label: string, action: () => void, primary = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `reader-mobile-nav-item${primary ? " primary" : ""}`;
    button.innerHTML = `<span aria-hidden="true">${icon}</span><b>${label}</b>`;
    button.addEventListener("click", action);
    return button;
  };

  nav.append(
    make("▤", "Shelf", () => document.querySelector<HTMLElement>(".bookcase")?.scrollIntoView({ behavior: "smooth", block: "start" })),
    make("＋", "Add", () => clickExisting(".reader-add-books-trigger"), true),
    make("✦", "Style", () => clickExisting(".theme-picker-trigger")),
    make("●", "You", () => {
      if (clickExisting(".sof-profile-link")) return;
      clickExisting(".sof-account > button");
    }),
  );

  document.body.appendChild(nav);
}

function scan() {
  const hero = document.querySelector<HTMLElement>(".hero");
  if (hero) {
    hero.classList.add("reader-hero");
    addBooksMenu(hero);
  }

  document.querySelector<HTMLElement>(".toolbar")?.classList.add("reader-toolbar");
  const modal = document.querySelector<HTMLElement>(".modal");
  if (modal) simplifyModal(modal);
  addMobileNav();
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

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const backdrop = document.querySelector<HTMLElement>(".reader-add-books-backdrop:not([hidden])");
      const trigger = document.querySelector<HTMLElement>(".reader-add-books-trigger");
      if (backdrop && trigger) setAddDialogOpen(backdrop, trigger, false);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", onKey);
    schedule();

    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKey);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
