"use client";

import { useEffect } from "react";

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

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const option = target.closest<HTMLButtonElement>(".cover-option");
      if (!option || option.disabled) return;

      // page.tsx previews on a normal click and saves on double-click.
      // Mobile users should never need a double tap, so after React handles
      // the preview click, synthesize the existing confirmation event.
      window.setTimeout(() => {
        if (stopped || !document.body.contains(option)) return;
        option.dispatchEvent(new MouseEvent("dblclick", {
          bubbles: true,
          cancelable: true,
          view: window,
        }));
      }, 80);
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
