"use client";

/**
 * Makes the V7 desktop experiment consume the room as a normal image URL.
 * This deliberately overrides the earlier client-side data/blob loading path.
 */
export default function BotanicalScenePlateImageFixStyles() {
  return <style>{`
    @media (min-width: 1181px) and (min-aspect-ratio: 3 / 2) {
      html[data-shelf-theme="botanical"] main.shelf-page::before,
      html[data-shelf-theme="botanical"][data-botanical-v7-ready="true"] main.shelf-page::before {
        background-image: url("/api/botanical-room-live") !important;
        background-position: center center !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        opacity: 1 !important;
      }
    }
  `}</style>;
}
