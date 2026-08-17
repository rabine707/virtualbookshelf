"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ROOM_PROPS = {
  sconce: "https://cdn.polyhaven.com/asset_img/thumbs/industrial_wall_sconce.png?format=png",
  frame: "https://cdn.polyhaven.com/asset_img/thumbs/fancy_picture_frame_02.png?format=png",
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
      <span className="botanical-scene-window" style={{ aspectRatio: "4 / 5" }}>
        <Image
          src="/themes/botanical/v6/windowpng.png"
          alt=""
          fill
          priority
          sizes="(max-width: 760px) 280px, (max-width: 1240px) 390px, 560px"
          style={{ objectFit: "contain", objectPosition: "left top" }}
        />
      </span>

      <span className="botanical-scene-vine botanical-scene-vine-left" style={{ aspectRatio: "2 / 5" }}>
        <Image
          src="/themes/botanical/v3/hanging-vine-right.webp"
          alt=""
          fill
          priority
          sizes="180px"
          style={{ objectFit: "contain", objectPosition: "top right" }}
        />
      </span>

      <span className="botanical-scene-vine botanical-scene-vine-right" style={{ aspectRatio: "2 / 5" }}>
        <Image
          src="/themes/botanical/v3/hanging-vine-right.webp"
          alt=""
          fill
          priority
          sizes="180px"
          style={{ objectFit: "contain", objectPosition: "top right" }}
        />
      </span>

      <span className="botanical-scene-planter" style={{ aspectRatio: "1 / 1" }}>
        <Image
          src="/themes/botanical/v3/ceramic-pothos-planter.webp"
          alt=""
          fill
          priority
          sizes="150px"
          style={{ objectFit: "contain", objectPosition: "center bottom" }}
        />
      </span>

      <div className="botanical-scene-art">
        <span className="botanical-scene-art-paper">
          <i className="botanical-art-stem botanical-art-stem-a" />
          <i className="botanical-art-stem botanical-art-stem-b" />
          <i className="botanical-art-mushroom botanical-art-mushroom-a" />
          <i className="botanical-art-mushroom botanical-art-mushroom-b" />
          <i className="botanical-art-leaf botanical-art-leaf-a" />
          <i className="botanical-art-leaf botanical-art-leaf-b" />
        </span>
        <img className="botanical-scene-art-frame" src={ROOM_PROPS.frame} alt="" decoding="async" />
      </div>

      <div className="botanical-scene-antique-books">
        <span />
        <span />
        <span />
      </div>

      <div className="botanical-scene-candle" aria-hidden="true">
        <span className="botanical-scene-candle-glow" />
        <span className="botanical-scene-candle-flame" />
        <span className="botanical-scene-candle-wick" />
        <span className="botanical-scene-candle-wax" />
        <span className="botanical-scene-candle-holder" />
      </div>

      <span className="botanical-real-sconce-glow" />
      <img
        className="botanical-real-room-sconce"
        src={ROOM_PROPS.sconce}
        alt=""
        decoding="async"
      />

      <span className="botanical-scene-sofa" style={{ aspectRatio: "3 / 2" }}>
        <Image
          src="/themes/botanical/v6/sofapng.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1240px) 470px, 650px"
          style={{ objectFit: "contain", objectPosition: "left bottom" }}
        />
      </span>
    </div>,
    room,
  );
}
