"use client";

/**
 * V7 scene-plate stacking rules.
 * The photographic room is a real image node at z=10, the live bookshelf is
 * z=30, and the live header/controls are z=40.
 */
export default function BotanicalScenePlateImageFixStyles() {
  return <style>{`
    .botanical-v7-room-plate {
      display: none;
    }

    @media (min-width: 1181px) and (min-aspect-ratio: 3 / 2) {
      html[data-shelf-theme="botanical"] main.shelf-page::before {
        content: none !important;
        display: none !important;
        background: none !important;
        opacity: 0 !important;
      }

      html[data-shelf-theme="botanical"] main.shelf-page > .botanical-v7-room-plate {
        display: block !important;
        position: absolute !important;
        z-index: 10 !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        object-fit: cover !important;
        object-position: center center !important;
        pointer-events: none !important;
        user-select: none !important;
      }
    }
  `}</style>;
}
