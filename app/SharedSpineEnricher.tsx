"use client";

import { useEffect } from "react";
import {
  applySpineTypographyMode,
  hasLocalSpine,
  splitBookIdentity,
  type SpineGeneratedEventDetail,
  type SpineRenderMode,
} from "../lib/spines/client";
import { loadSharedSpineCatalog, publishSharedSpine, titleAuthorKey } from "./shared-spines";

function setTypographyMode(button: HTMLButtonElement, renderMode: SpineRenderMode) {
  const spine = button.querySelector<HTMLElement>(".generated-spine");
  if (!spine) return;
  applySpineTypographyMode(spine, renderMode);
}

function modalDetail(label: string) {
  const modal = document.querySelector<HTMLElement>(".modal");
  if (!modal) return "";
  for (const dt of modal.querySelectorAll<HTMLElement>("dt")) {
    if (dt.textContent?.trim().toLowerCase() !== label.toLowerCase()) continue;
    const dd = dt.nextElementSibling;
    return dd?.textContent?.trim() || "";
  }
  return "";
}

function selectedBookIdentity() {
  const modal = document.querySelector<HTMLElement>(".modal");
  if (!modal) return null;
  const title = modal.querySelector<HTMLElement>(".details h2")?.textContent?.trim() || "";
  const author = (modal.querySelector<HTMLElement>(".details .author")?.textContent || "").replace(/^by\s+/i, "").trim();
  if (!title) return null;
  const isbnValue = modalDetail("ISBN");
  const asinValue = modalDetail("Audible ASIN");
  return {
    title,
    author,
    isbn: isbnValue && isbnValue !== "N/A" ? isbnValue : undefined,
    asin: asinValue || undefined,
  };
}

async function applySharedSpines() {
  const catalog = await loadSharedSpineCatalog();
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("button.book")];

  await Promise.all(buttons.map(async (button) => {
    const cover = button.querySelector<HTMLImageElement>(".book-cover-art");
    const art = button.querySelector<HTMLImageElement>(".generated-spine-art-dedicated");
    const coverUrl = cover?.currentSrc || cover?.src || "";
    if (!coverUrl || !art || !art.isConnected) return;
    if (await hasLocalSpine(coverUrl)) return;

    const identity = splitBookIdentity(button.title || "");
    const shared = catalog.byCover.get(coverUrl) || catalog.byTitleAuthor.get(titleAuthorKey(identity.title, identity.author));
    if (!shared || !art.isConnected) return;

    art.src = shared.url;
    art.classList.add("generated-spine-art-picked", "generated-spine-art-community");
    art.classList.remove("generated-spine-art-fallback");
    button.dataset.spineCrop = shared.position || (shared.renderMode === "integrated" ? "custom" : "community");
    button.dataset.communitySpine = "1";
    setTypographyMode(button, shared.renderMode);
  }));
}

export default function SharedSpineEnricher() {
  useEffect(() => {
    let timer = 0;
    const scheduleApply = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void applySharedSpines(), 120);
    };

    const onGenerated = (event: Event) => {
      const detail = (event as CustomEvent<SpineGeneratedEventDetail>).detail;
      if (!detail?.coverUrl || !detail.image) return;
      if (detail.shared) {
        scheduleApply();
        return;
      }
      const identity = selectedBookIdentity();
      if (!identity) return;

      const provider = detail.position
        ? "cover-crop"
        : detail.renderMode === "integrated"
          ? "AI-integrated"
          : "AI";

      void publishSharedSpine(
        identity,
        detail.image,
        detail.coverUrl,
        provider,
        detail.position || undefined,
      ).then((result) => {
        if (!result.shared) return;
        window.dispatchEvent(new CustomEvent("shelf-community-spine-published", {
          detail: { ...detail, sharedUrl: result.url },
        }));
      }).catch(() => {
        // Local save already succeeded. Shared publishing can be retried later.
      });
    };

    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "class"] });
    window.addEventListener("shelf-spine-generated", onGenerated);
    window.addEventListener("shelf-auth-changed", scheduleApply);
    window.addEventListener("shelf-community-spine-published", scheduleApply);
    scheduleApply();

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("shelf-spine-generated", onGenerated);
      window.removeEventListener("shelf-auth-changed", scheduleApply);
      window.removeEventListener("shelf-community-spine-published", scheduleApply);
    };
  }, []);

  return null;
}
