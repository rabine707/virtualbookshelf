"use client";

/**
 * Makes the V7 desktop experiment consume the room as one normal static image.
 * No data URLs, blob URLs, runtime reconstruction, or API route is involved.
 */
export default function BotanicalScenePlateImageFixStyles() {
  return <style>{`
    @media (min-width: 1181px) and (min-aspect-ratio: 3 / 2) {
      html[data-shelf-theme="botanical"] main.shelf-page::before,
      html[data-shelf-theme="botanical"][data-botanical-v7-ready="true"] main.shelf-page::before {
        background-image: url("/themes/botanical/v7/room.webp") !important;
        background-position: center center !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        opacity: 1 !important;
      }
    }
  `}</style>;
}
