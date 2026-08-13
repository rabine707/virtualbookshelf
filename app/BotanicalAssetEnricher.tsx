"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ROOM_PROPS = {
  plant: "https://cdn.polyhaven.com/asset_img/thumbs/potted_plant_02.png?format=png",
  frame: "https://cdn.polyhaven.com/asset_img/thumbs/fancy_picture_frame_02.png?format=png",
  sconce: "https://cdn.polyhaven.com/asset_img/thumbs/industrial_wall_sconce.png?format=png",
} as const;

function isBotanical() {
  return document.documentElement.dataset.shelfTheme === "botanical";
}

export default function BotanicalAssetEnricher() {
  const [room, setRoom] = useState<Element | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setActive(isBotanical());
        setRoom(document.querySelector(".cinematic-room"));
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-shelf-theme"],
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  if (!active || !room) return null;

  return createPortal(
    <div className="botanical-real-room-props" aria-hidden="true">
      <div className="botanical-real-window">
        <span className="botanical-real-window-glass" />
        <span className="botanical-real-window-lace" />
        <span className="botanical-real-window-mullion botanical-real-window-mullion-v" />
        <span className="botanical-real-window-mullion botanical-real-window-mullion-h" />
      </div>
      <img className="botanical-real-room-plant" src={ROOM_PROPS.plant} alt="" decoding="async" />
      <img className="botanical-real-room-frame" src={ROOM_PROPS.frame} alt="" decoding="async" />
      <span className="botanical-real-sconce-glow" />
      <img className="botanical-real-room-sconce" src={ROOM_PROPS.sconce} alt="" decoding="async" />
    </div>,
    room,
  );
}
