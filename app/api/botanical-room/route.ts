const ROOM_PLATE_PARTS = [
  "/themes/botanical/v7/room-plate-01.b64",
  "/themes/botanical/v7/room-plate-02.b64",
  "/themes/botanical/v7/room-plate-03-04.b64",
  "/themes/botanical/v7/room-plate-05-06.b64",
  "/themes/botanical/v7/room-plate-07-08.b64",
  "/themes/botanical/v7/room-plate-09-10.b64",
] as const;

export const dynamic = "force-static";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  const parts = await Promise.all(
    ROOM_PLATE_PARTS.map(async (path) => {
      const response = await fetch(new URL(path, origin), {
        cache: "force-cache",
      });

      if (!response.ok) {
        throw new Error(`Unable to load Botanical room fragment: ${path}`);
      }

      return (await response.text()).trim();
    }),
  );

  const image = Buffer.from(parts.join(""), "base64");

  return new Response(image, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
