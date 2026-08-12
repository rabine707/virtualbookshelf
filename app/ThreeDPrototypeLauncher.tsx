"use client";

import { useEffect } from "react";

export default function ThreeDPrototypeLauncher() {
  useEffect(() => {
    let frame = 0;

    const mount = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const bookcase = document.querySelector<HTMLElement>(".bookcase");
        if (!bookcase || document.querySelector(".bookshelf-3d-launch-row")) return;

        const row = document.createElement("div");
        row.className = "bookshelf-3d-launch-row";

        const link = document.createElement("a");
        link.href = "/3d-prototype";
        link.className = "bookshelf-3d-launch";
        link.textContent = "Try the 3D shelf prototype";
        link.setAttribute("aria-label", "Open the experimental 3D bookshelf prototype");

        row.appendChild(link);
        bookcase.parentElement?.insertBefore(row, bookcase);
      });
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      document.querySelector(".bookshelf-3d-launch-row")?.remove();
    };
  }, []);

  return null;
}
