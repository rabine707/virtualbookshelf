"use client";

import { useEffect } from "react";
import {
  applySpineTypographyMode,
  generatedSpineUrl,
  getGeneratedSpine,
  getGeneratedSpineMode,
  shelfSpineDisplayAuthor,
  shelfSpineDisplayTitle,
  spineTitleScale,
  splitBookIdentity,
  storedSpineCrop,
  type SpineGeneratedEventDetail,
} from "../lib/spines/client";

function buildSpine(button: HTMLButtonElement, sourceImage: HTMLImageElement) {
  const src = sourceImage.currentSrc || sourceImage.src;
  if (!src) return;
  const existing = button.querySelector<HTMLElement>(".generated-spine");
  if (existing?.dataset.source === src) return;
  existing?.remove();

  const identity = splitBookIdentity(button.title || "");
  const title = shelfSpineDisplayTitle(identity.title);
  const author = shelfSpineDisplayAuthor(identity.author);
  const spine = document.createElement("span");
  spine.className = "generated-spine";
  spine.dataset.source = src;
  spine.dataset.titleScale = spineTitleScale(title);
  spine.dataset.typography = "overlay";
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

  getGeneratedSpine(src).then(async (saved) => {
    if (!saved || !art.isConnected) return;
    art.src = saved;
    art.classList.add("generated-spine-art-picked");
    art.classList.remove("generated-spine-art-fallback");
    button.dataset.spineCrop = storedSpineCrop(saved);
    applySpineTypographyMode(spine, await getGeneratedSpineMode(src));
  });

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
  // Geometry is shelf-controlled. The generated image is only the printed texture.
  // Match the regular shelf-book height instead of inheriting the source image ratio.
  button.style.setProperty("--generated-spine-width", "48px");
  button.style.setProperty("--generated-spine-height", "204px");
}

function wireBook(button: HTMLButtonElement) {
  const image = button.querySelector<HTMLImageElement>(".book-cover-art");
  if (!image) {
    button.querySelector(".generated-spine")?.remove();
    delete button.dataset.generatedSpine;
    delete button.dataset.spineCrop;
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

    const onGenerated = (event: Event) => {
      const detail = (event as CustomEvent<SpineGeneratedEventDetail>).detail;
      if (!detail) return;
      for (const button of document.querySelectorAll<HTMLButtonElement>("button.book")) {
        const cover = button.querySelector<HTMLImageElement>(".book-cover-art");
        const src = cover?.currentSrc || cover?.src;
        if (src !== detail.coverUrl) continue;
        const art = button.querySelector<HTMLImageElement>(".generated-spine-art-dedicated");
        const spine = button.querySelector<HTMLElement>(".generated-spine");
        if (art) {
          art.src = detail.image;
          art.classList.add("generated-spine-art-picked");
          art.classList.remove("generated-spine-art-fallback");
          button.dataset.spineCrop = detail.position || storedSpineCrop(detail.image);
        }
        if (spine) applySpineTypographyMode(spine, detail.renderMode || "overlay");
      }
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "class"] });
    window.addEventListener("shelf-spine-generated", onGenerated);
    scan();
    return () => {
      observer.disconnect();
      window.removeEventListener("shelf-spine-generated", onGenerated);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
