"use client";

import { useEffect } from "react";
import {
  getGeneratedSpine,
  getGeneratedSpineMode,
  readSpineStoreValue,
  saveGeneratedSpine,
  writeSpineStoreValue,
  type SpinePosition,
  type SpineRenderMode,
} from "../lib/spines/client";
import { sharedSpineRenderMode } from "../lib/spines/shared-render-mode";

const HISTORY_KEY_PREFIX = "history:v1:";
const CANDIDATES_KEY = "shelf-of-fame-spine-candidates-v1";
const DEFAULT_CLOTH_IMAGE = "__default_cloth__";
const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";

type BookIdentity = {
  title: string;
  author: string;
  isbn?: string;
  asin?: string;
  coverUrl: string;
  key: string;
};

type SpineChoice = {
  image: string;
  renderMode: SpineRenderMode;
  position?: SpinePosition;
  source: string;
  createdAt: number;
  shared?: boolean;
  coverUrl?: string;
};

type SharedSpineRow = {
  storage_path?: string;
  source_cover_url?: string | null;
  vote_score?: number | null;
  provider?: string | null;
  model?: string | null;
  created_at?: string | null;
  books?: {
    title?: string | null;
    author?: string | null;
    normalized_title?: string | null;
    normalized_author?: string | null;
    isbn?: string | null;
    asin?: string | null;
  } | null;
};

type Candidate = {
  title?: string;
  author?: string;
  spineImage?: string;
  source?: string;
  kind?: string;
  createdAt?: number;
};

type SpineEventDetail = {
  coverUrl?: string;
  image?: string;
  position?: SpinePosition;
  renderMode?: SpineRenderMode;
  shared?: boolean;
  sharedUrl?: string;
};

let sharedCache: { expires: number; rows: SharedSpineRow[] } | null = null;

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identity(title: string, author: string) {
  return `${normalize(title)}::${normalize(author)}`;
}

function modalDetail(modal: Element, label: string) {
  for (const dt of modal.querySelectorAll<HTMLElement>(".details dt")) {
    if (dt.textContent?.trim().toLowerCase() !== label.toLowerCase()) continue;
    return dt.nextElementSibling?.textContent?.trim() || "";
  }
  return "";
}

function modalBook(modal: Element): BookIdentity | null {
  const host = modal as HTMLElement;
  const title = host.dataset.bookTitle || modal.querySelector<HTMLElement>(".details h2")?.textContent?.trim() || "";
  const author = (host.dataset.bookAuthor || modal.querySelector<HTMLElement>(".details .author")?.textContent || "")
    .replace(/^by\s+/i, "")
    .trim();
  const cover = modal.querySelector<HTMLImageElement>(".cover-image");
  const coverUrl = host.dataset.bookCover || cover?.currentSrc || cover?.src || "";
  if (!title || !coverUrl) return null;
  const isbnRaw = host.dataset.bookIsbn || modalDetail(modal, "ISBN");
  const asinRaw = host.dataset.bookAsin || modalDetail(modal, "Audible ASIN");
  return {
    title,
    author,
    coverUrl,
    key: identity(title, author),
    isbn: isbnRaw && isbnRaw !== "N/A" ? isbnRaw : undefined,
    asin: asinRaw || undefined,
  };
}

async function activeSpine(coverUrl: string) {
  return (await getGeneratedSpine(coverUrl)) || "";
}

async function activeMode(coverUrl: string): Promise<SpineRenderMode> {
  return getGeneratedSpineMode(coverUrl);
}

async function saveActiveSpine(book: BookIdentity, choice: SpineChoice) {
  await saveGeneratedSpine(book.coverUrl, choice.image === DEFAULT_CLOTH_IMAGE ? "" : choice.image, choice.renderMode);
}

function historyKey(book: BookIdentity) {
  return `${HISTORY_KEY_PREFIX}${book.key}`;
}

async function readHistory(book: BookIdentity): Promise<SpineChoice[]> {
  const value = await readSpineStoreValue<unknown>(historyKey(book));
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is SpineChoice => Boolean(
    entry
    && typeof entry === "object"
    && typeof (entry as SpineChoice).image === "string"
    && typeof (entry as SpineChoice).source === "string",
  ));
}

async function writeHistory(book: BookIdentity, entries: SpineChoice[]) {
  await writeSpineStoreValue(historyKey(book), entries.slice(0, 20));
}

async function rememberHistory(book: BookIdentity, choice: SpineChoice) {
  const current = await readHistory(book);
  const existing = current.find((entry) => entry.image === choice.image);
  const nextChoice = existing ? { ...existing, ...choice } : choice;
  const next = [nextChoice, ...current.filter((entry) => entry.image !== choice.image)];
  await writeHistory(book, next);
  window.dispatchEvent(new CustomEvent("shelf-spine-gallery-changed"));
}

async function forgetHistory(book: BookIdentity, image: string) {
  const current = await readHistory(book);
  const next = current.filter((entry) => entry.image !== image);
  if (next.length === current.length) return;
  await writeHistory(book, next);
  window.dispatchEvent(new CustomEvent("shelf-spine-gallery-changed"));
}

async function markHistoryShared(book: BookIdentity, image: string) {
  const current = await readHistory(book);
  let changed = false;
  const next = current.map((entry) => {
    if (entry.image !== image) return entry;
    changed = true;
    return { ...entry, shared: true };
  });
  if (!changed) return;
  await writeHistory(book, next);
  window.dispatchEvent(new CustomEvent("shelf-spine-gallery-changed"));
}

function publicSpineUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/spines/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function sharedRows() {
  if (sharedCache && sharedCache.expires > Date.now()) return sharedCache.rows;
  try {
    const select = "storage_path,source_cover_url,vote_score,provider,model,created_at,books(title,author,normalized_title,normalized_author,isbn,asin)";
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/spines?select=${encodeURIComponent(select)}&status=eq.approved&order=vote_score.desc,created_at.desc&limit=1000`,
      {
        cache: "no-store",
        headers: { apikey: SUPABASE_KEY },
      },
    );
    if (!response.ok) return [];
    const rows = await response.json() as SharedSpineRow[];
    sharedCache = { expires: Date.now() + 15_000, rows };
    return rows;
  } catch {
    return [];
  }
}

function rowMatchesBook(row: SharedSpineRow, book: BookIdentity) {
  const data = row.books;
  if (!data) return false;
  if (book.isbn && data.isbn?.trim() === book.isbn) return true;
  if (book.asin && data.asin?.trim() === book.asin) return true;
  const rowTitle = data.title || data.normalized_title || "";
  const rowAuthor = data.author || data.normalized_author || "";
  return identity(rowTitle, rowAuthor) === book.key;
}

function sharedChoice(row: SharedSpineRow): SpineChoice | null {
  if (!row.storage_path) return null;
  const renderMode = sharedSpineRenderMode(row.provider);
  const position = row.provider === "cover-crop" && (row.model === "left" || row.model === "center" || row.model === "right")
    ? row.model
    : undefined;
  const source = renderMode === "integrated"
    ? "Community AI"
    : row.provider === "cover-crop"
      ? `${position ? `${position[0].toUpperCase()}${position.slice(1)} ` : ""}crop`
      : row.provider === "AI"
        ? "Community AI"
        : "Community";
  return {
    image: publicSpineUrl(row.storage_path),
    renderMode,
    position,
    source,
    createdAt: row.created_at ? Date.parse(row.created_at) || 0 : 0,
    shared: true,
    coverUrl: row.source_cover_url || undefined,
  };
}

function uploadedChoices(book: BookIdentity): SpineChoice[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CANDIDATES_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return (parsed as Candidate[])
      .filter((candidate) => candidate.spineImage && identity(candidate.title || "", candidate.author || "") === book.key)
      .map((candidate) => ({
        image: candidate.spineImage as string,
        renderMode: "integrated" as const,
        source: "Uploaded spine",
        createdAt: Number(candidate.createdAt || 0),
        shared: true,
      }));
  } catch {
    return [];
  }
}

function uniqueChoices(entries: SpineChoice[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (!entry.image || seen.has(entry.image)) return false;
    seen.add(entry.image);
    return true;
  });
}

function previewSource(editor: Element) {
  const detail = editor.querySelector<HTMLElement>(".spine-crop-heading span")?.textContent || "";
  if (/gpt image 2/i.test(detail)) return "GPT Image 2";
  if (/klein/i.test(detail)) return "Klein AI";
  if (/gemini/i.test(detail)) return "Gemini AI";
  return "AI generation";
}

async function captureAiPreview(modal: Element) {
  const book = modalBook(modal);
  const editor = modal.querySelector<HTMLElement>('.spine-crop-editor[data-mode="ai"]');
  const image = editor?.querySelector<HTMLImageElement>(".spine-crop-preview img")?.src || "";
  if (!book || !editor || !image || editor.dataset.spineGalleryCaptured === image) return;
  editor.dataset.spineGalleryCaptured = image;
  await rememberHistory(book, {
    image,
    renderMode: "integrated",
    source: previewSource(editor),
    createdAt: Date.now(),
    shared: false,
    coverUrl: book.coverUrl,
  });
}

async function galleryEntries(book: BookIdentity) {
  const [local, rows, active, mode] = await Promise.all([
    readHistory(book),
    sharedRows(),
    activeSpine(book.coverUrl),
    activeMode(book.coverUrl),
  ]);
  const shared = rows.filter((row) => rowMatchesBook(row, book)).map(sharedChoice).filter((entry): entry is SpineChoice => Boolean(entry));
  const uploaded = uploadedChoices(book);
  const current: SpineChoice[] = active
    ? [{ image: active, renderMode: mode, source: "Current spine", createdAt: Number.MAX_SAFE_INTEGER, shared: true }]
    : [];
  const defaultCloth: SpineChoice = { image: DEFAULT_CLOTH_IMAGE, renderMode: "overlay", source: "Default Cloth", createdAt: 0, shared: true };
  const choices = uniqueChoices([defaultCloth, ...current, ...local, ...uploaded, ...shared]);
  return {
    active,
    choices: choices.sort((left, right) => {
      if ((left.image === DEFAULT_CLOTH_IMAGE && !active) || left.image === active) return -1;
      if ((right.image === DEFAULT_CLOTH_IMAGE && !active) || right.image === active) return 1;
      return right.createdAt - left.createdAt;
    }),
  };
}

function ensureSection(picker: HTMLElement) {
  let section = picker.querySelector<HTMLElement>("[data-spine-gallery]");
  if (section) return section;

  section = document.createElement("section");
  section.className = "saved-spine-choices";
  section.setAttribute("data-spine-gallery", "1");
  section.innerHTML = `
    <div class="saved-spine-heading">
      <strong>Spine gallery</strong>
      <span data-spine-gallery-count></span>
    </div>
    <div class="saved-spine-grid" data-spine-gallery-grid></div>
    <p class="saved-spine-empty" data-spine-gallery-empty></p>
  `;

  const webPanel = picker.querySelector("[data-web-cover-panel]");
  if (webPanel) picker.insertBefore(section, webPanel);
  else picker.appendChild(section);
  return section;
}

async function renderGallery(modal: Element) {
  const picker = modal.querySelector<HTMLElement>(".cover-picker");
  const book = modalBook(modal);
  if (!picker || !book) return;
  if (picker.querySelector("[data-native-spine-selector]")) return;
  const section = ensureSection(picker);
  const renderKey = `${book.key}::${book.coverUrl}`;
  section.dataset.renderKey = renderKey;

  const { active, choices } = await galleryEntries(book);
  if (!section.isConnected || section.dataset.renderKey !== renderKey) return;

  const count = section.querySelector<HTMLElement>("[data-spine-gallery-count]");
  const holder = section.querySelector<HTMLElement>("[data-spine-gallery-grid]");
  const empty = section.querySelector<HTMLElement>("[data-spine-gallery-empty]");
  if (!count || !holder || !empty) return;

  count.textContent = `${choices.length} ${choices.length === 1 ? "choice" : "choices"}`;
  holder.replaceChildren();
  empty.textContent = choices.length
    ? ""
    : "Generate, crop, or upload a spine and it will stay here so you can compare before choosing.";

  for (const choice of choices) {
    const button = document.createElement("button");
    const isDefault = choice.image === DEFAULT_CLOTH_IMAGE;
    const isActive = isDefault ? !active : choice.image === active;
    button.type = "button";
    button.className = `saved-spine-option${isActive ? " active" : ""}`;
    button.title = isActive ? "Currently on your shelf" : `Use ${choice.source}`;
    button.setAttribute("aria-label", button.title);

    const image = isDefault ? document.createElement("div") : document.createElement("img");
    if (image instanceof HTMLImageElement) {
      image.src = choice.image;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
    } else {
      image.className = "default-cloth-preview";
      image.setAttribute("aria-hidden", "true");
    }

    const label = document.createElement("span");
    label.textContent = isActive ? "Active" : choice.source;

    button.append(image, label);
    if (!isActive) {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await saveActiveSpine(book, choice);
          if (!isDefault) await rememberHistory(book, { ...choice, createdAt: choice.createdAt || Date.now() });
          modal.querySelector<HTMLElement>(".spine-crop-editor")?.remove();
          window.dispatchEvent(new CustomEvent("shelf-spine-generated", {
            detail: {
              coverUrl: book.coverUrl,
              image: isDefault ? "" : choice.image,
              position: choice.position,
              renderMode: choice.renderMode,
              shared: Boolean(choice.shared),
            } satisfies SpineEventDetail,
          }));
          await renderGallery(modal);
        } finally {
          button.disabled = false;
        }
      });
    }
    holder.appendChild(button);
  }
}

function mutationIsInsideGallery(mutation: MutationRecord) {
  const target = mutation.target;
  return target instanceof Element && Boolean(target.closest("[data-spine-gallery]"));
}

export default function SpineGallery() {
  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const modal = document.querySelector(".modal");
        if (!modal) return;
        void captureAiPreview(modal);
        void renderGallery(modal);
      }, 80);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const reject = target.closest(".spine-crop-reject");
      const editor = reject?.closest<HTMLElement>('.spine-crop-editor[data-mode="ai"]');
      if (!editor) return;
      const modal = editor.closest(".modal");
      const book = modal ? modalBook(modal) : null;
      const image = editor.querySelector<HTMLImageElement>(".spine-crop-preview img")?.src || "";
      if (book && image) void forgetHistory(book, image);
    };

    const onGenerated = (event: Event) => {
      const detail = (event as CustomEvent<SpineEventDetail>).detail;
      const modal = document.querySelector(".modal");
      const book = modal ? modalBook(modal) : null;
      if (!book || !detail?.image || detail.coverUrl !== book.coverUrl) {
        schedule();
        return;
      }

      const source = detail.position
        ? `${detail.position[0].toUpperCase()}${detail.position.slice(1)} crop`
        : detail.shared
          ? "Community spine"
          : "AI generation";
      void rememberHistory(book, {
        image: detail.image,
        renderMode: detail.renderMode || (detail.position ? "overlay" : "integrated"),
        position: detail.position,
        source,
        createdAt: Date.now(),
        shared: Boolean(detail.shared || detail.position),
        coverUrl: book.coverUrl,
      });
      if (detail.shared) void saveActiveSpine(book, {
        image: detail.image,
        renderMode: detail.renderMode || "overlay",
        position: detail.position,
        source,
        createdAt: Date.now(),
        shared: true,
      });
      schedule();
    };

    const onPublished = (event: Event) => {
      sharedCache = null;
      const detail = (event as CustomEvent<SpineEventDetail>).detail;
      const modal = document.querySelector(".modal");
      const book = modal ? modalBook(modal) : null;
      if (book && detail?.image) void markHistoryShared(book, detail.image);
      schedule();
    };

    const observer = new MutationObserver((mutations) => {
      if (mutations.length && mutations.every(mutationIsInsideGallery)) return;
      schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "data-mode"] });
    document.addEventListener("click", onClick, true);
    window.addEventListener("shelf-spine-generated", onGenerated);
    window.addEventListener("shelf-community-spine-published", onPublished);
    window.addEventListener("shelf-spine-gallery-changed", schedule);
    schedule();

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("shelf-spine-generated", onGenerated);
      window.removeEventListener("shelf-community-spine-published", onPublished);
      window.removeEventListener("shelf-spine-gallery-changed", schedule);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
