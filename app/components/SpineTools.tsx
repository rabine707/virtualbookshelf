"use client";

import { useEffect, useState } from "react";
import { saveGeneratedSpine, type SpineGeneratedEventDetail } from "../../lib/spines/client";

const DEFAULT_CLOTH_PREFIX = "shelf-of-fame-default-cloth:";
const DEFAULT_STATUS = "Choose a manual or community spine above, or use the default textured cloth spine.";

type SpineToolsProps = {
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  asin?: string;
};

function defaultClothKey(title: string, author: string) {
  return `${DEFAULT_CLOTH_PREFIX}${title.trim().toLowerCase()}::${author.trim().toLowerCase()}`;
}

function emitSpine(detail: SpineGeneratedEventDetail) {
  window.dispatchEvent(new CustomEvent<SpineGeneratedEventDetail>("shelf-spine-generated", { detail }));
}

export function SpineTools({ title, author, coverUrl }: SpineToolsProps) {
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(DEFAULT_STATUS);
    setBusy(false);
  }, [author, coverUrl, title]);

  if (!coverUrl) return null;
  const confirmedCoverUrl = coverUrl;

  async function revertToDefaultSpine() {
    setBusy(true);
    try {
      localStorage.setItem(defaultClothKey(title, author), "1");
      await saveGeneratedSpine(confirmedCoverUrl, "", "overlay");
      emitSpine({ coverUrl: confirmedCoverUrl, image: "", renderMode: "overlay" });
      setStatus(`Default textured cloth spine restored for ${title}.`);
    } catch {
      setStatus("Could not restore the default cloth spine on this device.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button
      type="button"
      className="primary spine-crop-button"
      title="Restore this book to the default textured cloth spine"
      disabled={busy}
      onClick={() => void revertToDefaultSpine()}
    >
      {busy ? "↩ Restoring default cloth spine…" : "↩ Use default cloth spine"}
    </button>
    <div className="manual-spine-status" role="status">{status}</div>
  </>;
}
