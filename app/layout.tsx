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
import "./web-cover-search.css";
import "./saved-cover-choices.css";
import "./generated-spines.css";
import "./page-refresh.css";
import "./spine-generator.css";
import AudibleCoverEnricher from "./AudibleCoverEnricher";
import CoverAutoClose from "./CoverAutoClose";
import CoverDecisionSafety from "./CoverDecisionSafety";
import CoverSearchCleanup from "./CoverSearchCleanup";
import CoverSelectionEnricher from "./CoverSelectionEnricher";
import MobileTapFix from "./MobileTapFix";
import PageRefreshButton from "./PageRefreshButton";
import RemoveAudibleImport from "./RemoveAudibleImport";
import RomanceShelfEnricher from "./RomanceShelfEnricher";
import SavedCoverChoices from "./SavedCoverChoices";
import SpineArtEnricher from "./SpineArtEnricher";
import SpineGenerator from "./SpineGenerator";
import ThemeEnricher from "./ThemeEnricher";
import WebCoverEnricher from "./WebCoverEnricher";

export const metadata: Metadata = {
  title: "Virtual Bookshelf",
  description: "A cozy visual bookshelf with Goodreads CSV import.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <CoverAutoClose />
        <CoverDecisionSafety />
        <CoverSearchCleanup />
        <CoverSelectionEnricher />
        <SavedCoverChoices />
        <WebCoverEnricher />
        <RomanceShelfEnricher />
        <AudibleCoverEnricher />
        <SpineArtEnricher />
        <SpineGenerator />
        <MobileTapFix />
        <PageRefreshButton />
        <RemoveAudibleImport />
        <ThemeEnricher />
      </body>
    </html>
  );
}
