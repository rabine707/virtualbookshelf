"use client";

import type { CloudSyncStatus } from "./hooks/useCloudShelfSync";

const LABELS: Record<CloudSyncStatus, string> = {
  local: "Saved on this device",
  saving: "Saving…",
  saved: "Saved to cloud",
  offline: "Offline · changes kept",
  retrying: "Cloud unavailable · retrying",
};

export default function CloudSyncIndicator({ status }: { status: CloudSyncStatus }) {
  return <div className={`cloud-sync-indicator is-${status}`} role="status" aria-live="polite">
    <span aria-hidden="true" />{LABELS[status]}
    <style jsx>{`
      .cloud-sync-indicator{position:fixed;z-index:120;top:max(10px,env(safe-area-inset-top));right:12px;display:flex;align-items:center;gap:7px;min-height:30px;padding:0 10px;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(20,16,13,.82);box-shadow:0 7px 24px rgba(0,0,0,.18);backdrop-filter:blur(12px);color:#c9c0b7;font:750 10px/1 Arial,sans-serif;pointer-events:none}
      .cloud-sync-indicator span{width:6px;height:6px;border-radius:50%;background:#9db47f;box-shadow:0 0 0 3px rgba(157,180,127,.12)}
      .cloud-sync-indicator.is-saving span,.cloud-sync-indicator.is-retrying span{background:#d6b47c;animation:cloud-sync-pulse 1.1s ease-in-out infinite}
      .cloud-sync-indicator.is-offline span{background:#aa8170}.cloud-sync-indicator.is-local{opacity:.78}
      @keyframes cloud-sync-pulse{50%{opacity:.35;transform:scale(.75)}}
      @media(max-width:650px){.cloud-sync-indicator{top:max(8px,env(safe-area-inset-top));right:8px;min-height:27px;padding-inline:8px;font-size:9px}}
      @media(prefers-reduced-motion:reduce){.cloud-sync-indicator span{animation:none!important}}
    `}</style>
  </div>;
}
