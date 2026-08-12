"use client";

import { useEffect, useState } from "react";
import AuthEnricher from "./AuthEnricher";
import AudibleCoverEnricher from "./AudibleCoverEnricher";
import BookSearchAdd from "./BookSearchAdd";
import BotanicalSceneEnricher from "./BotanicalSceneEnricher";
import CloudAccountSettings from "./CloudAccountSettings";
import CloudSyncEnricher from "./CloudSyncEnricher";
import CommunityCoverSync from "./CommunityCoverSync";
import CoreInteractionEnricher from "./CoreInteractionEnricher";
import HelpShelfLauncher from "./HelpShelfLauncher";
import IdentifierEditor from "./IdentifierEditor";
import MobileTapFix from "./MobileTapFix";
import ModalScrollLock from "./ModalScrollLock";
import PageRefreshButton from "./PageRefreshButton";
import QoLEnricher from "./QoLEnricher";
import RemoveAudibleImport from "./RemoveAudibleImport";
import RomanceShelfEnricher from "./RomanceShelfEnricher";
import ShelfScanner from "./ShelfScanner";
import SharedSpineEnricher from "./SharedSpineEnricher";
import SpineArtEnricher from "./SpineArtEnricher";
import SpineAuthorCorrector from "./SpineAuthorCorrector";
import SpineCommunityEnricher from "./SpineCommunityEnricher";
import SpineErrorSanitizer from "./SpineErrorSanitizer";
import SpineGallery from "./SpineGallery";
import SpineGenerator from "./SpineGenerator";
import ThemeEnricher from "./ThemeEnricher";

function MobileBottomNav() {
  const click = (selector: string) => {
    const target = document.querySelector<HTMLElement>(selector);
    target?.click();
  };

  const goToShelf = () => {
    const shelf = document.querySelector<HTMLElement>(".bookcase");
    if (shelf) {
      shelf.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // The mobile nav is rendered from the root layout, including /account.
    // If there is no shelf on the current route, Shelf should actually return
    // to the home shelf instead of becoming a no-op.
    window.location.assign("/");
  };

  return <>
    <style>{`
      .safe-mobile-nav { display: none; }
      @media (max-width: 760px) {
        body { padding-bottom: calc(92px + env(safe-area-inset-bottom)) !important; }
        .help-shelf-launcher { display: none !important; }
        .safe-mobile-nav {
          position: fixed;
          z-index: 120;
          left: 16px;
          right: 16px;
          bottom: max(12px, env(safe-area-inset-bottom));
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          padding: 8px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 22px;
          background: rgba(18,15,13,.96);
          box-shadow: 0 14px 44px rgba(0,0,0,.48);
          backdrop-filter: blur(18px);
        }
        .safe-mobile-nav button {
          min-width: 0;
          min-height: 58px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 4px;
          padding: 6px 4px;
          border: 0;
          border-radius: 16px;
          background: transparent;
          color: inherit;
          font: inherit;
        }
        .safe-mobile-nav button:nth-child(2) { background: rgba(255,255,255,.1); }
        .safe-mobile-nav span { font-size: 23px; line-height: 1; }
        .safe-mobile-nav b { font-size: 11px; line-height: 1; }
      }
    `}</style>
    <nav className="safe-mobile-nav" aria-label="Main navigation">
      <button type="button" onClick={goToShelf}>
        <span aria-hidden="true">▤</span><b>Shelf</b>
      </button>
      <button type="button" onClick={() => window.dispatchEvent(new Event("shelf-open-book-search"))}>
        <span aria-hidden="true">＋</span><b>Add</b>
      </button>
      <button type="button" onClick={() => click(".theme-picker-trigger")}>
        <span aria-hidden="true">✦</span><b>Style</b>
      </button>
      <button type="button" onClick={() => {
        const profile = document.querySelector<HTMLElement>(".sof-profile-link");
        if (profile) profile.click();
        else click(".sof-account > button");
      }}>
        <span aria-hidden="true">●</span><b>You</b>
      </button>
    </nav>
  </>;
}

export default function ClientEnhancers() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <>
    <AuthEnricher />
    <CloudSyncEnricher />
    <BookSearchAdd />
    <ShelfScanner />
    <CloudAccountSettings />
    <HelpShelfLauncher />
    <CoreInteractionEnricher />
    <ModalScrollLock />
    <CommunityCoverSync />
    <RomanceShelfEnricher />
    <AudibleCoverEnricher />
    <SpineArtEnricher />
    <SharedSpineEnricher />
    <SpineGenerator />
    <SpineErrorSanitizer />
    <SpineGallery />
    <SpineAuthorCorrector />
    <SpineCommunityEnricher />
    <IdentifierEditor />
    <MobileTapFix />
    <PageRefreshButton />
    <RemoveAudibleImport />
    <ThemeEnricher />
    <BotanicalSceneEnricher />
    <QoLEnricher />
    <MobileBottomNav />
  </>;
}
