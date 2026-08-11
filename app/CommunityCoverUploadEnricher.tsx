"use client";

import { useEffect } from "react";

const LIBRARY_KEY = "shelf-of-fame-library-v1";
const SESSION_KEY = "shelf-of-fame-supabase-session";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PREPARED_DIMENSION = 1800;

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

type CropPercent = {
  left: number;
  right: number;
  top: number;
  bottom: number;
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

function loadPhoto(file: File) {
  return new Promise<{ image: HTMLImageElement; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That cover photo could not be opened."));
    };
    image.src = url;
  });
}

function centeredPortraitCrop(width: number, height: number, targetRatio = 0.65): CropPercent {
  const sourceRatio = width / height;
  if (sourceRatio > targetRatio) {
    const wantedWidth = height * targetRatio;
    const trimPercent = Math.max(0, ((width - wantedWidth) / width) * 50);
    return { left: trimPercent, right: trimPercent, top: 0, bottom: 0 };
  }

  const wantedHeight = width / targetRatio;
  const trimPercent = Math.max(0, ((height - wantedHeight) / height) * 50);
  return { left: 0, right: 0, top: trimPercent, bottom: trimPercent };
}

function cropGeometry(image: HTMLImageElement, crop: CropPercent) {
  const widthFraction = Math.max(0.02, 1 - (crop.left + crop.right) / 100);
  const heightFraction = Math.max(0.02, 1 - (crop.top + crop.bottom) / 100);
  const width = Math.max(1, Math.round(image.naturalWidth * widthFraction));
  const height = Math.max(1, Math.round(image.naturalHeight * heightFraction));
  return { width, height, ratio: width / height, widthFraction, heightFraction };
}

function ratioLabel(ratio: number) {
  if (ratio >= 0.5 && ratio <= 0.82) return "Looks like a normal portrait book cover";
  if (ratio > 0.82 && ratio <= 1.05) return "A little wide — check that background is not included";
  if (ratio < 0.5) return "Very narrow — check that the full front cover is inside the crop";
  return "Landscape crop — this probably includes background or another object";
}

async function cropPhotoToFile(file: File, image: HTMLImageElement, crop: CropPercent) {
  const sx = Math.round(image.naturalWidth * crop.left / 100);
  const sy = Math.round(image.naturalHeight * crop.top / 100);
  const sourceWidth = Math.max(1, Math.round(image.naturalWidth * (1 - (crop.left + crop.right) / 100)));
  const sourceHeight = Math.max(1, Math.round(image.naturalHeight * (1 - (crop.top + crop.bottom) / 100)));
  const scale = Math.min(1, MAX_PREPARED_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
  const outputHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare that cover photo.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sx, sy, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);

  const mime = file.type === "image/png" && file.size < 2_000_000 ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, mime === "image/jpeg" ? 0.9 : undefined));
  if (!blob) throw new Error("Your browser could not export the cropped cover.");

  const base = (file.name || "cover").replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "cover";
  const extension = mime === "image/png" ? "png" : "jpg";
  return new File([blob], `${base}-cropped.${extension}`, { type: mime, lastModified: Date.now() });
}

async function prepareCoverPhoto(file: File): Promise<File | null> {
  const { image, url } = await loadPhoto(file);
  let crop = centeredPortraitCrop(image.naturalWidth, image.naturalHeight);

  return new Promise<File | null>((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.setAttribute("data-cover-prep-dialog", "1");
    backdrop.style.position = "fixed";
    backdrop.style.inset = "0";
    backdrop.style.zIndex = "99999";
    backdrop.style.background = "rgba(20, 15, 12, 0.72)";
    backdrop.style.display = "grid";
    backdrop.style.placeItems = "center";
    backdrop.style.padding = "18px";

    const panel = document.createElement("section");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Prepare cover photo");
    panel.style.width = "min(920px, 96vw)";
    panel.style.maxHeight = "92vh";
    panel.style.overflow = "auto";
    panel.style.background = "#f8efe1";
    panel.style.color = "#2b1d15";
    panel.style.borderRadius = "18px";
    panel.style.padding = "18px";
    panel.style.boxShadow = "0 24px 70px rgba(0,0,0,.35)";

    const heading = document.createElement("div");
    heading.style.display = "flex";
    heading.style.alignItems = "start";
    heading.style.justifyContent = "space-between";
    heading.style.gap = "12px";

    const headingCopy = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = "Prepare your cover";
    title.style.margin = "0 0 4px";
    const subtitle = document.createElement("p");
    subtitle.textContent = "Crop out the table, wall, hands, or other books before this image enters the shared cover library.";
    subtitle.style.margin = "0";
    subtitle.style.opacity = "0.76";
    headingCopy.append(title, subtitle);

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Cancel cover upload");
    close.style.border = "0";
    close.style.background = "transparent";
    close.style.fontSize = "2rem";
    close.style.cursor = "pointer";
    heading.append(headingCopy, close);

    const workspace = document.createElement("div");
    workspace.style.display = "grid";
    workspace.style.gridTemplateColumns = "minmax(0, 1.45fr) minmax(240px, .8fr)";
    workspace.style.gap = "18px";
    workspace.style.marginTop = "16px";

    const previewColumn = document.createElement("div");
    previewColumn.style.minWidth = "0";
    previewColumn.style.display = "grid";
    previewColumn.style.placeItems = "center";
    previewColumn.style.background = "rgba(43,29,21,.08)";
    previewColumn.style.borderRadius = "14px";
    previewColumn.style.padding = "12px";
    previewColumn.style.overflow = "auto";

    const imageWrap = document.createElement("div");
    imageWrap.style.position = "relative";
    imageWrap.style.display = "inline-block";
    imageWrap.style.maxWidth = "100%";

    const displayImage = document.createElement("img");
    displayImage.src = url;
    displayImage.alt = "Cover photo crop preview";
    displayImage.style.display = "block";
    displayImage.style.maxWidth = "100%";
    displayImage.style.maxHeight = "58vh";
    displayImage.style.width = "auto";
    displayImage.style.height = "auto";

    const dimmerTop = document.createElement("span");
    const dimmerBottom = document.createElement("span");
    const dimmerLeft = document.createElement("span");
    const dimmerRight = document.createElement("span");
    for (const dimmer of [dimmerTop, dimmerBottom, dimmerLeft, dimmerRight]) {
      dimmer.style.position = "absolute";
      dimmer.style.background = "rgba(10, 8, 7, .5)";
      dimmer.style.pointerEvents = "none";
    }

    const cropBox = document.createElement("span");
    cropBox.style.position = "absolute";
    cropBox.style.border = "3px solid #f1c25b";
    cropBox.style.boxSizing = "border-box";
    cropBox.style.pointerEvents = "none";
    cropBox.style.boxShadow = "0 0 0 1px rgba(0,0,0,.35) inset";

    imageWrap.append(displayImage, dimmerTop, dimmerBottom, dimmerLeft, dimmerRight, cropBox);
    previewColumn.appendChild(imageWrap);

    const controls = document.createElement("div");
    controls.style.display = "grid";
    controls.style.alignContent = "start";
    controls.style.gap = "12px";

    const metrics = document.createElement("div");
    metrics.style.padding = "10px 12px";
    metrics.style.background = "rgba(255,255,255,.5)";
    metrics.style.borderRadius = "12px";
    metrics.style.lineHeight = "1.45";

    const metricMain = document.createElement("strong");
    const metricDetail = document.createElement("div");
    metricDetail.style.fontSize = ".88rem";
    metricDetail.style.opacity = ".76";
    metrics.append(metricMain, metricDetail);

    const inputMap = new Map<keyof CropPercent, HTMLInputElement>();
    const valueMap = new Map<keyof CropPercent, HTMLElement>();
    const labels: Array<[keyof CropPercent, string]> = [
      ["left", "Trim left"],
      ["right", "Trim right"],
      ["top", "Trim top"],
      ["bottom", "Trim bottom"],
    ];

    const sliders = document.createElement("div");
    sliders.style.display = "grid";
    sliders.style.gap = "9px";

    for (const [key, labelText] of labels) {
      const row = document.createElement("label");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "78px minmax(0,1fr) 38px";
      row.style.gap = "8px";
      row.style.alignItems = "center";
      row.style.fontSize = ".9rem";

      const label = document.createElement("span");
      label.textContent = labelText;
      const range = document.createElement("input");
      range.type = "range";
      range.min = "0";
      range.max = "70";
      range.step = "1";
      range.value = String(Math.round(crop[key]));
      const value = document.createElement("span");
      value.style.textAlign = "right";
      valueMap.set(key, value);
      inputMap.set(key, range);
      row.append(label, range, value);
      sliders.appendChild(row);
    }

    const presets = document.createElement("div");
    presets.style.display = "grid";
    presets.style.gridTemplateColumns = "1fr 1fr";
    presets.style.gap = "8px";
    const portraitPreset = document.createElement("button");
    portraitPreset.type = "button";
    portraitPreset.className = "primary";
    portraitPreset.textContent = "Auto portrait start";
    portraitPreset.title = "Start with a centered 0.65 width-to-height book-cover crop";
    const fullPhoto = document.createElement("button");
    fullPhoto.type = "button";
    fullPhoto.className = "primary";
    fullPhoto.textContent = "Use full photo";
    presets.append(portraitPreset, fullPhoto);

    const tip = document.createElement("small");
    tip.textContent = "Adjust the four edges until only the front cover remains. This measures image geometry, not physical inches/cm.";
    tip.style.opacity = ".72";
    tip.style.lineHeight = "1.4";

    const actions = document.createElement("div");
    actions.style.display = "grid";
    actions.style.gridTemplateColumns = "1fr 1.2fr";
    actions.style.gap = "8px";
    actions.style.marginTop = "4px";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "primary";
    cancel.textContent = "Cancel";
    const useCrop = document.createElement("button");
    useCrop.type = "button";
    useCrop.className = "primary";
    useCrop.textContent = "✓ Crop & continue";
    actions.append(cancel, useCrop);

    controls.append(metrics, sliders, presets, tip, actions);
    workspace.append(previewColumn, controls);
    panel.append(heading, workspace);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    const cleanup = (result: File | null) => {
      backdrop.remove();
      URL.revokeObjectURL(url);
      resolve(result);
    };

    const validCrop = () => crop.left + crop.right < 92 && crop.top + crop.bottom < 92;

    const update = () => {
      for (const [key, input] of inputMap) crop[key] = Number(input.value);
      const left = crop.left;
      const right = crop.right;
      const top = crop.top;
      const bottom = crop.bottom;

      cropBox.style.left = `${left}%`;
      cropBox.style.right = `${right}%`;
      cropBox.style.top = `${top}%`;
      cropBox.style.bottom = `${bottom}%`;

      dimmerTop.style.left = "0";
      dimmerTop.style.right = "0";
      dimmerTop.style.top = "0";
      dimmerTop.style.height = `${top}%`;
      dimmerBottom.style.left = "0";
      dimmerBottom.style.right = "0";
      dimmerBottom.style.bottom = "0";
      dimmerBottom.style.height = `${bottom}%`;
      dimmerLeft.style.left = "0";
      dimmerLeft.style.top = `${top}%`;
      dimmerLeft.style.bottom = `${bottom}%`;
      dimmerLeft.style.width = `${left}%`;
      dimmerRight.style.right = "0";
      dimmerRight.style.top = `${top}%`;
      dimmerRight.style.bottom = `${bottom}%`;
      dimmerRight.style.width = `${right}%`;

      for (const [key, value] of valueMap) value.textContent = `${Math.round(crop[key])}%`;

      if (!validCrop()) {
        metricMain.textContent = "Crop is too small";
        metricDetail.textContent = "Leave at least 8% of the image in both directions.";
        useCrop.disabled = true;
        return;
      }

      const geometry = cropGeometry(image, crop);
      metricMain.textContent = `${geometry.width} × ${geometry.height}px • ratio ${geometry.ratio.toFixed(2)}`;
      const lowResolution = geometry.width < 350 || geometry.height < 500;
      metricDetail.textContent = `${ratioLabel(geometry.ratio)}${lowResolution ? " • Low-resolution crop" : ""}`;
      useCrop.disabled = false;
    };

    for (const input of inputMap.values()) input.addEventListener("input", update);
    portraitPreset.addEventListener("click", () => {
      crop = centeredPortraitCrop(image.naturalWidth, image.naturalHeight);
      for (const [key, input] of inputMap) input.value = String(Math.round(crop[key]));
      update();
    });
    fullPhoto.addEventListener("click", () => {
      crop = { left: 0, right: 0, top: 0, bottom: 0 };
      for (const input of inputMap.values()) input.value = "0";
      update();
    });
    close.addEventListener("click", () => cleanup(null));
    cancel.addEventListener("click", () => cleanup(null));
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) cleanup(null); });
    useCrop.addEventListener("click", async () => {
      if (!validCrop()) return;
      useCrop.disabled = true;
      useCrop.textContent = "Preparing cover…";
      try {
        const prepared = await cropPhotoToFile(file, image, crop);
        cleanup(prepared);
      } catch {
        useCrop.disabled = false;
        useCrop.textContent = "✓ Crop & continue";
        metricDetail.textContent = "Could not prepare that crop. Try a slightly larger crop.";
      }
    });

    const mobile = window.matchMedia("(max-width: 760px)");
    if (mobile.matches) workspace.style.gridTemplateColumns = "1fr";
    update();
  });
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
      const picker = modal?.querySelector<HTMLElement>('.cover-picker[aria-label="Choose a cover"]');
      if (!modal || !picker) return;

      const existingHolder = modal.querySelector<HTMLElement>("[data-community-cover-upload]");
      if (existingHolder) {
        if (existingHolder.parentElement !== picker) {
          const heading = picker.querySelector(".cover-picker-heading");
          if (heading?.nextSibling) picker.insertBefore(existingHolder, heading.nextSibling);
          else picker.prepend(existingHolder);
        }
        return;
      }

      const holder = document.createElement("div");
      holder.setAttribute("data-community-cover-upload", "1");
      holder.style.display = "grid";
      holder.style.gridTemplateColumns = "minmax(0, 1fr) auto";
      holder.style.gap = "8px 10px";
      holder.style.alignItems = "center";
      holder.style.margin = "10px 0 12px";
      holder.style.padding = "10px";
      holder.style.border = "1px dashed rgba(78, 57, 43, 0.28)";
      holder.style.borderRadius = "12px";
      holder.style.background = "rgba(255, 255, 255, 0.28)";

      const copy = document.createElement("div");
      copy.style.display = "grid";
      copy.style.gap = "2px";

      const label = document.createElement("strong");
      label.textContent = "Don't see your cover?";
      label.style.fontSize = "0.95rem";

      const note = document.createElement("small");
      note.style.opacity = "0.72";
      note.style.lineHeight = "1.35";
      note.textContent = "Upload a special edition or missing cover. Crop it before saving; exact duplicate images are reused automatically.";
      copy.append(label, note);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary";
      button.textContent = "📷 Upload missing cover";
      button.title = "Add a cover photo that is missing from the cover databases";
      button.style.whiteSpace = "nowrap";
      button.style.minHeight = "40px";

      const status = document.createElement("small");
      status.setAttribute("role", "status");
      status.style.lineHeight = "1.35";
      status.style.minHeight = "1.2em";
      status.style.gridColumn = "1 / -1";

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.hidden = true;

      button.addEventListener("click", () => input.click());
      input.addEventListener("change", async () => {
        const originalFile = input.files?.[0];
        input.value = "";
        if (!originalFile) return;
        if (!/^image\/(?:jpeg|png|webp)$/i.test(originalFile.type)) {
          status.textContent = "Use a JPEG, PNG, or WebP cover photo.";
          return;
        }
        if (originalFile.size <= 0 || originalFile.size > MAX_IMAGE_BYTES) {
          status.textContent = "Cover photos must be 5 MB or smaller.";
          return;
        }

        button.disabled = true;
        button.textContent = "Preparing cover…";
        status.textContent = "Crop the photo so only the front cover is saved.";

        try {
          const file = await prepareCoverPhoto(originalFile);
          if (!file) {
            status.textContent = "Cover upload cancelled.";
            button.textContent = "📷 Upload missing cover";
            return;
          }
          if (file.size > MAX_IMAGE_BYTES) throw new Error("That cropped cover is still larger than 5 MB. Crop it tighter and try again.");

          button.textContent = "Uploading cover…";
          status.textContent = "Checking the shared library for duplicates first…";

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
            ? "That exact cropped image already existed, so we reused the stored copy."
            : "Cropped cover saved. It is available to you now and queued for community review.";
          button.textContent = "✓ Cover saved";

          window.setTimeout(() => window.location.reload(), 650);
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "Community cover upload failed.";
          button.textContent = "📷 Upload missing cover";
        } finally {
          if (document.contains(button) && button.textContent !== "✓ Cover saved") button.disabled = false;
        }
      });

      holder.append(copy, button, status, input);
      const heading = picker.querySelector(".cover-picker-heading");
      if (heading?.nextSibling) picker.insertBefore(holder, heading.nextSibling);
      else picker.prepend(holder);
    };

    mount();
    const observer = new MutationObserver(() => window.requestAnimationFrame(mount));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
