"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ROOM_PROPS = {
  plant: "https://cdn.polyhaven.com/asset_img/thumbs/potted_plant_02.png?format=png",
  frame: "https://cdn.polyhaven.com/asset_img/thumbs/fancy_picture_frame_02.png?format=png",
  sconce: "https://cdn.polyhaven.com/asset_img/thumbs/industrial_wall_sconce.png?format=png",
  chair: "/themes/botanical/v6/sofapng.png",
  windowScene: "/themes/botanical/v6/windowpng.png",
  floor: "/themes/botanical/v6/floor-perspective.webp",
  sideWall: "/themes/botanical/v6/side-wall.webp",
} as const;

function isBotanical() {
  return document.documentElement.dataset.shelfTheme === "botanical";
}

export default function BotanicalAssetEnricher() {
  const [scene, setScene] = useState<Element | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setActive(isBotanical());
        setScene(document.querySelector("main.shelf-page"));
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

  if (!active || !scene) return null;

  return createPortal(
    <>
      <img className="botanical-floor-extension" src={ROOM_PROPS.floor} alt="" decoding="async" />
      <div className="botanical-real-room-props" aria-hidden="true">
        <img className="botanical-window-scene" src={ROOM_PROPS.windowScene} alt="" decoding="async" />
        <img className="botanical-real-room-plant" src={ROOM_PROPS.plant} alt="" decoding="async" />
        <img className="botanical-real-room-frame" src={ROOM_PROPS.frame} alt="" decoding="async" />
        <img className="botanical-real-room-sconce" src={ROOM_PROPS.sconce} alt="" decoding="async" />
        <img className="botanical-reading-chair" src={ROOM_PROPS.chair} alt="" decoding="async" />
        <img className="botanical-right-side-wall" src={ROOM_PROPS.sideWall} alt="" decoding="async" />
      </div>
    </>,
    scene,
  );
}
