"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { PrototypeBook } from "../Bookshelf3DPrototype";

const Bookshelf3DPrototype = dynamic(() => import("../Bookshelf3DPrototype"), { ssr: false });
const STORAGE_KEY = "shelf-of-fame-library-v1";

type StoredBook = PrototypeBook & {
  rating?: number;
  year?: string;
  shelf?: string;
};

const fallbackBooks: StoredBook[] = [
  { id: "preview-1", title: "A Good Girl's Guide to Murder", author: "Holly Jackson", color: "#d7d2c7" },
  { id: "preview-2", title: "The Wrong Catch", author: "C. R. Jane", color: "#6f6257" },
  { id: "preview-3", title: "Along Came Holly", author: "Codi Hall", color: "#536e8c" },
  { id: "preview-4", title: "Beasts Depraved Sinners", author: "Anna", color: "#536c8e" },
  { id: "preview-5", title: "Beautiful Things", author: "Emily Rath", color: "#a8783d" },
  { id: "preview-6", title: "Axes & O's", author: "Kayla Grosse", color: "#47637e" },
  { id: "preview-7", title: "Back in the Burbs", author: "Avery Flynn", color: "#63765a" },
  { id: "preview-8", title: "Crimson Elite", author: "Rina Kent", color: "#7b313d" },
];

function isStoredBook(value: unknown): value is StoredBook {
  if (!value || typeof value !== "object") return false;
  const book = value as Partial<StoredBook>;
  return typeof book.id === "string"
    && typeof book.title === "string"
    && typeof book.author === "string"
    && typeof book.color === "string";
}

export default function ThreeDPrototypePage() {
  const [books, setBooks] = useState<StoredBook[]>(fallbackBooks);
  const [loadedPersonalLibrary, setLoadedPersonalLibrary] = useState(false);
  const [selected, setSelected] = useState<StoredBook | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const stored = parsed.filter(isStoredBook);
      if (!stored.length) return;
      stored.sort((a, b) => a.title.localeCompare(b.title));
      setBooks(stored);
      setLoadedPersonalLibrary(true);
    } catch {
      // The fallback eight-book scene still lets us judge the renderer.
    }
  }, []);

  const firstEight = useMemo(() => books.slice(0, 8), [books]);

  return (
    <main className="prototype-page-shell">
      <header className="prototype-page-header">
        <div>
          <p className="eyebrow">SHELF OF FAME LAB</p>
          <h1>3D Shelf Prototype</h1>
          <p>
            {loadedPersonalLibrary
              ? "Using the first eight books from your real saved library. Nothing here replaces your normal shelf yet."
              : "This browser does not have your production shelf data, so the renderer is using eight representative books for the visual test."}
          </p>
        </div>
        <Link href="/" className="prototype-page-back">← Shelf of Fame</Link>
      </header>

      <Bookshelf3DPrototype
        books={firstEight}
        onSelect={(book) => setSelected(book as StoredBook)}
        onClose={() => window.location.assign("/")}
      />

      {selected ? (
        <div className="prototype-book-card" role="dialog" aria-modal="true" aria-label={selected.title}>
          <button type="button" onClick={() => setSelected(null)} aria-label="Close book details">×</button>
          <span>BOOK SELECTED</span>
          <strong>{selected.title}</strong>
          <small>by {selected.author}</small>
          <p>This click hook is ready to be wired to the production book modal when the renderer graduates from prototype to the main shelf.</p>
        </div>
      ) : null}
    </main>
  );
}
