type ColorBucket = {
  blue: number;
  count: number;
  green: number;
  red: number;
  score: number;
};

type Hsl = {
  hue: number;
  lightness: number;
  saturation: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function rgbToHsl(red: number, green: number, blue: number): Hsl {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  const saturation = delta === 0 ? 0 : delta / Math.max(.001, 1 - Math.abs((2 * lightness) - 1));
  let hue = 0;

  if (delta !== 0) {
    if (maximum === r) hue = 60 * (((g - b) / delta) % 6);
    else if (maximum === g) hue = 60 * (((b - r) / delta) + 2);
    else hue = 60 * (((r - g) / delta) + 4);
  }

  if (hue < 0) hue += 360;
  return { hue, lightness, saturation };
}

function hslToRgb({ hue, lightness, saturation }: Hsl) {
  const chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment < 1) [red, green] = [chroma, secondary];
  else if (segment < 2) [red, green] = [secondary, chroma];
  else if (segment < 3) [green, blue] = [chroma, secondary];
  else if (segment < 4) [green, blue] = [secondary, chroma];
  else if (segment < 5) [red, blue] = [secondary, chroma];
  else [red, blue] = [chroma, secondary];

  const match = lightness - (chroma / 2);
  return {
    red: Math.round((red + match) * 255),
    green: Math.round((green + match) * 255),
    blue: Math.round((blue + match) * 255),
  };
}

function componentHex(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function clothColor(red: number, green: number, blue: number) {
  const hsl = rgbToHsl(red, green, blue);
  const adjusted = hslToRgb({
    hue: hsl.hue,
    saturation: hsl.saturation < .08 ? .06 : clamp(hsl.saturation * .84, .2, .58),
    lightness: clamp(.19 + (hsl.lightness * .34), .22, .42),
  });
  return `#${componentHex(adjusted.red)}${componentHex(adjusted.green)}${componentHex(adjusted.blue)}`;
}

export function spineColorFromPixels(pixels: Uint8Array | Uint8ClampedArray, channels: number) {
  if (channels < 3 || pixels.length < channels) return null;

  const buckets = new Map<string, ColorBucket>();
  let usablePixels = 0;

  for (let offset = 0; offset + 2 < pixels.length; offset += channels) {
    if (channels >= 4 && pixels[offset + 3] < 48) continue;

    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const hsl = rgbToHsl(red, green, blue);
    if (hsl.lightness < .025 || hsl.lightness > .96) continue;

    const key = `${red >> 5}-${green >> 5}-${blue >> 5}`;
    const bucket = buckets.get(key) || { red: 0, green: 0, blue: 0, count: 0, score: 0 };
    const highlightPenalty = hsl.lightness > .84 ? .42 : 1;
    const chromaWeight = 1 + (hsl.saturation * 1.65);
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    bucket.count += 1;
    bucket.score += highlightPenalty * chromaWeight;
    buckets.set(key, bucket);
    usablePixels += 1;
  }

  if (!buckets.size || !usablePixels) return null;

  const ranked = [...buckets.values()].sort((left, right) => right.score - left.score);
  let selected = ranked[0];
  const selectedHsl = rgbToHsl(
    selected.red / selected.count,
    selected.green / selected.count,
    selected.blue / selected.count,
  );

  if (selectedHsl.saturation < .12) {
    const chromatic = ranked.find((bucket) => {
      const hsl = rgbToHsl(
        bucket.red / bucket.count,
        bucket.green / bucket.count,
        bucket.blue / bucket.count,
      );
      return hsl.saturation >= .2
        && bucket.count >= usablePixels * .02
        && bucket.score >= selected.score * .22;
    });
    if (chromatic) selected = chromatic;
  }

  return clothColor(
    selected.red / selected.count,
    selected.green / selected.count,
    selected.blue / selected.count,
  );
}
