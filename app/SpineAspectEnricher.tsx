"use client";

import { useEffect } from "react";

const BOOK_HEIGHT = 204;
const MIN_WIDTH = 54;
const MAX_WIDTH = 204;

function fitImage(image: HTMLImageElement) {
  const book = image.closest<HTMLElement>("button.book");
  if (!book || !image.naturalWidth || !image.naturalHeight) return;

  const ratio = image.naturalWidth / image.naturalHeight;
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, BOOK_HEIGHT * ratio));

  book.style.setProperty("--image-book-width", `${width.toFixed(1)}px`);
  book.style.setProperty("--image-book-height", `${BOOK_HEIGHT}px`);
  book.style.setProperty("--image-aspect-ratio", `${image.naturalWidth} / ${image.naturalHeight}`);
  book.dataset.imageAspect = "1";
}

function wireImage(image: HTMLImageElement) {
  if (image.dataset.aspectWired === "1") {
    if (image.complete) fitImage(image);
    return;
  }

  image.dataset.aspectWired = "1";
  image.addEventListener("load", () => fitImage(image));
  if (image.complete) fitImage(image);
}

export default function SpineAspectEnricher() {
  useEffect(() => {
    const scan = (root: ParentNode = document) => {
      for (const image of root.querySelectorAll<HTMLImageElement>(".book-cover-art")) wireImage(image);
    };

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(".book-cover-art")) wireImage(node as HTMLImageElement);
          scan(node);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => observer.disconnect();
  }, []);

  return null;
}
