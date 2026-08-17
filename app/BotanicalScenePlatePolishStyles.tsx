"use client";

/**
 * Final desktop polish for the Botanical V7 scene-plate experiment.
 * This intentionally renders after the older Botanical layers so the room photo,
 * scrolling shelf viewport, and live UI read as one coherent environment.
 */
export default function BotanicalScenePlatePolishStyles() {
  return <style>{`
    @media (min-width: 1181px) and (min-aspect-ratio: 3 / 2) {
      html[data-shelf-theme="botanical"] .botanical-v7-room-plate {
        filter: saturate(.96) contrast(1.015) brightness(.98) !important;
      }

      /* The room already owns plants, lamps and props. Do not double-compose them. */
      html[data-shelf-theme="botanical"] .botanical-row-decor,
      html[data-shelf-theme="botanical"] .botanical-practical-glow,
      html[data-shelf-theme="botanical"] .botanical-decor-plant {
        display: none !important;
      }

      /* Preserve the proven architectural fit while making the opening feel recessed. */
      html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
      html[data-shelf-theme="botanical"] .bookcase {
        background: rgba(6, 10, 7, .16) !important;
        box-shadow:
          inset 22px 0 28px rgba(0,0,0,.18),
          inset -24px 0 30px rgba(0,0,0,.22),
          inset 0 18px 28px rgba(0,0,0,.16) !important;
        backdrop-filter: none !important;
      }

      /* Three repeating rows fit the central framed opening exactly. */
      html[data-shelf-theme="botanical"] .modular-shelf-row,
      html[data-shelf-theme="botanical"] .shelf-row {
        box-sizing: border-box !important;
        min-height: calc(32.55vw / 3) !important;
        height: calc(32.55vw / 3) !important;
        margin: 0 !important;
        overflow: hidden !important;
        background: rgba(10, 12, 9, .23) !important;
        border: 0 !important;
        box-shadow:
          inset 14px 0 20px rgba(0,0,0,.20),
          inset -16px 0 22px rgba(0,0,0,.22),
          inset 0 12px 18px rgba(0,0,0,.14) !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row::after,
      html[data-shelf-theme="botanical"] .shelf-row::after {
        inset: 0 !important;
        background:
          linear-gradient(90deg, rgba(0,0,0,.15), transparent 8%, transparent 91%, rgba(0,0,0,.18)),
          linear-gradient(180deg, rgba(255,214,145,.025), transparent 30%, rgba(0,0,0,.08)) !important;
        opacity: 1 !important;
      }

      /* Keep the physical ledges visible without laying a giant wood panel over the room. */
      html[data-shelf-theme="botanical"] .modular-shelf-row::before,
      html[data-shelf-theme="botanical"] .shelf-row::before {
        height: 10px !important;
        background: linear-gradient(180deg, rgba(111,68,39,.55), rgba(42,22,13,.72)) !important;
        box-shadow: 0 5px 10px rgba(0,0,0,.24), inset 0 1px rgba(255,220,170,.10) !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row > .wood-shelf,
      html[data-shelf-theme="botanical"] .shelf-row > .wood-shelf {
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        height: 15px !important;
        background:
          linear-gradient(180deg, rgba(118,74,43,.86), rgba(57,31,19,.94) 46%, rgba(31,16,10,.98)) !important;
        box-shadow:
          0 -1px rgba(255,219,163,.08),
          0 7px 12px rgba(0,0,0,.35),
          inset 0 1px rgba(255,226,178,.09) !important;
      }

      /* Safe-zone inset keeps every live spine off the wooden side moldings. */
      html[data-shelf-theme="botanical"] .modular-shelf-row > .books,
      html[data-shelf-theme="botanical"] .shelf-row > .books {
        left: 2.5% !important;
        right: 2.5% !important;
        bottom: 15px !important;
        height: calc((32.55vw / 3) - 22px) !important;
        gap: 5px !important;
      }

      html[data-shelf-theme="botanical"] .book-flow,
      html[data-shelf-theme="botanical"] .book-cluster {
        gap: 5px !important;
      }

      html[data-shelf-theme="botanical"] .book {
        width: clamp(42px, calc(var(--book-width) - 20px), 69px) !important;
        height: clamp(126px, calc((32.55vw / 3) - 31px), 171px) !important;
        max-height: 171px !important;
      }

      html[data-shelf-theme="botanical"] .shelf-row-placeholder .books {
        display: none !important;
      }

      /* Let the room dominate; controls remain legible but secondary. */
      html[data-shelf-theme="botanical"] .reader-toolbar .search-wrap,
      html[data-shelf-theme="botanical"] .reader-toolbar select,
      html[data-shelf-theme="botanical"] .reader-toolbar .page-refresh-button,
      html[data-shelf-theme="botanical"] .reader-toolbar .count-pill,
      html[data-shelf-theme="botanical"] .reader-toolbar .qol-fix-button,
      html[data-shelf-theme="botanical"] .reader-toolbar > .spine-review-launch,
      html[data-shelf-theme="botanical"] .reader-toolbar > .theme-picker-trigger,
      html[data-shelf-theme="botanical"] .reader-toolbar > .spine-label-toggle {
        background: rgba(5, 12, 8, .38) !important;
        border-color: rgba(236, 224, 194, .12) !important;
        box-shadow: inset 0 1px rgba(255,255,255,.025), 0 4px 13px rgba(0,0,0,.11) !important;
        backdrop-filter: blur(5px) saturate(.82) !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar .search::placeholder,
      html[data-shelf-theme="botanical"] .reader-toolbar .count-pill span {
        color: rgba(235, 224, 201, .52) !important;
      }
    }
  `}</style>;
}
