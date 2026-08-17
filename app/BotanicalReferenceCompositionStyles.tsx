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
      min-height: 252px !important;
      height: 252px !important;
      overflow: visible !important;
      z-index: 20 !important;
      box-shadow: none !important;
      border-bottom: 0 !important;
      background: #0b1710 !important;
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
      left: -86px !important;
      top: -82px !important;
      width: clamp(300px, 23vw, 410px) !important;
      max-width: none !important;
      z-index: 24 !important;
      opacity: .96 !important;
      filter:
        brightness(.98)
        saturate(.92)
        contrast(1.02)
        drop-shadow(20px 30px 36px rgba(0,0,0,.30)) !important;
      transform: rotate(-.2deg) !important;
    }

    /* The approved sofa becomes foreground framing, not header decoration. */
    html[data-shelf-theme="botanical"] .botanical-scene-sofa {
      left: -118px !important;
      right: auto !important;
      bottom: -690px !important;
      width: clamp(430px, 35vw, 610px) !important;
      max-width: none !important;
      z-index: 42 !important;
      opacity: .96 !important;
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
      top: 70px !important;
      width: 68px !important;
      opacity: .72 !important;
    }

    html[data-shelf-theme="botanical"] .botanical-real-sconce-glow {
      right: 31px !important;
      top: 42px !important;
      width: 170px !important;
      height: 170px !important;
      opacity: .58 !important;
    }

    /* ---------- COMPACT UPPER-WALL UI ---------- */
    html[data-shelf-theme="botanical"] .cinematic-room__content {
      width: auto !important;
      min-width: 0 !important;
      max-width: 1040px !important;
      margin: 0 235px 0 clamp(300px, 22vw, 410px) !important;
      padding: 15px 0 8px !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero {
      min-height: 92px !important;
      gap: 18px !important;
      padding: 0 0 8px !important;
      align-items: flex-start !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero .eyebrow {
      margin-bottom: 3px !important;
      font-size: 9px !important;
      letter-spacing: .22em !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero h1 {
      font-size: clamp(44px, 4.15vw, 61px) !important;
      line-height: .90 !important;
      letter-spacing: -.036em !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero .subhead {
      margin-top: 7px !important;
      font-size: 13px !important;
      line-height: 1.3 !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero-actions {
      padding-top: 2px !important;
      flex: 0 0 auto !important;
    }

    html[data-shelf-theme="botanical"] .reader-add-books-trigger {
      min-height: 39px !important;
      padding: 8px 18px !important;
      font-size: 13px !important;
    }

    /* Two deliberate rows, matching the reference instead of a dashboard stack. */
    html[data-shelf-theme="botanical"] .reader-toolbar {
      display: grid !important;
      grid-template-columns: minmax(280px, 1fr) 138px 132px 76px !important;
      grid-template-rows: 40px 40px !important;
      grid-auto-flow: row !important;
      gap: 6px !important;
      align-items: stretch !important;
      width: 100% !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .search-wrap {
      grid-column: 1 !important;
      grid-row: 1 !important;
      min-width: 0 !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > select {
      grid-column: 2 !important;
      grid-row: 1 !important;
      width: 100% !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .toolbar-actions {
      grid-column: 3 / 5 !important;
      grid-row: 1 !important;
      display: grid !important;
      grid-template-columns: minmax(0,1fr) 76px !important;
      gap: 6px !important;
      min-width: 0 !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .spine-review-launch {
      grid-column: 1 !important;
      grid-row: 2 !important;
      width: 100% !important;
      min-width: 0 !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .qol-toolbar {
      grid-column: 2 !important;
      grid-row: 2 !important;
      width: 100% !important;
      min-width: 0 !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .theme-picker-trigger {
      grid-column: 3 !important;
      grid-row: 2 !important;
      width: 100% !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar > .spine-label-toggle {
      grid-column: 4 !important;
      grid-row: 2 !important;
      width: 100% !important;
      min-width: 0 !important;
      font-size: 10px !important;
      line-height: 1.05 !important;
      padding: 5px !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .qol-fix-button {
      width: 100% !important;
      height: 100% !important;
      min-height: 40px !important;
      padding: 5px 9px !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search,
    html[data-shelf-theme="botanical"] .reader-toolbar select,
    html[data-shelf-theme="botanical"] .reader-toolbar .page-refresh-button,
    html[data-shelf-theme="botanical"] .reader-toolbar .count-pill {
      min-height: 40px !important;
      height: 40px !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .page-refresh-button {
      padding: 0 10px !important;
      font-size: 12px !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .count-pill {
      min-width: 0 !important;
      width: 76px !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .count-pill strong {
      font-size: 14px !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .count-pill span {
      font-size: 8px !important;
    }

    /* The duplicated floating launcher is useful on long shelves, but not in the
       first viewport where the in-toolbar community control already exists. */
    html[data-shelf-theme="botanical"] .help-shelf-launcher {
      bottom: 18px !important;
      opacity: .72 !important;
      transform: scale(.88) !important;
      transform-origin: left bottom !important;
    }

    /* ---------- SHELF STARTS IMMEDIATELY ---------- */
    html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
    html[data-shelf-theme="botanical"] .bookcase {
      position: relative !important;
      z-index: 8 !important;
      width: calc(100% - 34px) !important;
      max-width: 1580px !important;
      margin: 0 auto !important;
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

    /* ---------- LARGE-DESKTOP REFERENCE PROPORTIONS ---------- */
    @media (min-width: 1450px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        min-height: 250px !important;
        height: 250px !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        margin-left: clamp(350px, 24vw, 455px) !important;
        margin-right: 235px !important;
        max-width: none !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        width: clamp(340px, 23vw, 430px) !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        bottom: -700px !important;
        width: clamp(500px, 34vw, 620px) !important;
      }
    }

    /* ---------- TABLET: scenery yields before books ---------- */
    @media (max-width: 1180px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        min-height: 278px !important;
        height: 278px !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        margin-left: 215px !important;
        margin-right: 28px !important;
        padding-top: 17px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        left: -78px !important;
        width: 290px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        left: -150px !important;
        bottom: -620px !important;
        width: 455px !important;
        opacity: .82 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-real-room-sconce,
      html[data-shelf-theme="botanical"] .botanical-real-sconce-glow {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar {
        grid-template-columns: minmax(230px,1fr) 112px 112px 68px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar > .toolbar-actions {
        grid-template-columns: minmax(0,1fr) 68px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar .count-pill {
        width: 68px !important;
      }
    }

    /* ---------- MOBILE: keep the room idea but protect usability ---------- */
    @media (max-width: 760px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        min-height: 274px !important;
        height: auto !important;
        overflow: hidden !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        margin: 0 !important;
        padding: 18px 16px 12px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        left: -102px !important;
        top: -64px !important;
        width: 220px !important;
        opacity: .40 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero {
        min-height: 82px !important;
        padding-left: 70px !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero h1 {
        font-size: clamp(38px, 11vw, 52px) !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero .subhead {
        font-size: 12px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar {
        display: grid !important;
        grid-template-columns: minmax(0,1fr) 94px !important;
        grid-template-rows: 42px 38px 38px !important;
        gap: 6px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar > .search-wrap { grid-column: 1; grid-row: 1; }
      html[data-shelf-theme="botanical"] .reader-toolbar > select { grid-column: 2; grid-row: 1; }
      html[data-shelf-theme="botanical"] .reader-toolbar > .toolbar-actions { display: none !important; }
      html[data-shelf-theme="botanical"] .reader-toolbar > .spine-review-launch { grid-column: 1; grid-row: 2; }
      html[data-shelf-theme="botanical"] .reader-toolbar > .qol-toolbar { grid-column: 2; grid-row: 2; }
      html[data-shelf-theme="botanical"] .reader-toolbar > .theme-picker-trigger { grid-column: 1; grid-row: 3; }
      html[data-shelf-theme="botanical"] .reader-toolbar > .spine-label-toggle { grid-column: 2; grid-row: 3; }

      html[data-shelf-theme="botanical"] .help-shelf-launcher {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
      html[data-shelf-theme="botanical"] .bookcase {
        width: calc(100% - 12px) !important;
      }
    }
  `}</style>;
}
