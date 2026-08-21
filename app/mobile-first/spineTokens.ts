import type { SpineShellId } from "./spineShellTextures";

export type SpineMaterialId =
  | "linen-fine"
  | "linen-coarse"
  | "smooth-cloth"
  | "vintage-cloth"
  | "worn-linen";

type FoilPalette = {
  dark: string;
  mid: string;
  light: string;
};

export type SpineTokens = {
  width: number;
  height: number;
  material: SpineMaterialId;
  shell: SpineShellId;
  foil: FoilPalette;
  wearOpacity: number;
  topRule: boolean;
  bottomRule: boolean;
};

const MATERIALS: Array<{ id: SpineMaterialId; shell: SpineShellId }> = [
  { id: "linen-fine", shell: "classic" },
  { id: "linen-coarse", shell: "rough" },
  { id: "smooth-cloth", shell: "classic" },
  { id: "vintage-cloth", shell: "vintage" },
  { id: "worn-linen", shell: "rough" },
];

const FOILS: FoilPalette[] = [
  { dark: "#9a6d25", mid: "#dfbc69", light: "#fff0b0" },
  { dark: "#7f7062", mid: "#d4c8b7", light: "#fff8e9" },
  { dark: "#874b2d", mid: "#d89565", light: "#ffd2a5" },
  { dark: "#8e7440", mid: "#e8cf8a", light: "#fff3bf" },
];

export function stableSpineNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function spineTokensFor(id: string, title: string, author: string): SpineTokens {
  const seed = `${id}|${title}|${author}`;
  const material = MATERIALS[stableSpineNumber(`${seed}|material`) % MATERIALS.length];
  const wearBucket = stableSpineNumber(`${seed}|wear`) % 100;

  return {
    width: 54 + (stableSpineNumber(`${seed}|width`) % 5),
    height: 158 + (stableSpineNumber(`${seed}|height`) % 8),
    material: material.id,
    shell: material.shell,
    foil: FOILS[stableSpineNumber(`${seed}|foil`) % FOILS.length],
    wearOpacity: Math.round((.12 + (wearBucket / 100) * .5) * 100) / 100,
    topRule: stableSpineNumber(`${seed}|top-rule`) % 100 < 36,
    bottomRule: stableSpineNumber(`${seed}|bottom-rule`) % 100 < 41,
  };
}
