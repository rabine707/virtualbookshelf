"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function isBotanical() {
  return document.documentElement.dataset.shelfTheme === "botanical";
}

/**
 * Botanical V7 uses one coherent room plate instead of independently layered
 * window, sofa, vine, frame and lamp props. The room is a real DOM image so it
 * cannot be lost behind competing pseudo-elements or legacy background rules.
 */
export default function BotanicalAssetEnricher() {
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setHost(isBotanical() ? document.querySelector("main.shelf-page") : null);
      });
    };

    sync();

    const rootObserver = new MutationObserver(sync);
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-shelf-theme"],
    });

    const bodyObserver = new MutationObserver(sync);
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      rootObserver.disconnect();
      bodyObserver.disconnect();
    };
  }, []);

  if (!host) return null;

  return createPortal(
    <img
      className="botanical-v7-room-plate"
      src="/themes/botanical/v7/room.webp"
      alt=""
      aria-hidden="true"
      decoding="async"
      fetchPriority="high"
    />,
    host,
  );
}
