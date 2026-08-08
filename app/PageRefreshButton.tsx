"use client";

import { useEffect } from "react";

export default function PageRefreshButton() {
  useEffect(() => {
    const mount = () => {
      const toolbar = document.querySelector<HTMLElement>(".toolbar");
      if (!toolbar || toolbar.querySelector(".page-refresh-button")) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "page-refresh-button";
      button.setAttribute("aria-label", "Refresh bookshelf");
      button.title = "Refresh bookshelf";
      button.innerHTML = '<span class="page-refresh-icon" aria-hidden="true">↻</span><span class="page-refresh-label">Refresh</span>';
      button.addEventListener("click", () => window.location.reload());

      const count = toolbar.querySelector(".count-pill");
      toolbar.insertBefore(button, count || null);
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
