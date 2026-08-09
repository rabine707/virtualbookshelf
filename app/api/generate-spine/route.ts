type PollinationsImage = {
  url?: string;
  b64_json?: string;
  media_type?: string;
};

type PollinationsResponse = {
  data?: PollinationsImage[];
  error?: {
    message?: string;
    details?: { upstreamBody?: string };
  } | string;
};

export async function POST(request: Request) {
  // Keep the old env name working for the current Vercel deployment while
  // preferring the provider-wide name for future configuration.
  const apiKey = process.env.POLLINATIONS_API_KEY || process.env.KLEIN_API_KEY;
  if (!apiKey) {
    return Response.json({
      error: "Spine generation is not configured yet.",
      needsApiKey: true,
    }, { status: 503 });
  }

  let body: { cover?: string; title?: string; author?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const cover = body.cover?.trim();
  const title = body.title?.trim() || "this book";
  const author = body.author?.trim() || "";
  if (!cover || !/^https?:\/\//i.test(cover)) {
    return Response.json({ error: "A valid confirmed cover is required." }, { status: 400 });
  }

  const prompt = [
    `Create original book-spine artwork inspired by the supplied confirmed front cover for “${title}”${author ? ` by ${author}` : ""}.`,
    "Recompose the cover's palette, visual motifs, symbols, lighting, textures, scenery, and atmosphere into artwork designed specifically for a physical book spine.",
    "The output must be an extremely tall, narrow vertical composition at roughly a 4:17 book-spine ratio, not a front cover and not a stretched crop.",
    "Keep the strongest recognizable imagery centered vertically and horizontally so it remains legible on a bookshelf at small size.",
    "Extend backgrounds and textures naturally toward the edges. Favor one cohesive focal motif over lots of tiny details.",
    "Do not add title text, author text, logos, publisher marks, barcodes, badges, frames, borders, or invented lettering. The app overlays accurate typography separately when the user wants it.",
    "Make the artwork sharp, polished, cohesive, print-like, and visually related to the reference cover without simply reproducing or stretching it.",
  ].join(" ");

  try {
    const response = await fetch("https://gen.pollinations.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "flux",
        prompt,
        image: cover,
        n: 1,
        size: "512x2176",
        quality: "medium",
        response_format: "b64_json",
        safe: true,
      }),
    });

    const result = await response.json() as PollinationsResponse;
    if (!response.ok) {
      const providerError = typeof result.error === "string"
        ? result.error
        : result.error?.message || result.error?.details?.upstreamBody;
      return Response.json({
        error: providerError || "FLUX spine generation failed.",
      }, { status: response.status });
    }

    const generated = result.data?.[0];
    if (generated?.b64_json) {
      const mediaType = generated.media_type || "image/jpeg";
      return Response.json({
        image: `data:${mediaType};base64,${generated.b64_json}`,
        model: "flux",
      });
    }

    if (generated?.url) {
      return Response.json({ image: generated.url, model: "flux" });
    }

    return Response.json({ error: "No FLUX spine artwork was returned." }, { status: 502 });
  } catch {
    return Response.json({ error: "Could not reach the FLUX image generator." }, { status: 502 });
  }
}
