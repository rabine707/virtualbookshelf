import type { Book } from "./client-library";

export type BookStoryTags = {
  tropes: string[];
  genres: string[];
  moods: string[];
  inferred: boolean;
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 8);
}

function has(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function storyTagsForBook(book: Book): BookStoryTags {
  const storedTropes = unique(book.tropes || []);
  const storedGenres = unique(book.genres || []);
  const storedMoods = unique(book.moods || []);
  if (storedTropes.length || storedGenres.length || storedMoods.length) {
    return { tropes: storedTropes, genres: storedGenres, moods: storedMoods, inferred: false };
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
    inferred: true,
  };
}
