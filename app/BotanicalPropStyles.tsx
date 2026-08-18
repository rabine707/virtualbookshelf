"use client";

export default function BotanicalPropStyles() {
  return <style>{`
    html[data-shelf-theme="botanical"] .botanical-real-room-props {
      position: absolute;
      z-index: 2;
      inset: 0;
      overflow: visible;
      pointer-events: none;
    }

    html[data-shelf-theme="botanical"] .botanical-real-window {
      position: absolute;
      left: -22px;
      top: -30px;
      width: 294px;
      height: 365px;
      overflow: hidden;
      border: 15px solid #2b1b12;
      border-left-width: 22px;
      border-radius: 2px 3px 8px 2px;
      background: linear-gradient(120deg, #d7dfbd 0%, #b7c79e 34%, #536d53 100%);
      box-shadow: 13px 18px 34px rgba(0,0,0,.42), inset -20px -16px 38px rgba(26,48,31,.36);
      transform: perspective(900px) rotateY(2deg);
    }

    html[data-shelf-theme="botanical"] .botanical-real-window-glass,
    html[data-shelf-theme="botanical"] .botanical-real-window-lace,
    html[data-shelf-theme="botanical"] .botanical-real-window-mullion {
      position: absolute;
      display: block;
    }

    html[data-shelf-theme="botanical"] .botanical-real-window-glass {
      inset: 0;
      background:
        radial-gradient(circle at 28% 18%, rgba(255,255,225,.78), transparent 28%),
        linear-gradient(120deg, rgba(255,255,226,.48), rgba(185,205,162,.18) 46%, rgba(32,68,44,.22));
      box-shadow: inset 0 0 38px rgba(255,255,220,.22);
    }

    html[data-shelf-theme="botanical"] .botanical-real-window-lace {
      inset: 0 44% 0 0;
      opacity: .58;
      background:
        radial-gradient(circle at 12px 12px, rgba(250,245,220,.72) 0 2px, transparent 2.5px) 0 0 / 24px 24px,
        radial-gradient(circle at 0 0, transparent 0 9px, rgba(250,245,220,.28) 9.5px 10.5px, transparent 11px) 0 0 / 24px 24px,
        linear-gradient(90deg, rgba(246,239,213,.34), rgba(246,239,213,.08));
    }

    html[data-shelf-theme="botanical"] .botanical-real-window-mullion {
      background: linear-gradient(90deg, #4e321f, #2d1b11 70%, #1c100a);
      box-shadow: 4px 5px 12px rgba(0,0,0,.30);
    }
    html[data-shelf-theme="botanical"] .botanical-real-window-mullion-v { top: 0; bottom: 0; left: 52%; width: 9px; }
    html[data-shelf-theme="botanical"] .botanical-real-window-mullion-h { left: 0; right: 0; top: 48%; height: 9px; }

    html[data-shelf-theme="botanical"] .botanical-real-room-plant {
      position: absolute;
      left: 54px;
      bottom: -62px;
      width: 255px;
      height: auto;
      object-fit: contain;
      filter: saturate(.86) brightness(.78) drop-shadow(12px 18px 18px rgba(0,0,0,.48));
      transform: rotate(-1.5deg);
    }

    html[data-shelf-theme="botanical"] .botanical-real-room-frame {
      position: absolute;
      right: 74px;
      top: 32px;
      width: 205px;
      height: auto;
      object-fit: contain;
      filter: saturate(.78) brightness(.68) drop-shadow(0 13px 17px rgba(0,0,0,.48));
      transform: rotate(.35deg);
    }

    html[data-shelf-theme="botanical"] .botanical-real-room-sconce {
      position: absolute;
      right: 275px;
      top: 116px;
      width: 112px;
      height: auto;
      object-fit: contain;
      filter: saturate(.88) brightness(.82) drop-shadow(0 12px 13px rgba(0,0,0,.52));
    }

    html[data-shelf-theme="botanical"] .botanical-real-sconce-glow {
      position: absolute;
      right: 228px;
      top: 104px;
      width: 210px;
      height: 210px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,205,118,.24), rgba(232,165,80,.11) 24%, rgba(190,123,54,.035) 48%, transparent 72%);
      filter: blur(12px);
      opacity: .82;
    }

    html[data-shelf-theme="botanical"] .botanical-decor-plant { opacity: 0 !important; }

    html[data-shelf-theme="botanical"] .botanical-row-decor-plant::before,
    html[data-shelf-theme="botanical"] .botanical-row-decor-plant-small::before,
    html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow::before {
      content: "";
      position: absolute;
      z-index: 2;
      left: 50%;
      bottom: -1px;
      transform: translateX(-50%);
      background-position: center bottom;
      background-repeat: no-repeat;
      background-size: contain;
      filter: drop-shadow(0 3px 2px rgba(0,0,0,.46)) drop-shadow(0 9px 9px rgba(0,0,0,.38));
    }

    html[data-shelf-theme="botanical"] .botanical-row-decor-plant::before {
      width: 150px;
      height: 205px;
      background-image: url("https://cdn.polyhaven.com/asset_img/thumbs/potted_plant_02.png?format=png");
    }

    html[data-shelf-theme="botanical"] .botanical-row-decor-plant-small::before {
      width: 118px;
      height: 168px;
      background-image: url("https://cdn.polyhaven.com/asset_img/thumbs/potted_plant_04.png?format=png");
    }

    html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow::before {
      width: 104px;
      height: 160px;
      bottom: -2px;
      background-image: url("https://cdn.polyhaven.com/asset_img/thumbs/vintage_oil_lamp.png?format=png");
      filter: brightness(.82) saturate(.88) drop-shadow(0 3px 2px rgba(0,0,0,.48)) drop-shadow(0 8px 8px rgba(0,0,0,.38));
    }

    /* A real contact shadow grounds every prop on the front edge of the plank. */
    html[data-shelf-theme="botanical"] .shelf-occupant-flow > .botanical-row-decor::after {
      content: "";
      position: absolute;
      z-index: 0;
      left: 50%;
      bottom: -4px;
      width: 76%;
      height: 14px;
      transform: translateX(-50%);
      border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(0,0,0,.58) 0%, rgba(0,0,0,.38) 38%, rgba(0,0,0,.14) 60%, transparent 78%);
      filter: blur(2.5px);
      opacity: .9;
      pointer-events: none;
    }

    /* Glow is now a soft radial layer rather than a blend-mode surface.
       This avoids Chromium compositing tiles showing up as a rectangular block. */
    html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow .botanical-practical-glow {
      position: absolute !important;
      z-index: 1 !important;
      left: 50% !important;
      bottom: 35px !important;
      width: 136px !important;
      height: 136px !important;
      transform: translateX(-50%) !important;
      border-radius: 50% !important;
      background: radial-gradient(circle, rgba(255,207,123,.26) 0%, rgba(237,166,76,.12) 27%, rgba(204,126,48,.045) 48%, transparent 70%) !important;
      filter: blur(12px) !important;
      opacity: .66 !important;
      mix-blend-mode: normal !important;
      pointer-events: none !important;
    }

    /* Physical shelf occupancy: props and books participate in one flex row.
       The prop reserves real horizontal space, so resizing cannot put books over it. */
    html[data-shelf-theme="botanical"] .shelf-occupant-flow {
      justify-content: center !important;
      align-items: flex-end !important;
      gap: 12px !important;
    }

    html[data-shelf-theme="botanical"] .shelf-occupant-flow > .book-flow {
      display: flex !important;
      flex: 0 1 auto !important;
      min-width: 0 !important;
      max-width: 100% !important;
      align-items: flex-end !important;
      gap: 8px !important;
    }

    html[data-shelf-theme="botanical"] .shelf-occupant-flow > .book-flow.book-layout-split {
      gap: 38px !important;
    }

    html[data-shelf-theme="botanical"] .shelf-occupant-flow > .botanical-row-decor {
      display: block !important;
      position: relative !important;
      z-index: 12 !important;
      left: auto !important;
      right: auto !important;
      bottom: 0 !important;
      flex: 0 0 auto !important;
      align-self: flex-end !important;
      height: 220px !important;
      margin: 0 !important;
      pointer-events: none !important;
    }

    html[data-shelf-theme="botanical"] .shelf-occupant-flow > .botanical-row-decor-plant {
      width: 150px !important;
      flex-basis: 150px !important;
    }

    html[data-shelf-theme="botanical"] .shelf-occupant-flow > .botanical-row-decor-plant-small {
      width: 118px !important;
      flex-basis: 118px !important;
    }

    html[data-shelf-theme="botanical"] .shelf-occupant-flow > .botanical-row-decor-warm-glow {
      width: 104px !important;
      flex-basis: 104px !important;
    }

    @media (max-width: 1100px) {
      html[data-shelf-theme="botanical"] .botanical-real-room-frame { right: 28px; width: 168px; }
      html[data-shelf-theme="botanical"] .botanical-real-room-sconce { right: 190px; width: 94px; }
      html[data-shelf-theme="botanical"] .botanical-real-sconce-glow { right: 145px; }
      html[data-shelf-theme="botanical"] .botanical-real-window { width: 238px; }
      html[data-shelf-theme="botanical"] .botanical-real-room-plant { width: 205px; left: 30px; }
      html[data-shelf-theme="botanical"] .shelf-occupant-flow { gap: 8px !important; }
      html[data-shelf-theme="botanical"] .shelf-occupant-flow > .botanical-row-decor-plant { width: 128px !important; flex-basis: 128px !important; }
      html[data-shelf-theme="botanical"] .shelf-occupant-flow > .botanical-row-decor-plant-small { width: 102px !important; flex-basis: 102px !important; }
      html[data-shelf-theme="botanical"] .shelf-occupant-flow > .botanical-row-decor-warm-glow { width: 92px !important; flex-basis: 92px !important; }
    }

    @media (max-width: 760px) {
      html[data-shelf-theme="botanical"] .botanical-real-window { left: -58px; top: -35px; width: 180px; height: 265px; opacity: .62; }
      html[data-shelf-theme="botanical"] .botanical-real-room-plant { left: -12px; bottom: -30px; width: 145px; opacity: .72; }
      html[data-shelf-theme="botanical"] .botanical-real-room-frame,
      html[data-shelf-theme="botanical"] .botanical-real-room-sconce,
      html[data-shelf-theme="botanical"] .botanical-real-sconce-glow { display: none !important; }
      html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow::before,
      html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow .botanical-practical-glow { display: none !important; }
      html[data-shelf-theme="botanical"] .shelf-occupant-flow > .botanical-row-decor { display: none !important; }
    }
  `}</style>;
}
