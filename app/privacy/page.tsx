import Link from "next/link";
import "../public-info.css";

export const metadata = { title: "Privacy — Shelf of Fame" };

export default function PrivacyPage() {
  return <main className="public-info-page">
    <Link className="public-info-back" href="/">← Back to Shelf of Fame</Link>
    <article>
      <span className="public-info-eyebrow">YOUR READING LIFE</span>
      <h1>Privacy</h1>
      <p className="public-info-lede">Your shelf is private unless you choose to publish it.</p>
      <h2>What stays private</h2>
      <p>Your email, password, private reading notes, account settings, and unpublished shelf are not displayed on your public profile.</p>
      <h2>What you can share</h2>
      <p>If you publish your shelf, readers can see the profile details, genres, favorites, books, and shelf artwork you choose to make public. Reading activity sharing is a separate, optional control.</p>
      <h2>Where information is stored</h2>
      <p>Shelf of Fame may store shelf and account information on your device and, when you sign in, in its cloud services so your collection can sync across sessions.</p>
      <h2>Your choices</h2>
      <p>You can make your shelf private again from Public Shelf settings. For help with your information or account, use the <Link href="/support">support page</Link>.</p>
      <p className="public-info-note">This plain-language notice describes the current product behavior and will be expanded as public services are added.</p>
    </article>
  </main>;
}
