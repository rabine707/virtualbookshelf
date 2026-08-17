"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ROOM_PROPS = {
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
      <span className="botanical-scene-window">
        <Image
          src="/themes/botanical/v6/windowpng.png"
          alt=""
          fill
          priority
          sizes="(max-width: 760px) 250px, (max-width: 1240px) 355px, 470px"
        />
      </span>

      <span className="botanical-real-sconce-glow" />
      <img
        className="botanical-real-room-sconce"
        src={ROOM_PROPS.sconce}
        alt=""
        decoding="async"
      />

      <span className="botanical-scene-sofa">
        <Image
          src="/themes/botanical/v6/sofapng.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1240px) 430px, 540px"
        />
      </span>
    </div>,
    room,
  );
}
