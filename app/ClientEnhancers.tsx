"use client";

import { useEffect, useState } from "react";
import AuthEnricher from "./AuthEnricher";
import AudibleCoverEnricher from "./AudibleCoverEnricher";
import CoreInteractionEnricher from "./CoreInteractionEnricher";
import CoverDecisionSafety from "./CoverDecisionSafety";
import CoverSearchCleanup from "./CoverSearchCleanup";
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

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return <>
    <AuthEnricher />
    <CoreInteractionEnricher />
    <CoverDecisionSafety />
    <CoverSearchCleanup />
    <SavedCoverChoices />
    <WebCoverEnricher />
    <RomanceShelfEnricher />
    <AudibleCoverEnricher />
    <SpineArtEnricher />
    <SpineGenerator />
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
