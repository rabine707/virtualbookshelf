"use client";

import { ChangeEvent, useRef, useState } from "react";
import styles from "./scan.module.css";

type CvApi = any;

declare global {
  interface Window {
    cv?: CvApi | Promise<CvApi>;
  }
}

type PreparedImage = {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
};

type Region = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  crop: string;
};

const OPENCV_SCRIPT_ID = "shelf-of-fame-opencv";
const OPENCV_URL = "https://docs.opencv.org/4.x/opencv.js";
const MAX_IMAGE_DIMENSION = 1800;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function resolveCv() {
  const value = window.cv;
  if (!value) return null;
  if (typeof (value as Promise<CvApi>).then === "function") {
    const resolved = await (value as Promise<CvApi>);
    window.cv = resolved;
    return resolved;
  }
  return value as CvApi;
}

async function loadOpenCv() {
  const existing = await resolveCv();
  if (existing?.Mat) return existing;

  let script = document.getElementById(OPENCV_SCRIPT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = OPENCV_SCRIPT_ID;
    script.src = OPENCV_URL;
    script.async = true;
    document.head.appendChild(script);
  }

  const started = Date.now();
  while (Date.now() - started < 20_000) {
    const cv = await resolveCv();
    if (cv?.Mat) return cv;
    await wait(100);
  }

  throw new Error("OpenCV could not finish loading. Check your connection and try again.");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be opened by your browser."));
    image.src = src;
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

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      width,
      height,
      fileName: file.name || "bookshelf-photo",
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function overlapRatio(a: Omit<Region, "id" | "crop">, b: Omit<Region, "id" | "crop">) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) return 0;
  const overlap = (right - left) * (bottom - top);
  return overlap / Math.min(a.width * a.height, b.width * b.height);
}

function cleanRegions(regions: Array<Omit<Region, "id" | "crop">>) {
  const ranked = [...regions].sort((a, b) => (b.height * b.width) - (a.height * a.width));
  const kept: Array<Omit<Region, "id" | "crop">> = [];

  for (const region of ranked) {
    if (kept.some((existing) => overlapRatio(region, existing) > 0.82)) continue;
    kept.push(region);
  }

  return kept.sort((a, b) => a.x - b.x).slice(0, 60);
}

// Detection approach adapted from the CC0 Libiry BookSpineScanner project:
// grayscale -> blur -> Canny edges -> vertical dilation -> contour filtering.
async function detectSpineRegions(image: PreparedImage) {
  const cv = await loadOpenCv();
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not analyze this photo.");
  context.drawImage(await loadImage(image.dataUrl), 0, 0, image.width, image.height);

  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const kernelHeight = Math.max(7, Math.round(image.height / 150));
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, kernelHeight));

  const candidates: Array<Omit<Region, "id" | "crop">> = [];
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    cv.Canny(gray, edges, 45, 145);
    cv.dilate(edges, edges, kernel);
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const minHeight = image.height * 0.27;
    const minWidth = Math.max(10, image.width * 0.006);
    const maxWidth = image.width * 0.24;

    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      try {
        const rect = cv.boundingRect(contour);
        const ratio = rect.height / Math.max(rect.width, 1);
        const tallEnough = rect.height >= minHeight;
        const usefulWidth = rect.width >= minWidth && rect.width <= maxWidth;
        const spineLike = ratio >= 1.65;
        if (!tallEnough || !usefulWidth || !spineLike) continue;

        candidates.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
      } finally {
        contour.delete?.();
      }
    }
  } finally {
    src.delete();
    gray.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    kernel.delete();
  }

  return cleanRegions(candidates);
}

async function makeCrop(image: PreparedImage, region: Omit<Region, "id" | "crop">) {
  const source = await loadImage(image.dataUrl);
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
  return canvas.toDataURL("image/jpeg", 0.94);
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
      setStatus("Loading spine detector…");
      await loadOpenCv();
      setStatus("Finding book-shaped regions…");
      const detected = await detectSpineRegions(prepared);

      if (!detected.length) {
        setStatus("No clear spine-shaped regions found yet.");
        return;
      }

      setStatus(`Cropping ${detected.length} detected spine${detected.length === 1 ? "" : "s"}…`);
      const cropped = await Promise.all(detected.map(async (region, index) => ({
        ...region,
        id: `${Date.now()}-${index}`,
        crop: await makeCrop(prepared, region),
      })));
      setRegions(cropped);
      setStatus(`Found ${cropped.length} possible book spine${cropped.length === 1 ? "" : "s"}.`);
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
          <p className={styles.eyebrow}>EXPERIMENTAL · DETECTION ONLY</p>
          <h1>Scan My Shelf</h1>
          <p className={styles.lead}>
            Take a straight-on photo of a shelf or upload one you already have. This first prototype only finds and crops possible book spines—nothing is saved to your account yet.
          </p>
        </header>

        <section className={styles.tipCard} aria-label="Photo tips">
          <strong>Best first test</strong>
          <span>Try 5–15 upright books, good even lighting, and keep the camera as square to the shelf as possible.</span>
        </section>

        <section className={styles.actions}>
          <button className={styles.primaryButton} type="button" disabled={processing} onClick={() => cameraInput.current?.click()}>
            <span aria-hidden="true">📷</span>
            Take Photo
          </button>
          <button className={styles.secondaryButton} type="button" disabled={processing} onClick={() => uploadInput.current?.click()}>
            <span aria-hidden="true">🖼️</span>
            Upload Photo
          </button>
          {image ? (
            <button className={styles.ghostButton} type="button" disabled={processing} onClick={reset}>
              Clear
            </button>
          ) : null}
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
                  title={`Possible spine ${index + 1}. Click to remove this detection.`}
                  aria-label={`Remove possible spine ${index + 1}`}
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
                    <h2>Detected spine crops</h2>
                    <p>Tap “Not a book” on any false detection. OCR and title matching come in the next pass.</p>
                  </div>
                </div>
                <div className={styles.cropGrid}>
                  {regions.map((region, index) => (
                    <article className={styles.cropCard} key={region.id}>
                      <div className={styles.cropNumber}>#{index + 1}</div>
                      <div className={styles.cropImageWrap}>
                        <img src={region.crop} alt={`Detected spine crop ${index + 1}`} className={styles.cropImage} />
                      </div>
                      <button className={styles.removeButton} type="button" onClick={() => removeRegion(region.id)}>
                        Not a book
                      </button>
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
            <span>Detected book regions will be outlined and turned into individual spine crops.</span>
          </section>
        )}

        <footer className={styles.footer}>
          Prototype scope: local image processing only. No OCR, metadata lookup, shelf import, Supabase upload, or community sharing is enabled in this branch yet.
        </footer>
      </div>
    </main>
  );
}
