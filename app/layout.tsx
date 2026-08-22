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
import "./auth.css";
import "./account/account.css";
import "./help-shelf-launcher.css";
import AuthSessionManager from "./AuthSessionManager";

export const metadata: Metadata = {
  title: "Shelf of Fame — Your Reading Life, On Display",
  description: "Turn the books you've read into a shelf worth showing off.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AuthSessionManager />
      </body>
    </html>
  );
}
