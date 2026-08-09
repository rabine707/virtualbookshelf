type GeminiPart = {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
  inline_data?: {
    mime_type?: string;
    data?: string;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
    status?: string;
  };
};

function base64FromArrayBuffer(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({
      error: "Gemini spine generation is not configured yet.",
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
    `Using the supplied confirmed front cover for “${title}”${author ? ` by ${author}` : ""} as the visual reference, create a new image designed specifically for the narrow spine of this same book.`,
    "Preserve the reference cover's recognizable visual identity: palette, central subject or motif, clothing and character features when present, scenery, symbols, lighting, textures, and overall mood.",
    "Recompose rather than crop: intelligently rearrange and extend the reference artwork so the important imagery reads naturally in a very tall, narrow 1:4 composition.",
    "Keep the strongest focal subject inside the central vertical area so it stays recognizable when displayed as a small bookshelf spine.",
    "Avoid inventing unrelated characters, faces, objects, or a new genre aesthetic. This should clearly feel derived from the supplied cover.",
    "Do not include any title, author name, words, letters, logos, publisher marks, badges, barcodes, frames, borders, book mockups, or typography. The app adds accurate text separately.",
    "Return polished standalone spine artwork only, edge-to-edge, with no surrounding background outside the artwork.",
  ].join(" ");

  try {
    const coverResponse = await fetch(cover, {
      cache: "no-store",
      headers: { "User-Agent": "ShelfOfFame/1.0" },
    });
    if (!coverResponse.ok) {
      return Response.json({ error: "Could not load the confirmed cover for Gemini." }, { status: 502 });
    }

    const contentType = coverResponse.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return Response.json({ error: "The confirmed cover URL did not return an image." }, { status: 400 });
    }

    const coverBytes = await coverResponse.arrayBuffer();
    const coverBase64 = base64FromArrayBuffer(coverBytes);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: contentType,
                  data: coverBase64,
                },
              },
            ],
          }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            responseFormat: {
              image: {
                aspectRatio: "1:4",
                imageSize: "1K",
              },
            },
          },
        }),
      },
    );

    const result = await response.json() as GeminiResponse;
    if (!response.ok) {
      return Response.json({
        error: result.error?.message || "Gemini spine generation failed.",
      }, { status: response.status });
    }

    const parts = result.candidates?.flatMap((candidate) => candidate.content?.parts || []) || [];
    const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
    const inline = imagePart?.inlineData;
    const snakeInline = imagePart?.inline_data;
    const data = inline?.data || snakeInline?.data;
    const mimeType = inline?.mimeType || snakeInline?.mime_type || "image/png";

    if (!data) {
      const text = parts.map((part) => part.text).filter(Boolean).join(" ").trim();
      return Response.json({
        error: text || "Gemini returned no spine artwork.",
      }, { status: 502 });
    }

    return Response.json({
      image: `data:${mimeType};base64,${data}`,
      model: "gemini-3.1-flash-image",
      aspectRatio: "1:4",
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Could not reach the Gemini image generator.",
    }, { status: 502 });
  }
}
