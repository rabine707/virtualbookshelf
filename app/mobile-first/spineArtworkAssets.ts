import type { SpineArtworkId } from "./spineTemplates";

const ART_ROOT = "/themes/botanical/v8/spine-art";

export const SPINE_ARTWORK_IMAGES: Partial<Record<SpineArtworkId, string>> = {
  "gothic-castle": `${ART_ROOT}/gothic-castle-v1.png`,
  "skull-botanicals": `${ART_ROOT}/skull-botanicals-v1.png?v=2`,
  "ornate-key": `${ART_ROOT}/ornate-key-v1.png?v=2`,
  "moth-moon": `${ART_ROOT}/moth-moon-v1.png`,
  "heart-dagger": `${ART_ROOT}/heart-dagger-v1.png`,
  "raven-moon": `${ART_ROOT}/raven-moon-v1.png`,
  "letter-roses": `${ART_ROOT}/letter-roses-v1.png`,
  "hockey-heritage": `${ART_ROOT}/hockey-heritage-v1.png`,
  "western-wildflowers": `${ART_ROOT}/western-wildflowers-v1.png`,
  "coastal-sun": `${ART_ROOT}/coastal-sun-v1.png`,
  "broken-heart-roses": `${ART_ROOT}/broken-heart-roses-v1.png`,
  "travel-postcards": `${ART_ROOT}/travel-postcards-v1.png`,
  "apartment-window": `${ART_ROOT}/apartment-window-v1.png`,
  "mistletoe-bells": `${ART_ROOT}/mistletoe-bells-v1.png`,
  "medical-herbarium": `${ART_ROOT}/medical-herbarium-v1.png`,
  "wine-vines": `${ART_ROOT}/wine-vines-v1.png`,
  "lace-mask": `${ART_ROOT}/lace-mask-v1.png`,
  wildflowers: `${ART_ROOT}/wildflowers-v2.png`,
  "crossed-axes": `${ART_ROOT}/crossed-axes-v2.png`,
  "serpent-rose": `${ART_ROOT}/serpent-rose-v2.png`,
  "thorn-heart": `${ART_ROOT}/thorn-heart-v2.png`,
  "mountain-pines": `${ART_ROOT}/mountain-pines-v2.png`,
  "playing-cards": `${ART_ROOT}/playing-cards-v2.png`,
  "hockey-heart": `${ART_ROOT}/hockey-heart-v2.png`,
  "fox-moon": `${ART_ROOT}/fox-moon-v2.png`,
  "sealed-letter": `${ART_ROOT}/sealed-letter-v2.png`,
  "wedding-rings": `${ART_ROOT}/wedding-rings-v2.png`,
  "moth-bloom": `${ART_ROOT}/moth-bloom-v2.png`,
};

export function spineArtworkImage(artwork: SpineArtworkId | null) {
  return artwork ? SPINE_ARTWORK_IMAGES[artwork] : undefined;
}
