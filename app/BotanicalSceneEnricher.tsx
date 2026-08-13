"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function botanicalActive() {
  return document.documentElement.dataset.shelfTheme === "botanical";
}

async function loadBase64Asset(path: string, mime: string) {
  const response = await fetch(path, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  const payload = (await response.text()).trim();
  return `url("data:${mime};base64,${payload}")`;
}

export default function BotanicalSceneEnricher() {
  const [active, setActive] = useState(false);
  const [cinematicReady, setCinematicReady] = useState(false);

  useEffect(() => {
    const sync = () => setActive(botanicalActive());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-shelf-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    Promise.all([
      loadBase64Asset("/themes/botanical/v4/header-plate.b64", "image/webp"),
      loadBase64Asset("/themes/botanical/v4/shelf-back.b64", "image/webp"),
    ])
      .then(([headerPlate, shelfBack]) => {
        if (cancelled) return;
        const root = document.documentElement;
        root.style.setProperty("--botanical-v4-header", headerPlate);
        root.style.setProperty("--botanical-v4-shelf-back", shelfBack);
        root.dataset.botanicalV4Ready = "true";
        setCinematicReady(true);
      })
      .catch((error) => {
        console.warn("Botanical cinematic assets failed to load", error);
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  if (!active) return null;

  return (
    <>
      {createPortal(
        <div
          className={`botanical-v3-room botanical-asset-room botanical-v4-room${cinematicReady ? " botanical-v4-room-ready" : ""}`}
          aria-hidden="true"
        >
          <div className="botanical-v4-cinematic-plate" />
          <div className="botanical-room-window-light" />
          <div className="botanical-room-window-rays" />
          <div className="botanical-room-grain" />
          <div className="botanical-room-vignette" />
        </div>,
        document.body,
      )}
      {createPortal(
        <div className="botanical-v3-foreground botanical-asset-foreground botanical-v4-foreground" aria-hidden="true" />,
        document.body,
      )}
    </>
  );
}
