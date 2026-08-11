const SPINE_WIDTH = 300;
const SPINE_HEIGHT = 1200;
const MAX_COVER_BYTES = 8 * 1024 * 1024;

type SpinePosition = "left" | "center" | "right";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function allowedCoverUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function mimeFromHeader(contentType: string | null) {
  const type = (contentType || "").split(";")[0].trim().toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  if (type === "image/png") return "image/png";
  if (type === "image/webp") return "image/webp";
  if (type === "image/gif") return "image/gif";
  return null;
}

function spinePosition(value: string | null): SpinePosition {
  if (value === "left" || value === "right") return value;
  return "center";
}

function preserveAspectRatio(position: SpinePosition) {
  if (position === "left") return "xMinYMid slice";
  if (position === "right") return "xMaxYMid slice";
  return "xMidYMid slice";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cover = searchParams.get("cover")?.trim() || "";
  const position = spinePosition(searchParams.get("position"));

  if (!cover || !allowedCoverUrl(cover)) {
    return Response.json({ error: "A valid cover URL is required." }, { status: 400 });
  }

  try {
    const response = await fetch(cover, {
      redirect: "follow",
      cache: "force-cache",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "ShelfOfFame/1.0",
      },
    });

    if (!response.ok) {
      return Response.json({ error: "Cover could not be loaded." }, { status: 502 });
    }

    const mime = mimeFromHeader(response.headers.get("content-type"));
    if (!mime) {
      return Response.json({ error: "Unsupported cover image format." }, { status: 415 });
    }

    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_COVER_BYTES) {
      return Response.json({ error: "Cover image is too large." }, { status: 413 });
    }

    const dataUrl = `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
    const safeDataUrl = xmlEscape(dataUrl);
    const alignment = preserveAspectRatio(position);

    // A book spine is a narrow 1:4 detail crop of the approved front-cover artwork.
    // We intentionally keep the source sharp and only choose which horizontal
    // part of the cover is visible: left detail, center detail, or right detail.
    // Title and author are rendered separately in the browser for cover crops.
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SPINE_WIDTH}" height="${SPINE_HEIGHT}" viewBox="0 0 ${SPINE_WIDTH} ${SPINE_HEIGHT}">
  <defs>
    <linearGradient id="edgeShade" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".34"/>
      <stop offset=".055" stop-color="#fff" stop-opacity=".08"/>
      <stop offset=".16" stop-color="#000" stop-opacity="0"/>
      <stop offset=".84" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".38"/>
    </linearGradient>
    <linearGradient id="topBottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".16"/>
      <stop offset=".08" stop-color="#000" stop-opacity="0"/>
      <stop offset=".91" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".24"/>
    </linearGradient>
    <linearGradient id="paperSheen" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".02"/>
      <stop offset=".44" stop-color="#fff" stop-opacity=".055"/>
      <stop offset=".62" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".045"/>
    </linearGradient>
  </defs>

  <rect width="${SPINE_WIDTH}" height="${SPINE_HEIGHT}" fill="#17120f"/>
  <image href="${safeDataUrl}" x="0" y="0" width="${SPINE_WIDTH}" height="${SPINE_HEIGHT}"
    preserveAspectRatio="${alignment}"/>
  <rect width="${SPINE_WIDTH}" height="${SPINE_HEIGHT}" fill="url(#paperSheen)"/>
  <rect width="${SPINE_WIDTH}" height="${SPINE_HEIGHT}" fill="url(#edgeShade)"/>
  <rect width="${SPINE_WIDTH}" height="${SPINE_HEIGHT}" fill="url(#topBottom)"/>
  <rect x="3" y="2" width="294" height="1196" rx="12" fill="none"
    stroke="#fff" stroke-opacity=".09" stroke-width="3"/>
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "X-Shelf-Spine-Position": position,
      },
    });
  } catch {
    return Response.json({ error: "Spine generation failed." }, { status: 500 });
  }
}
