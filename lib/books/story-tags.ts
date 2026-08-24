import type { Book } from "./client-library";

export type BookStoryTags = {
  tropes: string[];
  genres: string[];
  moods: string[];
  themes: string[];
  goodreads: string[];
  source: "stored" | "curated" | "suggested";
  inferred: boolean;
};

type CuratedStoryTags = Pick<BookStoryTags, "tropes" | "genres" | "moods" | "themes">;

const CURATED_STORY_TAGS: Record<string, CuratedStoryTags> = {
  "beach read": {
    tropes: ["Enemies to lovers", "Grumpy/sunshine", "Slow burn", "Forced proximity", "Friends to lovers", "Second chance"],
    genres: ["Contemporary romance", "New adult"],
    moods: ["Funny & witty", "Angsty", "Emotional"],
    themes: ["Writers & creative process", "Grief & loss", "Small-town summer"],
  },
  "people we meet on vacation": {
    tropes: ["Friends to lovers", "Slow burn", "Second chance", "Opposites attract"],
    genres: ["Contemporary romance"], moods: ["Warm & escapist", "Funny & witty", "Emotional"],
    themes: ["Travel", "Long-term friendship", "Finding home"],
  },
  "red white royal blue": {
    tropes: ["Enemies to lovers", "Secret relationship", "Forbidden romance", "Long distance"],
    genres: ["Contemporary romance", "LGBTQ+ romance"], moods: ["Funny & witty", "Hopeful", "Romantic"],
    themes: ["Royalty", "Politics", "Identity"],
  },
  "ugly love": {
    tropes: ["Friends with benefits", "No strings attached", "Forbidden feelings"],
    genres: ["Contemporary romance", "New adult"], moods: ["Angsty", "Emotional", "Heartbreaking"],
    themes: ["Grief", "Healing", "Fear of commitment"],
  },
  "the silent patient": {
    tropes: ["Unreliable narrator", "Hidden past", "Obsessive investigation"],
    genres: ["Psychological thriller", "Mystery"], moods: ["Suspenseful", "Dark & twisty"],
    themes: ["Trauma", "Silence", "Truth & deception"],
  },
  "the guest list": {
    tropes: ["Closed-circle mystery", "Multiple POV", "Everyone has a secret"],
    genres: ["Mystery", "Thriller"], moods: ["Atmospheric", "Suspenseful", "Dark & twisty"],
    themes: ["Isolation", "Revenge", "Buried secrets"],
  },
  "the paris apartment": {
    tropes: ["Locked-room mystery", "Missing person", "Everyone has a secret"],
    genres: ["Mystery", "Thriller"], moods: ["Atmospheric", "Suspenseful", "Claustrophobic"],
    themes: ["Paris", "Family secrets", "Hidden lives"],
  },
  "icebreaker": {
    tropes: ["Sports romance", "Forced proximity", "He falls first", "College romance"],
    genres: ["Contemporary romance", "New adult"], moods: ["Playful", "Steamy", "Comforting"],
    themes: ["Hockey", "Figure skating", "Team & friendship"],
  },
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 8);
}

function has(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function titleKey(title: string) {
  return title.toLowerCase().replace(/\s*[([][^\])]+[\])]\s*$/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function storyTagsForBook(book: Book): BookStoryTags {
  const storedTropes = unique(book.tropes || []);
  const storedGenres = unique([...(book.genres || []), ...(book.publicGenres || [])]);
  const storedMoods = unique(book.moods || []);
  const storedThemes = unique([...(book.themes || []), ...(book.publicSubjects || [])]);
  const goodreads = unique(book.goodreadsTags || []);
  const curated = CURATED_STORY_TAGS[titleKey(book.title)];
  if (storedTropes.length || storedGenres.length || storedMoods.length || storedThemes.length) {
    return {
      tropes: unique([...storedTropes, ...(curated?.tropes || [])]),
      genres: unique([...storedGenres, ...(curated?.genres || [])]),
      moods: unique([...storedMoods, ...(curated?.moods || [])]),
      themes: unique([...storedThemes, ...(curated?.themes || [])]),
      goodreads,
      source: "stored",
      inferred: false,
    };
  }

  if (curated) {
    return { ...curated, goodreads, source: "curated", inferred: false };
  }

  const text = `${book.title} ${book.shelf || ""}`.toLowerCase();
  const tropes: string[] = [];
  const genres: string[] = [];
  const moods: string[] = [];

  if (has(text, ["neighbor", "next door"])) tropes.push("Neighbors");
  if (has(text, ["roommate"])) tropes.push("Roommates");
  if (has(text, ["fake out", "fake date", "fake dating"])) tropes.push("Fake dating");
  if (has(text, ["rival", "enemy", "enemies", "hate"])) tropes.push("Rivals to lovers");
  if (has(text, ["second chance", "bring me back", "reminders", "again"])) tropes.push("Second chance");
  if (has(text, ["wedding", "hitched", "marry", "bride", "groom"])) tropes.push("Marriage pact");
  if (has(text, ["hockey", "puck", "icebreaker", "player", "team", "football"])) tropes.push("Sports romance");
  if (has(text, ["cowboy", "ranch", "rodeo"])) tropes.push("Cowboy romance");
  if (has(text, ["billionaire", "boss", "highest bidder"])) tropes.push("Power imbalance");
  if (has(text, ["beach", "summer", "vacation", "pool boy"])) tropes.push("Summer romance");

  if (has(text, ["love", "kiss", "crush", "darling", "romance", "puck", "wedding", "tempt me"])) genres.push("Romance");
  if (has(text, ["murder", "mystery", "patient", "lies", "guest list", "ritual", "silent"])) genres.push("Mystery & thriller");
  if (has(text, ["crown", "king", "queen", "god of", "warlock", "witch", "dragon", "fae", "wings"])) genres.push("Fantasy");
  if (has(text, ["dark", "haunting", "hunting", "venom", "villain", "sinner", "cruel", "wicked", "butcher"])) genres.push("Dark romance");
  if (!genres.length && tropes.length) genres.push("Contemporary romance");

  if (has(text, ["beach", "summer", "vacation", "merry", "christmas", "sweet"])) moods.push("Warm & escapist");
  if (has(text, ["dark", "haunting", "blood", "venom", "ritual", "murder", "lies"])) moods.push("Dark & twisty");
  if (has(text, ["heart", "love", "reminders", "hurt", "ends with us", "what's left"])) moods.push("Emotional");
  if (has(text, ["funny", "cute", "play", "fake out", "crush"])) moods.push("Playful");
  if (has(text, ["secret", "mystery", "silent", "watching", "guest list"])) moods.push("Suspenseful");

  return {
    tropes: unique(tropes),
    genres: unique(genres),
    moods: unique(moods),
    themes: [],
    goodreads,
    source: "suggested",
    inferred: true,
  };
}
