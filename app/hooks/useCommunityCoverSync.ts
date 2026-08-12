"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useRef } from "react";
import {
  applyApprovedCommunityCovers,
  ApprovedCommunityCover,
  communityCoverRequestBooks,
} from "../../lib/books/community-cover";
import { Book, CoverResult } from "../../lib/books/client-library";

const SUPABASE_URL = "https://vrkuimrfdkejfhpxlwlf.supabase.co";
const SUPABASE_KEY = "sb_publishable_mf0u925xGBkP4iNgxSCjuQ_H4Dp8r1S";
const SESSION_KEY = "shelf-of-fame-supabase-session";
const RESYNC_INTERVAL_MS = 60_000;

type UseCommunityCoverSyncOptions = {
  books: Book[];
  setBooks: Dispatch<SetStateAction<Book[]>>;
};

function accessToken() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null") as { access_token?: string } | null;
    return parsed?.access_token || "";
  } catch {
    return "";
  }
}

function headers(token?: string) {
  return {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function libraryFingerprint(books: Book[]) {
  return books.map((book) => [
    book.id,
    book.title,
    book.author,
    book.isbn || "",
    book.asin || "",
    book.preferredCover?.url || "",
    book.coverFeedback?.accepted || "",
    (book.coverFeedback?.rejected || []).join(","),
    (book.coverFeedback?.wrongEdition || []).join(","),
  ].join("|")).join(";");
}

export function useCommunityCoverSync({ books, setBooks }: UseCommunityCoverSyncOptions) {
  const booksRef = useRef(books);
  const lastFingerprint = useRef("");
  const syncing = useRef(false);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  const syncApprovedCovers = useCallback(async (force = false) => {
    if (syncing.current) return;
    const currentBooks = booksRef.current;
    const fingerprint = libraryFingerprint(currentBooks);
    if (!force && fingerprint === lastFingerprint.current) return;

    const requestBooks = communityCoverRequestBooks(currentBooks);
    if (!requestBooks.length) return;

    syncing.current = true;
    lastFingerprint.current = fingerprint;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_approved_covers_for_library`, {
        method: "POST",
        headers: headers(),
        cache: "no-store",
        body: JSON.stringify({ p_books: requestBooks }),
      });
      if (!response.ok) return;
      const rows = await response.json() as ApprovedCommunityCover[];
      if (!Array.isArray(rows) || !rows.length) return;

      setBooks((current) => {
        const applied = applyApprovedCommunityCovers(current, rows);
        return applied.books;
      });
    } catch {
      // Community cover sync is optional; personal shelf choices remain local.
    } finally {
      syncing.current = false;
    }
  }, [setBooks]);

  const submitCoverChoice = useCallback(async (book: Book, cover: CoverResult) => {
    const token = accessToken();
    if (!token || !book.title || !book.author || !/^https?:\/\//i.test(cover.url)) return false;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_user_cover_choice`, {
        method: "POST",
        headers: headers(token),
        keepalive: true,
        body: JSON.stringify({
          p_title: book.title,
          p_author: book.author,
          p_image_url: cover.url,
          p_source: cover.source || "User verified",
          p_isbn: book.isbn || null,
          p_asin: book.asin || null,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    void syncApprovedCovers();
  }, [books, syncApprovedCovers]);

  useEffect(() => {
    const interval = window.setInterval(() => void syncApprovedCovers(true), RESYNC_INTERVAL_MS);
    const onFocus = () => void syncApprovedCovers(true);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncApprovedCovers]);

  return { submitCoverChoice, syncApprovedCovers };
}
