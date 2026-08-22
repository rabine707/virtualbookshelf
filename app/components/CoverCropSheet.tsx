"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";
import {
  CoverCrop,
  readCoverCrop,
  stripCoverCrop,
  withCoverCrop,
} from "../../lib/books/cover-crop";

type CoverCropSheetProps = {
  imageUrl: string;
  title: string;
  onCancel: () => void;
  onConfirm: (url: string) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CoverCropSheet({ imageUrl, title, onCancel, onConfirm }: CoverCropSheetProps) {
  const initial = useMemo(() => readCoverCrop(imageUrl) || { zoom: 1, x: 0, y: 0 }, [imageUrl]);
  const [crop, setCrop] = useState<CoverCrop>(initial);
  const drag = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: crop.x,
      startY: crop.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - current.x) / Math.max(bounds.width, 1)) * 100;
    const dy = ((event.clientY - current.y) / Math.max(bounds.height, 1)) * 100;
    setCrop((value) => ({
      ...value,
      x: clamp(current.startX + dx, -45, 45),
      y: clamp(current.startY + dy, -45, 45),
    }));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2600,
        display: "grid",
        placeItems: "end center",
        background: "rgba(9,7,6,.68)",
        backdropFilter: "blur(8px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Crop cover for ${title}`}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(100%, 520px)",
          borderRadius: "24px 24px 0 0",
          padding: "18px 18px calc(18px + env(safe-area-inset-bottom))",
          background: "#18120f",
          color: "#f5eadc",
          border: "1px solid rgba(255,255,255,.09)",
          boxShadow: "0 -24px 80px rgba(0,0,0,.46)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".16em", opacity: .58, fontWeight: 800 }}>CROP COVER</div>
            <strong style={{ display: "block", marginTop: 5, fontSize: 18 }}>{title}</strong>
            <span style={{ display: "block", marginTop: 3, fontSize: 12, opacity: .62 }}>Drag the image to position it, then use the zoom slider.</span>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close crop" style={{ border: 0, background: "transparent", color: "inherit", fontSize: 28, lineHeight: 1 }}>×</button>
        </div>

        <div
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            position: "relative",
            width: "min(72vw, 290px)",
            aspectRatio: "2 / 3",
            margin: "0 auto",
            overflow: "hidden",
            borderRadius: 10,
            background: "#0b0908",
            boxShadow: "0 16px 42px rgba(0,0,0,.42)",
            touchAction: "none",
            cursor: "grab",
          }}
        >
          <img
            src={stripCoverCrop(imageUrl)}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transformOrigin: "center center",
              transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})`,
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, border: "1px solid rgba(255,255,255,.5)", boxShadow: "inset 0 0 0 999px rgba(0,0,0,.04)" }} />
        </div>

        <label style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, marginTop: 16, fontSize: 12 }}>
          <span style={{ opacity: .6 }}>Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={crop.zoom}
            onChange={(event) => setCrop((value) => ({ ...value, zoom: Number(event.target.value) }))}
          />
          <span style={{ width: 38, textAlign: "right", opacity: .72 }}>{crop.zoom.toFixed(1)}×</span>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => { setCrop({ zoom: 1, x: 0, y: 0 }); }}
            style={{ minHeight: 46, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "inherit", fontWeight: 750 }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onConfirm(withCoverCrop(imageUrl, crop))}
            style={{ minHeight: 46, borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "#b58b60", color: "#17110d", fontWeight: 850 }}
          >
            Use this crop
          </button>
        </div>

        <button
          type="button"
          onClick={() => onConfirm(stripCoverCrop(imageUrl))}
          style={{ width: "100%", marginTop: 9, minHeight: 40, border: 0, background: "transparent", color: "#d7c6b2", fontWeight: 700 }}
        >
          Use image as-is
        </button>
      </section>
    </div>
  );
}
