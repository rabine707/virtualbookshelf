import type { Book } from "../lib/books/client-library";
import type { SocialProfile, SocialProfilePage } from "./social-client";

const FOLLOW_KEY = "shelf-of-fame-local-demo-follows-v1";

type DemoReader = {
  profile: SocialProfile;
  sourceBook: string;
  theme: string;
  communityStars: number;
  books: DemoBook[];
};

export type DemoBook = Book & { demoSpineUrl?: string };

function book(id: string, title: string, author: string, color: string, genres: string[], demoSpineUrl?: string): DemoBook {
  return { id, title, author, rating: 5, color, genres, demoSpineUrl };
}

const demoReaders: DemoReader[] = [
  {
    profile: { id: "local-malachi-vize", username: "malachivize", display_name: "Malachi Vize", bio: "I don't need words. Revenge, gothic hauntings, spiders, and anything worth reading before a sunrise run.", favorite_genres: ["Gothic", "Thriller", "Horror"], followers: 184, following: 42 },
    sourceBook: "Web of Silence", theme: "classic", communityStars: 1260,
    books: [
      book("malachi-monte-cristo", "The Count of Monte Cristo", "Alexandre Dumas", "#24384a", ["Classic", "Revenge"], "/demo-spines/malachi/the-count-of-monte-cristo.png"),
      book("malachi-collector", "The Collector", "John Fowles", "#5b342f", ["Thriller", "Psychological"], "/demo-spines/malachi/the-collector.png"),
      book("malachi-poe", "The Complete Tales and Poems of Edgar Allan Poe", "Edgar Allan Poe", "#262127", ["Gothic", "Horror"], "/demo-spines/malachi/complete-tales-and-poems.png"),
      book("malachi-silence-lambs", "The Silence of the Lambs", "Thomas Harris", "#652b31", ["Thriller", "Horror"], "/demo-spines/malachi/the-silence-of-the-lambs.png"),
      book("malachi-phantom", "The Phantom of the Opera", "Gaston Leroux", "#473a4f", ["Gothic", "Classic"], "/demo-spines/malachi/the-phantom-of-the-opera.png"),
      book("malachi-spiders", "Spiders of North America", "Richard A. Bradley", "#45533c", ["Nature", "Reference"], "/demo-spines/malachi/spiders-of-north-america.png"),
      book("malachi-born-run", "Born to Run", "Christopher McDougall", "#8a633b", ["Running", "Nonfiction"], "/demo-spines/malachi/born-to-run.png"),
      book("malachi-asl", "The ASL Handshape Dictionary", "Richard A. Tennant", "#4d6070", ["Language", "Reference"], "/demo-spines/malachi/the-asl-handshape-dictionary.png"),
    ],
  },
  {
    profile: { id: "local-kade-mitchell", username: "kademitchell", display_name: "Kade Mitchell", bio: "Survival, surveillance, and second chances. I finish what I start—and I protect what's mine.", favorite_genres: ["Thriller", "Crime", "Psychology"], followers: 231, following: 58 },
    sourceBook: "Edge of Darkness", theme: "midnight", communityStars: 1485,
    books: [
      book("kade-bourne", "The Bourne Identity", "Robert Ludlum", "#263d4d", ["Thriller", "Espionage"], "/demo-spines/kade/the-bourne-identity.png"),
      book("kade-dragon-tattoo", "The Girl with the Dragon Tattoo", "Stieg Larsson", "#4f342f", ["Thriller", "Crime"], "/demo-spines/kade/the-girl-with-the-dragon-tattoo.png"),
      book("kade-monte-cristo", "The Count of Monte Cristo", "Alexandre Dumas", "#34495a", ["Classic", "Revenge"], "/demo-spines/kade/the-count-of-monte-cristo.png"),
      book("kade-body-keeps-score", "The Body Keeps the Score", "Bessel van der Kolk", "#526052", ["Psychology", "Trauma"], "/demo-spines/kade/the-body-keeps-the-score.png"),
      book("kade-mans-search", "Man's Search for Meaning", "Viktor E. Frankl", "#6b5948", ["Psychology", "Memoir"], "/demo-spines/kade/mans-search-for-meaning.png"),
      book("kade-art-war", "The Art of War", "Sun Tzu", "#762f2d", ["Strategy", "Classic"], "/demo-spines/kade/the-art-of-war.png"),
      book("kade-no-country", "No Country for Old Men", "Cormac McCarthy", "#55453a", ["Crime", "Thriller"], "/demo-spines/kade/no-country-for-old-men.png"),
      book("kade-sharp-objects", "Sharp Objects", "Gillian Flynn", "#6a3d48", ["Thriller", "Mystery"], "/demo-spines/kade/sharp-objects.png"),
    ],
  },
  {
    profile: { id: "local-jagger-thatcher", username: "jaggerthatcher", display_name: "Jagger Thatcher", bio: "Vegas odds, leverage, loyalty. Not mafia. And husbands are just obstacles with paperwork.", favorite_genres: ["Crime", "Strategy", "Thriller"], followers: 157, following: 37 },
    sourceBook: "Don't Say Mafia", theme: "classic", communityStars: 980,
    books: [
      book("jagger-casino", "Casino", "Nicholas Pileggi", "#4a2723", ["Crime", "Las Vegas"], "/demo-spines/jagger/casino.png"),
      book("jagger-godfather", "The Godfather", "Mario Puzo", "#342826", ["Crime", "Classic"], "/demo-spines/jagger/the-godfather.png"),
      book("jagger-prince", "The Prince", "Niccolò Machiavelli", "#594733", ["Strategy", "Classic"], "/demo-spines/jagger/the-prince.png"),
      book("jagger-never-split", "Never Split the Difference", "Chris Voss", "#214a53", ["Business", "Psychology"], "/demo-spines/jagger/never-split-the-difference.png"),
      book("jagger-art-war", "The Art of War", "Sun Tzu", "#763329", ["Strategy", "Classic"], "/demo-spines/jagger/the-art-of-war.png"),
      book("jagger-you", "You", "Caroline Kepnes", "#6b343d", ["Thriller", "Psychological"], "/demo-spines/jagger/you.png"),
      book("jagger-fear-loathing", "Fear and Loathing in Las Vegas", "Hunter S. Thompson", "#6b6233", ["Las Vegas", "Classic"], "/demo-spines/jagger/fear-and-loathing-in-las-vegas.png"),
      book("jagger-bringing-house", "Bringing Down the House", "Ben Mezrich", "#354e5f", ["Las Vegas", "Nonfiction"], "/demo-spines/jagger/bringing-down-the-house.png"),
    ],
  },
  {
    profile: { id: "local-nikolai-sokolov", username: "nikolaisokolov", display_name: "Nikolai Sokolov", bio: "Fights, Harleys, loud music, too much sugar, and Brandon. Mostly Brandon.", favorite_genres: ["Action", "Music", "Queer"], followers: 312, following: 64 },
    sourceBook: "God of Fury", theme: "emerald-study", communityStars: 1720,
    books: [
      book("nikolai-fight-club", "Fight Club", "Chuck Palahniuk", "#4b3030", ["Action", "Psychological"], "/demo-spines/nikolai/fight-club.png"),
      book("nikolai-zen-motorcycle", "Zen and the Art of Motorcycle Maintenance", "Robert M. Pirsig", "#3e5360", ["Motorcycles", "Philosophy"], "/demo-spines/nikolai/zen-and-the-art-of-motorcycle-maintenance.png"),
      book("nikolai-high-fidelity", "High Fidelity", "Nick Hornby", "#6b4f32", ["Music", "Contemporary"], "/demo-spines/nikolai/high-fidelity.png"),
      book("nikolai-song-achilles", "The Song of Achilles", "Madeline Miller", "#426075", ["Queer", "Romance"], "/demo-spines/nikolai/the-song-of-achilles.png"),
      book("nikolai-art-war", "The Art of War", "Sun Tzu", "#742f2b", ["Strategy", "Classic"], "/demo-spines/nikolai/the-art-of-war.png"),
      book("nikolai-kitchen", "Kitchen Confidential", "Anthony Bourdain", "#41413c", ["Food", "Memoir"], "/demo-spines/nikolai/kitchen-confidential.png"),
      book("nikolai-batman", "Batman: Year One", "Frank Miller", "#2f3338", ["Comics", "Action"], "/demo-spines/nikolai/batman-year-one.png"),
      book("nikolai-perks", "The Perks of Being a Wallflower", "Stephen Chbosky", "#4c6448", ["Queer", "Coming of Age"], "/demo-spines/nikolai/the-perks-of-being-a-wallflower.png"),
    ],
  },
  {
    profile: { id: "local-emmett-montgomery", username: "emmettmontgomery", display_name: "Emmett Montgomery", bio: "Former All-Star. Warriors manager. Dad first. Build the person and the player will follow.", favorite_genres: ["Baseball", "Leadership", "Family"], followers: 129, following: 51 },
    sourceBook: "In Her Own League", theme: "warm-library", communityStars: 845,
    books: [
      book("emmett-boys-summer", "The Boys of Summer", "Roger Kahn", "#43566a", ["Baseball", "History"], "/demo-spines/emmett/the-boys-of-summer.png"),
      book("emmett-moneyball", "Moneyball", "Michael Lewis", "#4e633e", ["Baseball", "Business"], "/demo-spines/emmett/moneyball.png"),
      book("emmett-legacy", "Legacy", "James Kerr", "#332e2b", ["Leadership", "Sports"], "/demo-spines/emmett/legacy.png"),
      book("emmett-culture-code", "The Culture Code", "Daniel Coyle", "#72513a", ["Leadership", "Psychology"], "/demo-spines/emmett/the-culture-code.png"),
      book("emmett-ove", "A Man Called Ove", "Fredrik Backman", "#455b66", ["Family", "Contemporary"], "/demo-spines/emmett/a-man-called-ove.png"),
      book("emmett-baseball-100", "The Baseball 100", "Joe Posnanski", "#6c3c32", ["Baseball", "History"], "/demo-spines/emmett/the-baseball-100.png"),
      book("emmett-art-fielding", "The Art of Fielding", "Chad Harbach", "#405b49", ["Baseball", "Fiction"], "/demo-spines/emmett/the-art-of-fielding.png"),
      book("emmett-last-lecture", "The Last Lecture", "Randy Pausch", "#83633e", ["Family", "Memoir"], "/demo-spines/emmett/the-last-lecture.png"),
    ],
  },
];

function normalizedUsername(username: string) {
  return decodeURIComponent(username).replace(/^@/, "").trim().toLowerCase();
}

function followedUsernames() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const saved = JSON.parse(window.localStorage.getItem(FOLLOW_KEY) || "[]");
    return new Set(Array.isArray(saved) ? saved.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function profileWithLocalFollow(reader: DemoReader): SocialProfile {
  const isFollowing = followedUsernames().has(reader.profile.username);
  return {
    ...reader.profile,
    is_demo: true,
    favorite_genres: [...(reader.profile.favorite_genres || [])],
    is_following: isFollowing,
    is_self: false,
    followers: Number(reader.profile.followers || 0) + (isFollowing ? 1 : 0),
  };
}

export function localDemoReader(username: string) {
  return demoReaders.find((reader) => reader.profile.username === normalizedUsername(username)) || null;
}

export function localDemoReaderPage(query = "", offset = 0, limit = 24): SocialProfilePage | null {
  const needle = query.replace(/^@/, "").trim().toLowerCase();
  const matching = demoReaders.filter((reader) => !needle || [
    reader.profile.username,
    reader.profile.display_name,
    reader.profile.bio,
    reader.sourceBook,
    ...(reader.profile.favorite_genres || []),
  ].some((value) => String(value || "").toLowerCase().includes(needle)));
  const profiles = matching.slice(offset, offset + limit).map(profileWithLocalFollow);
  return { profiles, next_offset: offset + limit < matching.length ? offset + limit : null };
}

export function localDemoPublicShelf(username: string): Record<string, unknown> | null | undefined {
  const reader = localDemoReader(username);
  // Unknown usernames should continue to Supabase. Returning null here makes
  // every real public profile look private while developing on localhost.
  if (!reader) return undefined;
  return {
    profile: { ...reader.profile, is_demo: true },
    settings: {
      theme: reader.theme,
      community_stars: reader.communityStars,
      plan: "premium",
      profile_favorite_book_ids: reader.books.slice(0, 5).map((book) => book.id),
      profile_favorites_style: "spines",
    },
    books: reader.books.map((book) => ({ ...book })),
  };
}

export function localDemoSocial(username: string): Record<string, unknown> | null {
  const reader = localDemoReader(username);
  if (!reader) return null;
  const profile = profileWithLocalFollow(reader);
  return {
    favorite_genres: profile.favorite_genres,
    followers: profile.followers,
    following: profile.following,
    is_following: profile.is_following,
    is_self: false,
  };
}

export function setLocalDemoFollow(username: string, follow: boolean): Record<string, unknown> | null {
  const reader = localDemoReader(username);
  if (!reader || typeof window === "undefined") return null;
  const followed = followedUsernames();
  if (follow) followed.add(reader.profile.username);
  else followed.delete(reader.profile.username);
  window.localStorage.setItem(FOLLOW_KEY, JSON.stringify([...followed]));
  return localDemoSocial(reader.profile.username);
}

export function localDemoConnections(username: string, offset = 0, limit = 30): SocialProfilePage | null {
  const reader = localDemoReader(username);
  if (!reader) return null;
  const profiles = demoReaders
    .filter((candidate) => candidate.profile.username !== reader.profile.username)
    .slice(offset, offset + limit)
    .map(profileWithLocalFollow);
  return { profiles, next_offset: null };
}
