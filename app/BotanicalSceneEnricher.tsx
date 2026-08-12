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
        <div className="botanical-v3-room" aria-hidden="true">
          <div className="botanical-room-wall" />
          <div className="botanical-room-window-light" />
          <div className="botanical-room-window-architecture">
            <div className="botanical-room-window-view" />
            <span className="botanical-room-window-mullion botanical-room-window-mullion-v" />
            <span className="botanical-room-window-mullion botanical-room-window-mullion-h botanical-room-window-mullion-h-one" />
            <span className="botanical-room-window-mullion botanical-room-window-mullion-h botanical-room-window-mullion-h-two" />
          </div>
          <img className="botanical-room-vine-window" src={`${ASSET_ROOT}/hanging-vine-right.webp`} alt="" draggable={false} />
          <img className="botanical-room-vine-corner" src={`${ASSET_ROOT}/hanging-vine-right.webp`} alt="" draggable={false} />
          <div className="botanical-room-frame" role="presentation">
            <span className="botanical-room-frame-paper">
              <i className="botanical-room-frame-fern botanical-room-frame-fern-one" />
              <i className="botanical-room-frame-fern botanical-room-frame-fern-two" />
              <i className="botanical-room-frame-fern botanical-room-frame-fern-three" />
            </span>
          </div>
          <div className="botanical-room-grain" />
          <div className="botanical-room-vignette" />
        </div>,
        document.body,
      )}
      {createPortal(
        <div className="botanical-v3-foreground" aria-hidden="true">
          <img className="botanical-room-vine-edge-left" src={`${ASSET_ROOT}/hanging-vine-right.webp`} alt="" draggable={false} />
          <img className="botanical-room-vine-edge-right" src={`${ASSET_ROOT}/hanging-vine-right.webp`} alt="" draggable={false} />
        </div>,
        document.body,
      )}
    </>
  );
}
