import Link from "next/link";
import "../public-info.css";

export const metadata = { title: "Support — Shelf of Fame" };

export default function SupportPage() {
  return <main className="public-info-page">
    <Link className="public-info-back" href="/">← Back to Shelf of Fame</Link>
    <article>
      <span className="public-info-eyebrow">NEED A HAND?</span>
      <h1>Support</h1>
      <p className="public-info-lede">Get help with your account, imports, covers, or shelf experience.</p>

      <h2>Account access</h2>
      <p>If you cannot sign in, open <Link href="/account">Account</Link> and request a password-reset email. Your shelf remains private unless you publish it.</p>

      <h2>Import or cover problems</h2>
      <p>Keep the original library export you imported. When reporting a problem, describe the import source, the affected title, and what you expected to happen. Do not include passwords or other private account information.</p>

      <h2>Report a bug or request help</h2>
      <p>Open a request in the project’s <a href="https://github.com/rabine707/virtualbookshelf/issues" target="_blank" rel="noreferrer">support tracker</a>. Reports posted there are public, so remove personal information before submitting.</p>

      <h2>Want to help with book covers?</h2>
      <p><Link href="/help-the-shelf">Help the Shelf</Link> is a separate community activity for reviewing possible covers. It is not the customer-support page.</p>
    </article>
  </main>;
}
