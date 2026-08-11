export const runtime = "nodejs";

const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const MAX_IMAGE_BYTES = 5_500_000;
const MAX_RESULTS = 80;

type ScanBook = {
  title: string;
  author: string;
  confidence?: number;
  isbn?: string;
  year?: number;
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

function cleanText(value: unknown, max = 300) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function parseDataUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const data = match[2];
  const bytes = Math.floor(data.length * 0.75);
  if (bytes <= 0 || bytes > MAX_IMAGE_BYTES) return null;
  return { mimeType, data };
}

async function consumePass(token: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_shelf_scan_pass`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_limit: 10 }),
  });
  const data = await response.json().catch(() => null) as Array<{ allowed?: boolean; passes?: number; remaining?: number }> | null;
  if (!response.ok) return { allowed: false, remaining: 0, error: "Could not verify your scan allowance." };
  const row = Array.isArray(data) ? data[0] : null;
  return { allowed: Boolean(row?.allowed), remaining: Number(row?.remaining || 0) };
}

function normalizeBooks(value: unknown): ScanBook[] {
  if (!value || typeof value !== "object") return [];
  const books = Array.isArray((value as { books?: unknown }).books) ? (value as { books: unknown[] }).books : [];
  const seen = new Set<string>();
  const result: ScanBook[] = [];
  for (const raw of books.slice(0, MAX_RESULTS)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const title = cleanText(item.title, 300);
    const author = cleanText(item.author, 220) || "Unknown author";
    if (!title) continue;
    const key = `${title.toLowerCase()}::${author.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const confidenceNumber = Number(item.confidence);
    const yearNumber = Number(item.year);
    result.push({
      title,
      author,
      ...(Number.isFinite(confidenceNumber) ? { confidence: Math.max(0, Math.min(1, confidenceNumber)) } : {}),
      ...(cleanText(item.isbn, 32) ? { isbn: cleanText(item.isbn, 32).replace(/[^0-9Xx]/g, "") } : {}),
      ...(Number.isInteger(yearNumber) && yearNumber > 1400 && yearNumber < 2200 ? { year: yearNumber } : {}),
    });
  }
  return result;
}

async function saveScan(token: string, sourceName: string, books: ScanBook[]) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/shelf_scans`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        source_name: sourceName || null,
        detected_books: books,
        detected_count: books.length,
        accepted_count: 0,
        status: books.length ? "complete" : "partial",
      }),
    });
  } catch {
    // Scan results are still returned even if scan history cannot be recorded.
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return Response.json({ error: "Sign in to scan a bookshelf." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid scan request." }, { status: 400 });
  }

  const image = parseDataUrl(body.imageDataUrl);
  if (!image) return Response.json({ error: "Use a JPG, PNG, or WebP photo under 5.5 MB." }, { status: 400 });

  const allowance = await consumePass(token);
  if (!allowance.allowed) {
    return Response.json({ error: allowance.error || "You have used today's shelf scans.", remaining: allowance.remaining }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
  if (!apiKey) return Response.json({ error: "Shelf scanning is not configured yet." }, { status: 503 });
  const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";

  const prompt = [
    "Inspect this photograph of a physical bookshelf and identify readable books from their spines or covers.",
    "Return only books you can reasonably identify. Do not invent titles to fill gaps.",
    "For each book return title, author, confidence from 0 to 1, and ISBN/year only when visibly known or highly certain.",
    "If a title is partly obscured, use the most likely full published title only when confidence is at least 0.65.",
    `Return at most ${MAX_RESULTS} unique books.`,
  ].join(" ");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: image.mimeType, data: image.data } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            books: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  author: { type: "STRING" },
                  confidence: { type: "NUMBER" },
                  isbn: { type: "STRING" },
                  year: { type: "INTEGER" },
                },
                required: ["title", "author", "confidence"],
              },
            },
          },
          required: ["books"],
        },
      },
    }),
  });

  const gemini = await response.json().catch(() => null) as GeminiResponse | null;
  if (!response.ok) {
    const message = cleanText(gemini?.error?.message, 260) || "The book scanner could not read that photo.";
    return Response.json({ error: message, remaining: allowance.remaining }, { status: response.status === 429 ? 429 : 502 });
  }

  const text = gemini?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  let parsed: unknown = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  const books = normalizeBooks(parsed);
  await saveScan(token, cleanText(body.sourceName, 180), books);

  return Response.json({ books, remaining: allowance.remaining });
}
