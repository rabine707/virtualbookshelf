"use client";

import { useEffect } from "react";

function pickerSearchButton(picker: Element) {
  return [...picker.querySelectorAll<HTMLButtonElement>(":scope > button.primary")]
    .find((button) => /search more covers|searching more editions|more editions searched|no more covers found/i.test(button.textContent || "")) || null;
}

function refreshPicker(picker: HTMLElement) {
  const heading = picker.querySelector<HTMLElement>(".cover-picker-heading strong");
  const count = picker.querySelector<HTMLElement>(".cover-picker-heading span");
  const searchButton = pickerSearchButton(picker);
  const zeroMatches = /^\s*0\s+matches?\s*$/i.test(count?.textContent || "");

  if (!zeroMatches) {
    if (heading && heading.dataset.emptyCoverLabel === "1") {
      heading.textContent = "Choose your cover";
      delete heading.dataset.emptyCoverLabel;
    }
    if (count) count.style.display = "";
    if (searchButton) searchButton.style.display = "";
    return;
  }

  if (heading) {
    heading.textContent = "No database covers found";
    heading.dataset.emptyCoverLabel = "1";
  }
  if (count) count.style.display = "none";

  if (!searchButton) return;

  // Keep the deeper LibraryThing/Romance.io lookup, but run it automatically
  // instead of asking the user to press a redundant empty-state button.
  if (!picker.dataset.zeroCoverSearchStarted && !searchButton.disabled) {
    picker.dataset.zeroCoverSearchStarted = "1";
    searchButton.click();
  }

  searchButton.style.display = "none";
}

export default function CoverSearchCleanup() {
  useEffect(() => {
    let raf = 0;

    const scan = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        for (const picker of document.querySelectorAll<HTMLElement>(".cover-picker")) {
          refreshPicker(picker);
        }
      });
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
    scan();

    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
