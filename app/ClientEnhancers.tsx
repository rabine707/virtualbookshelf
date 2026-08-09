"use client";

import { useEffect, useState } from "react";
import AudibleCoverEnricher from "./AudibleCoverEnricher";
import BookHubEnricher from "./BookHubEnricher";
import CoverAutoClose from "./CoverAutoClose";
import CoverDecisionSafety from "./CoverDecisionSafety";
import CoverSearchCleanup from "./CoverSearchCleanup";
import CoverSelectionEnricher from "./CoverSelectionEnricher";
import DecorStoreEnricher from "./DecorStoreEnricher";
import IdentifierEditor from "./IdentifierEditor";
import MobileTapFix from "./MobileTapFix";
import PageRefreshButton from "./PageRefreshButton";
import QoLEnricher from "./QoLEnricher";
import RemoveAudibleImport from "./RemoveAudibleImport";
import RomanceShelfEnricher from "./RomanceShelfEnricher";
import SavedCoverChoices from "./SavedCoverChoices";
import SpineArtEnricher from "./SpineArtEnricher";
import SpineCommunityEnricher from "./SpineCommunityEnricher";
import SpineGenerator from "./SpineGenerator";
import ThemeEnricher from "./ThemeEnricher";
import WebCoverEnricher from "./WebCoverEnricher";

export default function ClientEnhancers() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
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
      <SpineCommunityEnricher />
      <IdentifierEditor />
      <BookHubEnricher />
      <DecorStoreEnricher />
      <MobileTapFix />
      <PageRefreshButton />
      <RemoveAudibleImport />
      <ThemeEnricher />
      <QoLEnricher />
    </>
  );
}
