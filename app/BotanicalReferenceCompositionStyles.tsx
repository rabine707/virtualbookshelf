"use client";

/**
 * Reference-composition pass for the flagship Botanical theme.
 *
 * The visual target is one continuous reading room: a strong left window,
 * compact controls floating over the upper wall, shelves beginning immediately
 * below the utility area, and the sofa acting as lower-left foreground framing.
 * This layer intentionally renders last so it can correct accumulated legacy
 * Botanical rules without changing other themes or shelf behavior.
 */
export default function BotanicalReferenceCompositionStyles() {
  return <style>{`
    /* ---------- ONE CONTINUOUS ROOM ---------- */
    html[data-shelf-theme="botanical"] .cinematic-room {
      min-height: 204px !important;
      height: 204px !important;
      overflow: visible !important;
      z-index: 20 !important;
      box-shadow: none !important;
      border-bottom: 0 !important;
      background: #0b1710 !important;
    }

    /* Older Botanical layers clipped these props to the header. The approved
       window and sofa are room framing, so they must be allowed to cross the
       header/shelf boundary and visually stitch both areas together. */
    html[data-shelf-theme="botanical"] .botanical-real-room-props {
      overflow: visible !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__plate {
      background:
        linear-gradient(90deg,
          rgba(24, 48, 31, .22) 0%,
          rgba(12, 28, 18, .49) 38%,
          rgba(6, 17, 10, .72) 72%,
          rgba(4, 12, 7, .90) 100%),
        url("/themes/botanical/v4/header-plate.webp") center 48% / cover no-repeat !important;
      filter: saturate(.84) contrast(1.05) brightness(.78) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__daylight {
      left: -4% !important;
      top: -48% !important;
      width: 58% !important;
      height: 205% !important;
      opacity: .82 !important;
      filter: blur(13px) !important;
      background: linear-gradient(
        108deg,
        rgba(255, 248, 209, .28),
        rgba(232, 238, 198, .13) 29%,
        rgba(211, 224, 183, .045) 50%,
        transparent 70%
      ) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__vignette {
      background:
        radial-gradient(ellipse at 47% 25%, transparent 28%, rgba(0,0,0,.035) 58%, rgba(0,0,0,.25) 100%),
        linear-gradient(to bottom, transparent 67%, rgba(5,11,7,.24) 100%) !important;
    }

    /* ---------- WINDOW OWNS THE LEFT EDGE ---------- */
    html[data-shelf-theme="botanical"] .botanical-scene-window {
      left: -130px !important;
      top: -105px !important;
      width: clamp(500px, 37vw, 650px) !important;
      max-width: none !important;
      z-index: 24 !important;
      opacity: .98 !important;
      filter:
        brightness(.98)
        saturate(.92)
        contrast(1.02)
        drop-shadow(20px 30px 36px rgba(0,0,0,.30)) !important;
      transform: rotate(-.2deg) !important;
    }

    /* The approved sofa is lower-left foreground framing. It deliberately crosses
       the second/third shelf region without taking any interaction space. */
    html[data-shelf-theme="botanical"] .botanical-scene-sofa {
      left: -165px !important;
      right: auto !important;
      bottom: -680px !important;
      width: clamp(500px, 38vw, 660px) !important;
      max-width: none !important;
      z-index: 42 !important;
      opacity: .95 !important;
      filter:
        brightness(.74)
        saturate(.80)
        contrast(1.05)
        drop-shadow(18px 26px 34px rgba(0,0,0,.42)) !important;
      transform: rotate(-.4deg) !important;
      transform-origin: left bottom !important;
    }

    /* Keep the warm practical light small and architectural. */
    html[data-shelf-theme="botanical"] .botanical-real-room-sconce {
      right: 82px !important;
      top: 54px !important;
      width: 68px !important;
      opacity: .72 !important;
    }

    html[data-shelf-theme="botanical"] .botanical-real-sconce-glow {
      right: 31px !important;
      top: 26px !important;
      width: 170px !important;
      height: 170px !important;
      opacity: .58 !important;
    }

    /* ---------- COMPACT UPPER-WALL UI ---------- */
    html[data-shelf-theme="botanical"] .cinematic-room__content {
      width: auto !important;
      min-width: 0 !important;
      max-width: 1040px !important;
      margin: 0 235px 0 clamp(360px, 28vw, 500px) !important;
      padding: 13px 0 8px !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero {
      min-height: 74px !important;
      gap: 18px !important;
      padding: 0 0 7px !important;
      align-items: center !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero .eyebrow {
      margin-bottom: 3px !important;
      font-size: 8px !important;
      letter-spacing: .22em !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero h1 {
      font-size: clamp(42px, 3.65vw, 56px) !important;
      line-height: .90 !important;
      letter-spacing: -.036em !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero-actions {
      padding-top: 0 !important;
      flex: 0 0 auto !important;
    }

    html[data-shelf-theme="botanical"] .reader-add-books-trigger {
      min-height: 38px !important;
      padding: 8px 17px !important;
      font-size: 12px !important;
    }

    /* Search and Add Books stay visible. Everything administrative lives in •••. */
    html[data-shelf-theme="botanical"] .reader-toolbar {
      display: grid !important;
      grid-template-columns: minmax(280px, 1fr) 126px auto 42px !important;
      grid-template-rows: 40px !important;
      gap: 6px !important;
      align-items: stretch !important;
      width: 100% !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .search-wrap {
      grid-column: 1 !important;
      min-width: 0 !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > select {
      grid-column: 2 !important;
      width: 100% !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .shelf-book-count {
      grid-column: 3 !important;
      align-self: center !important;
      min-width: 72px !important;
      padding: 0 5px !important;
      color: rgba(238,233,220,.58) !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .shelf-book-count strong {
      color: rgba(238,233,220,.90) !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .shelf-utility-menu {
      grid-column: 4 !important;
      width: 42px !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .spine-review-launch,
    html[data-shelf-theme="botanical"] .reader-toolbar > .qol-toolbar,
    html[data-shelf-theme="botanical"] .reader-toolbar > .theme-picker-trigger,
    html[data-shelf-theme="botanical"] .reader-toolbar > .spine-label-toggle {
      display: none !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search-wrap,
    html[data-shelf-theme="botanical"] .reader-toolbar select,
    html[data-shelf-theme="botanical"] .shelf-utility-menu > summary {
      min-height: 40px !important;
      height: 40px !important;
      color: var(--cream) !important;
      background: linear-gradient(180deg, rgba(13, 28, 18, .72), rgba(6, 16, 10, .67)) !important;
      border: 1px solid var(--border) !important;
      border-radius: 12px !important;
      box-shadow: inset 0 1px rgba(255,255,255,.035), 0 8px 25px rgba(0,0,0,.15) !important;
      backdrop-filter: blur(9px) saturate(.9) !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search {
      min-height: 40px !important;
      height: 40px !important;
      color: var(--cream) !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      padding-left: 40px !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search::placeholder {
      color: rgba(238,233,220,.52) !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search-wrap > span {
      color: rgba(183,201,143,.78) !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar select {
      padding: 0 12px !important;
      font-size: 11px !important;
    }

    html[data-shelf-theme="botanical"] .shelf-utility-menu__panel {
      width: 278px !important;
      border-color: rgba(183,201,143,.24) !important;
      background: linear-gradient(180deg, rgba(10,22,14,.98), rgba(6,14,9,.98)) !important;
      box-shadow: 0 20px 54px rgba(0,0,0,.50) !important;
    }

    html[data-shelf-theme="botanical"] .shelf-utility-menu__heading span,
    html[data-shelf-theme="botanical"] .shelf-utility-menu__item > span {
      color: rgba(183,201,143,.58) !important;
    }

    html[data-shelf-theme="botanical"] .shelf-utility-menu__item:hover,
    html[data-shelf-theme="botanical"] .shelf-utility-menu__item:focus-visible {
      background: rgba(183,201,143,.08) !important;
    }

    /* ---------- SHELF STARTS IMMEDIATELY ---------- */
    html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
    html[data-shelf-theme="botanical"] .bookcase {
      position: relative !important;
      z-index: 8 !important;
      width: calc(100% - 34px) !important;
      max-width: 1580px !important;
      margin: -7px auto 0 !important;
      border-top: 0 !important;
      filter: drop-shadow(0 26px 38px rgba(0,0,0,.24)) !important;
    }

    /* Top crown catches the same left-hand daylight seen in the reference. */
    html[data-shelf-theme="botanical"] .modular-bookcase > .modular-shelf-row:first-child::before,
    html[data-shelf-theme="botanical"] .bookcase > .shelf-row:first-child::before {
      height: 24px !important;
      background:
        linear-gradient(105deg,
          rgba(255,225,174,.33) 0%,
          rgba(255,214,151,.12) 21%,
          rgba(72,37,20,.04) 45%,
          rgba(14,6,3,.34) 100%),
        url("/themes/botanical/v4/walnut-shelf-front.webp") center / 100% 100% no-repeat !important;
      box-shadow:
        0 4px 8px rgba(228,154,74,.13),
        0 11px 22px rgba(0,0,0,.50),
        inset 0 2px rgba(255,226,182,.18),
        inset 0 -4px rgba(9,4,2,.34) !important;
    }

    /* Slightly warmer recess light, still restrained enough for cover art. */
    html[data-shelf-theme="botanical"] .modular-shelf-row::after,
    html[data-shelf-theme="botanical"] .shelf-row::after {
      background:
        linear-gradient(104deg, rgba(255,223,162,.10), rgba(255,210,142,.025) 27%, transparent 48%),
        radial-gradient(ellipse at 14% 10%, rgba(255,224,168,.08), transparent 34%),
        linear-gradient(90deg, rgba(0,0,0,.14), transparent 8%, transparent 91%, rgba(0,0,0,.22)) !important;
    }

    /* Staged rows for a small library are scenery, not giant empty placeholders.
       Keep one quiet prop anchored to a side so the eye reads a furnished room. */
    html[data-shelf-theme="botanical"] .shelf-row-empty > .shelf-occupant-flow {
      left: 9% !important;
      right: 9% !important;
      justify-content: space-between !important;
    }

    html[data-shelf-theme="botanical"] .shelf-row-empty > .shelf-occupant-flow > .book-flow {
      flex: 0 0 1px !important;
      width: 1px !important;
      min-width: 1px !important;
    }

    html[data-shelf-theme="botanical"] .shelf-row-empty .botanical-row-decor {
      opacity: .82 !important;
    }

    /* ---------- LARGE-DESKTOP REFERENCE PROPORTIONS ---------- */
    @media (min-width: 1450px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        min-height: 198px !important;
        height: 198px !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        margin-left: clamp(440px, 29vw, 530px) !important;
        margin-right: 235px !important;
        max-width: none !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        left: -145px !important;
        width: clamp(560px, 38vw, 680px) !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        left: -175px !important;
        bottom: -670px !important;
        width: clamp(570px, 39vw, 690px) !important;
      }
    }

    /* ---------- TABLET: scenery yields before books ---------- */
    @media (max-width: 1180px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        min-height: 216px !important;
        height: 216px !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        margin-left: 245px !important;
        margin-right: 28px !important;
        padding-top: 14px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        left: -105px !important;
        width: 370px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        left: -150px !important;
        bottom: -620px !important;
        width: 500px !important;
        opacity: .84 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-real-room-sconce,
      html[data-shelf-theme="botanical"] .botanical-real-sconce-glow {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar {
        grid-template-columns: minmax(220px,1fr) 108px auto 42px !important;
      }
    }

    /* ---------- MOBILE: keep the room idea but protect usability ---------- */
    @media (max-width: 760px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        min-height: 178px !important;
        height: 178px !important;
        overflow: hidden !important;
      }

      html[data-shelf-theme="botanical"] .botanical-real-room-props {
        overflow: hidden !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        margin: 0 !important;
        padding: 13px 14px 10px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        left: -112px !important;
        top: -74px !important;
        width: 270px !important;
        opacity: .48 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero {
        min-height: 70px !important;
        padding-left: 70px !important;
        padding-bottom: 6px !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero h1 {
        font-size: clamp(35px, 10vw, 46px) !important;
      }

      /* Add is permanently available in the mobile bottom nav. */
      html[data-shelf-theme="botanical"] .reader-hero-actions {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar {
        display: grid !important;
        grid-template-columns: minmax(0,1fr) 92px 42px !important;
        grid-template-rows: 40px !important;
        gap: 5px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar > .search-wrap { grid-column: 1 !important; }
      html[data-shelf-theme="botanical"] .reader-toolbar > select { grid-column: 2 !important; }
      html[data-shelf-theme="botanical"] .reader-toolbar > .shelf-book-count { display: none !important; }
      html[data-shelf-theme="botanical"] .reader-toolbar > .shelf-utility-menu { grid-column: 3 !important; }

      html[data-shelf-theme="botanical"] .help-shelf-launcher {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
      html[data-shelf-theme="botanical"] .bookcase {
        width: calc(100% - 12px) !important;
        margin-top: -4px !important;
      }
    }
  `}</style>;
}
