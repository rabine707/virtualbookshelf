"use client";

import { useEffect } from "react";

const ROOM_PLATE_PARTS = [
  "/themes/botanical/v7/room-plate-01.b64",
  "/themes/botanical/v7/room-plate-02.b64",
  "/themes/botanical/v7/room-plate-03-04.b64",
  "/themes/botanical/v7/room-plate-05-06.b64",
  "/themes/botanical/v7/room-plate-07-08.b64",
  "/themes/botanical/v7/room-plate-09-10.b64",
] as const;

function isBotanical() {
  return document.documentElement.dataset.shelfTheme === "botanical";
}

async function loadRoomPlate(signal: AbortSignal) {
  const parts = await Promise.all(
    ROOM_PLATE_PARTS.map(async (path) => {
      const response = await fetch(path, { cache: "force-cache", signal });
      if (!response.ok) throw new Error(`Unable to load ${path}`);
      return (await response.text()).trim();
    }),
  );

  return parts.join("");
}

/**
 * Botanical V7 uses one coherent room plate instead of independently layered
 * window, sofa, vine, frame and lamp props. The real UI and bookshelf remain
 * live DOM above the scene; this component only supplies the photographic room.
 */
export default function BotanicalAssetEnricher() {
  useEffect(() => {
    const root = document.documentElement;
    let controller: AbortController | null = null;

    const sync = () => {
      if (!isBotanical()) return;
      if (root.dataset.botanicalV7Ready === "true" || root.dataset.botanicalV7Ready === "loading") return;

      controller?.abort();
      controller = new AbortController();
      root.dataset.botanicalV7Ready = "loading";

      loadRoomPlate(controller.signal)
        .then((payload) => {
          if (controller?.signal.aborted) return;
          root.style.setProperty(
            "--botanical-v7-room",
            `url("data:image/webp;base64,${payload}")`,
          );
          root.dataset.botanicalV7Ready = "true";
        })
        .catch((error) => {
          if (controller?.signal.aborted) return;
          delete root.dataset.botanicalV7Ready;
          console.warn("Botanical V7 room plate failed to load", error);
        });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-shelf-theme"],
    });

    return () => {
      controller?.abort();
      observer.disconnect();
    };
  }, []);

  return null;
}
