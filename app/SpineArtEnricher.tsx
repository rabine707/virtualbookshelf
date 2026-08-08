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

function spineWidthFor(title: string) {
  // Keep the shelf recognizably book-like while allowing longer/heavier books
  // to feel a little thicker. The range is intentionally restrained.
  const words = title.split(/\s+/).filter(Boolean).length;
  return Math.max(54, Math.min(70, 54 + words * 2));
}

function buildSpine(button: HTMLButtonElement, sourceImage: HTMLImageElement) {
  const src = sourceImage.currentSrc || sourceImage.src;
  if (!src) return;

  const existing = button.querySelector<HTMLElement>(".generated-spine");
  if (existing?.dataset.source === src) return;
  existing?.remove();

  const { title, author } = splitBookIdentity(button);
  const spine = document.createElement("span");
  spine.className = "generated-spine";
  spine.dataset.source = src;
  spine.setAttribute("aria-hidden", "true");

  const art = document.createElement("img");
  art.className = "generated-spine-art";
  art.src = src;
  art.alt = "";
  art.decoding = "async";
  art.loading = "lazy";

  const wash = document.createElement("span");
  wash.className = "generated-spine-wash";

  const ornamentTop = document.createElement("span");
  ornamentTop.className = "generated-spine-ornament generated-spine-ornament-top";
  ornamentTop.textContent = "◆";

  const titleNode = document.createElement("span");
  titleNode.className = "generated-spine-title";
  titleNode.textContent = title;

  const authorNode = document.createElement("span");
  authorNode.className = "generated-spine-author";
  authorNode.textContent = author;

  const ornamentBottom = document.createElement("span");
  ornamentBottom.className = "generated-spine-ornament generated-spine-ornament-bottom";
  ornamentBottom.textContent = "◆";

  spine.append(art, wash, ornamentTop, titleNode, authorNode, ornamentBottom);
  button.appendChild(spine);
  button.dataset.generatedSpine = "1";
  button.style.setProperty("--generated-spine-width", `${spineWidthFor(title)}px`);
}

function wireBook(button: HTMLButtonElement) {
  const image = button.querySelector<HTMLImageElement>(".book-cover-art");
  if (!image) {
    button.querySelector(".generated-spine")?.remove();
    delete button.dataset.generatedSpine;
    button.style.removeProperty("--generated-spine-width");
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
