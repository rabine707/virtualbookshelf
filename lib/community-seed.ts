type SeedBook = {
  title: string;
  author: string;
  isbn?: string | null;
  asin?: string | null;
  coverUrl?: string | null;
  source?: string | null;
  sourceIdentifier?: string | null;
  sourceTitle?: string | null;
  sourceAuthor?: string | null;
  confidence?: number;
  needsIdentification?: boolean;
};

type SupabaseBook = { id: string; title: string; author: string; isbn?: string | null; asin?: string | null };

const MAX_SEED_BATCH = 100;

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function headers(serviceRoleKey: string, prefer?: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function jsonOrText(response: Response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

export function sanitizeSeedBooks(input: unknown): SeedBook[] {
  if (!Array.isArray(input)) throw new Error("Seed payload must be an array.");
  if (input.length > MAX_SEED_BATCH) throw new Error(`Seed batches are limited to ${MAX_SEED_BATCH} books.`);
  return input.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid seed record.");
    const row = raw as Record<string, unknown>;
    const title = clean(row.title, 300);
    const author = clean(row.author, 200);
    if (!title || !author) throw new Error("Every seed record needs a title and author.");
    const coverUrl = clean(row.coverUrl, 2048) || null;
    if (coverUrl && !/^https:\/\//i.test(coverUrl)) throw new Error("Cover URLs must use HTTPS.");
    return {
      title,
      author,
      isbn: clean(row.isbn, 32) || null,
      asin: clean(row.asin, 32) || null,
      coverUrl,
      source: clean(row.source, 80) || null,
      sourceIdentifier: clean(row.sourceIdentifier, 200) || null,
      sourceTitle: clean(row.sourceTitle, 300) || null,
      sourceAuthor: clean(row.sourceAuthor, 200) || null,
      confidence: Math.max(0, Math.min(100, Number(row.confidence) || 0)),
      needsIdentification: Boolean(row.needsIdentification),
    };
  });
}

async function findExistingBook(baseUrl: string, serviceRoleKey: string, row: SeedBook): Promise<SupabaseBook | undefined> {
  const select = "id,title,author,isbn,asin";
  if (row.isbn) {
    const r = await fetch(`${baseUrl}/rest/v1/books?select=${select}&isbn=eq.${encodeURIComponent(row.isbn)}&limit=1`, { headers: headers(serviceRoleKey), cache: "no-store" });
    const data = await jsonOrText(r);
    if (r.ok && Array.isArray(data) && data[0]) return data[0] as SupabaseBook;
  }
  if (row.asin) {
    const r = await fetch(`${baseUrl}/rest/v1/books?select=${select}&asin=eq.${encodeURIComponent(row.asin)}&limit=1`, { headers: headers(serviceRoleKey), cache: "no-store" });
    const data = await jsonOrText(r);
    if (r.ok && Array.isArray(data) && data[0]) return data[0] as SupabaseBook;
  }
  const nt = normalize(row.title), na = normalize(row.author);
  const r = await fetch(`${baseUrl}/rest/v1/books?select=${select}&normalized_title=eq.${encodeURIComponent(nt)}&normalized_author=eq.${encodeURIComponent(na)}&limit=1`, { headers: headers(serviceRoleKey), cache: "no-store" });
  const data = await jsonOrText(r);
  if (r.ok && Array.isArray(data) && data[0]) return data[0] as SupabaseBook;
  return undefined;
}

async function createBook(baseUrl: string, serviceRoleKey: string, row: SeedBook): Promise<SupabaseBook> {
  const response = await fetch(`${baseUrl}/rest/v1/books`, {
    method: "POST",
    headers: headers(serviceRoleKey, "return=representation"),
    body: JSON.stringify({
      title: row.title,
      author: row.author,
      isbn: row.isbn,
      asin: row.asin,
      normalized_title: normalize(row.title),
      normalized_author: normalize(row.author),
    }),
  });
  const data = await jsonOrText(response);
  if (!response.ok || !Array.isArray(data) || !data[0]) throw new Error(`Could not seed book: ${row.title}`);
  return data[0] as SupabaseBook;
}

async function upsertCandidate(baseUrl: string, serviceRoleKey: string, row: SeedBook, bookId: string) {
  if (!row.coverUrl) return false;
  const response = await fetch(`${baseUrl}/rest/v1/cover_candidates?on_conflict=image_url`, {
    method: "POST",
    headers: headers(serviceRoleKey, "resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify({
      book_id: bookId,
      image_url: row.coverUrl,
      source: row.source,
      source_identifier: row.sourceIdentifier,
      source_title: row.sourceTitle || row.title,
      source_author: row.sourceAuthor || row.author,
      status: row.needsIdentification ? "needs_identification" : "pending",
      confidence: row.confidence || 0,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Could not seed cover candidate for: ${row.title}`);
  return true;
}

export async function seedCommunityCatalog(baseUrl: string, serviceRoleKey: string, rows: SeedBook[]) {
  let booksCreated = 0, booksMatched = 0, candidatesUpserted = 0;
  for (const row of rows) {
    let book = await findExistingBook(baseUrl, serviceRoleKey, row);
    if (book) booksMatched += 1;
    else { book = await createBook(baseUrl, serviceRoleKey, row); booksCreated += 1; }
    if (await upsertCandidate(baseUrl, serviceRoleKey, row, book.id)) candidatesUpserted += 1;
  }
  return { received: rows.length, booksCreated, booksMatched, candidatesUpserted };
}
