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
  const activeBookId = useRef<string | null>(null);
  const sawPrimaryLookup = useRef(false);
  const attempted = useRef(false);

  useEffect(() => {
    const selectedId = selected?.id || null;
    if (activeBookId.current !== selectedId) {
      activeBookId.current = selectedId;
      sawPrimaryLookup.current = false;
      attempted.current = false;
    }

    if (!selected) return;

    // The cover-manager effect starts its fetch after the same render that opens
    // the modal. Requiring an observed loading=true state prevents Audible from
    // racing ahead on that first render, so it remains a true fallback.
    if (coverLoading) {
      sawPrimaryLookup.current = true;
      return;
    }

    if (!sawPrimaryLookup.current || attempted.current || cover || selected.preferredCover?.url) return;
    attempted.current = true;

    const controller = new AbortController();
    let settled = false;
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
      .catch(() => undefined)
      .finally(() => {
        settled = true;
      });

    return () => {
      controller.abort();
      if (!settled && activeBookId.current === selected.id) attempted.current = false;
    };
  }, [cover, coverLoading, selected, setBooks, setCover, setSelected]);
}
