"use client";

import { useEffect } from "react";

const FRIENDLY_ERROR = "AI spine generation is temporarily unavailable. Please try again later or use a cover crop.";

function shouldSanitize(text: string) {
  return /(?:GPT Image 2:|Klein:|Gemini:|insufficient balance|available balance|\bpollen\b|quota exceeded|RESOURCE_EXHAUSTED|generativelanguage\.googleapis\.com|ai\.google\.dev\/gemini-api\/docs\/rate-limits|ai\.dev\/rate-limit)/i.test(text);
}

function sanitizeStatus(element: HTMLElement) {
  const text = element.textContent?.trim() || "";
  if (text && shouldSanitize(text) && text !== FRIENDLY_ERROR) {
    element.textContent = FRIENDLY_ERROR;
  }
}

function scan() {
  for (const element of document.querySelectorAll<HTMLElement>(
    ".generate-spine-status, .spine-crop-editor-status",
  )) {
    sanitizeStatus(element);
  }
}

export default function SpineErrorSanitizer() {
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        scan();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    schedule();

    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
