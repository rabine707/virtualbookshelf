type OpenAIImageCall = {
  type?: string;
  result?: string;
};

type OpenAIResponse = {
  output?: OpenAIImageCall[];
  error?: { message?: string };
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
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
    `Create original book-spine artwork inspired by the attached confirmed front cover for “${title}”${author ? ` by ${author}` : ""}.`,
    "This is not a front-cover crop. Recompose the visual motifs, palette, characters, symbols, lighting, textures, and atmosphere into artwork designed specifically for a very tall, narrow physical book spine.",
    "IMPORTANT COMPOSITION: the final shelf will center-crop your portrait image to approximately a 4:17 ratio. Put all important visual information inside a narrow vertical band centered in the image, about 34% of the canvas width. Treat the outer left/right areas as expendable bleed/extension.",
    "Do not add title text, author text, logos, publisher marks, barcodes, badges, or invented lettering. The app adds accurate typography separately.",
    "Make the center band detailed, sharp, cohesive, print-like, and recognizable as belonging with the reference cover. Avoid a blurry gradient look and avoid simply stretching the original image.",
  ].join(" ");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.1",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: cover, detail: "high" },
          ],
        }],
        tools: [{
          type: "image_generation",
          model: "gpt-image-1",
          action: "edit",
          input_fidelity: "high",
          size: "1024x1536",
          quality: "medium",
          output_format: "jpeg",
          output_compression: 82,
          background: "opaque",
        }],
        tool_choice: { type: "image_generation" },
      }),
    });

    const result = await response.json() as OpenAIResponse;
    if (!response.ok) {
      return Response.json({ error: result.error?.message || "Image generation failed." }, { status: response.status });
    }

    const imageCall = result.output?.find((item) => item.type === "image_generation_call" && item.result);
    if (!imageCall?.result) {
      return Response.json({ error: "No generated spine artwork was returned." }, { status: 502 });
    }

    return Response.json({ image: `data:image/jpeg;base64,${imageCall.result}` });
  } catch {
    return Response.json({ error: "Could not reach the image generator." }, { status: 502 });
  }
}
