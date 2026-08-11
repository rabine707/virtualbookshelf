"use client";

import { useEffect, useState } from "react";
import AuthEnricher from "./AuthEnricher";
import AudibleCoverEnricher from "./AudibleCoverEnricher";
import CommunityCoverUploadEnricher from "./CommunityCoverUploadEnricher";
import CoreInteractionEnricher from "./CoreInteractionEnricher";
import CoverDecisionSafety from "./CoverDecisionSafety";
import CoverSearchCleanup from "./CoverSearchCleanup";
import DecorStoreEnricher from "./DecorStoreEnricher";
import HelpShelfLauncher from "./HelpShelfLauncher";
import IdentifierEditor from "./IdentifierEditor";
import LibraryDeleteEnricher from "./LibraryDeleteEnricher";
import MobileTapFix from "./MobileTapFix";
import PageRefreshButton from "./PageRefreshButton";
import QoLEnricher from "./QoLEnricher";
import RemoveAudibleImport from "./RemoveAudibleImport";
import RomanceShelfEnricher from "./RomanceShelfEnricher";
import SavedCoverChoicesStable from "./SavedCoverChoicesStable";
import ScannedSpineEnricher from "./ScannedSpineEnricher";
import SharedSpineEnricher from "./SharedSpineEnricher";
import SpineArtEnricher from "./SpineArtEnricher";
import SpineCommunityEnricher from "./SpineCommunityEnricher";
import SpineGenerator from "./SpineGenerator";
import SpineSourcePreferenceEnricher from "./SpineSourcePreferenceEnricher";
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
    <SavedCoverChoicesStable />
    <WebCoverEnricher />
    <RomanceShelfEnricher />
    <AudibleCoverEnricher />
    <CommunityCoverUploadEnricher />
    <SpineSourcePreferenceEnricher />
    <SpineArtEnricher />
    <ScannedSpineEnricher />
    <SharedSpineEnricher />
    <SpineGenerator />
    <SpineCommunityEnricher />
    <IdentifierEditor />
    <LibraryDeleteEnricher />
    <DecorStoreEnricher />
    <MobileTapFix />
    <PageRefreshButton />
    <RemoveAudibleImport />
    <ThemeEnricher />
    <QoLEnricher />
  </>;
}
