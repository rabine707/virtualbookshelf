"use client";

/**
 * V7 scene-plate stacking rules.
 * The room is fixed to the viewport at z=0. The app scene sits above it, with
 * the dynamic bookshelf and live controls retaining their existing z layers.
 */
export default function BotanicalScenePlateImageFixStyles() {
  return <style>{`
    .botanical-v7-room-layer {
      display: none;
    }

    @media (min-width: 1181px) and (min-aspect-ratio: 3 / 2) {
      html[data-shelf-theme="botanical"] main.shelf-page::before {
        content: none !important;
        display: none !important;
        background: none !important;
        opacity: 0 !important;
      }

      html[data-shelf-theme="botanical"] body > .botanical-v7-room-layer {
        display: block !important;
        position: fixed !important;
        inset: 0 !important;
        z-index: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
        pointer-events: none !important;
        user-select: none !important;
        background: #080d09 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-v7-room-plate {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        object-fit: cover !important;
        object-position: center center !important;
      }

      html[data-shelf-theme="botanical"] main.shelf-page {
        z-index: 1 !important;
        background: transparent !important;
      }
    }
  `}</style>;
}
