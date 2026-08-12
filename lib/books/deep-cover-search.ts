import {
  deepAuthorLastName,
  deepBareKeywords,
  deepKeywordSearchText,
  deepTitleVariants,
  normalizeBookText,
} from "./matching";
import type { CoverCandidate } from "./providers";
import {
  googleBooksCovers,
  openLibraryBareKeywordSearch,
  openLibraryCoverByIsbn,
  openLibraryKeywordSearch,
  openLibrarySearchByIsbn,
  openLibrarySearchByTitle,
} from "./deep-providers";
import {
  libraryThingIsbnsByTitle,
  libraryThingPopularCoversByTitle,
  libraryThingRelatedIsbns,
} from "./library-thing";

export type DeepCoverSearchInput = {
  isbn: string;
  title: string;
  author: string;
  includeLibraryThing: boolean;
};

export type RankedCover = {
  url: string;
  source: string;
};

export type DeepCoverSearchResult = {
  options: RankedCover[];
  discoveredIsbn: string;
};

function uniqueRanked(options: CoverCandidate[]) {
  const seen = new Set<string>();
  return options
    .sort((a, b) => b.score - a.score)
    .filter((option) => {
      const key = option.url.replace(/&zoom=\d+/i, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 60)
    .map(({ url, source }) => ({ url, source }));
}

export async function searchDeepCovers(input: DeepCoverSearchInput): Promise<DeepCoverSearchResult> {
  const { isbn, title, author, includeLibraryThing } = input;
  let discoveredIsbn = "";
  const searches: Promise<CoverCandidate[]>[] = [];

  if (isbn) {
    searches.push(openLibraryCoverByIsbn(isbn));
    searches.push(openLibrarySearchByIsbn(isbn));
    searches.push(googleBooksCovers(`isbn:${isbn}`, title, author, true));
  }

  if (title) {
    for (const searchTitle of deepTitleVariants(title)) {
      searches.push(openLibrarySearchByTitle(searchTitle, title, author));
      searches.push(openLibraryKeywordSearch(searchTitle, title, author));
      searches.push(openLibraryBareKeywordSearch(searchTitle, title, author));

      const strictGoogleQuery = author
        ? `intitle:${searchTitle} inauthor:${author}`
        : `intitle:${searchTitle}`;
      searches.push(googleBooksCovers(strictGoogleQuery, title, author));
      searches.push(googleBooksCovers(author ? `${searchTitle} ${author}` : searchTitle, title, author));

      const keywordQuery = deepKeywordSearchText(searchTitle, author);
      if (keywordQuery) searches.push(googleBooksCovers(keywordQuery, title, author));

      const bareKeywords = deepBareKeywords(searchTitle);
      if (bareKeywords && normalizeBookText(bareKeywords) !== normalizeBookText(keywordQuery)) {
        searches.push(googleBooksCovers(bareKeywords, title, author));
      }

      const authorLastName = deepAuthorLastName(author);
      if (authorLastName && bareKeywords) {
        searches.push(googleBooksCovers(`${bareKeywords} inauthor:${authorLastName}`, title, author));
      }
    }
  }

  const groups = await Promise.allSettled(searches);
  let candidates = groups.flatMap((group) => group.status === "fulfilled" ? group.value : []);

  if (includeLibraryThing) {
    try {
      let editionIsbns: string[] = [];

      if (isbn) {
        const relatedIsbns = await libraryThingRelatedIsbns(isbn);
        editionIsbns = [isbn, ...relatedIsbns];
      } else if (title) {
        editionIsbns = await libraryThingIsbnsByTitle(title);
        discoveredIsbn = editionIsbns[0] || "";
      }

      const deeperSearches: Promise<CoverCandidate[]>[] = [];
      for (const [index, editionIsbn] of editionIsbns.entries()) {
        deeperSearches.push(openLibraryCoverByIsbn(editionIsbn));
        deeperSearches.push(openLibrarySearchByIsbn(editionIsbn));
        deeperSearches.push(googleBooksCovers(`isbn:${editionIsbn}`, title, author, !discoveredIsbn));
        if (index >= 9) break;
      }

      const [deepGroups, libraryThingGallery] = await Promise.all([
        Promise.allSettled(deeperSearches),
        title ? libraryThingPopularCoversByTitle(title, author) : Promise.resolve([]),
      ]);

      const relatedCandidates = deepGroups
        .flatMap((group) => group.status === "fulfilled" ? group.value : [])
        .map((option, index) => ({
          ...option,
          score: Math.min(option.score, 19.5 - index * 0.01),
        }));

      candidates = [...candidates, ...relatedCandidates, ...libraryThingGallery];
    } catch {
      // LibraryThing is an optional title, edition, and cover-discovery source.
    }
  }

  return {
    options: uniqueRanked(candidates),
    discoveredIsbn,
  };
}
