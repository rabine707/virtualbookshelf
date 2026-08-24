"use client";

import { Dispatch, SetStateAction, useEffect } from "react";
import { Book } from "../../lib/books/client-library";
import type { PublicBookTags } from "../../lib/books/public-tags";

const TAG_REFRESH_MS = 180 * 24 * 60 * 60 * 1000;

type Options = {
  selected: Book | null;
  setSelected: Dispatch<SetStateAction<Book | null>>;
  setBooks: Dispatch<SetStateAction<Book[]>>;
};

export function useBookTagEnrichment({ selected, setSelected, setBooks }: Options) {
  useEffect(() => {
    if (!selected) return;
    if (selected.publicTagsCheckedAt && Date.now() - selected.publicTagsCheckedAt < TAG_REFRESH_MS) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ title: selected.title, author: selected.author });
    fetch(`/api/book-tags?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<PublicBookTags> : null)
      .then((tags) => {
        if (!tags) return;
        const checkedAt = Date.now();
        const update = (book: Book): Book => ({
          ...book,
          publicGenres: tags.genres,
          publicSubjects: tags.subjects,
          publicTagsCheckedAt: checkedAt,
        });
        setBooks((current) => current.map((book) => book.id === selected.id ? update(book) : book));
        setSelected((current) => current?.id === selected.id ? update(current) : current);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [selected?.id, selected?.publicTagsCheckedAt, setBooks, setSelected]);
}
