"use client";

import { useEffect } from "react";

function rowValue(details: Element, label: string) {
  const dt = [...details.querySelectorAll("dt")].find((node) => node.textContent?.trim().toLowerCase() === label.toLowerCase());
  return dt?.nextElementSibling?.textContent?.trim() || "";
}

function parseSeries(title: string) {
  const match = title.match(/\(([^\)]+),\s*#(\d+(?:\.\d+)?)\)\s*$/i) || title.match(/\(([^\)]+)\s+#(\d+(?:\.\d+)?)\)\s*$/i);
  if (!match) return null;
  return { name: match[1].trim(), number: match[2] };
}

export default function BookHubEnricher() {
  useEffect(() => {
    const enhance = () => {
      const modal = document.querySelector<HTMLElement>(".modal");
      const details = modal?.querySelector<HTMLElement>(".details");
      if (!modal || !details || modal.dataset.bookHub === "1") return;
      modal.dataset.bookHub = "1";
      modal.classList.add("book-hub-view");

      const title = details.querySelector("h2")?.textContent?.trim() || "Book";
      const author = (details.querySelector(".author")?.textContent || "").replace(/^by\s+/i, "").trim();
      const status = rowValue(details, "Goodreads shelf") || "Library";
      const year = rowValue(details, "Published") || "—";
      const isbn = rowValue(details, "ISBN") || "N/A";
      const series = parseSeries(title);

      const hero = document.createElement("section");
      hero.className = "book-hub-summary";
      hero.innerHTML = `<div class="book-hub-heading"><div><small>BOOK HUB</small><strong>${title.replace(/</g, "&lt;")}</strong><span>${author.replace(/</g, "&lt;")}</span></div><button type="button" class="book-hub-edit">✎ Edit</button></div><div class="book-hub-chips"><span><small>Status</small><b>${status.replace(/</g, "&lt;")}</b></span><span><small>Published</small><b>${year.replace(/</g, "&lt;")}</b></span><span><small>Series</small><b>${series ? `${series.name} #${series.number}` : "—"}</b></span></div><div class="book-hub-idline"><span>Edition identity</span><b>${isbn === "N/A" ? "Needs autofill" : isbn}</b></div>`;

      const eyebrow = details.querySelector(".eyebrow");
      if (eyebrow) details.insertBefore(hero, eyebrow);
      else details.prepend(hero);

      hero.querySelector<HTMLButtonElement>(".book-hub-edit")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const editing = modal.classList.toggle("book-hub-editing");
        button.textContent = editing ? "✓ Done" : "✎ Edit";
        if (editing) modal.querySelector<HTMLElement>('[aria-label="Cover feedback"]')?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    };

    enhance();
    const observer = new MutationObserver(() => requestAnimationFrame(enhance));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
