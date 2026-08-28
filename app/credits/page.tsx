import { assetCredits } from "../../lib/asset-credits";
import styles from "./credits.module.css";

export const metadata = {
  title: "Asset Credits | Shelf of Fame",
  description: "Credits and licenses for third-party visual assets used by Shelf of Fame.",
};

export default function CreditsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <a className={styles.back} href="/">← Back to Shelf of Fame</a>

        <p className={styles.eyebrow}>SHELF OF FAME</p>
        <h1 className={styles.title}>Credits</h1>
        <p className={styles.intro}>
          Required attribution for third-party assets used in the experience.
        </p>

        <section className={styles.list} aria-label="Third-party asset credits">
          {assetCredits.map((asset) => (
            <article className={styles.card} key={asset.id}>
              <h2 className={styles.name}>{asset.name}</h2>
              <p className={styles.meta}>
                <a className={styles.link} href={asset.sourceUrl} target="_blank" rel="noreferrer">
                  {asset.source}
                </a>
                <span aria-hidden="true"> · </span>
                <span>{asset.license}</span>
              </p>
              {asset.attribution && (
                <p className={styles.attribution}>{asset.attribution}</p>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
