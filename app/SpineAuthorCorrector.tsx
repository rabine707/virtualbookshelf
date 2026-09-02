"use client";

import { useEffect } from "react";

function cleanAuthor(author: string) {
  return author.replace(/\s*\([^\)]*\)\s*$/g, "").replace(/\s+/g, " ").trim();
}

function authorFromBookButton(button: HTMLButtonElement) {
  const raw = button.title || "";
  const splitAt = raw.lastIndexOf(" — ");
  if (splitAt < 0) return "";
  return cleanAuthor(raw.slice(splitAt + 3));
}

function ensureShelfCorrection(button: HTMLButtonElement) {
  const spine = button.querySelector<HTMLElement>('.generated-spine[data-typography="integrated"]');
  if (!spine) return;
  const author = authorFromBookButton(button);
  if (!author) return;

  let correction = spine.querySelector<HTMLElement>(".generated-spine-author-correction");
  if (!correction) {
    correction = document.createElement("span");
    correction.className = "generated-spine-author-correction";
    correction.setAttribute("aria-hidden", "true");
    spine.appendChild(correction);
  }
  if (correction.textContent !== author) correction.textContent = author;
}

function scan() {
  for (const button of document.querySelectorAll<HTMLButtonElement>("button.book")) ensureShelfCorrection(button);
}

export default function SpineAuthorCorrector() {
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        scan();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "data-typography"],
    });
    window.addEventListener("shelf-spine-generated", schedule);
    window.addEventListener("shelf-spine-gallery-changed", schedule);
    schedule();

    return () => {
      observer.disconnect();
      window.removeEventListener("shelf-spine-generated", schedule);
      window.removeEventListener("shelf-spine-gallery-changed", schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
