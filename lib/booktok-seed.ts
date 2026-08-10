export type TrendingSeedTitle = {
  title: string;
  author: string;
  bucket: "romance" | "dark-romance" | "litrpg" | "romantasy";
};

// Curated from current BookTok/TikTok reading signals and adjacent popularity sources.
// Keep this list intentionally small and recognizable; broader genre searches backfill the queue.
export const BOOKTOK_TRENDING_TITLES: TrendingSeedTitle[] = [
  { title: "Daggermouth", author: "H.M. Wolfe", bucket: "romance" },
  { title: "Alchemised", author: "SenLinYu", bucket: "romantasy" },
  { title: "Just for the Summer", author: "Abby Jimenez", bucket: "romance" },
  { title: "Fourth Wing", author: "Rebecca Yarros", bucket: "romantasy" },
  { title: "Onyx Storm", author: "Rebecca Yarros", bucket: "romantasy" },
  { title: "A Court of Thorns and Roses", author: "Sarah J. Maas", bucket: "romantasy" },
  { title: "It Happened One Summer", author: "Tessa Bailey", bucket: "romance" },
  { title: "Lights Out", author: "Navessa Allen", bucket: "dark-romance" },
  { title: "Butcher & Blackbird", author: "Brynne Weaver", bucket: "dark-romance" },
  { title: "Haunting Adeline", author: "H.D. Carlton", bucket: "dark-romance" },
  { title: "Does It Hurt?", author: "H.D. Carlton", bucket: "dark-romance" },
  { title: "Little Stranger", author: "Leigh Rivers", bucket: "dark-romance" },
  { title: "Sinners Anonymous", author: "Somme Sketcher", bucket: "dark-romance" },
  { title: "Birthday Girl", author: "Penelope Douglas", bucket: "dark-romance" },
  { title: "Dungeon Crawler Carl", author: "Matt Dinniman", bucket: "litrpg" },
  { title: "Carl's Doomsday Scenario", author: "Matt Dinniman", bucket: "litrpg" },
  { title: "He Who Fights with Monsters", author: "Shirtaloon", bucket: "litrpg" },
  { title: "Unsouled", author: "Will Wight", bucket: "litrpg" },
  { title: "The Path of Ascension", author: "C. Mantis", bucket: "litrpg" },
  { title: "Mistborn: The Final Empire", author: "Brandon Sanderson", bucket: "romantasy" },
];

export function sanitizeTrendingTitles(input: unknown): TrendingSeedTitle[] {
  if (!Array.isArray(input)) return [];
  const rows: TrendingSeedTitle[] = [];
  for (const raw of input.slice(0, 100)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim().slice(0, 300) : "";
    const author = typeof row.author === "string" ? row.author.trim().slice(0, 200) : "";
    const bucket = row.bucket === "dark-romance" || row.bucket === "litrpg" || row.bucket === "romantasy" ? row.bucket : "romance";
    if (title && author) rows.push({ title, author, bucket });
  }
  return rows;
}
