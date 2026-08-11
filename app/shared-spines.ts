const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const SESSION_KEY = "shelf-of-fame-supabase-session";

export type SharedBookIdentity = {
  title: string;
  author: string;
  isbn?: string;
  asin?: string;
};

export type SharedSpineRenderMode = "integrated" | "overlay";
export type SharedSpinePosition = "left" | "center" | "right";

export type SharedSpineEntry = {
  url: string;
  renderMode: SharedSpineRenderMode;
  position?: SharedSpinePosition;
};

type StoredSession = {
  access_token?: string;
  user?: { id?: string; email?: string };
};

type SharedSpineRow = {
  storage_path: string;
  source_cover_url?: string | null;
  vote_score?: number | null;
  provider?: string | null;
  model?: string | null;
  books?: {
    title?: string | null;
    author?: string | null;
    normalized_title?: string | null;
    normalized_author?: string | null;
    isbn?: string | null;
    asin?: string | null;
  } | null;
};

export type SharedSpineCatalog = {
  byCover: Map<string, SharedSpineEntry>;
  byIsbn: Map<string, SharedSpineEntry>;
  byAsin: Map<string, SharedSpineEntry>;
  byTitleAuthor: Map<string, SharedSpineEntry>;
};

export function normalizeBookText(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function titleAuthorKey(title: string, author: string) {
  return `${normalizeBookText(title)}::${normalizeBookText(author)}`;
}

function publicSpineUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/spines/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as StoredSession : null;
  } catch {
    return null;
  }
}

async function supabaseJson(path: string, init: RequestInit = {}, authenticated = false) {
  const session = authenticated ? readSession() : null;
  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_KEY);
  headers.set("Content-Type", "application/json");
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error || data?.msg || `Supabase request failed (${response.status})`);
  return data;
}

async function findOrCreateBook(identity: SharedBookIdentity) {
  const normalizedTitle = normalizeBookText(identity.title);
  const normalizedAuthor = normalizeBookText(identity.author);
  const filters: string[] = [];
  if (identity.isbn) filters.push(`isbn=eq.${encodeURIComponent(identity.isbn)}`);
  if (identity.asin) filters.push(`asin=eq.${encodeURIComponent(identity.asin)}`);
  filters.push(`normalized_title=eq.${encodeURIComponent(normalizedTitle)}&normalized_author=eq.${encodeURIComponent(normalizedAuthor)}`);

  for (const filter of filters) {
    const found = await supabaseJson(`/rest/v1/books?select=id&${filter}&limit=1`, { cache: "no-store" }, true) as Array<{ id: string }>;
    if (found?.[0]?.id) return found[0].id;
  }

  const inserted = await supabaseJson("/rest/v1/books?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      isbn: identity.isbn || null,
      asin: identity.asin || null,
      title: identity.title,
      author: identity.author,
      normalized_title: normalizedTitle,
      normalized_author: normalizedAuthor,
    }),
  }, true) as Array<{ id: string }>;
  if (!inserted?.[0]?.id) throw new Error("Could not create shared book record");
  return inserted[0].id;
}

function extensionFor(type: string) {
  if (type.includes("webp")) return "webp";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  return "png";
}

function sharedEntry(row: SharedSpineRow): SharedSpineEntry {
  const integrated = row.provider === "AI-integrated";
  const position = row.provider === "cover-crop" && (row.model === "left" || row.model === "center" || row.model === "right")
    ? row.model
    : undefined;
  return {
    url: publicSpineUrl(row.storage_path),
    renderMode: integrated ? "integrated" : "overlay",
    position,
  };
}

export async function publishSharedSpine(identity: SharedBookIdentity, image: string, sourceCoverUrl: string, provider?: string, model?: string) {
  const session = readSession();
  const userId = session?.user?.id;
  const token = session?.access_token;
  if (!userId || !token) return { shared: false as const, reason: "signed-out" as const };

  const bookId = await findOrCreateBook(identity);
  const imageResponse = await fetch(image);
  if (!imageResponse.ok) throw new Error("Could not read generated spine artwork");
  const blob = await imageResponse.blob();
  const path = `${bookId}/${crypto.randomUUID()}.${extensionFor(blob.type)}`;

  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/spines/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": blob.type || "image/png",
      "x-upsert": "false",
    },
    body: blob,
  });
  if (!upload.ok) {
    const message = await upload.text();
    throw new Error(message || "Could not upload shared spine artwork");
  }

  await supabaseJson("/rest/v1/spines", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      book_id: bookId,
      storage_path: path,
      source_cover_url: sourceCoverUrl,
      provider: provider || null,
      model: model || null,
      contributed_by: userId,
      status: "approved",
    }),
  }, true);

  catalogPromise = null;
  return { shared: true as const, url: publicSpineUrl(path) };
}

let catalogPromise: Promise<SharedSpineCatalog> | null = null;

export function loadSharedSpineCatalog(force = false) {
  if (catalogPromise && !force) return catalogPromise;
  catalogPromise = (async () => {
    const rows = await supabaseJson(
      "/rest/v1/spines?select=storage_path,source_cover_url,vote_score,provider,model,books(title,author,normalized_title,normalized_author,isbn,asin)&status=eq.approved&order=vote_score.desc,created_at.desc&limit=1000",
      { cache: "no-store" },
    ) as SharedSpineRow[];

    const catalog: SharedSpineCatalog = {
      byCover: new Map(),
      byIsbn: new Map(),
      byAsin: new Map(),
      byTitleAuthor: new Map(),
    };

    for (const row of rows || []) {
      if (!row.storage_path || !row.books) continue;
      const entry = sharedEntry(row);
      const cover = row.source_cover_url?.trim();
      const isbn = row.books.isbn?.trim();
      const asin = row.books.asin?.trim();
      const title = row.books.title || row.books.normalized_title || "";
      const author = row.books.author || row.books.normalized_author || "";
      if (cover && !catalog.byCover.has(cover)) catalog.byCover.set(cover, entry);
      if (isbn && !catalog.byIsbn.has(isbn)) catalog.byIsbn.set(isbn, entry);
      if (asin && !catalog.byAsin.has(asin)) catalog.byAsin.set(asin, entry);
      const key = titleAuthorKey(title, author);
      if (key !== "::" && !catalog.byTitleAuthor.has(key)) catalog.byTitleAuthor.set(key, entry);
    }
    return catalog;
  })().catch(() => ({ byCover: new Map(), byIsbn: new Map(), byAsin: new Map(), byTitleAuthor: new Map() }));
  return catalogPromise;
}
