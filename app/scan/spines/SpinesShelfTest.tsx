"use client";

import { ChangeEvent, useRef, useState } from "react";
import styles from "../scan.module.css";

type PreparedImage = {
  dataUrl: string;
  blob: Blob;
  fileName: string;
};

type ApiResponse = {
  result?: unknown;
  error?: string;
  needsConfiguration?: boolean;
};

type SimpleBook = {
  title: string;
  author: string;
  isbn: string;
};

const SESSION_KEY = "shelf-of-fame-supabase-session";
const MAX_IMAGE_DIMENSION = 1600;
const MAX_PREPARED_BYTES = 4 * 1024 * 1024;
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

function accessToken() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return "";
    const session = JSON.parse(raw) as { access_token?: unknown };
    return typeof session.access_token === "string" ? session.access_token.trim() : "";
  } catch {
    return "";
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be opened by your browser."));
    image.src = src;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality = 0.84) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Your browser could not prepare this photo."));
    }, "image/jpeg", quality);
  });
}

async function prepareFile(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo or image file.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestSide : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this photo.");
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasBlob(canvas);
    if (blob.size > MAX_PREPARED_BYTES) {
      throw new Error("The prepared image is still over 4 MB. Try a closer crop of the shelf.");
    }

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.84),
      blob,
      fileName: file.name || "bookshelf-photo",
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function apiJson(response: Response, fallback: string): Promise<ApiResponse> {
  const text = await response.text();
  if (!text) return { error: `${fallback} returned an empty response.` };
  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    return { error: response.ok ? `${fallback} returned unreadable data.` : `${fallback} failed (${response.status}).` };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function providerStatus(value: unknown) {
  const row = asRecord(value);
  return typeof row?.status === "string" ? row.status.toLowerCase() : "";
}

function providerJobId(value: unknown) {
  const row = asRecord(value);
  return typeof row?.job_id === "string" ? row.job_id : "";
}

function findBookArray(value: unknown, depth = 0): unknown[] {
  if (depth > 5) return [];
  if (Array.isArray(value)) {
    const looksLikeBooks = value.some((item) => {
      const row = asRecord(item);
      return Boolean(row && (typeof row.title === "string" || typeof row.author === "string" || typeof row.isbn === "string" || typeof row.isbn13 === "string"));
    });
    if (looksLikeBooks) return value;
    for (const item of value) {
      const found = findBookArray(item, depth + 1);
      if (found.length) return found;
    }
    return [];
  }

  const row = asRecord(value);
  if (!row) return [];
  for (const key of ["books", "recognized_books", "matches", "results", "collection", "data"]) {
    if (key in row) {
      const found = findBookArray(row[key], depth + 1);
      if (found.length) return found;
    }
  }
  for (const nested of Object.values(row)) {
    const found = findBookArray(nested, depth + 1);
    if (found.length) return found;
  }
  return [];
}

function simpleBooks(value: unknown): SimpleBook[] {
  return findBookArray(value).flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const author = typeof row.author === "string"
      ? row.author.trim()
      : typeof row.author_name === "string" ? row.author_name.trim() : "";
    const isbn = typeof row.isbn13 === "string"
      ? row.isbn13.trim()
      : typeof row.isbn === "string" ? row.isbn.trim() : "";
    if (!title && !author && !isbn) return [];
    return [{ title, author, isbn }];
  });
}

async function sleep(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function SpinesShelfTest() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [status, setStatus] = useState("Choose the same shelf photo you used for the Gemini test.");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setResult(null);
    setStatus("Preparing comparison photo…");
    try {
      const prepared = await prepareFile(file);
      setImage(prepared);
      setStatus("Photo ready. SPINES has not received it yet.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare the photo.");
      setStatus("Photo preparation stopped.");
    }
  }

  async function runComparison() {
    if (!image) return;
    const token = accessToken();
    if (!token) {
      setError("Sign in first, then return to this test page.");
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setStatus("Sending this photo to SPINES for bookshelf recognition…");

    try {
      const form = new FormData();
      form.append("image", image.blob, "shelf.jpg");
      const response = await fetch("/api/scan-shelf-spines", {
        method: "POST",
        body: form,
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await apiJson(response, "SPINES recognition");
      if (!response.ok) throw new Error(data.error || "SPINES recognition could not start.");

      let current = data.result;
      let currentStatus = providerStatus(current);
      let jobId = providerJobId(current);
      setResult(current);

      if (currentStatus === "complete") {
        setStatus("SPINES recognition complete.");
        return;
      }
      if (currentStatus === "failed") {
        throw new Error("SPINES reported that recognition failed.");
      }
      if (!jobId) {
        setStatus("SPINES returned a result immediately. Review the response below.");
        return;
      }

      const started = Date.now();
      while (Date.now() - started < POLL_TIMEOUT_MS) {
        setStatus(`SPINES is processing recognition job ${jobId.slice(0, 8)}…`);
        await sleep(POLL_INTERVAL_MS);
        const poll = await fetch(`/api/scan-shelf-spines?job_id=${encodeURIComponent(jobId)}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const pollData = await apiJson(poll, "SPINES status check");
        if (!poll.ok) throw new Error(pollData.error || "Could not check SPINES recognition status.");
        current = pollData.result;
        currentStatus = providerStatus(current);
        jobId = providerJobId(current) || jobId;
        setResult(current);

        if (currentStatus === "complete") {
          setStatus("SPINES recognition complete.");
          return;
        }
        if (currentStatus === "failed") {
          throw new Error("SPINES reported that recognition failed.");
        }
      }

      setStatus("SPINES is still processing. The last response is shown below.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "SPINES comparison failed.");
      setStatus("SPINES comparison stopped.");
    } finally {
      setProcessing(false);
    }
  }

  const books = simpleBooks(result);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a className={styles.backLink} href="/scan">← Back to Gemini scanner</a>
          <p className={styles.eyebrow}>EXPERIMENTAL · SPINES COMPARISON</p>
          <h1>SPINES Shelf Test</h1>
          <p className={styles.lead}>
            Upload the same shelf photo here to compare SPINES recognition against our Gemini two-pass scanner. Nothing is sent to SPINES until you press the comparison button.
          </p>
        </header>

        <section className={styles.tipCard} aria-label="Third-party processing notice">
          <strong>Third-party test</strong>
          <span>Running this comparison sends the prepared bookshelf photo to SPINES. Their service says uploaded shelf images are processed for recognition and may be stored by their service.</span>
        </section>

        <section className={styles.actions}>
          <button className={styles.secondaryButton} type="button" disabled={processing} onClick={() => inputRef.current?.click()}>
            <span aria-hidden="true">🖼️</span> Choose Shelf Photo
          </button>
          <button className={styles.primaryButton} type="button" disabled={processing || !image} onClick={() => void runComparison()}>
            {processing ? "Running SPINES…" : "Run SPINES Comparison"}
          </button>
          <input ref={inputRef} className={styles.hiddenInput} type="file" accept="image/*" onChange={chooseFile} />
        </section>

        <div className={styles.statusRow} aria-live="polite">
          {processing ? <span className={styles.spinner} aria-hidden="true" /> : <span className={styles.statusDot} aria-hidden="true" />}
          <span>{status}</span>
        </div>
        {error ? <div className={styles.error}>{error}</div> : null}

        {image ? (
          <section className={styles.workspace}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>COMPARISON PHOTO</p>
                <h2>{image.fileName}</h2>
              </div>
              <span className={styles.resultCount}>{books.length ? `${books.length} books parsed` : "awaiting result"}</span>
            </div>

            <div className={styles.workspaceGrid}>
              <div className={styles.previewColumn}>
                <div className={styles.imageStage}>
                  <img src={image.dataUrl} alt="Bookshelf sent to SPINES comparison" className={styles.shelfImage} />
                </div>
              </div>

              <div className={styles.resultsColumn}>
                <div className={styles.cropHeading}>
                  <div>
                    <h2>SPINES result</h2>
                    <p>We are intentionally showing the provider response during this experiment so we can learn its exact book/result shape before integrating it into the main review UI.</p>
                  </div>
                </div>

                {books.length ? (
                  <div className={styles.cropGrid}>
                    {books.map((book, index) => (
                      <article className={styles.cropCard} key={`${book.isbn}-${book.title}-${index}`}>
                        <div className={styles.cropNumber}>#{index + 1}</div>
                        <div className={styles.cropMeta}>
                          <strong>{book.title || "Untitled result"}</strong>
                          {book.author ? <span>{book.author}</span> : null}
                          {book.isbn ? <small>ISBN {book.isbn}</small> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : result ? (
                  <div className={styles.emptyState}>
                    <strong>SPINES returned data, but our temporary parser has not found the book list yet.</strong>
                    <span>Open the raw response below; once we see its exact structure, we can normalize it properly.</span>
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <strong>No SPINES result yet.</strong>
                    <span>Choose the photo, then explicitly run the comparison.</span>
                  </div>
                )}

                {result ? (
                  <details style={{ marginTop: 16 }}>
                    <summary style={{ cursor: "pointer", fontWeight: 700 }}>Raw SPINES response</summary>
                    <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, lineHeight: 1.5 }}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.placeholder}>
            <div className={styles.placeholderIcon} aria-hidden="true">▥</div>
            <strong>Choose the same shelf photo</strong>
            <span>This page will not automatically send it to SPINES.</span>
          </section>
        )}

        <footer className={styles.footer}>
          This is a comparison-only preview. It does not write SPINES results into your Shelf of Fame library or Supabase.
        </footer>
      </div>
    </main>
  );
}
