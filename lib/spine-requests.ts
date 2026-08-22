export type SpineRequestStatus = "pending" | "in_progress" | "completed" | "declined";

export function spineRequestBookKey(input: {
  title: string;
  author: string;
  isbn?: string;
  asin?: string;
}) {
  const isbn = input.isbn?.replace(/[^0-9X]/gi, "").toUpperCase();
  if (isbn) return `isbn:${isbn}`;

  const asin = input.asin?.replace(/\s+/g, "").toUpperCase();
  if (asin) return `asin:${asin}`;

  const normalize = (value: string) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return `book:${normalize(input.title)}|${normalize(input.author)}`;
}
