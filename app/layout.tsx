import type { Metadata } from "next";
import "./globals.css";
import "./spine-fix.css";
import AudibleCoverEnricher from "./AudibleCoverEnricher";

export const metadata: Metadata = {
  title: "Virtual Bookshelf",
  description: "A cozy visual bookshelf with Goodreads CSV import.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AudibleCoverEnricher />
      </body>
    </html>
  );
}
