"use client";

import { useEffect } from "react";

function absoluteUrl(value?: string | null) {
  if (!value) return "";
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
}

function findCorrectCoverButton(modal: Element) {
  return [...modal.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => /correct cover|applied to shelf/i.test(button.textContent?.trim() || "")) || null;
}

function updatePickerHints(root: ParentNode = document) {
  for (const option of root.querySelectorAll<HTMLButtonElement>(".cover-option")) {
    const source = option.querySelector("span")?.textContent?.trim() || "this source";
    option.title = `Use this ${source} cover on the shelf`;
    option.setAttribute("aria-label", `Use this ${source} cover on the shelf`);
  }
}

export default function CoverSelectionEnricher() {
  useEffect(() => {
    let stopped = false;

    function applySelectedOption(option: HTMLButtonElement, modal: Element, targetUrl: string, attempt = 0) {
      if (stopped || !document.body.contains(option) || !document.body.contains(modal)) return;

      const activeUrl = absoluteUrl(modal.querySelector<HTMLImageElement>(".cover-image")?.src);
      if (activeUrl === targetUrl) {
        const correctButton = findCorrectCoverButton(modal);
        if (!correctButton || correctButton.disabled) return;

        correctButton.click();
        const original = correctButton.textContent || "✓ Correct cover";
        correctButton.textContent = "✓ Applied to shelf";
        window.setTimeout(() => {
          if (document.body.contains(correctButton)) correctButton.textContent = original;
        }, 1800);
        return;
      }

      if (attempt >= 8) return;
      window.requestAnimationFrame(() => applySelectedOption(option, modal, targetUrl, attempt + 1));
    }

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const option = target.closest<HTMLButtonElement>(".cover-option");
      if (!option) return;

      const modal = option.closest(".modal");
      const targetImage = option.querySelector<HTMLImageElement>("img");
      if (!modal || !targetImage?.src) return;

      const targetUrl = absoluteUrl(targetImage.src);
      window.requestAnimationFrame(() => applySelectedOption(option, modal, targetUrl));
    }

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(".cover-option")) updatePickerHints(node.parentNode || document);
          else if (node.querySelector(".cover-option")) updatePickerHints(node);
        }
      }
    });

    document.addEventListener("click", handleClick, false);
    observer.observe(document.body, { childList: true, subtree: true });
    updatePickerHints();

    return () => {
      stopped = true;
      document.removeEventListener("click", handleClick, false);
      observer.disconnect();
    };
  }, []);

  return null;
}
