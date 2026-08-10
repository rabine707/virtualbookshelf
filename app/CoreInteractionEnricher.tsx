"use client";

import { useEffect } from "react";

function updateModalAndCoverHints() {
  const modal = document.querySelector<HTMLElement>(".modal");
  if (modal) {
    modal.dataset.bookHub = "1";
    modal.classList.add("book-hub-view", "book-hub-editing");
    modal.querySelector(".book-hub-summary")?.remove();
  }

  for (const option of document.querySelectorAll<HTMLButtonElement>(".cover-option")) {
    const source = option.querySelector("span")?.textContent?.trim() || "this source";
    option.title = `Use this ${source} cover on the shelf`;
    option.setAttribute("aria-label", `Use this ${source} cover on the shelf`);
  }
}

export default function CoreInteractionEnricher() {
  useEffect(() => {
    let stopped = false;
    let frame = 0;

    const scheduleSync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateModalAndCoverHints();
      });
    };

    const closeModalAfterSave = (button: HTMLButtonElement, delay = 90) => {
      window.setTimeout(() => {
        if (stopped) return;
        const modal = button.closest(".modal");
        modal?.querySelector<HTMLButtonElement>("button.close")?.click();
      }, delay);
    };

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>("button");
      if (!button || button.disabled) return;

      if (button.classList.contains("cover-option")) {
        // page.tsx still uses the existing double-click handler to commit a cover.
        // Convert a normal click into that confirmation so desktop and mobile
        // both stay single-action, then return to the shelf after it saves.
        window.setTimeout(() => {
          if (stopped || !document.body.contains(button)) return;
          button.dispatchEvent(new MouseEvent("dblclick", {
            bubbles: true,
            cancelable: true,
            view: window,
          }));
          closeModalAfterSave(button);
        }, 80);
        return;
      }

      if (/correct cover/i.test(button.textContent || "")) {
        closeModalAfterSave(button, 75);
      }
    }

    const observer = new MutationObserver(scheduleSync);
    document.addEventListener("click", handleClick, false);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    scheduleSync();

    return () => {
      stopped = true;
      document.removeEventListener("click", handleClick, false);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
