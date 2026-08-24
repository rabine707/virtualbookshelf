const GENERIC_TAGS = new Set([
  "fiction", "general", "literature", "books", "accessible book", "protected daisy",
]);

export type PublicBookTags = {
  genres: string[];
  subjects: string[];
};

function displayTag(value: string) {
  const cleaned = value.replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "";
}

export function cleanPublicTags(values: string[], limit = 8) {
  const seen = new Set<string>();
  return values
    .map(displayTag)
    .filter((value) => value.length >= 3 && value.length <= 42 && !GENERIC_TAGS.has(value.toLowerCase()))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function mergePublicTags(googleCategories: string[], openLibrarySubjects: string[]): PublicBookTags {
  return {
    genres: cleanPublicTags(googleCategories, 6),
    subjects: cleanPublicTags(openLibrarySubjects, 8),
  };
}
