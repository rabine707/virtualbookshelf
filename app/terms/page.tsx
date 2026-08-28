import Link from "next/link";
import "../public-info.css";

export const metadata = { title: "Terms — Shelf of Fame" };

export default function TermsPage() {
  return <main className="public-info-page">
    <Link className="public-info-back" href="/">← Back to Shelf of Fame</Link>
    <article>
      <span className="public-info-eyebrow">SHELF OF FAME</span>
      <h1>Terms of use</h1>
      <p className="public-info-lede">Use Shelf of Fame to organize, personalize, and share your reading life responsibly.</p>
      <h2>Your account and content</h2>
      <p>You are responsible for your account and for content you upload or publish. Only share artwork and information you have the right to use.</p>
      <h2>Community conduct</h2>
      <p>Do not use the service to harass others, impersonate someone, interfere with the product, or publish unlawful or harmful material.</p>
      <h2>Book information and artwork</h2>
      <p>Book metadata and artwork may come from multiple sources and can contain mistakes. Review custom covers and spines before publishing or relying on them.</p>
      <h2>Service availability</h2>
      <p>The product is evolving and may change or experience interruptions. Keep your original library exports and any artwork you cannot replace.</p>
      <h2>Questions</h2>
      <p>Use the <Link href="/support">support page</Link> to report a problem or request help.</p>
      <p className="public-info-note">These launch terms are a concise product notice, not a substitute for jurisdiction-specific legal review.</p>
    </article>
  </main>;
}
