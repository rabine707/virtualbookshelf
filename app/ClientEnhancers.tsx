"use client";

import { useEffect, useState } from "react";
import AuthEnricher from "./AuthEnricher";
import AudibleCoverEnricher from "./AudibleCoverEnricher";
import CoreInteractionEnricher from "./CoreInteractionEnricher";
import CoverDecisionSafety from "./CoverDecisionSafety";
import CoverSearchCleanup from "./CoverSearchCleanup";
import DecorStoreEnricher from "./DecorStoreEnricher";
import HelpShelfLauncher from "./HelpShelfLauncher";
import IdentifierEditor from "./IdentifierEditor";
import MobileTapFix from "./MobileTapFix";
import PageRefreshButton from "./PageRefreshButton";
import QoLEnricher from "./QoLEnricher";
import RemoveAudibleImport from "./RemoveAudibleImport";
import RomanceShelfEnricher from "./RomanceShelfEnricher";
import SavedCoverChoices from "./SavedCoverChoices";
import SharedSpineEnricher from "./SharedSpineEnricher";
import SpineArtEnricher from "./SpineArtEnricher";
import SpineCommunityEnricher from "./SpineCommunityEnricher";
import SpineGallery from "./SpineGallery";
import SpineGenerator from "./SpineGenerator";
import ThemeEnricher from "./ThemeEnricher";
import WebCoverEnricher from "./WebCoverEnricher";

export default function ClientEnhancers() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <>
    <AuthEnricher />
    <HelpShelfLauncher />
    <CoreInteractionEnricher />
    <CoverDecisionSafety />
    <CoverSearchCleanup />
    <SavedCoverChoices />
    <WebCoverEnricher />
    <RomanceShelfEnricher />
    <AudibleCoverEnricher />
    <SpineArtEnricher />
    <SharedSpineEnricher />
    <SpineGenerator />
    <SpineGallery />
    <SpineCommunityEnricher />
    <IdentifierEditor />
    <DecorStoreEnricher />
    <MobileTapFix />
    <PageRefreshButton />
    <RemoveAudibleImport />
    <ThemeEnricher />
    <QoLEnricher />
  </>;
}
