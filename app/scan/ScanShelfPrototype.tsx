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

type ScanResponse = {
  books?: ApiBook[];
  model?: string;
  error?: string;
};

type Region = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  crop: string;
  title: string;
  author: string;
  visibleText: string;
  confidence: number;
};

const MAX_IMAGE_DIMENSION = 1600;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const SCAN_TIMEOUT_MS = 38_000;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be opened by your browser."));
    image.src = src;
  });
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Your browser could not prepare this photo."));
    }, "image/jpeg", 0.84);
  });
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
    if (blob.size > 5 * 1024 * 1024) {
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

function regionFromApi(book: ApiBook, image: PreparedImage, index: number): Omit<Region, "crop"> | null {
  if (!Array.isArray(book.box_2d) || book.box_2d.length !== 4) return null;
  const values = book.box_2d.map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;

  const [yMinRaw, xMinRaw, yMaxRaw, xMaxRaw] = values;
  const yMin = clamp(yMinRaw, 0, 1000);
  const xMin = clamp(xMinRaw, 0, 1000);
  const yMax = clamp(yMaxRaw, 0, 1000);
  const xMax = clamp(xMaxRaw, 0, 1000);
  if (yMax <= yMin || xMax <= xMin) return null;

  return {
    id: `${Date.now()}-${index}`,
    x: Math.round((xMin / 1000) * image.width),
    y: Math.round((yMin / 1000) * image.height),
    width: Math.max(1, Math.round(((xMax - xMin) / 1000) * image.width)),
    height: Math.max(1, Math.round(((yMax - yMin) / 1000) * image.height)),
    title: (book.title || "").trim(),
    author: (book.author || "").trim(),
    visibleText: (book.visible_text || "").trim(),
    confidence: clamp(Math.round(Number(book.confidence) || 0), 0, 100),
  };
}

function makeCrop(source: HTMLImageElement, image: PreparedImage, region: Omit<Region, "crop">) {
  const pad = Math.max(4, Math.round(image.width * 0.004));
  const x = Math.max(0, region.x - pad);
  const y = Math.max(0, region.y - pad);
  const width = Math.min(image.width - x, region.width + pad * 2);
  const height = Math.min(image.height - y, region.height + pad * 2);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not crop a detected spine.");
  context.drawImage(source, x, y, width, height, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

async function detectBooks(image: PreparedImage) {
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
    });
    const data = await response.json() as ScanResponse;
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

export default function ScanShelfPrototype() {
  const cameraInput = useRef<HTMLInputElement>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [status, setStatus] = useState("Choose a shelf photo to begin.");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function processFile(file: File) {
    setProcessing(true);
    setError(null);
    setRegions([]);
    setStatus("Preparing photo…");

    try {
      const prepared = await prepareFile(file);
      setImage(prepared);
      setStatus("Gemini is finding the individual books…");
      const detected = await detectBooks(prepared);

      if (!detected.length) {
        setStatus("Gemini did not find any clear individual books in this photo.");
        return;
      }

      setStatus(`Cropping ${detected.length} detected book${detected.length === 1 ? "" : "s"}…`);
      const source = await loadImage(prepared.dataUrl);
      const converted = detected
        .map((book, index) => regionFromApi(book, prepared, index))
        .filter((region): region is Omit<Region, "crop"> => Boolean(region))
        .sort((left, right) => {
          const sameShelf = Math.abs(left.y - right.y) < prepared.height * 0.12;
          return sameShelf ? left.x - right.x : left.y - right.y;
        });

      const cropped = converted.map((region) => ({
        ...region,
        crop: makeCrop(source, prepared, region),
      }));

      setRegions(cropped);
      const readable = cropped.filter((region) => region.title || region.author).length;
      setStatus(`Found ${cropped.length} book${cropped.length === 1 ? "" : "s"}${readable ? ` · read text on ${readable}` : ""}.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The shelf scan failed.";
      setError(message);
      setStatus("Scan stopped.");
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
          <p className={styles.eyebrow}>EXPERIMENTAL · GEMINI DETECTION</p>
          <h1>Scan My Shelf</h1>
          <p className={styles.lead}>
            Take a straight-on shelf photo or upload one you already have. Gemini finds each physical book, outlines it, and reads visible title/author text when it can.
          </p>
        </header>

        <section className={styles.tipCard} aria-label="Photo tips">
          <strong>Best first test</strong>
          <span>Try 5–15 upright books, good even lighting, and keep the camera as square to the shelf as possible.</span>
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

            <div className={styles.imageStage}>
              <img src={image.dataUrl} alt="Bookshelf scan preview" className={styles.shelfImage} />
              {regions.map((region, index) => (
                <button
                  type="button"
                  key={region.id}
                  className={styles.regionBox}
                  style={{
                    left: `${(region.x / image.width) * 100}%`,
                    top: `${(region.y / image.height) * 100}%`,
                    width: `${(region.width / image.width) * 100}%`,
                    height: `${(region.height / image.height) * 100}%`,
                  }}
                  title={`Possible book ${index + 1}. Click to remove this detection.`}
                  aria-label={`Remove possible book ${index + 1}`}
                  onClick={() => removeRegion(region.id)}
                >
                  <span>{index + 1}</span>
                </button>
              ))}
            </div>

            {regions.length ? (
              <>
                <div className={styles.cropHeading}>
                  <div>
                    <h2>Detected books</h2>
                    <p>These are Gemini’s individual crops. Remove false detections; metadata verification comes next.</p>
                  </div>
                </div>
                <div className={styles.cropGrid}>
                  {regions.map((region, index) => (
                    <article className={styles.cropCard} key={region.id}>
                      <div className={styles.cropNumber}>#{index + 1} · {region.confidence}% book</div>
                      <div className={styles.cropImageWrap}>
                        <img src={region.crop} alt={`Detected book crop ${index + 1}`} className={styles.cropImage} />
                      </div>
                      <div className={styles.cropMeta}>
                        <strong>{region.title || "Needs identification"}</strong>
                        {region.author ? <span>{region.author}</span> : null}
                        {!region.title && region.visibleText ? <small>{region.visibleText}</small> : null}
                      </div>
                      <button className={styles.removeButton} type="button" onClick={() => removeRegion(region.id)}>Not a book</button>
                    </article>
                  ))}
                </div>
              </>
            ) : !processing ? (
              <div className={styles.emptyState}>
                <strong>No usable crops yet.</strong>
                <span>Try a closer photo of a smaller shelf section with upright books and less glare.</span>
              </div>
            ) : null}
          </section>
        ) : (
          <section className={styles.placeholder}>
            <div className={styles.placeholderIcon} aria-hidden="true">▥</div>
            <strong>Your shelf photo will appear here</strong>
            <span>Gemini will return individual book boxes and any title/author text it can actually read.</span>
          </section>
        )}

        <footer className={styles.footer}>
          This prototype sends the prepared photo to Gemini for detection. Shelf of Fame does not save the photo, crops, or results to Supabase yet.
        </footer>
      </div>
    </main>
  );
}
