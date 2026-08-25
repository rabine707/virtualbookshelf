"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AUTH_CHANGED_EVENT, getShelfProfile, readStoredShelfSession } from "../auth-client";
import { SpineOrnament } from "../mobile-first/SpineOrnament";
import { spineArtworkImage } from "../mobile-first/spineArtworkAssets";
import type { SpineArtworkId } from "../mobile-first/spineTemplates";
import "./engravings.css";

type CatalogItem = { id: SpineArtworkId; category: string };

const CATALOG: CatalogItem[] = [
  { id: "gothic-castle", category: "Fantasy" },
  { id: "skull-botanicals", category: "Dark romance" },
  { id: "ornate-key", category: "Mystery" },
  { id: "moth-moon", category: "Celestial" },
  { id: "heart-dagger", category: "Dark romance" },
  { id: "raven-moon", category: "Mystery" },
  { id: "letter-roses", category: "Romance" },
  { id: "hockey-heritage", category: "Sports" },
  { id: "western-wildflowers", category: "Nature" },
  { id: "moon-forest", category: "Celestial" },
  { id: "compass-star", category: "Celestial" },
  { id: "leafy-sprig", category: "Botanical" },
  { id: "botanical-key", category: "Botanical" },
  { id: "rose-bloom", category: "Floral" },
  { id: "wildflowers", category: "Floral" },
  { id: "crossed-axes", category: "Fantasy" },
  { id: "crown-blade", category: "Fantasy" },
  { id: "serpent-rose", category: "Dark romance" },
  { id: "thorn-heart", category: "Romance" },
  { id: "mountain-pines", category: "Nature" },
  { id: "frost-mountain", category: "Nature" },
  { id: "heart-vine", category: "Romance" },
  { id: "playing-cards", category: "Games" },
  { id: "hockey-heart", category: "Sports" },
  { id: "crossed-sticks", category: "Sports" },
  { id: "watching-eye", category: "Mystery" },
  { id: "candle-key", category: "Mystery" },
  { id: "fox-moon", category: "Nature" },
  { id: "sealed-letter", category: "Romance" },
  { id: "wedding-rings", category: "Romance" },
  { id: "moth-bloom", category: "Floral" },
  { id: "coastal-sun", category: "Nature" },
  { id: "broken-heart-roses", category: "Dark romance" },
  { id: "travel-postcards", category: "Travel" },
  { id: "apartment-window", category: "Contemporary" },
  { id: "mistletoe-bells", category: "Seasonal" },
  { id: "medical-herbarium", category: "Contemporary" },
  { id: "wine-vines", category: "Botanical" },
  { id: "lace-mask", category: "Dark romance" },
  { id: "lips", category: "Romance" },
  { id: "open-book", category: "Literary" },
  { id: "hourglass", category: "Literary" },
  { id: "lighthouse", category: "Nature" },
  { id: "feather-quill", category: "Literary" },
];

function label(id: string) {
  return id.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

export default function EngravingLibraryPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const checkAccess = useCallback(async () => {
    const session = readStoredShelfSession();
    if (!session?.access_token || !session.user?.id) {
      setAllowed(false);
      return;
    }
    if (session.profile?.trusted_curator === true) setAllowed(true);
    const profile = await getShelfProfile(session.user.id, session.access_token);
    setAllowed(profile?.trusted_curator === true);
  }, []);

  useEffect(() => {
    void checkAccess();
    const onAuthChanged = () => void checkAccess();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [checkAccess]);

  if (allowed !== true) {
    return (
      <main className="engraving-library engraving-library-gate">
        <span className="engraving-library-eyebrow">Shelf of Fame studio</span>
        <h1>{allowed === null ? "Checking access…" : "Curator access only"}</h1>
        <p>{allowed === null ? "Opening the engraving library." : "This internal design library is available to trusted curators."}</p>
        {allowed === false ? <Link href="/" className="engraving-library-back">← Back to shelf</Link> : null}
      </main>
    );
  }

  return (
    <main className="engraving-library">
      <header className="engraving-library-header">
        <div>
          <span className="engraving-library-eyebrow">Shelf of Fame studio</span>
          <h1>Engraving Library</h1>
          <p>Every reusable motif currently available to the shared spine renderer.</p>
        </div>
        <Link href="/" className="engraving-library-back">← Back to shelf</Link>
      </header>

      <div className="engraving-library-summary">
        <strong>{CATALOG.length}</strong>
        <span>engraving motifs</span>
      </div>

      <section className="engraving-library-grid" aria-label="All engraving motifs">
        {CATALOG.map((item) => {
          const image = spineArtworkImage(item.id);
          return (
            <article className="engraving-card" key={item.id}>
              <div className="engraving-card-preview" data-render-type={image ? "illustrated" : "vector"}>
                {image
                  ? <img src={image} alt="" loading="lazy" decoding="async" />
                  : <SpineOrnament artwork={item.id} className="engraving-card-svg" />}
              </div>
              <div className="engraving-card-copy">
                <strong>{label(item.id)}</strong>
                <span>{item.category}</span>
                <small>{image ? "Illustrated" : "Vector"}</small>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
