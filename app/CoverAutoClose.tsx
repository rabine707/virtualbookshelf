"use client";

import { useEffect } from "react";

export default function CoverAutoClose() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("button");
      if (!button || !button.textContent?.includes("Correct cover")) return;

      const modal = button.closest(".modal");
      if (!modal) return;

      // Let the existing React handler save the chosen cover first, then close
      // the book details modal and return the user to the shelf.
      window.setTimeout(() => {
        const closeButton = modal.querySelector<HTMLButtonElement>("button.close");
        closeButton?.click();
      }, 75);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
