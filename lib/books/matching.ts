const STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "book", "by", "edition", "for", "from", "in", "into",
  "novel", "of", "on", "or", "series", "the", "to", "volume", "with",
]);

export function normalizeBookText(value?: string) {
  return (value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(value?: string) {
  return normalizeBookText(value).split(" ").filter(Boolean);
}

function titleWords(value?: string) {
  const all = words(value);
  const useful = all.filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  return useful.length ? [...new Set(useful)] : [...new Set(all)];
}

export function stripSeriesSuffix(title: string) {
  let cleaned = title.trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const match = cleaned.match(/\s*[\(\[]([^\)\]]+)[\)\]]\s*$/);
    if (!match) break;
    const metadata = match[1];
    const looksLikeSeries = /#\s*\d+(?:\.\d+)?\b/i.test(metadata)
      || /\b(?:book|volume|vol\.?|part)\s*(?:#|no\.?\s*)?\d+(?:\.\d+)?\b/i.test(metadata)
      || /\b(?:series|duet|trilogy|saga)\b[^\d]{0,30}\d+(?:\.\d+)?\b/i.test(metadata);
    if (!looksLikeSeries) break;
    cleaned = cleaned.slice(0, match.index).trim();
  }
  return cleaned || title.trim();
}

export function cleanIsbn(value?: string) {
  const cleaned = (value || "").replace(/[^0-9Xx]/g, "");
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : null;
}

function authorScore(requestedAuthor: string, candidates: string[]) {
  const wanted = words(requestedAuthor);
  if (!wanted.length) return 0;
  const lastName = wanted.at(-1);
  let best = 0;

  for (const candidate of candidates) {
    const found = words(candidate);
    if (!found.length) continue;
    const foundSet = new Set(found);
    const shared = wanted.filter((word) => foundSet.has(word)).length;
    const overlap = shared / wanted.length;

    if (normalizeBookText(candidate) === normalizeBookText(requestedAuthor)) best = Math.max(best, 10);
    else if (lastName && foundSet.has(lastName) && overlap >= 0.5) best = Math.max(best, 8);
    else if (lastName && foundSet.has(lastName)) best = Math.max(best, 6);
    else if (overlap >= 0.67) best = Math.max(best, 5);
  }

  return best;
}

function titleScore(requestedTitle: string, candidateTitle?: string) {
  const wanted = normalizeBookText(stripSeriesSuffix(requestedTitle));
  const found = normalizeBookText(candidateTitle);
  if (!wanted || !found) return 0;
  if (wanted === found) return 14;
  if (wanted.includes(found) || found.includes(wanted)) return 11;

  const wantedKeywords = titleWords(wanted);
  const foundSet = new Set(titleWords(found));
  const matches = wantedKeywords.filter((word) => foundSet.has(word)).length;
  const coverage = wantedKeywords.length ? matches / wantedKeywords.length : 0;

  if (coverage >= 0.85 && matches >= 2) return 9;
  if (coverage >= 0.67 && matches >= 2) return 7;
  if (coverage >= 0.5 && matches >= 2) return 5;
  return 0;
}

export function scoreBookCandidate(
  title: string,
  author: string,
  candidateTitle?: string,
  candidateAuthors: string[] = [],
) {
  const titleMatch = titleScore(title, candidateTitle);
  if (!titleMatch) return 0;
  const authorMatch = authorScore(author, candidateAuthors);
  if (author && authorMatch < 5) return 0;
  return titleMatch + authorMatch;
}
