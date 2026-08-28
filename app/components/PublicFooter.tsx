import Link from "next/link";

export default function PublicFooter() {
  return <footer className="public-launch-footer" aria-label="Shelf of Fame information">
    <span>© {new Date().getFullYear()} Shelf of Fame</span>
    <nav aria-label="Legal and support">
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/support">Support</Link>
      <Link href="/credits">Credits</Link>
    </nav>
  </footer>;
}
