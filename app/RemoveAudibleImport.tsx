"use client";

import { useEffect } from "react";

export default function RemoveAudibleImport() {
  useEffect(() => {
    const removeAudibleImport = () => {
      for (const button of document.querySelectorAll<HTMLButtonElement>("button")) {
        if (button.textContent?.trim() === "Import Audible CSV") button.remove();
      }
    };

    removeAudibleImport();
    const observer = new MutationObserver(removeAudibleImport);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
