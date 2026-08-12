"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ASSET_ROOT = "/themes/botanical/v3";

type DecorKind =
  | "plant-bottles"
  | "lamp-frame"
  | "candle-stack"
  | "plant-frame"
  | "bottles"
  | "small-plant";
type DecorSide = "left" | "right";
type RowDecorSpec = { left?: DecorKind; right?: DecorKind };

// The first shelves carry the strongest atmosphere. Lower shelves progressively
// quiet down so a large library still feels like a collection, not a prop wall.
const ROW_DECOR_PLAN: RowDecorSpec[] = [
  { left: "plant-bottles", right: "lamp-frame" },
  { left: "candle-stack", right: "plant-frame" },
  { left: "small-plant" },
  { right: "bottles" },
  {},
  { left: "plant-frame" },
  {},
  { right: "small-plant" },
  {},
  {},
  { left: "candle-stack" },
  {},
];

function botanicalActive() {
  return document.documentElement.dataset.shelfTheme === "botanical";
}

function clearRow(row: HTMLElement) {
  row.classList.remove("botanical-decor-left", "botanical-decor-right", "botanical-decor-both");
  row.querySelectorAll<HTMLElement>(".botanical-row-decor").forEach((node) => node.remove());
}

function plantImage(className: string, eager: boolean) {
  return `<img class="${className}" src="${ASSET_ROOT}/ceramic-pothos-planter.webp" alt="" loading="${eager ? "eager" : "lazy"}" decoding="async" />`;
}

function bottlesMarkup() {
  return `
    <span class="botanical-apothecary botanical-apothecary-wide"><i></i></span>
    <span class="botanical-apothecary botanical-apothecary-tall"><i></i></span>
  `;
}

function frameMarkup() {
  return `
    <span class="botanical-mini-frame">
      <i class="botanical-mini-frame-sky"></i>
      <i class="botanical-mini-frame-hill botanical-mini-frame-hill-back"></i>
      <i class="botanical-mini-frame-hill botanical-mini-frame-hill-front"></i>
    </span>
  `;
}

function lampMarkup() {
  return `
    <span class="botanical-lamp-aura"></span>
    <span class="botanical-lamp-glass">
      <i class="botanical-lamp-bulb"></i>
      <i class="botanical-lamp-highlight"></i>
    </span>
    <span class="botanical-lamp-cap"></span>
    <span class="botanical-lamp-stem"></span>
    <span class="botanical-lamp-foot"></span>
  `;
}

function candleStackMarkup() {
  return `
    <span class="botanical-stack-book botanical-stack-book-one"></span>
    <span class="botanical-stack-book botanical-stack-book-two"></span>
    <span class="botanical-stack-book botanical-stack-book-three"></span>
    <span class="botanical-stack-candle"><i></i><b></b></span>
  `;
}

function buildDecor(kind: DecorKind, side: DecorSide, eager: boolean) {
  const wrapper = document.createElement("div");
  wrapper.className = `botanical-row-decor botanical-row-decor-${side} botanical-row-decor-${kind}`;
  wrapper.dataset.kind = kind;
  wrapper.dataset.side = side;
  wrapper.setAttribute("aria-hidden", "true");

  switch (kind) {
    case "plant-bottles":
      wrapper.innerHTML = `${plantImage("botanical-decor-plant botanical-decor-plant-large", eager)}<span class="botanical-bottle-group">${bottlesMarkup()}</span>`;
      break;
    case "lamp-frame":
      wrapper.innerHTML = `${lampMarkup()}<span class="botanical-frame-companion">${frameMarkup()}</span>`;
      break;
    case "candle-stack":
      wrapper.innerHTML = candleStackMarkup();
      break;
    case "plant-frame":
      wrapper.innerHTML = `${plantImage("botanical-decor-plant botanical-decor-plant-medium", eager)}<span class="botanical-frame-companion botanical-frame-companion-low">${frameMarkup()}</span>`;
      break;
    case "bottles":
      wrapper.innerHTML = `<span class="botanical-bottle-group botanical-bottle-group-solo">${bottlesMarkup()}</span>`;
      break;
    case "small-plant":
      wrapper.innerHTML = plantImage("botanical-decor-plant botanical-decor-plant-small", eager);
      break;
  }

  return wrapper;
}

function syncRowDecor(active: boolean) {
  const rows = [...document.querySelectorAll<HTMLElement>(".shelf-row")];

  rows.forEach((row, index) => {
    row.querySelectorAll<HTMLElement>(".asset-decor-set.asset-theme-botanical").forEach((node) => node.remove());

    if (!active) {
      clearRow(row);
      return;
    }

    const spec = ROW_DECOR_PLAN[index % ROW_DECOR_PLAN.length];
    const desired = new Map<DecorSide, DecorKind>();
    if (spec.left) desired.set("left", spec.left);
    if (spec.right) desired.set("right", spec.right);

    row.classList.toggle("botanical-decor-left", Boolean(spec.left));
    row.classList.toggle("botanical-decor-right", Boolean(spec.right));
    row.classList.toggle("botanical-decor-both", Boolean(spec.left && spec.right));

    (["left", "right"] as DecorSide[]).forEach((side) => {
      const wantedKind = desired.get(side);
      const existing = row.querySelector<HTMLElement>(`.botanical-row-decor-${side}`);

      if (!wantedKind) {
        existing?.remove();
        return;
      }

      if (existing?.dataset.kind === wantedKind) return;
      existing?.remove();
      row.appendChild(buildDecor(wantedKind, side, index < 2));
    });
  });
}

export default function BotanicalSceneEnricher() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let raf = 0;
    const sync = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const nextActive = botanicalActive();
        setActive(nextActive);
        syncRowDecor(nextActive);
      });
    };

    sync();
    const htmlObserver = new MutationObserver(sync);
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-shelf-theme"] });

    const bodyObserver = new MutationObserver(sync);
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      htmlObserver.disconnect();
      bodyObserver.disconnect();
      if (raf) cancelAnimationFrame(raf);
      document.querySelectorAll<HTMLElement>(".shelf-row").forEach(clearRow);
    };
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
          <img className="botanical-room-vine-upper" src={`${ASSET_ROOT}/hanging-vine-right.webp`} alt="" draggable={false} />
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
