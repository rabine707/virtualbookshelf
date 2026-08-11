"use client";

import { useEffect } from "react";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const SESSION_KEY = "shelf-of-fame-supabase-session";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type StoredBook = {
  title?: string;
  author?: string;
  isbn?: string;
  preferredCover?: { url: string; source?: string };
  savedCovers?: Array<{ url: string; source?: string }>;
  coverFeedback?: { accepted?: string; rejected?: string[]; wrongEdition?: string[] };
} & Record<string, unknown>;

type UploadResponse = {
  imageUrl?: string;
  duplicate?: boolean;
  possibleDuplicate?: boolean;
  exactDuplicate?: boolean;
  existing?: Array<{ image_url?: string }>;
  error?: string;
  message?: string;
};

function normalize(value?: string) {
  return (value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function identity(title: string, author: string) {
  return `${normalize(title)}::${normalize(author)}`;
}

function accessToken() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token || "";
  } catch {
    return "";
  }
}

function modalBook() {
  const modal = document.querySelector<HTMLElement>(".modal");
  if (!modal) return null;
  const title = modal.querySelector<HTMLElement>(".details h2")?.textContent?.trim() || "";
  const author = (modal.querySelector<HTMLElement>(".details .author")?.textContent || "").replace(/^by\s+/i, "").trim();
  let isbn = "";
  for (const dt of modal.querySelectorAll<HTMLElement>(".details dt")) {
    if (dt.textContent?.trim().toLowerCase() !== "isbn") continue;
    const value = dt.nextElementSibling?.textContent?.trim() || "";
    if (value && value !== "N/A") isbn = value;
  }
  return title && author ? { title, author, isbn } : null;
}

function applyUploadedCover(title: string, author: string, imageUrl: string, duplicate: boolean) {
  const wanted = identity(title, author);
  const raw = window.localStorage.getItem(LIBRARY_KEY);
  const parsed: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(parsed)) throw new Error("Your browser library could not be read.");

  const books = parsed as StoredBook[];
  let found = false;
  const next = books.map((book) => {
    if (identity(book.title || "", book.author || "") !== wanted) return book;
    found = true;
    const cover = { url: imageUrl, source: duplicate ? "Community cover" : "Your uploaded cover" };
    const saved = [...(book.savedCovers || []), ...(book.preferredCover?.url ? [book.preferredCover] : []), cover];
    const seen = new Set<string>();
    return {
      ...book,
      preferredCover: cover,
      savedCovers: saved.filter((item) => item?.url && !seen.has(item.url) && !!seen.add(item.url)),
      coverFeedback: {
        ...book.coverFeedback,
        accepted: imageUrl,
        rejected: (book.coverFeedback?.rejected || []).filter((url) => url !== imageUrl),
        wrongEdition: (book.coverFeedback?.wrongEdition || []).filter((url) => url !== imageUrl),
      },
    };
  });

  if (!found) throw new Error("Open a book from your library before uploading its cover.");
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
}

async function uploadCover(file: File, allowVariant: boolean): Promise<{ response: Response; data: UploadResponse }> {
  const token = accessToken();
  if (!token) throw new Error("Sign in before uploading a cover to the shared library.");
  const book = modalBook();
  if (!book) throw new Error("Confirm the book title and author first.");

  const form = new FormData();
  form.set("image", file, file.name || "cover.jpg");
  form.set("title", book.title);
  form.set("author", book.author);
  if (book.isbn) form.set("isbn", book.isbn);
  if (allowVariant) form.set("allowVariant", "true");

  const response = await fetch("/api/community-cover", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  let data: UploadResponse = {};
  try { data = await response.json() as UploadResponse; } catch {}
  return { response, data };
}

export default function CommunityCoverUploadEnricher() {
  useEffect(() => {
    const mount = () => {
      const modal = document.querySelector<HTMLElement>(".modal");
      const feedback = modal?.querySelector<HTMLElement>('[aria-label="Cover feedback"]');
      if (!modal || !feedback || feedback.querySelector("[data-community-cover-upload]")) return;

      const holder = document.createElement("div");
      holder.setAttribute("data-community-cover-upload", "1");
      holder.style.display = "grid";
      holder.style.gap = "6px";
      holder.style.marginTop = "2px";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary";
      button.textContent = "📷 Upload your cover";
      button.title = "Add a cover photo that is missing from the cover databases";

      const note = document.createElement("small");
      note.style.opacity = "0.72";
      note.style.lineHeight = "1.35";
      note.textContent = "For special editions or covers our databases do not have. Exact duplicate images are reused automatically.";

      const status = document.createElement("small");
      status.setAttribute("role", "status");
      status.style.lineHeight = "1.35";
      status.style.minHeight = "1.2em";

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.hidden = true;

      button.addEventListener("click", () => input.click());
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;
        if (!/^image\/(?:jpeg|png|webp)$/i.test(file.type)) {
          status.textContent = "Use a JPEG, PNG, or WebP cover photo.";
          return;
        }
        if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
          status.textContent = "Cover photos must be 5 MB or smaller.";
          return;
        }

        button.disabled = true;
        button.textContent = "Uploading cover…";
        status.textContent = "Checking the shared library for duplicates first…";

        try {
          let result = await uploadCover(file, false);
          if (result.response.status === 409 && result.data.possibleDuplicate && !result.data.exactDuplicate) {
            const count = result.data.existing?.length || 1;
            const continueUpload = window.confirm(
              `This book or edition already has ${count} community-uploaded cover${count === 1 ? "" : "s"}.\n\nOnly continue if your photo shows a genuinely different cover or edition. Upload it anyway?`,
            );
            if (!continueUpload) {
              status.textContent = "Upload cancelled — the existing community cover was kept.";
              return;
            }
            status.textContent = "Uploading this as a different cover/edition…";
            result = await uploadCover(file, true);
          }

          if (!result.response.ok || !result.data.imageUrl) {
            throw new Error(result.data.error || "Could not save that cover photo.");
          }

          const book = modalBook();
          if (!book) throw new Error("The book details closed before the upload finished.");
          applyUploadedCover(book.title, book.author, result.data.imageUrl, Boolean(result.data.duplicate));
          status.textContent = result.data.duplicate
            ? "That exact image already existed, so we reused the stored copy."
            : "Cover saved. It is available to you now and queued for community review.";
          button.textContent = "✓ Cover saved";

          window.setTimeout(() => window.location.reload(), 650);
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "Community cover upload failed.";
          button.textContent = "📷 Upload your cover";
        } finally {
          if (document.contains(button) && button.textContent !== "✓ Cover saved") button.disabled = false;
        }
      });

      holder.append(button, note, status, input);
      feedback.appendChild(holder);
    };

    mount();
    const observer = new MutationObserver(() => window.requestAnimationFrame(mount));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
