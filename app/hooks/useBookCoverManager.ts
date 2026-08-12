"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  allowedCovers,
  Book,
  coverKey,
  coverMemory,
  coverOptionsMemory,
  coverRequestUrl,
  CoverFeedback,
  CoverResponse,
  CoverResult,
  isbnForBook,
  rejectedUrls,
  romanceCoverRequestUrl,
} from "../../lib/books/client-library";

type UseBookCoverManagerOptions = {
  setBooks: Dispatch<SetStateAction<Book[]>>;
  showToast: (message: string) => void;
};

export function useBookCoverManager({ setBooks, showToast }: UseBookCoverManagerOptions) {
  const [selected, setSelected] = useState<Book | null>(null);
  const [cover, setCover] = useState<CoverResult | null>(null);
  const [coverOptions, setCoverOptions] = useState<CoverResult[]>([]);
  const [coverLoading, setCoverLoading] = useState(false);
  const [deepSearchLoading, setDeepSearchLoading] = useState(false);
  const [deepSearchDone, setDeepSearchDone] = useState(false);

  useEffect(() => {
    if (!selected) {
      setCover(null);
      setCoverOptions([]);
      setCoverLoading(false);
      setDeepSearchLoading(false);
      setDeepSearchDone(false);
      return;
    }

    const key = coverKey(selected);
    const rejected = rejectedUrls(selected);
    const preferred = selected.preferredCover && !rejected.has(selected.preferredCover.url)
      ? selected.preferredCover
      : undefined;
    const cachedOptions = allowedCovers(selected, coverOptionsMemory.get(key) || []);
    const startingOptions = preferred
      ? allowedCovers(selected, [preferred, ...cachedOptions])
      : cachedOptions;
    const cachedCover = coverMemory.get(key);
    const safeCached = cachedCover && !rejected.has(cachedCover.url) ? cachedCover : null;

    setCover(preferred || safeCached || startingOptions[0] || null);
    setCoverOptions(startingOptions);
    setCoverLoading(true);
    setDeepSearchLoading(false);
    setDeepSearchDone(false);

    const controller = new AbortController();
    fetch(coverRequestUrl(selected), { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result: CoverResponse | null) => {
        const fetched = result?.options || (result?.url && result?.source ? [{ url: result.url, source: result.source }] : []);
        const allOptions = allowedCovers(selected, preferred ? [preferred, ...fetched] : fetched);
        coverOptionsMemory.set(key, allOptions);
        setCoverOptions(allOptions);

        const next = preferred || safeCached || allOptions[0] || null;
        coverMemory.set(key, next);
        setCover(next);

        if (result?.discoveredIsbn && !isbnForBook(selected)) {
          const updated = {
            ...selected,
            isbn: result.discoveredIsbn,
            isbnSource: "LibraryThing title/edition lookup",
            isbnConfidence: "medium" as const,
          };
          setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
          setSelected(updated);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setCoverLoading(false);
      });

    return () => controller.abort();
  }, [selected?.id, selected?.coverFeedback, selected?.preferredCover, setBooks]);

  const selectedIsbn = selected ? isbnForBook(selected) : undefined;

  function chooseCover(option: CoverResult) {
    if (!selected) return;
    const feedback: CoverFeedback = {
      ...selected.coverFeedback,
      accepted: option.url,
      rejected: (selected.coverFeedback?.rejected || []).filter((url) => url !== option.url),
      wrongEdition: (selected.coverFeedback?.wrongEdition || []).filter((url) => url !== option.url),
    };
    const updated = { ...selected, preferredCover: option, coverFeedback: feedback };
    setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
    setSelected(updated);
    setCover(option);
    coverMemory.set(coverKey(updated), option);
    showToast(`Marked this ${option.source} cover as correct for ${selected.title}.`);
  }

  function rejectCurrentCover(kind: "wrong" | "edition") {
    if (!selected || !cover) return;
    const rejected = new Set(selected.coverFeedback?.rejected || []);
    const wrongEdition = new Set(selected.coverFeedback?.wrongEdition || []);
    if (kind === "edition") wrongEdition.add(cover.url);
    else rejected.add(cover.url);

    const feedback: CoverFeedback = {
      ...selected.coverFeedback,
      accepted: selected.coverFeedback?.accepted === cover.url ? undefined : selected.coverFeedback?.accepted,
      rejected: [...rejected],
      wrongEdition: [...wrongEdition],
    };
    const updated: Book = {
      ...selected,
      preferredCover: selected.preferredCover?.url === cover.url ? undefined : selected.preferredCover,
      coverFeedback: feedback,
    };
    const remaining = allowedCovers(updated, coverOptions.filter((option) => option.url !== cover.url));
    const next = remaining[0] || null;

    setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
    setSelected(updated);
    setCoverOptions(remaining);
    setCover(next);
    coverOptionsMemory.set(coverKey(updated), remaining);
    coverMemory.set(coverKey(updated), next);
    setDeepSearchDone(false);
    showToast(kind === "edition"
      ? `Rejected that edition for ${selected.title}. It won't be suggested again.`
      : `Rejected that cover for ${selected.title}. It won't be suggested again.`);
  }

  async function searchMoreCovers() {
    if (!selected || deepSearchLoading || deepSearchDone) return;

    const key = coverKey(selected);
    const preferred = selected.preferredCover;
    const before = allowedCovers(selected, preferred ? [preferred, ...coverOptions] : coverOptions);
    setDeepSearchLoading(true);

    try {
      const [coverResponse, romanceResponse] = await Promise.all([
        fetch(coverRequestUrl(selected, true), { cache: "no-store" }),
        fetch(romanceCoverRequestUrl(selected), { cache: "no-store" }),
      ]);
      const result: CoverResponse | null = coverResponse.ok ? await coverResponse.json() : null;
      const romanceResult: CoverResponse | null = romanceResponse.ok ? await romanceResponse.json() : null;
      const fetched = result?.options || (result?.url && result?.source ? [{ url: result.url, source: result.source }] : []);
      const romanceFetched = romanceResult?.options
        || (romanceResult?.url && romanceResult?.source ? [{ url: romanceResult.url, source: romanceResult.source }] : []);
      const allOptions = allowedCovers(
        selected,
        preferred ? [preferred, ...before, ...fetched, ...romanceFetched] : [...before, ...fetched, ...romanceFetched],
      );
      const added = Math.max(0, allOptions.length - before.length);
      const foundIsbn = Boolean(result?.discoveredIsbn && !selectedIsbn);
      const foundRomanceio = Boolean(romanceResult?.discoveredRomanceioId && !selected.romanceioId);

      coverOptionsMemory.set(key, allOptions);
      setCoverOptions(allOptions);

      if (!cover && allOptions[0]) {
        coverMemory.set(key, allOptions[0]);
        setCover(allOptions[0]);
      }

      let updated: Book = selected;
      if (foundIsbn && result?.discoveredIsbn) {
        updated = {
          ...updated,
          isbn: result.discoveredIsbn,
          isbnSource: "LibraryThing title/edition lookup",
          isbnConfidence: "medium" as const,
        };
      }
      if (foundRomanceio && romanceResult?.discoveredRomanceioId) {
        updated = {
          ...updated,
          romanceioId: romanceResult.discoveredRomanceioId,
        };
      }
      if (updated !== selected) {
        setBooks((current) => current.map((book) => book.id === selected.id ? updated : book));
        setSelected(updated);
      }

      setDeepSearchDone(true);
      const foundIdentifiers: string[] = [];
      if (foundIsbn && result?.discoveredIsbn) foundIdentifiers.push(`ISBN ${result.discoveredIsbn}`);
      if (foundRomanceio) foundIdentifiers.push("a Romance.io match");

      if (foundIdentifiers.length) {
        const identifierText = foundIdentifiers.join(" and ");
        showToast(added
          ? `Found ${identifierText} and ${added} more cover${added === 1 ? "" : "s"} for ${selected.title}.`
          : `Found ${identifierText} for ${selected.title}.`);
      } else {
        showToast(added ? `Found ${added} more cover${added === 1 ? "" : "s"} for ${selected.title}.` : `No additional covers found for ${selected.title}.`);
      }
    } catch {
      showToast(`Couldn't finish the deeper cover search for ${selected.title}.`);
    } finally {
      setDeepSearchLoading(false);
    }
  }

  return {
    selected,
    setSelected,
    selectedIsbn,
    cover,
    setCover,
    coverOptions,
    coverLoading,
    deepSearchLoading,
    deepSearchDone,
    chooseCover,
    rejectCurrentCover,
    searchMoreCovers,
  };
}
