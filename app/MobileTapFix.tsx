"use client";

import { useEffect } from "react";

const TARGETS = [
  "button.close",
  "button.cover-option",
  "button[data-web-mode]",
  ".cover-column [aria-label='Cover feedback'] button",
].join(",");

export default function MobileTapFix() {
  useEffect(() => {
    let lastTouchAt = 0;

    function handleTouchEnd(event: TouchEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>(TARGETS);
      if (!button || button.disabled) return;

      const now = Date.now();
      if (now - lastTouchAt < 250) return;
      lastTouchAt = now;

      event.preventDefault();
      event.stopPropagation();
      button.click();
    }

    document.addEventListener("touchend", handleTouchEnd, { capture: true, passive: false });
    return () => document.removeEventListener("touchend", handleTouchEnd, true);
  }, []);

  return null;
}
