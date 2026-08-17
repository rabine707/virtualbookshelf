"use client";

/**
 * Botanical V7 desktop experiment.
 *
 * One coherent room image owns the architecture and atmosphere. The real title,
 * controls and bookshelf stay interactive DOM. The bookshelf becomes a scroll
 * viewport fitted into the empty framed opening in the room plate.
 *
 * Tablet/mobile intentionally keep the existing Botanical implementation until
 * the desktop composition is approved.
 */
export default function BotanicalScenePlateStyles() {
  return <style>{`
    @media (min-width: 1181px) and (min-aspect-ratio: 3 / 2) {
      html[data-shelf-theme="botanical"],
      html[data-shelf-theme="botanical"] body {
        width: 100% !important;
        height: 100% !important;
        min-height: 100% !important;
        overflow: hidden !important;
        background: #080d09 !important;
      }

      html[data-shelf-theme="botanical"] main.shelf-page {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        max-width: none !important;
        height: 100vh !important;
        min-height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #080d09 !important;
        isolation: isolate !important;
      }

      /* The room is one scene, not a collection of independently floating props. */
      html[data-shelf-theme="botanical"] main.shelf-page::before {
        content: "";
        position: absolute;
        z-index: 0;
        inset: 0;
        pointer-events: none;
        background-color: #080d09;
        background-position: center center;
        background-repeat: no-repeat;
        background-size: cover;
        opacity: 0;
        transition: opacity .28s ease;
      }

      html[data-shelf-theme="botanical"][data-botanical-v7-ready="true"] main.shelf-page::before {
        background-image: var(--botanical-v7-room);
        opacity: 1;
      }

      /* Retire the old separately composed room when the scene-plate experiment is active. */
      html[data-shelf-theme="botanical"] .cinematic-room__plate,
      html[data-shelf-theme="botanical"] .cinematic-room__daylight,
      html[data-shelf-theme="botanical"] .cinematic-room__vignette,
      html[data-shelf-theme="botanical"] .botanical-real-room-props,
      html[data-shelf-theme="botanical"] .botanical-v3-room,
      html[data-shelf-theme="botanical"] .botanical-v3-foreground,
      html[data-shelf-theme="botanical"] .botanical-asset-room,
      html[data-shelf-theme="botanical"] .botanical-asset-foreground {
        display: none !important;
      }

      /* The former hero becomes a transparent interaction layer over the upper wall. */
      html[data-shelf-theme="botanical"] .cinematic-room {
        position: absolute !important;
        z-index: 40 !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        pointer-events: none !important;
        isolation: auto !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        position: absolute !important;
        z-index: 50 !important;
        top: 12px !important;
        left: 27.2vw !important;
        right: 20.5vw !important;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        pointer-events: auto !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero {
        min-height: 84px !important;
        height: auto !important;
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 18px !important;
        margin: 0 !important;
        padding: 0 0 7px !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero .eyebrow {
        margin: 0 0 3px !important;
        font-size: 9px !important;
        letter-spacing: .23em !important;
        color: rgba(197, 210, 154, .88) !important;
        text-shadow: 0 2px 12px rgba(0,0,0,.72) !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero h1 {
        font-size: clamp(43px, 3.7vw, 59px) !important;
        line-height: .9 !important;
        letter-spacing: -.038em !important;
        color: #eee9dc !important;
        text-shadow: 0 5px 24px rgba(0,0,0,.72) !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero .subhead {
        max-width: 590px !important;
        margin: 6px 0 0 !important;
        font-size: 12.5px !important;
        line-height: 1.25 !important;
        color: rgba(238, 233, 220, .76) !important;
        text-shadow: 0 2px 10px rgba(0,0,0,.72) !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero-actions {
        flex: 0 0 auto !important;
        padding-top: 1px !important;
      }

      html[data-shelf-theme="botanical"] .reader-add-books-trigger {
        min-height: 36px !important;
        padding: 7px 17px !important;
        font-size: 12.5px !important;
        box-shadow: 0 8px 22px rgba(0,0,0,.28), inset 0 1px rgba(255,255,255,.34) !important;
      }

      /* Keep the existing two-row control logic, but let it visually recede into the wall. */
      html[data-shelf-theme="botanical"] .reader-toolbar {
        grid-template-rows: 36px 36px !important;
        gap: 5px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar .search,
      html[data-shelf-theme="botanical"] .reader-toolbar select,
      html[data-shelf-theme="botanical"] .reader-toolbar .page-refresh-button,
      html[data-shelf-theme="botanical"] .reader-toolbar .count-pill,
      html[data-shelf-theme="botanical"] .reader-toolbar .qol-fix-button,
      html[data-shelf-theme="botanical"] .reader-toolbar > .spine-review-launch,
      html[data-shelf-theme="botanical"] .reader-toolbar > .theme-picker-trigger,
      html[data-shelf-theme="botanical"] .reader-toolbar > .spine-label-toggle {
        min-height: 36px !important;
        height: 36px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar .search-wrap,
      html[data-shelf-theme="botanical"] .reader-toolbar select,
      html[data-shelf-theme="botanical"] .reader-toolbar .page-refresh-button,
      html[data-shelf-theme="botanical"] .reader-toolbar .count-pill,
      html[data-shelf-theme="botanical"] .reader-toolbar .qol-fix-button,
      html[data-shelf-theme="botanical"] .reader-toolbar > .spine-review-launch,
      html[data-shelf-theme="botanical"] .reader-toolbar > .theme-picker-trigger,
      html[data-shelf-theme="botanical"] .reader-toolbar > .spine-label-toggle {
        background: rgba(7, 18, 11, .58) !important;
        border-color: rgba(183, 201, 143, .22) !important;
        border-radius: 11px !important;
        box-shadow: inset 0 1px rgba(255,255,255,.025), 0 5px 16px rgba(0,0,0,.16) !important;
        backdrop-filter: blur(7px) saturate(.86) !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar .search {
        padding-top: 7px !important;
        padding-bottom: 7px !important;
        font-size: 13px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar select,
      html[data-shelf-theme="botanical"] .reader-toolbar .page-refresh-button {
        font-size: 12px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar .count-pill strong {
        font-size: 13px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar .count-pill span {
        font-size: 7px !important;
      }

      /* ---------- THE CENTRAL OPENING IS THE LIVE BOOKSHELF ---------- */
      html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
      html[data-shelf-theme="botanical"] .bookcase {
        position: fixed !important;
        z-index: 30 !important;
        left: 24.15vw !important;
        top: calc(50vh - 14.25vw) !important;
        width: 54.15vw !important;
        max-width: none !important;
        height: 32.55vw !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        scrollbar-width: thin !important;
        scrollbar-color: rgba(190, 153, 94, .38) transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        filter: none !important;
      }

      html[data-shelf-theme="botanical"] .bookcase::-webkit-scrollbar {
        width: 6px;
      }

      html[data-shelf-theme="botanical"] .bookcase::-webkit-scrollbar-track {
        background: transparent;
      }

      html[data-shelf-theme="botanical"] .bookcase::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(190, 153, 94, .32);
      }

      /* The scene plate already supplies plants/chair/decor. Avoid another collage inside it. */
      html[data-shelf-theme="botanical"] .botanical-row-decor {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .shelf-occupant-flow {
        gap: 0 !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row,
      html[data-shelf-theme="botanical"] .shelf-row {
        min-height: 218px !important;
        height: 218px !important;
        margin: 0 !important;
        border-left: 0 !important;
        border-right: 0 !important;
        overflow: hidden !important;
        box-shadow:
          inset 17px 0 24px rgba(0,0,0,.28),
          inset -20px 0 27px rgba(0,0,0,.34),
          inset 0 16px 20px rgba(0,0,0,.22) !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row::before,
      html[data-shelf-theme="botanical"] .shelf-row::before {
        left: 0 !important;
        right: 0 !important;
        height: 15px !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row::after,
      html[data-shelf-theme="botanical"] .shelf-row::after {
        inset: 15px 0 25px !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row > .books,
      html[data-shelf-theme="botanical"] .shelf-row > .books {
        left: 1.5% !important;
        right: 1.5% !important;
        bottom: 25px !important;
        height: 188px !important;
        gap: 5px !important;
      }

      html[data-shelf-theme="botanical"] .book-cluster {
        gap: 5px !important;
      }

      html[data-shelf-theme="botanical"] .book-flow {
        max-width: 100% !important;
        gap: 12px !important;
      }

      html[data-shelf-theme="botanical"] .book {
        width: clamp(46px, calc(var(--book-width) - 18px), 76px) !important;
        height: clamp(148px, calc(var(--book-height) - 28px), 185px) !important;
        max-height: 185px !important;
        flex-shrink: 1 !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row > .wood-shelf,
      html[data-shelf-theme="botanical"] .shelf-row > .wood-shelf {
        left: 0 !important;
        right: 0 !important;
        height: 26px !important;
      }

      html[data-shelf-theme="botanical"] .help-shelf-launcher,
      html[data-shelf-theme="botanical"] footer {
        display: none !important;
      }

      /* Keep dialogs, account UI and book-detail interactions above the staged scene. */
      html[data-shelf-theme="botanical"] .modal-backdrop,
      html[data-shelf-theme="botanical"] .modal,
      html[data-shelf-theme="botanical"] .sof-account,
      html[data-shelf-theme="botanical"] [role="dialog"] {
        z-index: 160 !important;
      }
    }
  `}</style>;
}
