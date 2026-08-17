const ROOM_PLATE_PARTS = [
  "/themes/botanical/v7/room-plate-01.b64",
  "/themes/botanical/v7/room-plate-02.b64",
  "/themes/botanical/v7/room-plate-03-04.b64",
  "/themes/botanical/v7/room-plate-05-06.b64",
  "/themes/botanical/v7/room-plate-07-08.b64",
  "/themes/botanical/v7/room-plate-09-10.b64",
] as const;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const parts: string[] = [];

  for (const path of ROOM_PLATE_PARTS) {
    const response = await fetch(new URL(path, origin), { cache: "force-cache" });
    if (!response.ok) {
      return new Response(`Missing room fragment: ${path}`, { status: 500 });
    }
    parts.push((await response.text()).trim());
  }

  const image = Buffer.from(parts.join(""), "base64");

  return new Response(image, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(image.byteLength),
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
    },
  });
}
