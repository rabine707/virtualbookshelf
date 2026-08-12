"use client";

import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { applyAudibleCoverFallback, AudibleCoverLookup } from "../../lib/books/audible-fallback";
import { Book, CoverResult } from "../../lib/books/client-library";

type UseAudibleCoverFallbackOptions = {
  selected: Book | null;
  cover: CoverResult | null;
  coverLoading: boolean;
  setBooks: Dispatch<SetStateAction<Book[]>>;
  setSelected: Dispatch<SetStateAction<Book | null>>;
  setCover: Dispatch<SetStateAction<CoverResult | null>>;
};

export function useAudibleCoverFallback({
  selected,
  cover,
  coverLoading,
  setBooks,
  setSelected,
  setCover,
}: UseAudibleCoverFallbackOptions) {
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    if (!selected || coverLoading || cover || selected.preferredCover?.url) return;
    if (attempted.current.has(selected.id)) return;
    attempted.current.add(selected.id);

    const controller = new AbortController();
    const params = new URLSearchParams({
      title: selected.title,
      author: selected.author,
    });

    fetch(`/api/asin?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => response.ok ? response.json() as Promise<AudibleCoverLookup> : null)
      .then((result) => {
        if (!result || controller.signal.aborted) return;
        if (!result.asin && !result.coverUrl) return;

        const updated = applyAudibleCoverFallback(selected, result);
        if (updated === selected) return;

        setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
        setSelected((current) => current?.id === selected.id ? updated : current);
        if (updated.preferredCover?.url && updated.preferredCover.url !== selected.preferredCover?.url) {
          setCover(updated.preferredCover);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [cover, coverLoading, selected, setBooks, setCover, setSelected]);
}
