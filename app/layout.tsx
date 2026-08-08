import type { Metadata } from "next";
import "./globals.css";
import "./spine-fix.css";
import "./theme-dark-academia.css";
import "./theme-dark-academia-v2.css";
import "./theme-cinematic-dark.css";
import "./theme-organic-dark.css";
import "./theme-mobile-hotfix.css";
import "./theme-asset-dark.css";
import "./modal-cover-hotfix.css";
import AudibleCoverEnricher from "./AudibleCoverEnricher";
import RomanceShelfEnricher from "./RomanceShelfEnricher";
import ThemeEnricher from "./ThemeEnricher";

export const metadata: Metadata = {
  title: "Virtual Bookshelf",
  description: "A cozy visual bookshelf with Goodreads CSV import.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <RomanceShelfEnricher />
        <AudibleCoverEnricher />
        <ThemeEnricher />
      </body>
    </html>
  );
}
