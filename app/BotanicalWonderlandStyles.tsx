"use client";

/**
 * Environment-dressing pass for Botanical.
 *
 * The bookshelf mechanics are intentionally left alone. This layer makes the
 * first viewport read as a lived-in reading room by strengthening the window,
 * foreground seating, foliage, practical light, framed art, warm shelf pools,
 * and quiet integrated controls.
 */
export default function BotanicalWonderlandStyles() {
  return <style>{`
    /* ---------- ROOM: richer, not busier ---------- */
    html[data-shelf-theme="botanical"] .cinematic-room {
      height: 264px !important;
      min-height: 264px !important;
      overflow: visible !important;
      background: #0a160f !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__plate {
      background:
        radial-gradient(ellipse at 77% 32%, rgba(139, 92, 45, .10), transparent 23%),
        linear-gradient(90deg,
          rgba(31, 58, 38, .20) 0%,
          rgba(13, 31, 19, .42) 34%,
          rgba(7, 18, 11, .69) 71%,
          rgba(3, 10, 6, .92) 100%),
        url("/themes/botanical/v4/header-plate.webp") center 46% / cover no-repeat !important;
      filter: saturate(.88) contrast(1.06) brightness(.79) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room::before {
      content: "" !important;
      position: absolute !important;
      z-index: 2 !important;
      inset: 0 !important;
      pointer-events: none !important;
      background:
        linear-gradient(101deg, transparent 0 16%, rgba(238, 227, 177, .035) 17% 20%, transparent 21% 100%),
        linear-gradient(78deg, transparent 0 24%, rgba(231, 220, 171, .025) 25% 28%, transparent 29% 100%),
        radial-gradient(ellipse at 29% 20%, rgba(224, 226, 178, .055), transparent 28%) !important;
      opacity: .95 !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__daylight {
      left: -8% !important;
      top: -54% !important;
      width: 67% !important;
      height: 230% !important;
      opacity: .88 !important;
      filter: blur(12px) !important;
      background: linear-gradient(
        108deg,
        rgba(255, 250, 216, .30) 0%,
        rgba(234, 240, 202, .135) 24%,
        rgba(211, 225, 184, .045) 47%,
        transparent 69%
      ) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__vignette {
      background:
        radial-gradient(ellipse at 44% 28%, transparent 34%, rgba(0,0,0,.025) 58%, rgba(0,0,0,.27) 100%),
        linear-gradient(to bottom, transparent 72%, rgba(3,9,5,.28) 100%) !important;
    }

    /* Let the room props bridge the header and shelf instead of being clipped. */
    html[data-shelf-theme="botanical"] .botanical-real-room-props {
      overflow: visible !important;
      z-index: 8 !important;
    }

    /* ---------- LEFT ARCHITECTURE ---------- */
    html[data-shelf-theme="botanical"] .botanical-scene-window {
      left: -72px !important;
      top: -118px !important;
      width: clamp(430px, 32vw, 610px) !important;
      max-width: none !important;
      z-index: 9 !important;
      opacity: 1 !important;
      filter:
        brightness(1.02)
        saturate(.96)
        contrast(1.025)
        drop-shadow(22px 34px 42px rgba(0,0,0,.31)) !important;
      transform: rotate(-.25deg) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-vine {
      position: absolute !important;
      pointer-events: none !important;
      z-index: 13 !important;
      filter: saturate(.90) brightness(.82) contrast(1.05) drop-shadow(0 12px 14px rgba(0,0,0,.28)) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-vine-left {
      left: 18px !important;
      top: -78px !important;
      width: 185px !important;
      transform: scaleX(-1) rotate(-5deg) !important;
      transform-origin: top center !important;
      opacity: .96 !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-vine-right {
      right: -26px !important;
      top: -42px !important;
      width: 215px !important;
      transform: rotate(5deg) !important;
      transform-origin: top right !important;
      opacity: .84 !important;
    }

    /* Sofa/chair should be unmistakable foreground framing like the reference. */
    html[data-shelf-theme="botanical"] .botanical-scene-sofa {
      left: -122px !important;
      right: auto !important;
      bottom: -650px !important;
      width: clamp(510px, 39vw, 700px) !important;
      max-width: none !important;
      z-index: 44 !important;
      opacity: .98 !important;
      filter:
        brightness(.77)
        saturate(.83)
        contrast(1.06)
        drop-shadow(20px 28px 38px rgba(0,0,0,.48)) !important;
      transform: rotate(-.5deg) !important;
      transform-origin: left bottom !important;
    }

    /* ---------- RIGHT WALL VIGNETTE ---------- */
    html[data-shelf-theme="botanical"] .botanical-scene-art {
      position: absolute !important;
      z-index: 11 !important;
      right: 190px !important;
      top: 22px !important;
      width: 118px !important;
      height: 145px !important;
      pointer-events: none !important;
      filter: drop-shadow(0 13px 17px rgba(0,0,0,.42)) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-art-paper {
      position: absolute !important;
      z-index: 1 !important;
      inset: 17px 19px 21px !important;
      overflow: hidden !important;
      background:
        radial-gradient(circle at 31% 24%, rgba(85,65,42,.15), transparent 2px),
        linear-gradient(135deg, rgba(245,225,180,.96), rgba(193,163,116,.86)) !important;
      border: 1px solid rgba(81,52,27,.50) !important;
      box-shadow: inset 0 0 18px rgba(87,55,27,.18) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-art-frame {
      position: absolute !important;
      z-index: 3 !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      filter: sepia(.32) saturate(.72) brightness(.72) contrast(1.14) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-art-stem,
    html[data-shelf-theme="botanical"] .botanical-art-leaf,
    html[data-shelf-theme="botanical"] .botanical-art-mushroom {
      position: absolute !important;
      display: block !important;
      background: #49351f !important;
      opacity: .82 !important;
    }

    html[data-shelf-theme="botanical"] .botanical-art-stem-a {
      width: 2px !important;
      height: 58px !important;
      left: 34px !important;
      top: 31px !important;
      transform: rotate(-9deg) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-art-stem-b {
      width: 2px !important;
      height: 45px !important;
      right: 27px !important;
      top: 45px !important;
      transform: rotate(12deg) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-art-leaf {
      width: 22px !important;
      height: 10px !important;
      border-radius: 100% 0 100% 0 !important;
    }

    html[data-shelf-theme="botanical"] .botanical-art-leaf-a {
      left: 17px !important;
      top: 52px !important;
      transform: rotate(-27deg) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-art-leaf-b {
      right: 13px !important;
      top: 63px !important;
      transform: scaleX(-1) rotate(-22deg) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-art-mushroom {
      width: 26px !important;
      height: 12px !important;
      border-radius: 50% 50% 30% 30% !important;
    }

    html[data-shelf-theme="botanical"] .botanical-art-mushroom::after {
      content: "" !important;
      position: absolute !important;
      left: 11px !important;
      top: 9px !important;
      width: 5px !important;
      height: 18px !important;
      background: #49351f !important;
      border-radius: 1px !important;
    }

    html[data-shelf-theme="botanical"] .botanical-art-mushroom-a {
      left: 20px !important;
      top: 22px !important;
      transform: rotate(-7deg) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-art-mushroom-b {
      right: 15px !important;
      top: 31px !important;
      width: 19px !important;
      height: 9px !important;
      transform: rotate(9deg) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-antique-books {
      position: absolute !important;
      z-index: 12 !important;
      right: 42px !important;
      bottom: 3px !important;
      width: 170px !important;
      height: 58px !important;
      pointer-events: none !important;
      filter: drop-shadow(0 11px 13px rgba(0,0,0,.38)) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-antique-books span {
      position: absolute !important;
      right: 0 !important;
      display: block !important;
      border: 1px solid rgba(177,123,67,.35) !important;
      border-radius: 2px 4px 4px 2px !important;
      background:
        linear-gradient(90deg, rgba(197,142,80,.12), transparent 8% 92%, rgba(0,0,0,.25)),
        linear-gradient(#3a2518, #1d120c) !important;
      box-shadow: inset 0 1px rgba(230,176,104,.16), inset 0 -2px rgba(0,0,0,.35) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-antique-books span:nth-child(1) {
      bottom: 0 !important;
      width: 170px !important;
      height: 20px !important;
      transform: rotate(.7deg) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-antique-books span:nth-child(2) {
      bottom: 18px !important;
      right: 7px !important;
      width: 151px !important;
      height: 18px !important;
      transform: rotate(-1.2deg) !important;
      background: linear-gradient(#49331f, #27170f) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-antique-books span:nth-child(3) {
      bottom: 34px !important;
      right: 18px !important;
      width: 135px !important;
      height: 17px !important;
      transform: rotate(1deg) !important;
      background: linear-gradient(#2f3927, #172016) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-planter {
      position: absolute !important;
      z-index: 13 !important;
      right: -12px !important;
      bottom: -6px !important;
      width: 118px !important;
      pointer-events: none !important;
      filter: saturate(.87) brightness(.76) drop-shadow(0 13px 15px rgba(0,0,0,.40)) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-candle {
      position: absolute !important;
      z-index: 16 !important;
      right: 125px !important;
      top: 54px !important;
      width: 36px !important;
      height: 116px !important;
      pointer-events: none !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-candle-glow {
      position: absolute !important;
      left: 50% !important;
      top: -30px !important;
      width: 150px !important;
      height: 150px !important;
      transform: translateX(-50%) !important;
      border-radius: 50% !important;
      background: radial-gradient(circle, rgba(255,194,101,.30), rgba(220,139,57,.09) 34%, transparent 70%) !important;
      filter: blur(8px) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-candle-flame {
      position: absolute !important;
      z-index: 5 !important;
      top: 0 !important;
      left: 14px !important;
      width: 9px !important;
      height: 21px !important;
      border-radius: 52% 48% 54% 46% / 72% 72% 28% 28% !important;
      background: radial-gradient(circle at 50% 74%, #fff4c5 0 21%, #ffc15a 39%, #f27b25 72%, transparent 74%) !important;
      filter: drop-shadow(0 0 7px rgba(255,167,61,.88)) !important;
      transform: rotate(3deg) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-candle-wick {
      position: absolute !important;
      z-index: 4 !important;
      top: 17px !important;
      left: 17px !important;
      width: 2px !important;
      height: 8px !important;
      background: #3c2418 !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-candle-wax {
      position: absolute !important;
      top: 23px !important;
      left: 9px !important;
      width: 20px !important;
      height: 62px !important;
      border-radius: 4px 4px 2px 2px !important;
      background:
        linear-gradient(90deg, rgba(255,255,255,.38), transparent 25% 75%, rgba(109,62,23,.17)),
        linear-gradient(#e7d5a6, #b99153) !important;
      box-shadow: inset 0 2px rgba(255,255,255,.34), 0 0 14px rgba(230,159,70,.13) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-candle-holder {
      position: absolute !important;
      left: 2px !important;
      bottom: 0 !important;
      width: 34px !important;
      height: 34px !important;
      border-radius: 50% 50% 44% 44% !important;
      background: radial-gradient(circle at 40% 25%, #c59b58, #6c4525 48%, #2c1b10 78%) !important;
      box-shadow: inset 0 2px rgba(255,227,166,.18), 0 8px 14px rgba(0,0,0,.38) !important;
    }

    /* The generic industrial sconce was useful during layout work, but the
       candle + art vignette is more faithful to the reading-nook reference. */
    html[data-shelf-theme="botanical"] .botanical-real-room-sconce,
    html[data-shelf-theme="botanical"] .botanical-real-sconce-glow {
      display: none !important;
    }

    /* ---------- UI: present, but subordinate ---------- */
    html[data-shelf-theme="botanical"] .cinematic-room__content {
      margin-left: clamp(330px, 23vw, 435px) !important;
      margin-right: 320px !important;
      max-width: none !important;
      padding-top: 13px !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero {
      min-height: 91px !important;
      align-items: flex-start !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero h1 {
      font-size: clamp(43px, 4vw, 60px) !important;
      text-shadow: 0 4px 24px rgba(0,0,0,.50), 0 0 26px rgba(211,177,104,.035) !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero .subhead {
      color: rgba(231,223,201,.75) !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search-wrap,
    html[data-shelf-theme="botanical"] .reader-toolbar select,
    html[data-shelf-theme="botanical"] .reader-toolbar .page-refresh-button,
    html[data-shelf-theme="botanical"] .reader-toolbar .count-pill,
    html[data-shelf-theme="botanical"] .reader-toolbar > .spine-review-launch,
    html[data-shelf-theme="botanical"] .reader-toolbar > .theme-picker-trigger,
    html[data-shelf-theme="botanical"] .reader-toolbar > .spine-label-toggle,
    html[data-shelf-theme="botanical"] .reader-toolbar .qol-fix-button {
      background: rgba(13, 30, 20, .72) !important;
      border-color: rgba(194, 178, 139, .17) !important;
      box-shadow: inset 0 1px rgba(255,255,255,.018), 0 5px 15px rgba(0,0,0,.14) !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search-wrap:hover,
    html[data-shelf-theme="botanical"] .reader-toolbar select:hover,
    html[data-shelf-theme="botanical"] .reader-toolbar button:hover {
      background: rgba(24, 44, 31, .82) !important;
      border-color: rgba(170,181,158,.26) !important;
    }

    html[data-shelf-theme="botanical"] .reader-add-books-trigger {
      background: linear-gradient(180deg, #b8c4ab, #8d9d84) !important;
      box-shadow: 0 8px 20px rgba(0,0,0,.22), inset 0 1px rgba(255,255,255,.30) !important;
    }

    /* The in-toolbar action replaces this floating duplicate in Botanical. */
    html[data-shelf-theme="botanical"] .help-shelf-launcher {
      display: none !important;
    }

    /* ---------- SHELF: warm pools and lived-in depth ---------- */
    html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
    html[data-shelf-theme="botanical"] .bookcase {
      width: calc(100% - 30px) !important;
      max-width: 1620px !important;
      margin-top: 0 !important;
      filter: drop-shadow(0 28px 42px rgba(0,0,0,.27)) !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row,
    html[data-shelf-theme="botanical"] .shelf-row {
      position: relative !important;
      box-shadow:
        inset 28px 0 38px rgba(0,0,0,.28),
        inset -28px 0 40px rgba(0,0,0,.34),
        inset 0 16px 22px rgba(0,0,0,.20),
        inset 0 -19px 30px rgba(6,3,2,.23),
        0 1px rgba(255,220,164,.03) !important;
    }

    html[data-shelf-theme="botanical"] .shelf-row > .books,
    html[data-shelf-theme="botanical"] .modular-shelf-row > .books {
      position: relative !important;
      z-index: 3 !important;
    }

    html[data-shelf-theme="botanical"] .shelf-row > .books::before,
    html[data-shelf-theme="botanical"] .modular-shelf-row > .books::before {
      content: "" !important;
      position: absolute !important;
      z-index: 0 !important;
      left: 4% !important;
      right: 4% !important;
      top: -1px !important;
      height: 44px !important;
      pointer-events: none !important;
      background: linear-gradient(to bottom,
        rgba(255,190,92,.16),
        rgba(236,151,66,.055) 24%,
        transparent 82%) !important;
      filter: blur(4px) !important;
      opacity: .72 !important;
    }

    html[data-shelf-theme="botanical"] .shelf-row:nth-child(even) > .books::before,
    html[data-shelf-theme="botanical"] .modular-shelf-row:nth-child(even) > .books::before {
      opacity: .52 !important;
    }

    html[data-shelf-theme="botanical"] .book-flow,
    html[data-shelf-theme="botanical"] .botanical-row-decor {
      position: relative !important;
      z-index: 2 !important;
    }

    html[data-shelf-theme="botanical"] .botanical-row-decor {
      filter: drop-shadow(0 12px 14px rgba(0,0,0,.35)) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-decor-plant-large {
      transform: scale(1.07) !important;
      transform-origin: bottom center !important;
      filter: saturate(.91) brightness(.88) contrast(1.03) !important;
    }

    html[data-shelf-theme="botanical"] .botanical-decor-plant-small {
      filter: saturate(.88) brightness(.83) contrast(1.04) !important;
    }

    /* First shelf gets a stronger golden pool so the transition from room to
       furniture feels intentional rather than like a hard horizontal cut. */
    html[data-shelf-theme="botanical"] .shelf-row[data-shelf-row="1"] > .books::before,
    html[data-shelf-theme="botanical"] .modular-shelf-row[data-shelf-row="1"] > .books::before {
      left: 7% !important;
      right: 7% !important;
      height: 58px !important;
      opacity: .92 !important;
      background: linear-gradient(to bottom,
        rgba(255,196,98,.22),
        rgba(239,155,68,.07) 31%,
        transparent 82%) !important;
    }

    /* ---------- LARGE DESKTOP ---------- */
    @media (min-width: 1450px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        height: 264px !important;
        min-height: 264px !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        margin-left: clamp(380px, 24vw, 460px) !important;
        margin-right: 330px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        width: clamp(500px, 32vw, 630px) !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        bottom: -655px !important;
        width: clamp(590px, 39vw, 720px) !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-art {
        right: 202px !important;
        width: 126px !important;
        height: 154px !important;
      }
    }

    /* ---------- TABLET: decor yields before the library ---------- */
    @media (max-width: 1240px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        min-height: 286px !important;
        height: 286px !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        margin-left: 238px !important;
        margin-right: 32px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        left: -102px !important;
        width: 390px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        left: -175px !important;
        bottom: -615px !important;
        width: 500px !important;
        opacity: .90 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-art,
      html[data-shelf-theme="botanical"] .botanical-scene-candle,
      html[data-shelf-theme="botanical"] .botanical-scene-antique-books,
      html[data-shelf-theme="botanical"] .botanical-scene-planter,
      html[data-shelf-theme="botanical"] .botanical-scene-vine-right {
        display: none !important;
      }
    }

    /* ---------- MOBILE ---------- */
    @media (max-width: 760px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        min-height: 282px !important;
        height: auto !important;
        overflow: hidden !important;
      }

      html[data-shelf-theme="botanical"] .botanical-real-room-props {
        overflow: hidden !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        margin: 0 !important;
        padding: 17px 15px 12px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        left: -122px !important;
        top: -75px !important;
        width: 315px !important;
        opacity: .50 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-vine-left {
        left: -25px !important;
        width: 135px !important;
        opacity: .58 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa,
      html[data-shelf-theme="botanical"] .botanical-scene-vine-right,
      html[data-shelf-theme="botanical"] .botanical-scene-art,
      html[data-shelf-theme="botanical"] .botanical-scene-candle,
      html[data-shelf-theme="botanical"] .botanical-scene-antique-books,
      html[data-shelf-theme="botanical"] .botanical-scene-planter {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero h1 {
        font-size: clamp(38px, 12vw, 52px) !important;
      }

      html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
      html[data-shelf-theme="botanical"] .bookcase {
        width: 100% !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html[data-shelf-theme="botanical"] .botanical-scene-candle-flame {
        transform: none !important;
      }
    }
  `}</style>;
}
