"use client";

/**
 * Final Botanical visual layer.
 *
 * This component intentionally renders after the older Botanical style layers.
 * It is the implementation bridge between /DESIGN.md and the existing shelf UI,
 * allowing us to converge the theme without rewriting unrelated themes or book logic.
 */
export default function BotanicalDesignSystemStyles() {
  return <style>{`
    html[data-shelf-theme="botanical"] {
      color-scheme: dark;
      --sof-forest: #17251d;
      --sof-forest-deep: #0c1710;
      --sof-shadow: #071009;
      --sof-raised: #223328;
      --sof-walnut-deep: #2a170e;
      --sof-walnut: #51321f;
      --sof-walnut-light: #785338;
      --sof-cream: #e7dfc9;
      --sof-cream-muted: #b9b09d;
      --sof-sage: #889580;
      --sof-sage-light: #aab59e;
      --sof-brass: #9a7544;
      --sof-hairline: rgba(231, 223, 201, .13);
      --sof-control: rgba(19, 34, 25, .88);
      --sof-control-hover: rgba(31, 51, 38, .94);
    }

    html[data-shelf-theme="botanical"],
    html[data-shelf-theme="botanical"] body {
      background: var(--sof-shadow) !important;
      color: var(--sof-cream) !important;
    }

    html[data-shelf-theme="botanical"] body {
      background-image:
        radial-gradient(ellipse at 7% 0%, rgba(211, 222, 183, .075), transparent 30%),
        linear-gradient(90deg, #17251d 0%, #101d15 42%, #0a130d 100%) !important;
      background-attachment: fixed !important;
    }

    html[data-shelf-theme="botanical"] main.shelf-page {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 0 30px !important;
      overflow: clip !important;
    }

    /* ---------- room composition: atmosphere should frame, not delay, the shelf ---------- */
    html[data-shelf-theme="botanical"] .cinematic-room {
      position: relative !important;
      isolation: isolate !important;
      min-height: clamp(292px, 31vh, 350px) !important;
      overflow: hidden !important;
      background: var(--sof-forest-deep) !important;
      border: 0 !important;
      border-bottom: 1px solid rgba(154, 117, 68, .32) !important;
      box-shadow: 0 20px 46px rgba(0, 0, 0, .28) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__plate {
      z-index: 0 !important;
      display: block !important;
      background:
        linear-gradient(90deg, rgba(28, 48, 34, .38), rgba(10, 23, 15, .68) 52%, rgba(5, 13, 8, .88)),
        url("/themes/botanical/v4/header-plate.webp") center 42% / cover no-repeat !important;
      filter: saturate(.78) contrast(1.06) brightness(.70) !important;
      transform: scale(1.01) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__daylight {
      z-index: 1 !important;
      left: -6% !important;
      right: auto !important;
      top: -42% !important;
      bottom: auto !important;
      width: 64% !important;
      height: 188% !important;
      display: block !important;
      background: linear-gradient(
        109deg,
        rgba(255, 250, 220, .23) 0%,
        rgba(233, 239, 202, .105) 27%,
        rgba(210, 224, 185, .035) 48%,
        transparent 70%
      ) !important;
      transform: skewX(-8deg) !important;
      filter: blur(16px) !important;
      mix-blend-mode: normal !important;
      opacity: .92 !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__vignette {
      z-index: 4 !important;
      display: block !important;
      background:
        radial-gradient(ellipse at 42% 28%, transparent 20%, rgba(0,0,0,.045) 54%, rgba(0,0,0,.34) 100%),
        linear-gradient(to bottom, transparent 56%, rgba(3, 8, 5, .48) 100%) !important;
      pointer-events: none !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__content {
      position: relative !important;
      z-index: 12 !important;
      width: min(900px, calc(100% - 570px)) !important;
      min-width: 620px !important;
      margin: 0 auto !important;
      padding: 34px 0 14px !important;
    }

    /* ---------- approved scene assets ---------- */
    html[data-shelf-theme="botanical"] .botanical-real-room-props {
      position: absolute !important;
      z-index: 3 !important;
      inset: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-window {
      position: absolute !important;
      z-index: 2 !important;
      left: clamp(-94px, -5vw, -42px) !important;
      top: -62px !important;
      width: clamp(315px, 28vw, 470px) !important;
      height: auto !important;
      object-fit: contain !important;
      object-position: left top !important;
      filter:
        brightness(.88)
        saturate(.82)
        contrast(1.03)
        drop-shadow(18px 25px 28px rgba(0,0,0,.36)) !important;
      transform: rotate(-.45deg) !important;
      transform-origin: left top !important;
    }

    html[data-shelf-theme="botanical"] .botanical-scene-sofa {
      position: absolute !important;
      z-index: 5 !important;
      right: clamp(-108px, -6vw, -48px) !important;
      bottom: -88px !important;
      width: clamp(360px, 32vw, 540px) !important;
      height: auto !important;
      object-fit: contain !important;
      object-position: right bottom !important;
      filter:
        brightness(.66)
        saturate(.72)
        contrast(1.06)
        drop-shadow(-16px 24px 30px rgba(0,0,0,.47)) !important;
      transform: rotate(.45deg) !important;
      transform-origin: right bottom !important;
      opacity: .94 !important;
    }

    html[data-shelf-theme="botanical"] .botanical-real-sconce-glow {
      position: absolute !important;
      z-index: 3 !important;
      right: clamp(245px, 23vw, 390px) !important;
      top: 58px !important;
      width: 180px !important;
      height: 180px !important;
      border-radius: 50% !important;
      background: radial-gradient(circle,
        rgba(255, 212, 139, .17),
        rgba(203, 151, 82, .065) 35%,
        transparent 70%) !important;
      filter: blur(16px) !important;
      opacity: .8 !important;
    }

    html[data-shelf-theme="botanical"] .botanical-real-room-sconce {
      position: absolute !important;
      z-index: 4 !important;
      right: clamp(300px, 27vw, 440px) !important;
      top: 76px !important;
      width: 82px !important;
      height: auto !important;
      filter: brightness(.67) saturate(.72) drop-shadow(0 11px 12px rgba(0,0,0,.44)) !important;
    }

    /* Old CSS-built window / generic decorative pieces must not compete with approved art. */
    html[data-shelf-theme="botanical"] .botanical-real-window,
    html[data-shelf-theme="botanical"] .botanical-real-room-plant,
    html[data-shelf-theme="botanical"] .botanical-real-room-frame {
      display: none !important;
    }

    /* ---------- literary title hierarchy ---------- */
    html[data-shelf-theme="botanical"] .reader-hero {
      min-height: 104px !important;
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 24px !important;
      margin: 0 !important;
      padding: 0 0 12px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero .eyebrow {
      margin: 0 0 8px !important;
      color: var(--sof-sage-light) !important;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif !important;
      font-size: 10px !important;
      line-height: 1.2 !important;
      font-weight: 700 !important;
      letter-spacing: .19em !important;
      text-shadow: 0 2px 14px rgba(0,0,0,.55) !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero h1 {
      margin: 0 !important;
      color: var(--sof-cream) !important;
      font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif !important;
      font-size: clamp(46px, 4.7vw, 68px) !important;
      line-height: .94 !important;
      letter-spacing: -.035em !important;
      font-weight: 600 !important;
      text-shadow: 0 5px 28px rgba(0,0,0,.54) !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero .subhead {
      max-width: 570px !important;
      margin: 10px 0 0 !important;
      color: rgba(231, 223, 201, .72) !important;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif !important;
      font-size: 14px !important;
      line-height: 1.45 !important;
      text-shadow: 0 2px 13px rgba(0,0,0,.45) !important;
    }

    html[data-shelf-theme="botanical"] .reader-hero-actions {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 8px !important;
      flex-wrap: wrap !important;
      padding-top: 8px !important;
    }

    html[data-shelf-theme="botanical"] .reader-add-books-trigger {
      min-height: 42px !important;
      padding: 10px 20px !important;
      border: 1px solid rgba(231, 223, 201, .18) !important;
      border-radius: 999px !important;
      color: #132018 !important;
      background: linear-gradient(180deg, #aab59e, #889580) !important;
      box-shadow:
        0 9px 20px rgba(0,0,0,.24),
        inset 0 1px rgba(255,255,255,.28) !important;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif !important;
      font-weight: 700 !important;
      transition: transform .16s ease, filter .16s ease !important;
    }

    html[data-shelf-theme="botanical"] .reader-add-books-trigger:hover {
      transform: translateY(-1px) !important;
      filter: brightness(1.06) !important;
    }

    /* ---------- quiet utility UI ---------- */
    html[data-shelf-theme="botanical"] .reader-toolbar {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 146px auto !important;
      align-items: stretch !important;
      gap: 8px !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search-wrap,
    html[data-shelf-theme="botanical"] .reader-toolbar select,
    html[data-shelf-theme="botanical"] .reader-toolbar .page-refresh-button,
    html[data-shelf-theme="botanical"] .reader-toolbar .count-pill,
    html[data-shelf-theme="botanical"] .reader-toolbar > .spine-review-launch,
    html[data-shelf-theme="botanical"] .reader-toolbar > .theme-picker-trigger,
    html[data-shelf-theme="botanical"] .reader-toolbar > .spine-label-toggle,
    html[data-shelf-theme="botanical"] .reader-toolbar > .qol-fix-button {
      color: var(--sof-cream) !important;
      background: var(--sof-control) !important;
      border: 1px solid var(--sof-hairline) !important;
      border-radius: 10px !important;
      box-shadow: inset 0 1px rgba(255,255,255,.025), 0 5px 16px rgba(0,0,0,.13) !important;
      backdrop-filter: none !important;
      transition: background .15s ease, border-color .15s ease, transform .15s ease !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search-wrap:hover,
    html[data-shelf-theme="botanical"] .reader-toolbar select:hover,
    html[data-shelf-theme="botanical"] .reader-toolbar button:hover {
      background: var(--sof-control-hover) !important;
      border-color: rgba(170, 181, 158, .27) !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search {
      min-height: 42px !important;
      padding: 0 12px 0 39px !important;
      color: var(--sof-cream) !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      outline: none !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search::placeholder {
      color: rgba(231, 223, 201, .49) !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .search-wrap > span {
      color: var(--sof-sage) !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar select,
    html[data-shelf-theme="botanical"] .reader-toolbar .page-refresh-button,
    html[data-shelf-theme="botanical"] .reader-toolbar .count-pill {
      min-height: 42px !important;
    }

    html[data-shelf-theme="botanical"] .reader-toolbar .count-pill span {
      color: rgba(231, 223, 201, .58) !important;
    }

    /* ---------- cabinet and shelf material depth ---------- */
    html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
    html[data-shelf-theme="botanical"] .bookcase {
      width: min(1520px, calc(100% - 30px)) !important;
      margin: 0 auto !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      filter: drop-shadow(0 24px 34px rgba(0,0,0,.28)) !important;
      overflow: visible !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row,
    html[data-shelf-theme="botanical"] .shelf-row {
      position: relative !important;
      height: 286px !important;
      min-height: 286px !important;
      margin: 0 !important;
      overflow: hidden !important;
      border-left: 20px solid var(--sof-walnut-deep) !important;
      border-right: 20px solid #1e1009 !important;
      border-image: none !important;
      background:
        linear-gradient(108deg, rgba(255, 239, 204, .10), rgba(255, 231, 191, .025) 21%, transparent 43%),
        linear-gradient(90deg, rgba(0,0,0,.21), transparent 8%, transparent 90%, rgba(0,0,0,.34)),
        linear-gradient(to bottom, rgba(0,0,0,.18), transparent 34%, rgba(0,0,0,.31)),
        url("/themes/botanical/v4/shelf-back-clean.webp") center / cover no-repeat !important;
      background-color: #21150f !important;
      box-shadow:
        inset 28px 0 38px rgba(0,0,0,.36),
        inset -32px 0 44px rgba(0,0,0,.46),
        inset 0 18px 25px rgba(0,0,0,.29),
        inset 0 -18px 28px rgba(6,3,2,.23) !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row::before,
    html[data-shelf-theme="botanical"] .shelf-row::before {
      content: "" !important;
      position: absolute !important;
      z-index: 18 !important;
      left: -20px !important;
      right: -20px !important;
      top: 0 !important;
      height: 22px !important;
      pointer-events: none !important;
      background:
        linear-gradient(to bottom,
          rgba(255, 235, 199, .23) 0%,
          rgba(217, 171, 119, .07) 16%,
          rgba(73, 40, 23, .05) 39%,
          rgba(19, 9, 5, .48) 100%),
        linear-gradient(90deg, rgba(255,230,190,.07), transparent 24%, transparent 78%, rgba(0,0,0,.19)),
        url("/themes/botanical/v4/walnut-shelf-front.webp") center / 100% 100% no-repeat !important;
      border-top: 1px solid rgba(242, 205, 157, .20) !important;
      border-bottom: 1px solid rgba(8, 4, 2, .84) !important;
      box-shadow:
        0 2px 2px rgba(255, 225, 183, .04),
        0 9px 16px rgba(0,0,0,.48),
        0 18px 24px rgba(0,0,0,.16),
        inset 0 2px rgba(255,228,190,.15),
        inset 0 -4px rgba(10,4,2,.33) !important;
      filter: none !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row::after,
    html[data-shelf-theme="botanical"] .shelf-row::after {
      content: "" !important;
      position: absolute !important;
      z-index: 2 !important;
      inset: 22px 0 31px !important;
      pointer-events: none !important;
      background:
        linear-gradient(110deg, rgba(255, 242, 207, .082), rgba(230, 221, 183, .018) 30%, transparent 50%),
        radial-gradient(ellipse at 15% 13%, rgba(255, 231, 184, .065), transparent 34%),
        linear-gradient(90deg, rgba(0,0,0,.14), transparent 9%, transparent 90%, rgba(0,0,0,.24)) !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row > .books,
    html[data-shelf-theme="botanical"] .shelf-row > .books {
      position: absolute !important;
      z-index: 10 !important;
      left: 5.2% !important;
      right: 5.2% !important;
      bottom: 31px !important;
      height: 232px !important;
      min-height: 0 !important;
      display: flex !important;
      align-items: flex-end !important;
      gap: 8px !important;
      padding: 0 !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row > .wood-shelf,
    html[data-shelf-theme="botanical"] .shelf-row > .wood-shelf {
      position: absolute !important;
      z-index: 20 !important;
      left: -1.35% !important;
      right: -1.35% !important;
      bottom: 0 !important;
      width: auto !important;
      height: 33px !important;
      border: 0 !important;
      border-top: 1px solid rgba(244, 204, 151, .29) !important;
      border-radius: 0 0 3px 3px !important;
      background:
        linear-gradient(to bottom,
          rgba(255, 234, 198, .20) 0%,
          rgba(224, 182, 130, .06) 18%,
          rgba(79, 44, 26, .03) 40%,
          rgba(20, 9, 4, .43) 100%),
        linear-gradient(90deg, rgba(255,229,185,.06), transparent 30%, transparent 80%, rgba(0,0,0,.16)),
        url("/themes/botanical/v4/walnut-shelf-front.webp") center / 100% 100% no-repeat !important;
      box-shadow:
        0 -4px 8px rgba(0,0,0,.26),
        0 6px 10px rgba(9,4,2,.31),
        0 17px 28px rgba(0,0,0,.68),
        inset 0 3px rgba(255,226,184,.16),
        inset 0 -5px rgba(12,5,2,.31) !important;
    }

    html[data-shelf-theme="botanical"] .wood-shelf::after {
      bottom: -11px !important;
      height: 13px !important;
      background: radial-gradient(ellipse at 50% 0%, rgba(0,0,0,.48), transparent 72%) !important;
      filter: blur(3px) !important;
    }

    /* Keep the books physically upright. Variation should come from real spine art, not random leaning. */
    html[data-shelf-theme="botanical"] .book {
      --lean: 0deg !important;
    }

    html[data-shelf-theme="botanical"] .book:hover,
    html[data-shelf-theme="botanical"] .book:focus-visible {
      filter: brightness(1.055) !important;
    }

    html[data-shelf-theme="botanical"] .shelf-occupant-flow {
      filter: drop-shadow(5px 8px 7px rgba(0,0,0,.14)) !important;
    }

    /* ---------- overlays and dialogs: still part of the library ---------- */
    html[data-shelf-theme="botanical"] .theme-picker,
    html[data-shelf-theme="botanical"] .reader-modal,
    html[data-shelf-theme="botanical"] .book-hub-view {
      color: var(--sof-cream) !important;
      background:
        linear-gradient(145deg, rgba(31, 48, 37, .97), rgba(10, 20, 13, .985)) !important;
      border-color: rgba(231, 223, 201, .14) !important;
      box-shadow: 0 28px 76px rgba(0,0,0,.55) !important;
    }

    html[data-shelf-theme="botanical"] .theme-picker button,
    html[data-shelf-theme="botanical"] .reader-modal button,
    html[data-shelf-theme="botanical"] .reader-modal input,
    html[data-shelf-theme="botanical"] .reader-modal select,
    html[data-shelf-theme="botanical"] .reader-modal textarea {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif !important;
    }

    html[data-shelf-theme="botanical"] .modal-backdrop,
    html[data-shelf-theme="botanical"] .theme-picker-backdrop {
      background: rgba(3, 8, 5, .77) !important;
      backdrop-filter: blur(5px) !important;
    }

    /* ---------- footer ---------- */
    html[data-shelf-theme="botanical"] footer {
      color: rgba(231, 223, 201, .48) !important;
      border-color: rgba(231, 223, 201, .08) !important;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif !important;
    }

    html[data-shelf-theme="botanical"] footer a {
      color: var(--sof-sage-light) !important;
    }

    /* ---------- responsive behavior: remove scenery before books ---------- */
    @media (max-width: 1240px) {
      html[data-shelf-theme="botanical"] .cinematic-room__content {
        width: min(760px, calc(100% - 400px)) !important;
        min-width: 560px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        left: -108px !important;
        width: 355px !important;
        opacity: .88 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        right: -135px !important;
        width: 430px !important;
        opacity: .78 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-real-room-sconce,
      html[data-shelf-theme="botanical"] .botanical-real-sconce-glow {
        display: none !important;
      }
    }

    @media (max-width: 900px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        min-height: 278px !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        width: calc(100% - 52px) !important;
        min-width: 0 !important;
        padding: 26px 0 14px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        left: -128px !important;
        top: -54px !important;
        width: 310px !important;
        opacity: .46 !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero {
        padding-left: 128px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar {
        grid-template-columns: minmax(0, 1fr) 132px !important;
      }
    }

    @media (max-width: 760px) {
      html[data-shelf-theme="botanical"] .cinematic-room {
        min-height: 250px !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__plate {
        background-position: 38% center !important;
        filter: saturate(.74) contrast(1.03) brightness(.62) !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__daylight {
        width: 84% !important;
        opacity: .57 !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__content {
        width: calc(100% - 30px) !important;
        padding: 20px 0 12px !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        left: -126px !important;
        top: -40px !important;
        width: 250px !important;
        opacity: .25 !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero {
        min-height: 88px !important;
        padding: 0 0 10px !important;
        gap: 12px !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero h1 {
        font-size: clamp(38px, 12vw, 50px) !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero .subhead {
        max-width: 72vw !important;
        font-size: 13px !important;
      }

      html[data-shelf-theme="botanical"] .reader-add-books-trigger {
        min-height: 40px !important;
        padding: 9px 14px !important;
      }

      html[data-shelf-theme="botanical"] .reader-toolbar {
        grid-template-columns: minmax(0, 1fr) 118px !important;
        gap: 7px !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row,
      html[data-shelf-theme="botanical"] .shelf-row {
        height: 258px !important;
        min-height: 258px !important;
        border-left-width: 12px !important;
        border-right-width: 12px !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row::before,
      html[data-shelf-theme="botanical"] .shelf-row::before {
        left: -12px !important;
        right: -12px !important;
        height: 18px !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row > .books,
      html[data-shelf-theme="botanical"] .shelf-row > .books {
        left: 3% !important;
        right: 3% !important;
        bottom: 28px !important;
        height: 214px !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row > .wood-shelf,
      html[data-shelf-theme="botanical"] .shelf-row > .wood-shelf {
        height: 29px !important;
      }
    }

    @media (max-width: 520px) {
      html[data-shelf-theme="botanical"] .botanical-scene-window {
        display: none !important;
      }

      html[data-shelf-theme="botanical"] .reader-hero .subhead {
        max-width: 100% !important;
      }

      html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
      html[data-shelf-theme="botanical"] .bookcase {
        width: calc(100% - 12px) !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html[data-shelf-theme="botanical"] *,
      html[data-shelf-theme="botanical"] *::before,
      html[data-shelf-theme="botanical"] *::after {
        scroll-behavior: auto !important;
      }
    }
  `}</style>;
}
