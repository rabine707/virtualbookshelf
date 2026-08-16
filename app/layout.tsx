import type { Metadata } from "next";
import "./globals.css";
import "./spine-fix.css";
import "./theme-dark-academia.css";
import "./theme-dark-academia-v2.css";
import "./theme-cinematic-dark.css";
import "./theme-organic-dark.css";
import "./theme-mobile-hotfix.css";
import "./theme-asset-dark.css";
import "./theme-mega-upgrade.css";
import "./theme-packs.css";
import "./theme-environment-pack.css";
import "./theme-gallery.css";
import "./modal-cover-hotfix.css";
import "./modal-scroll-lock.css";
import "./web-cover-search.css";
import "./saved-cover-choices.css";
import "./generated-spines.css";
import "./spine-physical-cleanup.css";
import "./page-refresh.css";
import "./spine-generator.css";
import "./spine-author-correction.css";
import "./spine-community.css";
import "./identifier-editor.css";
import "./book-hub.css";
import "./decor-store.css";
import "./qol.css";
import "./auth.css";
import "./account/account.css";
import "./help-shelf-launcher.css";
import "./reader-ui-cleanup.css";
import "./mobile-shelf-compression.css";
import "./theme-ui-polish.css";
import "./desktop-toolbar-refine.css";
import "./shelf-art-polish.css";
import "./botanical-production.css";
import "./botanical-walnut-material.css";
import "./bookshelf-3d-prototype.css";
import "./prototype-page.css";
import "./cinematic-library-v2.css";
import "./cinematic-library-v3.css";
import "./cinematic-library-v3-fixes.css";
import "./cinematic-library-v4.css";
import "./cinematic-library-v5.css";
import "./cinematic-library-v6.css";
import "./cinematic-library-v7.css";
import BotanicalAssetEnricher from "./BotanicalAssetEnricher";
import BotanicalPropStyles from "./BotanicalPropStyles";
import BotanicalLampFixStyles from "./BotanicalLampFixStyles";
import BotanicalLightingStyles from "./BotanicalLightingStyles";
import ClientEnhancers from "./ClientEnhancers";
import ThreeDPrototypeLauncher from "./ThreeDPrototypeLauncher";

export const metadata: Metadata = {
  title: "Virtual Bookshelf",
  description: "A cozy visual bookshelf with Goodreads CSV import.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <BotanicalPropStyles />
        <BotanicalLampFixStyles />
        <BotanicalLightingStyles />
        {children}
        <ClientEnhancers />
        <BotanicalAssetEnricher />
        <ThreeDPrototypeLauncher />
      </body>
    </html>
  );
}
