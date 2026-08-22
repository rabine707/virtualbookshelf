"use client";

import BotanicalMaterialStyles from "./BotanicalMaterialStyles";
import BotanicalShelfDecorStyles from "./BotanicalShelfDecorStyles";
import BotanicalDesignSystemStyles from "./BotanicalDesignSystemStyles";
import BotanicalReferenceCompositionStyles from "./BotanicalReferenceCompositionStyles";

/**
 * Single mounted style authority for the flagship Botanical theme.
 *
 * The internal order is deliberate and preserves the visually validated cascade:
 * material foundation -> shelf decor -> canonical design system -> final composition.
 * Keeping that order here prevents layout.tsx (and future feature work) from becoming
 * another place where Botanical patches can be inserted out of sequence.
 */
export default function BotanicalThemeStyles() {
  return <>
    <BotanicalMaterialStyles />
    <BotanicalShelfDecorStyles />
    <BotanicalDesignSystemStyles />
    <BotanicalReferenceCompositionStyles />

    {/* Final cinematic integration. This stays inside the single Botanical theme
        authority: it does not create another runtime enhancer or legacy patch file.
        Its job is to make the header, room props, shelves, books and footer share one
        directional-light model instead of reading as separate rectangular layers. */}
    <style>{`
      html[data-shelf-theme="botanical"] body {
        background:
          radial-gradient(ellipse at 8% 18%, rgba(181, 164, 112, .10) 0%, rgba(58, 75, 48, .035) 28%, transparent 47%),
          linear-gradient(105deg, #182018 0%, #0d150f 39%, #080d09 76%, #060906 100%) !important;
      }

      html[data-shelf-theme="botanical"] main.shelf-page {
        position: relative !important;
        background:
          radial-gradient(ellipse at 4% 36%, rgba(226, 206, 155, .07) 0%, rgba(116, 111, 75, .025) 24%, transparent 43%),
          linear-gradient(90deg, rgba(34, 38, 29, .56) 0%, rgba(13, 19, 13, .26) 34%, rgba(6, 10, 7, .52) 100%) !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room {
        background:
          linear-gradient(90deg, #263126 0%, #132019 32%, #0b1710 68%, #071009 100%) !important;
        box-shadow: 0 20px 48px rgba(0,0,0,.20) !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room::after {
        content: "";
        position: absolute;
        z-index: 2;
        left: 0;
        right: 0;
        bottom: -92px;
        height: 124px;
        pointer-events: none;
        background: linear-gradient(
          to bottom,
          rgba(12, 24, 16, .78) 0%,
          rgba(28, 24, 16, .42) 34%,
          rgba(38, 24, 14, .17) 66%,
          transparent 100%
        );
        filter: blur(10px);
        opacity: .88;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__plate {
        background:
          linear-gradient(to bottom, rgba(21, 35, 24, .03) 0%, rgba(17, 28, 19, .02) 56%, rgba(61, 38, 21, .22) 100%),
          linear-gradient(90deg,
            rgba(40, 63, 42, .10) 0%,
            rgba(18, 37, 24, .26) 40%,
            rgba(7, 19, 11, .58) 73%,
            rgba(4, 12, 7, .82) 100%),
          url("/themes/botanical/v4/header-plate.webp") center 48% / cover no-repeat !important;
        filter: saturate(.88) contrast(1.035) brightness(.87) !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__daylight {
        left: -7% !important;
        top: -57% !important;
        width: 69% !important;
        height: 238% !important;
        opacity: .92 !important;
        filter: blur(15px) !important;
        background: linear-gradient(
          109deg,
          rgba(255, 248, 211, .34) 0%,
          rgba(242, 231, 187, .16) 25%,
          rgba(218, 224, 177, .055) 46%,
          transparent 70%
        ) !important;
        mix-blend-mode: screen !important;
      }

      html[data-shelf-theme="botanical"] .cinematic-room__vignette {
        background:
          radial-gradient(ellipse at 39% 19%, transparent 22%, rgba(0,0,0,.025) 55%, rgba(0,0,0,.23) 100%),
          linear-gradient(to bottom, transparent 58%, rgba(12,13,9,.10) 75%, rgba(13,10,7,.30) 100%),
          linear-gradient(90deg, transparent 0 60%, rgba(0,0,0,.16) 82%, rgba(0,0,0,.34) 100%) !important;
      }

      /* The props container already crosses the room/shelf seam. These two quiet
         pseudo-layers carry the window direction and right-side falloff down across
         the actual bookcase so every object appears to occupy the same room. */
      html[data-shelf-theme="botanical"] .botanical-real-room-props::before {
        content: "";
        position: absolute;
        z-index: 1;
        left: -7vw;
        top: 54px;
        width: 73vw;
        height: 710px;
        pointer-events: none;
        background: linear-gradient(
          111deg,
          rgba(255, 245, 204, .20) 0%,
          rgba(248, 229, 180, .105) 18%,
          rgba(226, 219, 166, .040) 38%,
          transparent 63%
        );
        transform: skewX(-6deg);
        transform-origin: left top;
        filter: blur(18px);
        opacity: .92;
        mix-blend-mode: screen;
      }

      html[data-shelf-theme="botanical"] .botanical-real-room-props::after {
        content: "";
        position: absolute;
        z-index: 1;
        right: -5%;
        top: 8px;
        width: 52%;
        height: 710px;
        pointer-events: none;
        background:
          radial-gradient(ellipse at 90% 24%, rgba(36, 23, 13, .11), transparent 42%),
          linear-gradient(90deg, transparent 0%, rgba(0,0,0,.045) 38%, rgba(0,0,0,.16) 78%, rgba(0,0,0,.27) 100%);
        filter: blur(10px);
        opacity: .58;
        mix-blend-mode: multiply;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-window {
        -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 80%, rgba(0,0,0,.80) 88%, transparent 100%);
        mask-image: linear-gradient(90deg, #000 0%, #000 80%, rgba(0,0,0,.80) 88%, transparent 100%);
        filter:
          brightness(1.02)
          saturate(.91)
          contrast(1.015)
          drop-shadow(18px 28px 34px rgba(0,0,0,.26)) !important;
      }

      html[data-shelf-theme="botanical"] .botanical-scene-sofa {
        left: -122px !important;
        bottom: -542px !important;
        width: clamp(405px, 28vw, 500px) !important;
        opacity: .91 !important;
        filter:
          brightness(.78)
          saturate(.82)
          contrast(1.045)
          drop-shadow(18px 25px 32px rgba(0,0,0,.39)) !important;
      }

      html[data-shelf-theme="botanical"] .botanical-real-sconce-glow {
        right: -2px !important;
        top: -4px !important;
        width: 240px !important;
        height: 240px !important;
        opacity: .68 !important;
        background: radial-gradient(
          ellipse at 56% 46%,
          rgba(255, 213, 132, .22) 0%,
          rgba(226, 157, 74, .10) 28%,
          rgba(170, 101, 42, .035) 49%,
          transparent 71%
        ) !important;
        filter: blur(16px) !important;
        mix-blend-mode: screen !important;
      }

      /* The cabinet becomes one lit architectural object rather than a stack of
         independent brown panels. Edge falloff and the room-wide glaze sit above
         the repeated rows but never intercept interaction. */
      html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
      html[data-shelf-theme="botanical"] .bookcase {
        isolation: isolate !important;
        box-shadow:
          0 24px 56px rgba(0,0,0,.29),
          0 4px 9px rgba(0,0,0,.22) !important;
        filter: drop-shadow(0 26px 38px rgba(0,0,0,.18)) !important;
      }

      html[data-shelf-theme="botanical"] .bookcase.modular-bookcase::before,
      html[data-shelf-theme="botanical"] .bookcase::before {
        content: "";
        position: absolute;
        z-index: 31;
        inset: 0;
        pointer-events: none;
        box-shadow:
          inset 30px 0 44px rgba(9, 8, 5, .16),
          inset -44px 0 58px rgba(0,0,0,.28),
          inset 0 -22px 32px rgba(0,0,0,.07);
      }

      html[data-shelf-theme="botanical"] .bookcase.modular-bookcase::after,
      html[data-shelf-theme="botanical"] .bookcase::after {
        content: "";
        position: absolute;
        z-index: 30;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(108deg,
            rgba(255, 236, 193, .055) 0%,
            rgba(255, 225, 177, .020) 28%,
            transparent 47%,
            rgba(7, 5, 3, .040) 72%,
            rgba(0, 0, 0, .09) 100%),
          radial-gradient(ellipse at 16% 0%, rgba(255, 226, 178, .040), transparent 33%);
        mix-blend-mode: soft-light;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row,
      html[data-shelf-theme="botanical"] .shelf-row {
        border-left-color: #2b1c12 !important;
        border-right-color: #1b100a !important;
        background:
          radial-gradient(ellipse at 12% 5%, rgba(255, 230, 180, .090) 0%, rgba(246, 217, 166, .025) 29%, transparent 46%),
          linear-gradient(108deg, rgba(236, 221, 178, .075) 0%, rgba(118, 101, 75, .018) 27%, transparent 49%, rgba(0,0,0,.105) 79%, rgba(0,0,0,.20) 100%),
          linear-gradient(to bottom, rgba(19,12,8,.22) 0%, transparent 28%, rgba(7,4,3,.26) 100%),
          url("/themes/botanical/v4/shelf-back-clean.webp") center / 100% 100% no-repeat !important;
        box-shadow:
          inset 20px 0 32px rgba(0,0,0,.29),
          inset -30px 0 44px rgba(0,0,0,.39),
          inset 0 20px 24px rgba(0,0,0,.29),
          inset 0 -12px 24px rgba(10,5,3,.18) !important;
      }

      /* This is the actual room-light layer. It sits above books and decor, below
         the front shelf plank, so the same warm left daylight touches bindings,
         props and the rear panel without flattening the physical shelf edge. */
      html[data-shelf-theme="botanical"] .modular-shelf-row::after,
      html[data-shelf-theme="botanical"] .shelf-row::after {
        z-index: 12 !important;
        inset: 18px 0 28px !important;
        opacity: .76 !important;
        background:
          linear-gradient(108deg,
            rgba(255, 238, 199, .085) 0%,
            rgba(255, 225, 177, .032) 24%,
            transparent 47%,
            rgba(2,2,1,.025) 72%,
            rgba(0,0,0,.075) 100%),
          radial-gradient(ellipse at 12% 16%, rgba(255, 231, 185, .075), transparent 34%),
          linear-gradient(to bottom, rgba(255,255,255,.018), transparent 32%, rgba(0,0,0,.045) 100%) !important;
        mix-blend-mode: soft-light !important;
      }

      /* A faint window-frame shadow and warm wash make the daylight feel cast by
         the visible window instead of looking like a generic green gradient. */
      html[data-shelf-theme="botanical"] .modular-shelf-row:first-child > .books::before,
      html[data-shelf-theme="botanical"] .shelf-row:first-child > .books::before {
        content: "";
        position: absolute;
        z-index: 15;
        inset: -4px 0 0;
        pointer-events: none;
        background:
          linear-gradient(108deg,
            transparent 0 13%,
            rgba(53, 38, 23, .075) 14% 16%,
            transparent 18% 29%,
            rgba(45, 32, 20, .050) 30% 32%,
            transparent 34% 100%),
          linear-gradient(108deg,
            rgba(255, 241, 204, .105) 0%,
            rgba(255, 229, 184, .043) 22%,
            transparent 49%);
        mix-blend-mode: soft-light;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row:first-child .book-cluster-a > .book:nth-child(-n+4),
      html[data-shelf-theme="botanical"] .shelf-row:first-child .book-cluster-a > .book:nth-child(-n+4) {
        filter: brightness(1.035) saturate(.985);
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row:nth-child(2)::after,
      html[data-shelf-theme="botanical"] .shelf-row:nth-child(2)::after {
        opacity: .64 !important;
        background:
          linear-gradient(110deg,
            rgba(255, 231, 188, .070) 0%,
            rgba(239, 210, 162, .022) 25%,
            transparent 48%,
            rgba(0,0,0,.038) 76%,
            rgba(0,0,0,.09) 100%),
          radial-gradient(ellipse at 16% 62%, rgba(222, 193, 147, .055), transparent 31%) !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row > .wood-shelf,
      html[data-shelf-theme="botanical"] .shelf-row > .wood-shelf {
        overflow: hidden !important;
        border-top-color: rgba(244, 204, 147, .24) !important;
        background:
          linear-gradient(to bottom,
            rgba(255, 223, 175, .14) 0%,
            rgba(126, 78, 48, .10) 18%,
            rgba(39, 21, 12, .22) 63%,
            rgba(11, 6, 4, .42) 100%),
          url("/themes/botanical/v4/walnut-shelf-front.webp") center / 100% 100% no-repeat !important;
        box-shadow:
          0 -5px 9px rgba(0,0,0,.25),
          0 10px 18px rgba(0,0,0,.58),
          inset 0 2px rgba(255,220,172,.11),
          inset 0 -4px rgba(9,4,2,.28) !important;
      }

      html[data-shelf-theme="botanical"] .modular-shelf-row > .wood-shelf::before,
      html[data-shelf-theme="botanical"] .shelf-row > .wood-shelf::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(100deg,
          rgba(255, 226, 178, .13) 0%,
          rgba(255, 213, 157, .035) 25%,
          transparent 49%,
          rgba(0,0,0,.10) 78%,
          rgba(0,0,0,.24) 100%);
        mix-blend-mode: soft-light;
      }

      /* Small libraries get a compact reading nook: the sofa owns the left side
         and a warm practical lamp balances it on the right. */
      html[data-shelf-theme="botanical"] .shelf-row-empty {
        min-height: 226px !important;
        height: 226px !important;
        background:
          radial-gradient(ellipse at 14% 66%, rgba(222, 195, 148, .095) 0%, rgba(122, 104, 78, .023) 28%, transparent 45%),
          radial-gradient(ellipse at 84% 55%, rgba(213, 157, 91, .065), transparent 29%),
          linear-gradient(106deg, rgba(198, 184, 145, .040) 0%, transparent 40%, rgba(0,0,0,.12) 100%),
          linear-gradient(to bottom, rgba(15,9,6,.18), transparent 32%, rgba(7,4,3,.26) 100%),
          url("/themes/botanical/v4/shelf-back-clean.webp") center / 100% 100% no-repeat !important;
      }

      html[data-shelf-theme="botanical"] .shelf-row-empty > .shelf-occupant-flow {
        height: 178px !important;
        bottom: 27px !important;
      }

      html[data-shelf-theme="botanical"] .shelf-row-empty .botanical-row-decor {
        opacity: .90 !important;
      }

      html[data-shelf-theme="botanical"] .shelf-row-empty .botanical-row-decor-warm-glow {
        filter: saturate(.94) brightness(1.02) !important;
      }

      html[data-shelf-theme="botanical"] main.shelf-page > footer {
        position: relative !important;
        z-index: 45 !important;
        margin-top: 0 !important;
        padding-left: clamp(330px, 25vw, 460px) !important;
        box-sizing: border-box !important;
        border-top: 1px solid rgba(110, 77, 49, .14) !important;
        background: linear-gradient(90deg, rgba(20,27,19,.20), rgba(7,10,7,.06) 48%, rgba(0,0,0,.12)) !important;
      }

      @media (min-width: 1450px) {
        html[data-shelf-theme="botanical"] .botanical-real-room-props::before {
          left: -6vw;
          width: 69vw;
          height: 730px;
        }

        html[data-shelf-theme="botanical"] .bookcase.modular-bookcase,
        html[data-shelf-theme="botanical"] .bookcase {
          max-width: 1600px !important;
        }
      }

      @media (max-width: 1180px) {
        html[data-shelf-theme="botanical"] .botanical-real-room-props::before {
          left: -10vw;
          top: 70px;
          width: 78vw;
          height: 650px;
          opacity: .72;
        }

        html[data-shelf-theme="botanical"] .botanical-real-room-props::after {
          width: 46%;
          height: 650px;
        }

        html[data-shelf-theme="botanical"] .botanical-scene-sofa {
          left: -112px !important;
          bottom: -510px !important;
          width: 405px !important;
        }

        html[data-shelf-theme="botanical"] .bookcase.modular-bookcase::before,
        html[data-shelf-theme="botanical"] .bookcase::before {
          box-shadow:
            inset 20px 0 34px rgba(9,8,5,.16),
            inset -34px 0 46px rgba(0,0,0,.27);
        }

        html[data-shelf-theme="botanical"] main.shelf-page > footer {
          padding-left: 300px !important;
        }
      }

      @media (max-width: 760px) {
        html[data-shelf-theme="botanical"] .botanical-real-room-props::before,
        html[data-shelf-theme="botanical"] .botanical-real-room-props::after {
          display: none !important;
        }

        html[data-shelf-theme="botanical"] .botanical-scene-window {
          -webkit-mask-image: none;
          mask-image: none;
        }

        html[data-shelf-theme="botanical"] .cinematic-room::after {
          bottom: -40px;
          height: 58px;
          filter: blur(7px);
          opacity: .62;
        }

        html[data-shelf-theme="botanical"] .bookcase.modular-bookcase::before,
        html[data-shelf-theme="botanical"] .bookcase::before {
          box-shadow:
            inset 9px 0 18px rgba(0,0,0,.15),
            inset -14px 0 24px rgba(0,0,0,.22);
        }

        html[data-shelf-theme="botanical"] .bookcase.modular-bookcase::after,
        html[data-shelf-theme="botanical"] .bookcase::after {
          opacity: .52;
        }

        html[data-shelf-theme="botanical"] .modular-shelf-row:first-child > .books::before,
        html[data-shelf-theme="botanical"] .shelf-row:first-child > .books::before {
          display: none !important;
        }

        html[data-shelf-theme="botanical"] .modular-shelf-row::after,
        html[data-shelf-theme="botanical"] .shelf-row::after {
          z-index: 9 !important;
          opacity: .52 !important;
        }

        html[data-shelf-theme="botanical"] .shelf-row-empty {
          min-height: 214px !important;
          height: 214px !important;
        }

        html[data-shelf-theme="botanical"] .shelf-row-empty > .shelf-occupant-flow {
          height: 168px !important;
        }

        html[data-shelf-theme="botanical"] main.shelf-page > footer {
          padding-left: 4px !important;
        }
      }
    `}</style>

    {/* One physical grammar for generated art, cover crops, and fallback bindings.
        This is intentionally mounted at the theme boundary so the three spine
        pipelines cannot drift into visibly different book proportions again. */}
    <style>{`
      html[data-shelf-theme="botanical"] .book {
        width: var(--book-width) !important;
        min-width: var(--book-width) !important;
        max-width: var(--book-width) !important;
        height: 204px !important;
        min-height: 204px !important;
        max-height: 204px !important;
        border-radius: 6px 5px 3px 6px !important;
        transform: rotate(0deg) !important;
        transform-origin: 50% 100% !important;
        transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease !important;
      }

      html[data-shelf-theme="botanical"] .book.has-cover[data-generated-spine="1"] {
        --generated-spine-width: var(--book-width) !important;
        --generated-spine-height: 204px !important;
        width: var(--book-width) !important;
        min-width: var(--book-width) !important;
        max-width: var(--book-width) !important;
        height: 204px !important;
        min-height: 204px !important;
        max-height: 204px !important;
        border-radius: 6px 5px 3px 6px !important;
      }

      html[data-shelf-theme="botanical"] .book.has-cover,
      html[data-shelf-theme="botanical"] .book:not(.has-cover),
      html[data-shelf-theme="botanical"] .book.has-cover[data-generated-spine="1"] {
        box-shadow:
          2px 6px 8px rgba(0,0,0,.30),
          1px 1px 1px rgba(0,0,0,.24),
          inset 3px 0 5px rgba(0,0,0,.14),
          inset -2px 0 3px rgba(0,0,0,.12),
          inset 1px 0 rgba(255,255,255,.12),
          0 3px 2px -2px rgba(8,4,2,.72) !important;
      }

      html[data-shelf-theme="botanical"] .book.has-cover .book-cover-art,
      html[data-shelf-theme="botanical"] .book.has-cover .generated-spine-art {
        filter: saturate(1.01) contrast(1.035) brightness(.96) !important;
      }

      html[data-shelf-theme="botanical"] .book:not(.has-cover) .book-title {
        font-size: 11px !important;
        line-height: 1.08 !important;
      }

      html[data-shelf-theme="botanical"] .book:not(.has-cover) .book-author {
        font-size: 7.5px !important;
        letter-spacing: .055em !important;
      }

      html[data-shelf-theme="botanical"] .book:hover,
      html[data-shelf-theme="botanical"] .book:focus-visible,
      html[data-shelf-theme="botanical"] .book.has-cover[data-generated-spine="1"]:hover,
      html[data-shelf-theme="botanical"] .book.has-cover[data-generated-spine="1"]:focus-visible {
        transform: translateY(-5px) rotate(0deg) !important;
        filter: brightness(1.025) !important;
        box-shadow:
          3px 10px 13px rgba(0,0,0,.34),
          1px 1px 1px rgba(0,0,0,.24),
          inset 3px 0 5px rgba(0,0,0,.12),
          inset -2px 0 3px rgba(0,0,0,.10),
          inset 1px 0 rgba(255,255,255,.13),
          0 4px 2px -2px rgba(8,4,2,.72) !important;
      }

      @media (max-width: 760px) {
        html[data-shelf-theme="botanical"] .book,
        html[data-shelf-theme="botanical"] .book.has-cover[data-generated-spine="1"] {
          height: 200px !important;
          min-height: 200px !important;
          max-height: 200px !important;
          --generated-spine-height: 200px !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        html[data-shelf-theme="botanical"] .book {
          transition: none !important;
        }
      }
    `}</style>
  </>;
}
