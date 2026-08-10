"use client";

import { useEffect } from "react";

const MODEL_VIEWER_SCRIPT = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.3.1/model-viewer.min.js";
const BOOK_MODEL = "/models/shelf-book.glb";

type SceneMaterial = {
  name?: string;
  pbrMetallicRoughness?: {
    baseColorTexture?: { setTexture?: (texture: unknown) => void };
  };
};

type ModelViewerLike = HTMLElement & {
  model?: { materials?: SceneMaterial[] };
  createTexture?: (url: string) => Promise<unknown>;
};

let modelViewerReady: Promise<void> | null = null;

function ensureModelViewer() {
  if (modelViewerReady) return modelViewerReady;
  modelViewerReady = new Promise<void>((resolve, reject) => {
    if (customElements.get("model-viewer")) {
      resolve();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${MODEL_VIEWER_SCRIPT}"]`);
    if (!script) {
      script = document.createElement("script");
      script.type = "module";
      script.src = MODEL_VIEWER_SCRIPT;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }

    const timer = window.setTimeout(() => reject(new Error("3D book renderer timed out")), 15000);
    customElements.whenDefined("model-viewer").then(() => {
      window.clearTimeout(timer);
      resolve();
    }).catch((error) => {
      window.clearTimeout(timer);
      reject(error);
    });
  });
  return modelViewerReady;
}

function spineSource(button: HTMLButtonElement) {
  const art = button.querySelector<HTMLImageElement>(".generated-spine-art-dedicated");
  return art?.currentSrc || art?.src || "";
}

function removePhysicalModel(button: HTMLButtonElement) {
  button.querySelector(".physical-book-model")?.remove();
  delete button.dataset.physicalBookModel;
  delete button.dataset.physicalModelReady;
}

async function applySpineTexture(button: HTMLButtonElement, viewer: ModelViewerLike) {
  const source = spineSource(button);
  if (!source || !viewer.createTexture || !viewer.model?.materials?.length) return;
  if (viewer.dataset.spineSource === source && button.dataset.physicalModelReady === "1") return;

  const material = viewer.model.materials.find((candidate) => candidate.name === "spineTexture");
  const textureChannel = material?.pbrMetallicRoughness?.baseColorTexture;
  if (!textureChannel?.setTexture) return;

  try {
    const texture = await viewer.createTexture(source);
    if (!viewer.isConnected || spineSource(button) !== source) return;
    textureChannel.setTexture(texture);
    viewer.dataset.spineSource = source;
    viewer.classList.add("is-ready");
    button.dataset.physicalModelReady = "1";
  } catch {
    // Keep the existing flat generated spine as a graceful fallback.
    viewer.classList.remove("is-ready");
    delete button.dataset.physicalModelReady;
  }
}

function buildPhysicalModel(button: HTMLButtonElement) {
  if (button.dataset.generatedSpine !== "1" || !spineSource(button)) {
    removePhysicalModel(button);
    return;
  }

  let viewer = button.querySelector<ModelViewerLike>(".physical-book-model");
  if (!viewer) {
    viewer = document.createElement("model-viewer") as ModelViewerLike;
    viewer.className = "physical-book-model";
    viewer.setAttribute("src", BOOK_MODEL);
    viewer.setAttribute("alt", "");
    viewer.setAttribute("aria-hidden", "true");
    viewer.setAttribute("loading", "lazy");
    viewer.setAttribute("reveal", "auto");
    viewer.setAttribute("interaction-prompt", "none");
    viewer.setAttribute("environment-image", "neutral");
    viewer.setAttribute("tone-mapping", "neutral");
    viewer.setAttribute("exposure", "1");
    viewer.setAttribute("camera-target", "0m 0m 0m");
    viewer.setAttribute("camera-orbit", "1.5deg 90deg 1.95m");
    viewer.setAttribute("field-of-view", "12deg");
    viewer.tabIndex = -1;
    button.appendChild(viewer);
    button.dataset.physicalBookModel = "1";

    viewer.addEventListener("load", () => void applySpineTexture(button, viewer as ModelViewerLike));
    viewer.addEventListener("error", () => {
      viewer?.classList.remove("is-ready");
      delete button.dataset.physicalModelReady;
    });
  }

  if (customElements.get("model-viewer") && viewer.model?.materials?.length) {
    void applySpineTexture(button, viewer);
  }
}

export default function PhysicalBookEnricher() {
  useEffect(() => {
    let raf = 0;
    let stopped = false;

    const scan = () => {
      if (raf || stopped) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        for (const button of document.querySelectorAll<HTMLButtonElement>("button.book")) {
          buildPhysicalModel(button);
        }
      });
    };

    void ensureModelViewer().then(scan).catch(() => {
      // CDN failure leaves the already-working generated spine untouched.
    });

    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "data-generated-spine"],
    });

    const onGenerated = () => scan();
    window.addEventListener("shelf-spine-generated", onGenerated);
    scan();

    return () => {
      stopped = true;
      observer.disconnect();
      window.removeEventListener("shelf-spine-generated", onGenerated);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
