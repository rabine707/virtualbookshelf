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

    // Keep the approved cover recognizable. A sharp center crop provides the
    // printed artwork while only the outer bleed is softened to extend the image
    // naturally to the physical 4:17 spine ratio.
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SPINE_WIDTH}" height="${SPINE_HEIGHT}" viewBox="0 0 ${SPINE_WIDTH} ${SPINE_HEIGHT}">
  <defs>
    <filter id="softBleed" x="-35%" y="-12%" width="170%" height="124%">
      <feGaussianBlur stdDeviation="10"/>
      <feColorMatrix type="saturate" values="1.08"/>
    </filter>
    <linearGradient id="edgeShade" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".52"/>
      <stop offset=".055" stop-color="#fff" stop-opacity=".11"/>
      <stop offset=".15" stop-color="#000" stop-opacity="0"/>
      <stop offset=".84" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".56"/>
    </linearGradient>
    <linearGradient id="topBottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".20"/>
      <stop offset=".10" stop-color="#000" stop-opacity="0"/>
      <stop offset=".88" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".30"/>
    </linearGradient>
    <linearGradient id="paperSheen" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".025"/>
      <stop offset=".45" stop-color="#fff" stop-opacity=".07"/>
      <stop offset=".62" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".06"/>
    </linearGradient>
    <clipPath id="sharpClip"><rect x="20" y="0" width="260" height="1275" rx="7"/></clipPath>
  </defs>

  <rect width="300" height="1275" fill="#17120f"/>

  <!-- Soft edge extension only. This is intentionally subtle so the spine no
       longer reads as frosted glass. -->
  <image href="${safeDataUrl}" x="-250" y="-28" width="800" height="1331"
    preserveAspectRatio="xMidYMid slice" filter="url(#softBleed)" opacity=".62"/>

  <!-- Primary printed artwork: sharp, high contrast and recognizable. -->
  <g clip-path="url(#sharpClip)">
    <image href="${safeDataUrl}" x="20" y="0" width="260" height="1275"
      preserveAspectRatio="xMidYMid slice" opacity="1"/>
  </g>

  <!-- Narrow side bleeds sampled from alternate cover positions add more of the
       original palette without obscuring the main artwork. -->
  <image href="${safeDataUrl}" x="0" y="0" width="28" height="1275"
    preserveAspectRatio="xMinYMid slice" opacity=".72"/>
  <image href="${safeDataUrl}" x="272" y="0" width="28" height="1275"
    preserveAspectRatio="xMaxYMid slice" opacity=".72"/>

  <rect width="300" height="1275" fill="url(#paperSheen)"/>
  <rect width="300" height="1275" fill="url(#edgeShade)"/>
  <rect width="300" height="1275" fill="url(#topBottom)"/>
  <rect x="3" y="2" width="294" height="1271" rx="12" fill="none"
    stroke="#fff" stroke-opacity=".10" stroke-width="3"/>
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return Response.json({ error: "Spine generation failed." }, { status: 500 });
  }
}
