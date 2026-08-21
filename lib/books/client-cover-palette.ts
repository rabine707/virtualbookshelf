import { spineColorFromPixels } from "./cover-palette";

type CoverPaletteResponse = {
  color?: string;
};

export const coverPaletteMemory = new Map<string, string | null>();
const pendingCoverPalettes = new Map<string, Promise<string | null>>();

export function coverPaletteRequestUrl(coverUrl: string) {
  return `/api/cover-palette?cover=${encodeURIComponent(coverUrl)}`;
}

function browserCoverSpineColor(coverUrl: string) {
  if (typeof Image === "undefined" || typeof document === "undefined") return Promise.resolve(null);

  return new Promise<string | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 32;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context || !image.naturalWidth || !image.naturalHeight) {
          resolve(null);
          return;
        }

        const targetRatio = canvas.width / canvas.height;
        const imageRatio = image.naturalWidth / image.naturalHeight;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = image.naturalWidth;
        let sourceHeight = image.naturalHeight;

        if (imageRatio > targetRatio) {
          sourceWidth = image.naturalHeight * targetRatio;
          sourceX = (image.naturalWidth - sourceWidth) / 2;
        } else {
          sourceHeight = image.naturalWidth / targetRatio;
          sourceY = (image.naturalHeight - sourceHeight) / 2;
        }

        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        resolve(spineColorFromPixels(pixels, 4));
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = coverUrl;
  });
}

export function loadCoverSpineColor(coverUrl: string) {
  if (coverPaletteMemory.has(coverUrl)) {
    return Promise.resolve(coverPaletteMemory.get(coverUrl) || null);
  }

  const pending = pendingCoverPalettes.get(coverUrl);
  if (pending) return pending;

  const request = browserCoverSpineColor(coverUrl)
    .then(async (browserColor) => {
      if (browserColor) return browserColor;
      const response = await fetch(coverPaletteRequestUrl(coverUrl), { cache: "force-cache" });
      if (!response.ok) return null;
      const payload = await response.json() as CoverPaletteResponse;
      return /^#[0-9a-f]{6}$/i.test(payload.color || "") ? payload.color! : null;
    })
    .catch(() => null)
    .then((color) => {
      coverPaletteMemory.set(coverUrl, color);
      pendingCoverPalettes.delete(coverUrl);
      return color;
    });

  pendingCoverPalettes.set(coverUrl, request);
  return request;
}
