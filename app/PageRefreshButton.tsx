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

      // Keep refresh attached to the bookshelf controls rather than letting it
      // become a stranded item in the toolbar grid on narrow mobile screens.
      const count = toolbar.querySelector<HTMLElement>(".count-pill");
      if (count) {
        let actions = toolbar.querySelector<HTMLElement>(".toolbar-actions");
        if (!actions) {
          actions = document.createElement("div");
          actions.className = "toolbar-actions";
          toolbar.insertBefore(actions, count);
          actions.append(button, count);
        } else {
          actions.insertBefore(button, actions.firstChild);
        }
      } else {
        toolbar.appendChild(button);
      }
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
