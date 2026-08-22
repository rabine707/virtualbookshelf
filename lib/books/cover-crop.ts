import type { CSSProperties } from "react";

export type CoverCrop = {
  zoom: number;
  x: number;
  y: number;
};

const CROP_MARKER = "#sof-crop=";

export function stripCoverCrop(url: string) {
  const markerIndex = url.indexOf(CROP_MARKER);
  return markerIndex >= 0 ? url.slice(0, markerIndex) : url;
}

export function readCoverCrop(url?: string | null): CoverCrop | null {
  if (!url) return null;
  const markerIndex = url.indexOf(CROP_MARKER);
  if (markerIndex < 0) return null;

  const raw = url.slice(markerIndex + CROP_MARKER.length).split("&", 1)[0];
  const [zoomRaw, xRaw, yRaw] = raw.split(",");
  const zoom = Number(zoomRaw);
  const x = Number(xRaw);
  const y = Number(yRaw);
  if (![zoom, x, y].every(Number.isFinite)) return null;

  return {
    zoom: Math.min(3, Math.max(1, zoom)),
    x: Math.min(45, Math.max(-45, x)),
    y: Math.min(45, Math.max(-45, y)),
  };
}

export function withCoverCrop(url: string, crop: CoverCrop | null) {
  const base = stripCoverCrop(url);
  if (!crop || (Math.abs(crop.zoom - 1) < 0.01 && Math.abs(crop.x) < 0.5 && Math.abs(crop.y) < 0.5)) {
    return base;
  }
  const zoom = crop.zoom.toFixed(3);
  const x = crop.x.toFixed(2);
  const y = crop.y.toFixed(2);
  return `${base}${CROP_MARKER}${zoom},${x},${y}`;
}

export function coverCropImageStyle(url?: string | null): CSSProperties | undefined {
  const crop = readCoverCrop(url);
  if (!crop) return undefined;
  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transformOrigin: "center center",
    transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})`,
  };
}
