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
        <h1 className={styles.title}>Asset credits</h1>
        <p className={styles.intro}>
          Shelf of Fame uses a mix of original artwork, generated assets, public-domain resources,
          and licensed third-party visuals. This page records required credits and source information
          for assets used in the experience.
        </p>

        <section className={styles.list} aria-label="Third-party asset credits">
          {assetCredits.map((asset) => (
            <article className={styles.card} key={asset.id}>
              <h2 className={styles.name}>{asset.name}</h2>
              {asset.usage && (
                <p className={styles.meta}>
                  <span className={styles.label}>Used for:</span> {asset.usage}
                </p>
              )}
              <p className={styles.meta}>
                <span className={styles.label}>Source:</span>{" "}
                <a className={styles.link} href={asset.sourceUrl} target="_blank" rel="noreferrer">
                  {asset.source}
                </a>
              </p>
              <p className={styles.meta}>
                <span className={styles.label}>License:</span> {asset.license}
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
