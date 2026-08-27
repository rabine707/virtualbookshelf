import type { Metadata } from "next";
import "./globals.css";
import "./modal-cover-hotfix.css";
import "./modal-scroll-lock.css";
import "./web-cover-search.css";
import "./saved-cover-choices.css";
import "./generated-spines.css";
import "./spine-generator.css";
import "./spine-author-correction.css";
import "./spine-community.css";
import "./identifier-editor.css";
import "./book-hub.css";
import "./cover-review.css";
import "./theme-ui-polish.css";
import "./auth.css";
import "./account/account.css";
import "./help-shelf-launcher.css";
import AuthSessionManager from "./AuthSessionManager";
import PublicFooter from "./components/PublicFooter";

export const metadata: Metadata = {
  metadataBase: new URL("https://virtualbookshelf-eta.vercel.app"),
  title: "Shelf of Fame — Your Reading Life, On Display",
  description: "Turn the books you've read into a shelf worth showing off.",
  applicationName: "Shelf of Fame",
  openGraph: {
    title: "Shelf of Fame — Your Reading Life, On Display",
    description: "Turn the books you've read into a shelf worth showing off.",
    type: "website",
    siteName: "Shelf of Fame",
  },
  twitter: {
    card: "summary",
    title: "Shelf of Fame — Your Reading Life, On Display",
    description: "Turn the books you've read into a shelf worth showing off.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PublicFooter />
        <AuthSessionManager />
      </body>
    </html>
  );
}
