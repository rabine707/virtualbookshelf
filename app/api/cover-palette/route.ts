import sharp from "sharp";
import { spineColorFromPixels } from "../../../lib/books/cover-palette";
import { fetchPublicImage, RemoteImageError } from "../../../lib/remote-image";

export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
};

export async function GET(request: Request) {
  const cover = new URL(request.url).searchParams.get("cover")?.trim() || "";
  if (!cover) {
    return Response.json({ color: null, error: "A cover URL is required." }, { status: 400 });
  }

  try {
    const image = await fetchPublicImage(cover);
    const { data, info } = await sharp(Buffer.from(image.base64, "base64"))
      .rotate()
      .resize(24, 32, { fit: "cover", position: "centre" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const color = spineColorFromPixels(data, info.channels);

    if (!color) {
      return Response.json({ color: null }, { status: 422, headers: responseHeaders });
    }

    return Response.json({ color }, { headers: responseHeaders });
  } catch (error) {
    const status = error instanceof RemoteImageError ? error.status : 415;
    return Response.json({ color: null }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
