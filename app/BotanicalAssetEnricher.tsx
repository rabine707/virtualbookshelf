"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function isBotanical() {
  return document.documentElement.dataset.shelfTheme === "botanical";
}

/**
 * Botanical V7 keeps the photographic room outside the app layout as a fixed
 * viewport layer. The shelf and controls remain normal interactive DOM above it.
 */
export default function BotanicalAssetEnricher() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setActive(isBotanical()));
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-shelf-theme"],
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  if (!active || typeof document === "undefined") return null;

  return createPortal(
    <div className="botanical-v7-room-layer" aria-hidden="true">
      <img
        className="botanical-v7-room-plate"
        src="/themes/botanical/v7/room.webp"
        alt=""
        decoding="async"
        fetchPriority="high"
      />
    </div>,
    document.body,
  );
}
