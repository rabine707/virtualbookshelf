import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOM_PLATE_PARTS = [
  "room-plate-01.b64",
  "room-plate-02.b64",
  "room-plate-03-04.b64",
  "room-plate-05-06.b64",
  "room-plate-07-08.b64",
  "room-plate-09-10.b64",
] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baseDir = path.join(process.cwd(), "public", "themes", "botanical", "v7");
    const parts = await Promise.all(
      ROOM_PLATE_PARTS.map((filename) => readFile(path.join(baseDir, filename), "utf8")),
    );

    const image = Buffer.from(parts.map((part) => part.trim()).join(""), "base64");

    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Unable to assemble Botanical room plate", error);
    return new Response("Unable to assemble Botanical room plate", { status: 500 });
  }
}
