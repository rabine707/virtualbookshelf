"use client";

import { useEffect } from "react";

function splitBookIdentity(button: HTMLButtonElement) {
  const raw = button.title || "";
  const splitAt = raw.lastIndexOf(" — ");
  if (splitAt < 0) return { title: raw, author: "" };
  return {
    title: raw.slice(0, splitAt).trim(),
    author: raw.slice(splitAt + 3).trim(),
  };
}

function spineDisplayTitle(title: string) {
  let cleaned = title.trim();
  cleaned = cleaned.replace(/\s*[\(\[][^\)\]]*(?:book|volume|vol\.?|series|#)\s*[^\)\]]*[\)\]]\s*$/i, "").trim();

  if (cleaned.length > 28) {
    const primary = cleaned.split(/\s+(?:—|–|-|:)\s+|:\s+/)[0]?.trim();
    if (primary && primary.length >= 5) cleaned = primary;
  }

  if (cleaned.length > 34) cleaned = `${cleaned.slice(0, 31).trim()}…`;
  return cleaned || title.trim();
}

function spineDisplayAuthor(author: string) {
  const cleaned = author
    .replace(/\s*\([^\)]*\)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= 22) return cleaned;
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length > 2) return `${parts[0]} ${parts[parts.length - 1]}`;
  return `${cleaned.slice(0, 20).trim()}…`;
}

function titleScale(title: string) {
  if (title.length > 27) return "compact";
  if (title.length > 18) return "medium";
  return "normal";
}

function generatedSpineUrl(coverUrl: string) {
  return `/api/spine?v=2&cover=${encodeURIComponent(coverUrl)}`;
}

function buildSpine(button: HTMLButtonElement, sourceImage: HTMLImageElement) {
  const src = sourceImage.currentSrc || sourceImage.src;
  if (!src) return;

  const existing = button.querySelector<HTMLElement>(".generated-spine");
  if (existing?.dataset.source === src) return;
  existing?.remove();

  const identity = splitBookIdentity(button);
  const title = spineDisplayTitle(identity.title);
  const author = spineDisplayAuthor(identity.author);
  const spine = document.createElement("span");
  spine.className = "generated-spine";
  spine.dataset.source = src;
  spine.dataset.titleScale = titleScale(title);
  spine.setAttribute("aria-hidden", "true");

  const art = document.createElement("img");
  art.className = "generated-spine-art generated-spine-art-dedicated";
  art.src = generatedSpineUrl(src);
  art.alt = "";
  art.decoding = "async";
  art.loading = "lazy";
  art.addEventListener("error", () => {
    art.src = src;
    art.classList.add("generated-spine-art-fallback");
  }, { once: true });

  const wash = document.createElement("span");
  wash.className = "generated-spine-wash";

  const textLane = document.createElement("span");
  textLane.className = "generated-spine-text-lane";

  const topRule = document.createElement("span");
  topRule.className = "generated-spine-rule generated-spine-rule-top";

  const titleNode = document.createElement("span");
  titleNode.className = "generated-spine-title";
  titleNode.textContent = title;

  const authorNode = document.createElement("span");
  authorNode.className = "generated-spine-author";
  authorNode.textContent = author;

  const bottomRule = document.createElement("span");
  bottomRule.className = "generated-spine-rule generated-spine-rule-bottom";

  spine.append(art, wash, textLane, topRule, titleNode, authorNode, bottomRule);
  button.appendChild(spine);
  button.dataset.generatedSpine = "1";
  button.style.setProperty("--generated-spine-width", "48px");
  button.style.setProperty("--generated-spine-height", "204px");
}

function wireBook(button: HTMLButtonElement) {
  const image = button.querySelector<HTMLImageElement>(".book-cover-art");
  if (!image) {
    button.querySelector(".generated-spine")?.remove();
    delete button.dataset.generatedSpine;
    button.style.removeProperty("--generated-spine-width");
    button.style.removeProperty("--generated-spine-height");
    return;
  }

  const refresh = () => buildSpine(button, image);
  if (image.dataset.spineArtWired !== "1") {
    image.dataset.spineArtWired = "1";
    image.addEventListener("load", refresh);
    image.addEventListener("error", refresh);
  }
  refresh();
}

export default function SpineArtEnricher() {
  useEffect(() => {
    let raf = 0;

    const scan = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        for (const button of document.querySelectorAll<HTMLButtonElement>("button.book")) wireBook(button);
      });
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "class"],
    });

    scan();
    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
