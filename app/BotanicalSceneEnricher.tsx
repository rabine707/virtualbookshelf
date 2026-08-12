"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ASSET_ROOT = "/themes/botanical/v3";

function botanicalActive() {
  return document.documentElement.dataset.shelfTheme === "botanical";
}

export default function BotanicalSceneEnricher() {
  const [active, setActive] = useState(false);

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

  if (!active) return null;

  return (
    <>
      {createPortal(
        <div className="botanical-v3-room botanical-asset-room" aria-hidden="true">
          <div className="botanical-room-wall" />
          <img
            className="botanical-room-window-asset"
            src={`${ASSET_ROOT}/window-left.webp`}
            alt=""
            draggable={false}
            decoding="async"
          />
          <div className="botanical-room-window-light" />
          <div className="botanical-room-window-rays" />
          <img
            className="botanical-room-vine-window"
            src={`${ASSET_ROOT}/hanging-vine-right.webp`}
            alt=""
            draggable={false}
            decoding="async"
          />
          <img
            className="botanical-room-vine-corner"
            src={`${ASSET_ROOT}/hanging-vine-right.webp`}
            alt=""
            draggable={false}
            decoding="async"
          />
          <div className="botanical-room-grain" />
          <div className="botanical-room-vignette" />
        </div>,
        document.body,
      )}
      {createPortal(
        <div className="botanical-v3-foreground botanical-asset-foreground" aria-hidden="true">
          <img
            className="botanical-room-vine-edge-left"
            src={`${ASSET_ROOT}/hanging-vine-right.webp`}
            alt=""
            draggable={false}
            decoding="async"
          />
          <img
            className="botanical-room-vine-edge-right"
            src={`${ASSET_ROOT}/hanging-vine-right.webp`}
            alt=""
            draggable={false}
            decoding="async"
          />
        </div>,
        document.body,
      )}
    </>
  );
}
