"use client";

import { ChangeEvent, useRef, useState } from "react";
import styles from "./scan.module.css";

type PreparedImage = {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  fileName: string;
};

type ApiBook = {
  box_2d: number[];
  title?: string;
  author?: string;
  visible_text?: string;
  confidence?: number;
};

type SpineRefinement = {
  index: number;
  spine_visible?: boolean;
  spine_box_2d?: number[] | null;
  title?: string;
  author?: string;
  visible_text?: string;
  confidence?: number;
};

type ScanResponse = {
  books?: ApiBook[];
  model?: string;
  error?: string;
};

type RefineResponse = {
  books?: SpineRefinement[];
  model?: string;
  error?: string;
};

type PixelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ReviewState = "unreviewed" | "correct" | "wrong" | "needs-identification";

type Region = PixelBox & {
  id: string;
  spineBox: PixelBox | null;
  crop: string | null;
  title: string;
  author: string;
  visibleText: string;
  bookConfidence: number;
  spineConfidence: number;
  reviewState: ReviewState;
  addedToShelf: boolean;
};

const SESSION_KEY = "shelf-of-fame-supabase-session";
const LIBRARY_STORAGE_KEY = "shelf-of-fame-library-v1";
const SCAN_BOOK_COLOR = "#6f4e37";
const MAX_IMAGE_DIMENSION = 1600;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PREPARED_BYTES = 4 * 1024 * 1024;
const BOOK_CROP_MAX_DIMENSION = 720;
const SCAN_TIMEOUT_MS = 38_000;
const REFINE_TIMEOUT_MS = 43_000;

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

async function apiJson<T extends { error?: string }>(response: Response, fallback: string): Promise<T> {
  const text = await response.text();
  if (!text) {
    return { error: response.ok ? `${fallback} returned an empty response.` : `${fallback} failed (${response.status}).` } as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      error: response.ok
        ? `${fallback} returned unreadable data.`
        : `${fallback} failed (${response.status}). Try again with a smaller photo.`,
    } as T;
  }
}

async function prepareFile(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo or image file.");
  if (file.size > MAX_FILE_BYTES) throw new Error("That photo is larger than 25 MB. Try a smaller image.");

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
      throw new Error("The prepared shelf photo is still too large. Try a closer photo of fewer books.");
    }

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.84),
      blob,
      width,
      height,
      fileName: file.name || "bookshelf-photo",
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizedBox(value: unknown, width: number, height: number): PixelBox | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const values = value.map(Number);
  if (values.some((entry) => !Number.isFinite(entry))) return null;

  const [yMinRaw, xMinRaw, yMaxRaw, xMaxRaw] = values;
  const yMin = clamp(yMinRaw, 0, 1000);
  const xMin = clamp(xMinRaw, 0, 1000);
  const yMax = clamp(yMaxRaw, 0, 1000);
  const xMax = clamp(xMaxRaw, 0, 1000);
  if (yMax <= yMin || xMax <= xMin) return null;

  return {
    x: Math.round((xMin / 1000) * width),
    y: Math.round((yMin / 1000) * height),
    width: Math.max(1, Math.round(((xMax - xMin) / 1000) * width)),
    height: Math.max(1, Math.round(((yMax - yMin) / 1000) * height)),
  };
}

function regionFromApi(book: ApiBook, image: PreparedImage, index: number): Region | null {
  const bookBox = normalizedBox(book.box_2d, image.width, image.height);
  if (!bookBox) return null;

  return {
    id: `${Date.now()}-${index}`,
    ...bookBox,
    spineBox: null,
    crop: null,
    title: (book.title || "").trim(),
    author: (book.author || "").trim(),
    visibleText: (book.visible_text || "").trim(),
    bookConfidence: clamp(Math.round(Number(book.confidence) || 0), 0, 100),
    spineConfidence: 0,
    reviewState: "unreviewed",
    addedToShelf: false,
  };
}

async function makeIsolatedBookCrop(source: HTMLImageElement, region: Region) {
  const scale = Math.min(1, BOOK_CROP_MAX_DIMENSION / Math.max(region.width, region.height));
  const width = Math.max(1, Math.round(region.width * scale));
  const height = Math.max(1, Math.round(region.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not isolate a detected book.");
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, width, height);
  return canvasBlob(canvas, 0.8);
}

function makeSpinePreview(
  source: HTMLImageElement,
  region: Region,
  refinement: SpineRefinement | undefined,
): { crop: string | null; spineBox: PixelBox | null } {
  if (!refinement?.spine_visible) return { crop: null, spineBox: null };
  const localBox = normalizedBox(refinement.spine_box_2d, region.width, region.height);
  if (!localBox) return { crop: null, spineBox: null };

  const absoluteBox: PixelBox = {
    x: clamp(region.x + localBox.x, 0, source.naturalWidth - 1),
    y: clamp(region.y + localBox.y, 0, source.naturalHeight - 1),
    width: Math.min(localBox.width, source.naturalWidth - region.x - localBox.x),
    height: Math.min(localBox.height, source.naturalHeight - region.y - localBox.y),
  };
  if (absoluteBox.width < 1 || absoluteBox.height < 1) return { crop: null, spineBox: null };

  const canvas = document.createElement("canvas");
  canvas.width = absoluteBox.width;
  canvas.height = absoluteBox.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a spine preview.");
  context.drawImage(
    source,
    absoluteBox.x,
    absoluteBox.y,
    absoluteBox.width,
    absoluteBox.height,
    0,
    0,
    absoluteBox.width,
    absoluteBox.height,
  );

  return { crop: canvas.toDataURL("image/png"), spineBox: absoluteBox };
}

function normalizedIdentity(title: string, author: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${normalize(title)}::${normalize(author)}`;
}

async function detectBooks(image: PreparedImage, token: string) {
  const form = new FormData();
  form.append("image", image.blob, "shelf.jpg");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  try {
    const response = await fetch("/api/scan-shelf", {
      method: "POST",
      body: form,
      signal: controller.signal,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await apiJson<ScanResponse>(response, "Shelf detection");
    if (!response.ok) throw new Error(data.error || "Shelf detection could not finish.");
    return data.books || [];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Shelf detection took too long. Try a closer photo of fewer books.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function refineSpines(bookCrops: Blob[], token: string) {
  const form = new FormData();
  form.append("count", String(bookCrops.length));
  bookCrops.forEach((blob, index) => form.append(`book_${index}`, blob, `book-${index + 1}.jpg`));

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REFINE_TIMEOUT_MS);
  try {
    const response = await fetch("/api/refine-spines", {
      method: "POST",
      body: form,
      signal: controller.signal,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await apiJson<RefineResponse>(response, "Spine refinement");
    if (!response.ok) throw new Error(data.error || "Spine refinement could not finish.");
    return data.books || [];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Spine refinement took too long. Try a closer photo of fewer books.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function ScanShelfPrototype() {
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [status, setStatus] = useState("Choose a shelf photo to begin.");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function processFile(file: File) {
    const token = accessToken();
    if (!token) {
      setError("Sign in first to use the AI shelf scanner. The account button is at the top of the page.");
      setStatus("Sign in required.");
      return;
    }

    let firstPassSucceeded = false;
    setProcessing(true);
    setError(null);
    setRegions([]);
    setStatus("Preparing photo…");

    try {
      const prepared = await prepareFile(file);
      setImage(prepared);

      setStatus("Pass 1 of 2 · Gemini is locating each physical book…");
      const detected = await detectBooks(prepared, token);
      if (!detected.length) {
        setStatus("Gemini did not find any clear individual books in this photo.");
        return;
      }

      const converted = detected
        .map((book, index) => regionFromApi(book, prepared, index))
        .filter((region): region is Region => Boolean(region))
        .sort((left, right) => {
          const sameShelf = Math.abs(left.y - right.y) < prepared.height * 0.12;
          return sameShelf ? left.x - right.x : left.y - right.y;
        });

      firstPassSucceeded = true;
      setRegions(converted);
      const source = await loadImage(prepared.dataUrl);
      setStatus(`Pass 2 of 2 · isolating the actual spine face inside ${converted.length} book${converted.length === 1 ? "" : "s"}…`);
      const isolatedCrops = await Promise.all(converted.map((region) => makeIsolatedBookCrop(source, region)));
      const refinements = await refineSpines(isolatedCrops, token);
      const byIndex = new Map(refinements.map((refinement) => [refinement.index, refinement]));

      const refined = converted.map((region, index) => {
        const refinement = byIndex.get(index);
        const preview = makeSpinePreview(source, region, refinement);
        return {
          ...region,
          spineBox: preview.spineBox,
          crop: preview.crop,
          title: (refinement?.title || region.title || "").trim(),
          author: (refinement?.author || region.author || "").trim(),
          visibleText: (refinement?.visible_text || region.visibleText || "").trim(),
          spineConfidence: clamp(Math.round(Number(refinement?.confidence) || 0), 0, 100),
        };
      });

      setRegions(refined);
      const visibleSpines = refined.filter((region) => region.crop).length;
      const readable = refined.filter((region) => region.title || region.author).length;
      setStatus(
        `Found ${refined.length} book${refined.length === 1 ? "" : "s"} · ${visibleSpines} complete spine face${visibleSpines === 1 ? "" : "s"} · read text on ${readable}. Review each result before adding it to your shelf.`,
      );
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The shelf scan failed.";
      setError(message);
      setStatus(firstPassSucceeded ? "Book detection succeeded, but spine refinement stopped." : "Scan stopped.");
    } finally {
      setProcessing(false);
    }
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void processFile(file);
  }

  function removeRegion(id: string) {
    setRegions((current) => current.filter((region) => region.id !== id));
  }

  function reviewRegion(id: string, reviewState: ReviewState) {
    setRegions((current) => current.map((region) => region.id === id
      ? { ...region, reviewState }
      : region));
  }

  function addRegionToShelf(id: string) {
    const region = regions.find((candidate) => candidate.id === id);
    if (!region?.title.trim()) {
      setError("This result needs a confirmed title before it can be added to your shelf.");
      return;
    }

    try {
      const saved = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      const library = Array.isArray(parsed)
        ? parsed.filter((entry) => entry && typeof entry === "object") as Record<string, unknown>[]
        : [];
      const author = region.author.trim() || "Unknown author";
      const identity = normalizedIdentity(region.title, author);
      const alreadyExists = library.some((entry) => {
        const existingTitle = typeof entry.title === "string" ? entry.title : "";
        const existingAuthor = typeof entry.author === "string" ? entry.author : "";
        return normalizedIdentity(existingTitle, existingAuthor) === identity;
      });

      if (!alreadyExists) {
        library.push({
          id: `scan-${Date.now()}-${region.id}`,
          title: region.title,
          author,
          color: SCAN_BOOK_COLOR,
          importSource: "Shelf scan",
        });
        window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
      }

      setRegions((current) => current.map((candidate) => candidate.id === id
        ? { ...candidate, reviewState: "correct", addedToShelf: true }
        : candidate));
      setError(null);
      setStatus(alreadyExists
        ? `${region.title} is already on your Shelf of Fame.`
        : `${region.title} was added to your Shelf of Fame.`);
    } catch {
      setError("Could not add this book to your browser shelf. Try again.");
    }
  }

  function reset() {
    setImage(null);
    setRegions([]);
    setError(null);
    setStatus("Choose a shelf photo to begin.");
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a className={styles.backLink} href="/">← Back to Shelf of Fame</a>
          <p className={styles.eyebrow}>EXPERIMENTAL · TWO-PASS GEMINI SCAN</p>
          <h1>Scan My Shelf</h1>
          <p className={styles.lead}>
            Pass one finds each physical book. Pass two looks at every book by itself and locates the complete visible binding/spine face, so page blocks are not used as spine previews.
          </p>
        </header>

        <section className={styles.tipCard} aria-label="Photo tips">
          <strong>Best first test</strong>
          <span>Try 5–15 books, good even lighting, and keep the camera as square to the shelf as possible. Sign in before scanning.</span>
        </section>

        <section className={styles.actions}>
          <button className={styles.primaryButton} type="button" disabled={processing} onClick={() => cameraInput.current?.click()}>
            <span aria-hidden="true">📷</span> Take Photo
          </button>
          <button className={styles.secondaryButton} type="button" disabled={processing} onClick={() => uploadInput.current?.click()}>
            <span aria-hidden="true">🖼️</span> Upload Photo
          </button>
          {image ? <button className={styles.ghostButton} type="button" disabled={processing} onClick={reset}>Clear</button> : null}
          <input ref={cameraInput} className={styles.hiddenInput} type="file" accept="image/*" capture="environment" onChange={chooseFile} />
          <input ref={uploadInput} className={styles.hiddenInput} type="file" accept="image/*" onChange={chooseFile} />
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
                <p className={styles.eyebrow}>DETECTION PREVIEW</p>
                <h2>{image.fileName}</h2>
              </div>
              <span className={styles.resultCount}>{regions.length} detected</span>
            </div>

            <div className={styles.workspaceGrid}>
              <div className={styles.previewColumn}>
                <div className={styles.imageStage}>
                  <img src={image.dataUrl} alt="Bookshelf scan preview" className={styles.shelfImage} />
                  {regions.map((region, index) => (
                    <div key={region.id}>
                      <button
                        type="button"
                        className={styles.regionBox}
                        style={{
                          left: `${(region.x / image.width) * 100}%`,
                          top: `${(region.y / image.height) * 100}%`,
                          width: `${(region.width / image.width) * 100}%`,
                          height: `${(region.height / image.height) * 100}%`,
                        }}
                        title={`Book ${index + 1}. Click to remove this detection.`}
                        aria-label={`Remove book ${index + 1}`}
                        onClick={() => removeRegion(region.id)}
                      >
                        <span>{index + 1}</span>
                      </button>
                      {region.spineBox ? (
                        <span
                          className={styles.spineRegionBox}
                          aria-hidden="true"
                          style={{
                            left: `${(region.spineBox.x / image.width) * 100}%`,
                            top: `${(region.spineBox.y / image.height) * 100}%`,
                            width: `${(region.spineBox.width / image.width) * 100}%`,
                            height: `${(region.spineBox.height / image.height) * 100}%`,
                          }}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className={styles.legend}><span /> whole book <i /> refined spine face</p>
              </div>

              <div className={styles.resultsColumn}>
                <div className={styles.cropHeading}>
                  <div>
                    <h2>Refined spine faces</h2>
                    <p>Each preview comes from an isolated-book second pass and shows the physical spine area Gemini localized inside that book.</p>
                  </div>
                </div>

                {regions.length ? (
                  <div className={styles.cropGrid}>
                    {regions.map((region, index) => (
                      <article className={styles.cropCard} key={region.id}>
                        <div className={styles.cropNumber}>
                          #{index + 1} · {region.bookConfidence}% book{region.spineConfidence ? ` · ${region.spineConfidence}% spine` : ""}
                        </div>
                        <div className={styles.cropImageWrap}>
                          {region.crop ? (
                            <img src={region.crop} alt={`Refined spine crop ${index + 1}`} className={styles.cropImage} />
                          ) : (
                            <div className={styles.noSpine}>{processing ? "Refining…" : "Spine face not visible"}</div>
                          )}
                        </div>
                        <div className={styles.cropMeta}>
                          <strong>{region.title || (region.crop ? "Needs identification" : "No visible spine")}</strong>
                          {region.author ? <span>{region.author}</span> : null}
                          {!region.title && region.visibleText ? <small>{region.visibleText}</small> : null}
                        </div>
                        <div className={styles.reviewActions} aria-label={`Review book ${index + 1}`}>
                          <button
                            className={`${styles.reviewButton} ${region.reviewState === "correct" ? styles.reviewButtonSelected : ""}`}
                            type="button"
                            disabled={processing}
                            aria-pressed={region.reviewState === "correct"}
                            onClick={() => reviewRegion(region.id, "correct")}
                          >
                            ✓ Correct
                          </button>
                          <button
                            className={`${styles.reviewButton} ${region.reviewState === "wrong" ? styles.reviewButtonSelected : ""}`}
                            type="button"
                            disabled={processing}
                            aria-pressed={region.reviewState === "wrong"}
                            onClick={() => reviewRegion(region.id, "wrong")}
                          >
                            Wrong book
                          </button>
                          <button
                            className={`${styles.reviewButton} ${region.reviewState === "needs-identification" ? styles.reviewButtonSelected : ""}`}
                            type="button"
                            disabled={processing}
                            aria-pressed={region.reviewState === "needs-identification"}
                            onClick={() => reviewRegion(region.id, "needs-identification")}
                          >
                            Needs ID
                          </button>
                        </div>
                        <button
                          className={styles.addButton}
                          type="button"
                          disabled={processing || region.addedToShelf || region.reviewState !== "correct" || !region.title}
                          onClick={() => addRegionToShelf(region.id)}
                        >
                          {region.addedToShelf ? "Added to Shelf ✓" : "Add to Shelf"}
                        </button>
                        <button className={styles.removeButton} type="button" disabled={processing} onClick={() => removeRegion(region.id)}>Not a book</button>
                      </article>
                    ))}
                  </div>
                ) : !processing ? (
                  <div className={styles.emptyState}>
                    <strong>No usable detections yet.</strong>
                    <span>Try a closer photo of a smaller shelf section with less glare.</span>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.placeholder}>
            <div className={styles.placeholderIcon} aria-hidden="true">▥</div>
            <strong>Your shelf photo will appear here</strong>
            <span>Gemini will find the books first, then inspect each isolated book for its actual spine surface.</span>
          </section>
        )}

        <footer className={styles.footer}>
          The photo, isolated crops, and scan results are not saved to Supabase. Only a book you explicitly mark Correct and choose Add to Shelf is written to your browser library. AI scans require a signed-in account and have a daily preview quota.
        </footer>
      </div>
    </main>
  );
}
