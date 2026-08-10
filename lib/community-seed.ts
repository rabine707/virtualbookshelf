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

type SupabaseBook = {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  asin?: string | null;
  normalized_title?: string | null;
  normalized_author?: string | null;
};

const MAX_SEED_BATCH = 150;

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

function normKey(title: string, author: string) {
  return `${normalize(title)}|${normalize(author)}`;
}

function identityKey(row: Pick<SeedBook, "isbn" | "asin" | "title" | "author">) {
  if (row.isbn) return `isbn:${row.isbn}`;
  if (row.asin) return `asin:${row.asin}`;
  return `norm:${normKey(row.title, row.author)}`;
}

export async function seedCommunityCatalog(baseUrl: string, serviceRoleKey: string, rows: SeedBook[]) {
  const existingResponse = await fetch(`${baseUrl}/rest/v1/books?select=id,title,author,isbn,asin,normalized_title,normalized_author&limit=10000`, {
    headers: headers(serviceRoleKey), cache: "no-store",
  });
  const existingData = await jsonOrText(existingResponse);
  if (!existingResponse.ok || !Array.isArray(existingData)) throw new Error("Could not read the shared book catalog.");

  const existing = existingData as SupabaseBook[];
  const byIsbn = new Map<string, SupabaseBook>();
  const byAsin = new Map<string, SupabaseBook>();
  const byNorm = new Map<string, SupabaseBook>();
  for (const book of existing) {
    if (book.isbn) byIsbn.set(book.isbn, book);
    if (book.asin) byAsin.set(book.asin, book);
    byNorm.set(`${book.normalized_title || normalize(book.title)}|${book.normalized_author || normalize(book.author)}`, book);
  }

  const resolveExisting = (row: SeedBook) =>
    (row.isbn ? byIsbn.get(row.isbn) : undefined) ||
    (row.asin ? byAsin.get(row.asin) : undefined) ||
    byNorm.get(normKey(row.title, row.author));

  const missingByIdentity = new Map<string, SeedBook>();
  let booksMatched = 0;
  for (const row of rows) {
    if (resolveExisting(row)) booksMatched += 1;
    else if (!missingByIdentity.has(identityKey(row))) missingByIdentity.set(identityKey(row), row);
  }

  const missing = [...missingByIdentity.values()];
  let created: SupabaseBook[] = [];
  if (missing.length) {
    const createResponse = await fetch(`${baseUrl}/rest/v1/books`, {
      method: "POST",
      headers: headers(serviceRoleKey, "return=representation"),
      body: JSON.stringify(missing.map((row) => ({
        title: row.title,
        author: row.author,
        isbn: row.isbn,
        asin: row.asin,
        normalized_title: normalize(row.title),
        normalized_author: normalize(row.author),
      }))),
    });
    const createData = await jsonOrText(createResponse);
    if (!createResponse.ok || !Array.isArray(createData)) throw new Error("Could not add the starter books to the shared catalog.");
    created = createData as SupabaseBook[];
    for (const book of created) {
      if (book.isbn) byIsbn.set(book.isbn, book);
      if (book.asin) byAsin.set(book.asin, book);
      byNorm.set(`${book.normalized_title || normalize(book.title)}|${book.normalized_author || normalize(book.author)}`, book);
    }
  }

  const candidateRows = rows.flatMap((row, index) => {
    if (!row.coverUrl) return [];
    const book = resolveExisting(row);
    if (!book) return [];
    return [{
      book_id: book.id,
      image_url: row.coverUrl,
      source: row.source,
      source_identifier: row.sourceIdentifier,
      source_title: row.sourceTitle || row.title,
      source_author: row.sourceAuthor || row.author,
      status: row.needsIdentification ? "needs_identification" : "pending",
      confidence: row.confidence || 0,
      created_at: new Date(Date.now() + index).toISOString(),
      updated_at: new Date().toISOString(),
    }];
  });

  if (candidateRows.length) {
    const candidateResponse = await fetch(`${baseUrl}/rest/v1/cover_candidates?on_conflict=image_url`, {
      method: "POST",
      headers: headers(serviceRoleKey, "resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(candidateRows),
    });
    if (!candidateResponse.ok) {
      const detail = await jsonOrText(candidateResponse);
      throw new Error(`Could not seed cover candidates: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
    }
  }

  return {
    received: rows.length,
    booksCreated: created.length,
    booksMatched,
    candidatesUpserted: candidateRows.length,
  };
}
