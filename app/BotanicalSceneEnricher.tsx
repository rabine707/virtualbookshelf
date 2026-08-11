"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ASSET_ROOT = "/themes/botanical/v3";

type PropSpec = {
  side: "left" | "right";
};

// Sparse, deterministic composition. The user's books stay visually dominant.
const PROP_PLAN: Array<PropSpec | null> = [
  null,
  { side: "left" },
  null,
  null,
  null,
  null,
  null,
  { side: "right" },
  null,
  null,
  null,
  null,
];

function botanicalActive() {
  return document.documentElement.dataset.shelfTheme === "botanical";
}

function clearRow(row: HTMLElement) {
  row.classList.remove("botanical-prop-left", "botanical-prop-right");
  row.querySelector<HTMLElement>(".botanical-row-prop")?.remove();
}

function syncRowProps(active: boolean) {
  const rows = [...document.querySelectorAll<HTMLElement>(".shelf-row")];

  rows.forEach((row, index) => {
    // Botanical v3 owns its own composition. Remove the older generic theme art.
    row.querySelectorAll<HTMLElement>(".asset-decor-set.asset-theme-botanical").forEach((node) => node.remove());

    if (!active) {
      clearRow(row);
      return;
    }

    const spec = PROP_PLAN[index % PROP_PLAN.length];
    if (!spec) {
      clearRow(row);
      return;
    }

    row.classList.toggle("botanical-prop-left", spec.side === "left");
    row.classList.toggle("botanical-prop-right", spec.side === "right");

    const existing = row.querySelector<HTMLElement>(".botanical-row-prop");
    if (existing?.dataset.side === spec.side) return;
    existing?.remove();

    const wrapper = document.createElement("div");
    wrapper.className = `botanical-row-prop botanical-row-prop-${spec.side}`;
    wrapper.dataset.side = spec.side;
    wrapper.setAttribute("aria-hidden", "true");

    const image = document.createElement("img");
    image.src = `${ASSET_ROOT}/ceramic-pothos-planter.webp`;
    image.alt = "";
    image.loading = index < 2 ? "eager" : "lazy";
    image.decoding = "async";
    wrapper.appendChild(image);
    row.appendChild(wrapper);
  });
}

export default function BotanicalSceneEnricher() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let raf = 0;
    const sync = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const nextActive = botanicalActive();
        setActive(nextActive);
        syncRowProps(nextActive);
      });
    };

    sync();
    const htmlObserver = new MutationObserver(sync);
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-shelf-theme"] });

    const bodyObserver = new MutationObserver(sync);
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      htmlObserver.disconnect();
      bodyObserver.disconnect();
      if (raf) cancelAnimationFrame(raf);
      document.querySelectorAll<HTMLElement>(".shelf-row").forEach(clearRow);
    };
  }, []);

  if (!active) return null;

  return (
    <>
      {createPortal(
        <div className="botanical-v3-room" aria-hidden="true">
          <img className="botanical-room-window" src={`${ASSET_ROOT}/window-left.webp`} alt="" draggable={false} />
        </div>,
        document.body,
      )}
      {createPortal(
        <div className="botanical-v3-foreground" aria-hidden="true">
          <img className="botanical-room-vine-right" src={`${ASSET_ROOT}/hanging-vine-right.webp`} alt="" draggable={false} />
        </div>,
        document.body,
      )}
    </>
  );
}
