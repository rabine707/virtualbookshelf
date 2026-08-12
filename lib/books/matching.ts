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

export type DeepMatchResult = {
  score: number;
  accepted: boolean;
};

export type DeepTitleEvidence = {
  score: number;
  exact: boolean;
  adjacent: boolean;
  coverage: number;
  keywordCount: number;
  keywordMatches: number;
};

function looksLikeSeriesMetadata(value: string) {
  const text = value.trim();
  return /#\s*\d+(?:\.\d+)?\b/i.test(text)
    || /\b(?:book|volume|vol\.?|part)\s*(?:#|no\.?\s*)?\d+(?:\.\d+)?\b/i.test(text)
    || /\b(?:series|duet|trilogy|saga)\b[^\d]{0,30}\d+(?:\.\d+)?\b/i.test(text);
}

export function stripGoodreadsSeriesSuffix(title: string) {
  let cleaned = title.trim();

  for (let pass = 0; pass < 3; pass += 1) {
    const match = cleaned.match(/\s*[\(\[]([^\)\]]+)[\)\]]\s*$/);
    if (!match || !looksLikeSeriesMetadata(match[1])) break;
    cleaned = cleaned.slice(0, match.index).trim();
  }

  cleaned = cleaned
    .replace(/\s*[-–—:]\s*(?:book|volume|vol\.?|part)\s*(?:#|no\.?\s*)?\d+(?:\.\d+)?\s*$/i, "")
    .trim();

  return cleaned || title.trim();
}

function addUsefulVariant(values: string[], candidate?: string) {
  const value = candidate?.trim();
  if (!value) return;
  const keywords = titleWords(value);
  if (!keywords.length) return;
  values.push(value);
}

export function deepTitleVariants(title: string) {
  const original = title.trim();
  const seriesCleaned = stripGoodreadsSeriesSuffix(original);
  const candidates: string[] = [];

  addUsefulVariant(candidates, seriesCleaned);
  addUsefulVariant(candidates, original);

  for (const value of [seriesCleaned, original]) {
    const subtitle = value.split(/\s*[:–—]\s*/)[0]?.trim();
    if (subtitle && titleWords(subtitle).length >= 2) addUsefulVariant(candidates, subtitle);

    const trailingParenthetical = value.replace(/\s*[\(\[][^\)\]]+[\)\]]\s*$/, "").trim();
    if (trailingParenthetical && titleWords(trailingParenthetical).length >= 2) {
      addUsefulVariant(candidates, trailingParenthetical);
    }
  }

  const seen = new Set<string>();
  return candidates.filter((variant) => {
    const key = normalizeBookText(variant);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function deepAuthorEvidence(requestedAuthor: string, candidateAuthors: string[]) {
  const wanted = normalizeBookText(requestedAuthor);
  if (!wanted) return 0;

  const wantedWords = words(wanted);
  const wantedLastName = wantedWords.at(-1);
  let best = 0;

  for (const candidate of candidateAuthors) {
    const found = normalizeBookText(candidate);
    if (!found) continue;

    if (found === wanted || found.includes(wanted) || wanted.includes(found)) {
      best = Math.max(best, 8);
      continue;
    }

    const foundWords = words(found);
    const foundSet = new Set(foundWords);
    const shared = wantedWords.filter((word) => foundSet.has(word)).length;
    const overlap = wantedWords.length ? shared / wantedWords.length : 0;

    if (wantedLastName && foundSet.has(wantedLastName)) best = Math.max(best, 5);
    if (overlap >= 0.67) best = Math.max(best, 4);
    else if (overlap >= 0.5) best = Math.max(best, 3);
  }

  return best;
}

export function deepTitleEvidence(requestedTitle: string, candidateTitle?: string): DeepTitleEvidence {
  const wantedTitle = normalizeBookText(requestedTitle);
  const foundTitle = normalizeBookText(candidateTitle);
  if (!wantedTitle || !foundTitle) {
    return { score: 0, exact: false, adjacent: false, coverage: 0, keywordCount: 0, keywordMatches: 0 };
  }

  const wantedKeywords = titleWords(wantedTitle);
  const foundKeywordSet = new Set(titleWords(foundTitle));
  const keywordMatches = wantedKeywords.filter((word) => foundKeywordSet.has(word)).length;
  const coverage = wantedKeywords.length ? keywordMatches / wantedKeywords.length : 0;

  let score = 0;
  let exact = false;
  let adjacent = false;

  if (foundTitle === wantedTitle) {
    score = 14;
    exact = true;
  } else if (foundTitle.includes(wantedTitle) || wantedTitle.includes(foundTitle)) {
    score = 11;
    adjacent = true;
  } else {
    score = coverage * 9;
    if (coverage >= 0.75) score += 1;
    if (keywordMatches >= 2 && coverage >= 0.5) score += 0.5;
  }

  return { score, exact, adjacent, coverage, keywordCount: wantedKeywords.length, keywordMatches };
}

export function matchDeepBookCandidate(
  requestedTitle: string,
  requestedAuthor: string,
  candidateTitle?: string,
  candidateAuthors: string[] = [],
): DeepMatchResult {
  const titleMatches = deepTitleVariants(requestedTitle)
    .map((variant) => deepTitleEvidence(variant, candidateTitle))
    .sort((a, b) => b.score - a.score);
  const bestTitle = titleMatches[0];
  if (!bestTitle || bestTitle.score <= 0) return { score: 0, accepted: false };

  const authorMatch = deepAuthorEvidence(requestedAuthor, candidateAuthors);
  const hasRequestedAuthor = Boolean(normalizeBookText(requestedAuthor));
  const score = bestTitle.score + authorMatch;

  let accepted = false;
  if (!hasRequestedAuthor) {
    accepted = bestTitle.exact
      || bestTitle.adjacent
      || bestTitle.coverage >= 0.5
      || bestTitle.keywordMatches >= 2;
  } else if (authorMatch >= 7) {
    accepted = bestTitle.exact || bestTitle.adjacent || bestTitle.keywordMatches >= 1 || bestTitle.coverage >= 0.1;
  } else if (authorMatch >= 5) {
    accepted = bestTitle.exact || bestTitle.adjacent || bestTitle.keywordMatches >= 1 || bestTitle.coverage >= 0.2;
  } else if (authorMatch >= 3) {
    accepted = bestTitle.exact || bestTitle.adjacent || bestTitle.coverage >= 0.5 || bestTitle.keywordMatches >= 2;
  }

  if (hasRequestedAuthor && bestTitle.keywordCount <= 1 && authorMatch < 3) accepted = false;
  if (!bestTitle.exact && !bestTitle.adjacent && bestTitle.keywordMatches < 1) accepted = false;
  return { score, accepted };
}

export function deepKeywordSearchText(title: string, author: string) {
  const keywords = titleWords(title).slice(0, 6);
  const authorLastName = words(author).at(-1);
  return [...keywords, authorLastName].filter(Boolean).join(" ");
}

export function deepBareKeywords(title: string) {
  return titleWords(title).slice(0, 5).join(" ");
}

export function deepAuthorLastName(author: string) {
  return words(author).at(-1);
}
