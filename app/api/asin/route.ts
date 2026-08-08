import { NextRequest, NextResponse } from "next/server";

type AudibleContributor = {
  name?: string;
};

type AudibleProduct = {
  asin?: string;
  title?: string;
  authors?: AudibleContributor[];
};

type AudibleCatalogResponse = {
  products?: AudibleProduct[];
};

function normalize(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(value?: string) {
  return normalize(value).split(" ").filter(Boolean);
}

function authorScore(requested: string, candidates: string[]) {
  const wanted = words(requested);
  if (!wanted.length) return 0;
  const last = wanted.at(-1);
  let best = 0;

  for (const candidate of candidates) {
    const found = words(candidate);
    if (!found.length) continue;
    const set = new Set(found);
    const shared = wanted.filter((word) => set.has(word)).length;
    const overlap = shared / wanted.length;

    if (normalize(candidate) === normalize(requested)) best = Math.max(best, 10);
    else if (last && set.has(last) && overlap >= 0.5) best = Math.max(best, 8);
    else if (last && set.has(last)) best = Math.max(best, 6);
    else if (overlap >= 0.67) best = Math.max(best, 5);
  }

  return best;
}

function titleScore(requested: string, candidate?: string) {
  const wanted = normalize(requested);
  const found = normalize(candidate);
  if (!wanted || !found) return 0;
  if (wanted === found) return 14;
  if (wanted.includes(found) || found.includes(wanted)) return 11;

  const wantedWords = words(wanted).filter((word) => word.length > 1);
  const foundSet = new Set(words(found));
  const matches = wantedWords.filter((word) => foundSet.has(word)).length;
  const coverage = wantedWords.length ? matches / wantedWords.length : 0;

  if (coverage >= 0.85 && matches >= 2) return 9;
  if (coverage >= 0.67 && matches >= 2) return 7;
  return 0;
}

function validAsin(value?: string) {
  const asin = (value || "").trim().toUpperCase();
  return /^[A-Z0-9]{10}$/.test(asin) ? asin : null;
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title")?.trim() || "";
  const author = request.nextUrl.searchParams.get("author")?.trim() || "";

  if (!title) {
    return NextResponse.json({ asin: null }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const params = new URLSearchParams({
      title,
      num_results: "12",
      products_sort_by: "Relevance",
      response_groups: "contributors,product_desc",
    });
    if (author) params.set("author", author);

    const response = await fetch(`https://api.audible.com/1.0/catalog/products?${params.toString()}`, {
      headers: {
        accept: "application/json",
        "User-Agent": "Shelf-of-Fame/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ asin: null }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const data = await response.json() as AudibleCatalogResponse;
    const ranked = (data.products || [])
      .map((product) => {
        const asin = validAsin(product.asin);
        const t = titleScore(title, product.title);
        const a = authorScore(author, (product.authors || []).map((entry) => entry.name || ""));
        return { asin, score: t + a, titleScore: t, authorScore: a };
      })
      .filter((item): item is { asin: string; score: number; titleScore: number; authorScore: number } => Boolean(item.asin))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    const second = ranked[1];
    const confident = Boolean(
      best
      && best.titleScore >= 11
      && (!author || best.authorScore >= 6)
      && (!second || best.score - second.score >= 1 || best.score >= 22)
    );

    return NextResponse.json(
      confident && best ? { asin: best.asin } : { asin: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ asin: null }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
