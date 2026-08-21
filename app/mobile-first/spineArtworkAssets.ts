import type { SpineArtworkId } from "./spineTemplates";

const ART_ROOT = "/themes/botanical/v8/spine-art";

export const SPINE_ARTWORK_IMAGES: Partial<Record<SpineArtworkId, string>> = {
  "moon-forest": `${ART_ROOT}/mountain-pines-v1.webp`,
  "leafy-sprig": `${ART_ROOT}/wildflowers-v1.webp`,
  "botanical-key": `${ART_ROOT}/wildflowers-v1.webp`,
  "rose-bloom": `${ART_ROOT}/wildflowers-v1.webp`,
  wildflowers: `${ART_ROOT}/wildflowers-v1.webp`,
  "crossed-axes": `${ART_ROOT}/crossed-axes-v1.webp`,
  "serpent-rose": `${ART_ROOT}/serpent-rose-v1.webp`,
  "thorn-heart": `${ART_ROOT}/thorn-heart-v1.webp`,
  "mountain-pines": `${ART_ROOT}/mountain-pines-v1.webp`,
  "frost-mountain": `${ART_ROOT}/mountain-pines-v1.webp`,
  "heart-vine": `${ART_ROOT}/thorn-heart-v1.webp`,
  "playing-cards": `${ART_ROOT}/playing-cards-v1.webp`,
  "hockey-heart": `${ART_ROOT}/hockey-heart-v1.webp`,
  "crossed-sticks": `${ART_ROOT}/hockey-heart-v1.webp`,
  "fox-moon": `${ART_ROOT}/fox-moon-v1.webp`,
  "sealed-letter": `${ART_ROOT}/sealed-letter-v1.webp`,
  "candle-key": `${ART_ROOT}/sealed-letter-v1.webp`,
  "wedding-rings": `${ART_ROOT}/wedding-rings-v1.webp`,
  "moth-bloom": `${ART_ROOT}/moth-bloom-v1.webp`,
};

export function spineArtworkImage(artwork: SpineArtworkId | null) {
  return artwork ? SPINE_ARTWORK_IMAGES[artwork] : undefined;
}
