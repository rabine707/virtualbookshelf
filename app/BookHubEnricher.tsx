"use client";

import { useEffect } from "react";

export default function BookHubEnricher() {
  useEffect(() => {
    const openDirectlyInEditMode = () => {
      const modal = document.querySelector<HTMLElement>(".modal");
      if (!modal) return;

      modal.dataset.bookHub = "1";
      modal.classList.add("book-hub-view", "book-hub-editing");
      modal.querySelector(".book-hub-summary")?.remove();
    };

    openDirectlyInEditMode();
    const observer = new MutationObserver(() => requestAnimationFrame(openDirectlyInEditMode));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
