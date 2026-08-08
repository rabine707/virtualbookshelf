"use client";

import { useEffect } from "react";

const INTERACTIVE_TARGETS = [
  "button",
  "a[href]",
  "[role='button']",
  "summary",
  "label[for]",
].join(",");

const MAX_TAP_MOVEMENT = 12;

type TouchStart = {
  identifier: number;
  x: number;
  y: number;
  moved: boolean;
};

export default function MobileTapFix() {
  useEffect(() => {
    let start: TouchStart | null = null;

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) {
        start = null;
        return;
      }

      const touch = event.touches[0];
      start = {
        identifier: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        moved: false,
      };
    }

    function handleTouchMove(event: TouchEvent) {
      if (!start || start.moved) return;
      const touch = Array.from(event.touches).find((item) => item.identifier === start?.identifier);
      if (!touch) return;

      const distance = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
      if (distance > MAX_TAP_MOVEMENT) start.moved = true;
    }

    function handleTouchEnd(event: TouchEvent) {
      const gesture = start;
      start = null;
      if (!gesture || gesture.moved) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const interactive = target.closest<HTMLElement>(INTERACTIVE_TARGETS);
      if (!interactive) return;

      if (
        interactive instanceof HTMLButtonElement
        && interactive.disabled
      ) return;

      if (interactive.getAttribute("aria-disabled") === "true") return;

      // Mobile Safari can treat the first tap as hover for controls that have
      // desktop hover states. Convert a clean touch into the click immediately
      // and suppress the browser's delayed/second-tap click.
      event.preventDefault();
      event.stopPropagation();
      interactive.click();
    }

    document.addEventListener("touchstart", handleTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", handleTouchMove, { capture: true, passive: true });
    document.addEventListener("touchend", handleTouchEnd, { capture: true, passive: false });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart, true);
      document.removeEventListener("touchmove", handleTouchMove, true);
      document.removeEventListener("touchend", handleTouchEnd, true);
    };
  }, []);

  return null;
}
