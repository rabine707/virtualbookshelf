import { NextRequest, NextResponse } from "next/server";

function cleanIsbn(value: string) {
  const cleaned = value.replace(/[^0-9Xx]/g, "");
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : null;
}

function isBlankLibraryThingGif(bytes: Uint8Array) {
  if (bytes.length < 10) return true;
  const signature = String.fromCharCode(...bytes.slice(0, 6));
  if (signature !== "GIF87a" && signature !== "GIF89a") return false;
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  return width <= 1 && height <= 1;
}

export async function GET(request: NextRequest) {
  const token = process.env.LIBRARYTHING_API_TOKEN?.trim();
  const isbn = cleanIsbn(request.nextUrl.searchParams.get("isbn") || "");

  if (!token || !isbn) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });
  }

  try {
    const url = `https://covers.librarything.com/devkey/${encodeURIComponent(token)}/large/isbn/${encodeURIComponent(isbn)}`;
    const response = await fetch(url, { next: { revalidate: 604800 } });
    if (!response.ok) {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=86400" } });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await response.arrayBuffer());

    if (!bytes.length || isBlankLibraryThingGif(bytes)) {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=86400" } });
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });
  }
}
