"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ASSET_ROOT = "/themes/botanical/v3";

type DecorKind = "plant" | "lamp" | "frame" | "candle-stack";
type DecorSide = "left" | "right";
type RowDecorSpec = {
  left?: DecorKind;
  right?: DecorKind;
};

// Keep the collection dominant while making the cabinet feel inhabited.
const ROW_DECOR_PLAN: RowDecorSpec[] = [
  { left: "plant", right: "lamp" },
  { left: "candle-stack", right: "frame" },
  {},
  { right: "plant" },
  {},
  { left: "frame" },
  {},
  { left: "plant" },
  {},
  {},
  { right: "candle-stack" },
  {},
];

function botanicalActive() {
  return document.documentElement.dataset.shelfTheme === "botanical";
}

function clearRow(row: HTMLElement) {
  row.classList.remove(
    "botanical-decor-left",
    "botanical-decor-right",
    "botanical-decor-both",
  );
  row.querySelectorAll<HTMLElement>(".botanical-row-decor").forEach((node) => node.remove());
}

function buildDecor(kind: DecorKind, side: DecorSide, eager: boolean) {
  const wrapper = document.createElement("div");
  wrapper.className = `botanical-row-decor botanical-row-decor-${side} botanical-row-decor-${kind}`;
  wrapper.dataset.kind = kind;
  wrapper.dataset.side = side;
  wrapper.setAttribute("aria-hidden", "true");

  if (kind === "plant") {
    const image = document.createElement("img");
    image.src = `${ASSET_ROOT}/ceramic-pothos-planter.webp`;
    image.alt = "";
    image.loading = eager ? "eager" : "lazy";
    image.decoding = "async";
    wrapper.appendChild(image);
    return wrapper;
  }

  if (kind === "lamp") {
    wrapper.innerHTML = `
      <span class="botanical-lamp-glow"></span>
      <span class="botanical-lamp-shade"><i></i></span>
      <span class="botanical-lamp-stem"></span>
      <span class="botanical-lamp-base"></span>
    `;
    return wrapper;
  }

  if (kind === "frame") {
    wrapper.innerHTML = `
      <span class="botanical-mini-frame">
        <i class="botanical-mini-frame-sky"></i>
        <i class="botanical-mini-frame-hill"></i>
      </span>
    `;
    return wrapper;
  }

  wrapper.innerHTML = `
    <span class="botanical-stack-book botanical-stack-book-one"></span>
    <span class="botanical-stack-book botanical-stack-book-two"></span>
    <span class="botanical-stack-book botanical-stack-book-three"></span>
    <span class="botanical-stack-candle"><i></i></span>
  `;
  return wrapper;
}

function syncRowDecor(active: boolean) {
  const rows = [...document.querySelectorAll<HTMLElement>(".shelf-row")];

  rows.forEach((row, index) => {
    // Botanical v4 owns the scene composition. Remove older generic theme art.
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
          <div className="botanical-room-wall-wash" />
          <div className="botanical-room-window-light" />
          <img className="botanical-room-window" src={`${ASSET_ROOT}/window-left.webp`} alt="" draggable={false} />
          <img className="botanical-room-vine-left" src={`${ASSET_ROOT}/hanging-vine-right.webp`} alt="" draggable={false} />
          <img className="botanical-room-vine-canopy" src={`${ASSET_ROOT}/hanging-vine-right.webp`} alt="" draggable={false} />
          <div className="botanical-room-frame" role="presentation">
            <span className="botanical-room-frame-paper">
              <i className="botanical-room-frame-stem botanical-room-frame-stem-one" />
              <i className="botanical-room-frame-stem botanical-room-frame-stem-two" />
              <i className="botanical-room-frame-cap botanical-room-frame-cap-one" />
              <i className="botanical-room-frame-cap botanical-room-frame-cap-two" />
            </span>
          </div>
          <div className="botanical-room-grain" />
        </div>,
        document.body,
      )}
      {createPortal(
        <div className="botanical-v3-foreground" aria-hidden="true">
          <img className="botanical-room-vine-right" src={`${ASSET_ROOT}/hanging-vine-right.webp`} alt="" draggable={false} />
        </div>,
        document.body,
      )}
    </>
  );
}
