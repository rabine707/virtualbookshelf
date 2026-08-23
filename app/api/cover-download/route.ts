import { fetchPublicImage, RemoteImageError } from "../../../lib/remote-image";
import { enforceApiRateLimit } from "../../../lib/rate-limit";

export const runtime = "nodejs";

function safeFilename(value: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return cleaned || "book-cover";
}

function extensionFor(contentType: string) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

export async function GET(request: Request) {
  const rateLimited = await enforceApiRateLimit(request);
  if (rateLimited) return rateLimited;

  const requestUrl = new URL(request.url);
  const imageUrl = requestUrl.searchParams.get("url") || "";
  const title = requestUrl.searchParams.get("title") || "book-cover";
  const author = requestUrl.searchParams.get("author") || "";

  try {
    const image = await fetchPublicImage(imageUrl);
    const bytes = Buffer.from(image.base64, "base64");
    const name = safeFilename(author ? `${title}-${author}` : title);
    return new Response(bytes, {
      headers: {
        "Content-Type": image.contentType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${name}.${extensionFor(image.contentType)}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof RemoteImageError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not download that cover image." }, { status: 502 });
  }
}
