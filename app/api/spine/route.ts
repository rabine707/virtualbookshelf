const SPINE_WIDTH = 300;
const SPINE_HEIGHT = 1275;
const MAX_COVER_BYTES = 8 * 1024 * 1024;

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cover = searchParams.get("cover")?.trim() || "";
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

    // This is a real, dedicated spine canvas rather than a front-cover element
    // being squeezed by CSS. Multiple crops of the approved cover are recomposed
    // into one 4:17 artwork, which also gives us a stable asset shape for a later
    // AI/outpainting pass without changing the shelf renderer again.
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SPINE_WIDTH}" height="${SPINE_HEIGHT}" viewBox="0 0 ${SPINE_WIDTH} ${SPINE_HEIGHT}">
  <defs>
    <filter id="blur" x="-30%" y="-10%" width="160%" height="120%">
      <feGaussianBlur stdDeviation="30"/>
      <feColorMatrix type="saturate" values="1.18"/>
    </filter>
    <linearGradient id="edgeShade" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".55"/>
      <stop offset=".08" stop-color="#fff" stop-opacity=".10"/>
      <stop offset=".20" stop-color="#000" stop-opacity="0"/>
      <stop offset=".78" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".58"/>
    </linearGradient>
    <linearGradient id="topBottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".28"/>
      <stop offset=".13" stop-color="#000" stop-opacity="0"/>
      <stop offset=".82" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".36"/>
    </linearGradient>
    <clipPath id="centerClip"><rect x="34" y="0" width="232" height="1275" rx="8"/></clipPath>
    <clipPath id="accentClip"><rect x="238" y="0" width="44" height="1275"/></clipPath>
  </defs>

  <rect width="300" height="1275" fill="#17120f"/>
  <image href="${safeDataUrl}" x="-330" y="-65" width="960" height="1405" preserveAspectRatio="xMidYMid slice" filter="url(#blur)" opacity=".93"/>
  <g clip-path="url(#centerClip)">
    <image href="${safeDataUrl}" x="34" y="0" width="232" height="1275" preserveAspectRatio="xMidYMid slice" opacity=".83"/>
  </g>
  <g clip-path="url(#accentClip)" opacity=".35">
    <image href="${safeDataUrl}" x="-10" y="0" width="330" height="1275" preserveAspectRatio="xMaxYMid slice"/>
  </g>
  <rect width="300" height="1275" fill="url(#edgeShade)"/>
  <rect width="300" height="1275" fill="url(#topBottom)"/>
  <rect x="3" y="2" width="294" height="1271" rx="12" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="3"/>
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      },
    });
  } catch {
    return Response.json({ error: "Spine generation failed." }, { status: 500 });
  }
}
