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

  const payload = parts.join("");
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return URL.createObjectURL(new Blob([bytes], { type: "image/webp" }));
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
    let roomObjectUrl: string | null = null;

    const clearRoom = () => {
      if (roomObjectUrl) {
        URL.revokeObjectURL(roomObjectUrl);
        roomObjectUrl = null;
      }
      root.style.removeProperty("--botanical-v7-room");
      delete root.dataset.botanicalV7Ready;
    };

    const sync = () => {
      if (!isBotanical()) {
        clearRoom();
        return;
      }

      if (root.dataset.botanicalV7Ready === "true" || root.dataset.botanicalV7Ready === "loading") return;

      controller?.abort();
      controller = new AbortController();
      root.dataset.botanicalV7Ready = "loading";

      loadRoomPlate(controller.signal)
        .then((objectUrl) => {
          if (controller?.signal.aborted) {
            URL.revokeObjectURL(objectUrl);
            return;
          }

          if (roomObjectUrl) URL.revokeObjectURL(roomObjectUrl);
          roomObjectUrl = objectUrl;
          root.style.setProperty("--botanical-v7-room", `url(${objectUrl})`);
          root.dataset.botanicalV7Ready = "true";
        })
        .catch((error) => {
          if (controller?.signal.aborted) return;
          clearRoom();
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
      clearRoom();
    };
  }, []);

  return null;
}
