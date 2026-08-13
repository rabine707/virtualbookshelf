"use client";

export default function BotanicalLampFixStyles() {
  return <style>{`
    /* Crop the bad opaque chimney from the Poly Haven preview, but preserve the
       lamp body's narrow silhouette instead of stretching it across the slot. */
    html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow::before {
      width: 104px !important;
      height: 86px !important;
      bottom: -2px !important;
      background-size: 104px 160px !important;
      background-position: center bottom !important;
      background-repeat: no-repeat !important;
      transform: translateX(-50%) scaleX(.62) !important;
      transform-origin: center bottom !important;
      filter: brightness(.84) saturate(.90)
        drop-shadow(0 3px 2px rgba(0,0,0,.48))
        drop-shadow(0 8px 8px rgba(0,0,0,.36)) !important;
    }

    html[data-shelf-theme="botanical"] .shelf-occupant-flow > .botanical-row-decor-warm-glow::after {
      width: 56% !important;
    }

    html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow .botanical-practical-glow {
      display: block !important;
      position: absolute !important;
      z-index: 4 !important;
      left: 50% !important;
      bottom: 77px !important;
      width: 18px !important;
      height: 63px !important;
      transform: translateX(-50%) !important;
      border: 1px solid rgba(245,231,192,.22) !important;
      border-radius: 8px 8px 4px 4px / 12px 12px 5px 5px !important;
      background:
        linear-gradient(90deg,
          rgba(255,255,238,.05) 0%,
          rgba(255,244,210,.17) 18%,
          rgba(255,255,245,.035) 43%,
          rgba(61,42,27,.04) 68%,
          rgba(255,238,197,.12) 88%,
          rgba(255,255,240,.03) 100%) !important;
      box-shadow:
        inset 2px 0 2px rgba(255,255,235,.12),
        inset -2px 0 2px rgba(24,14,8,.07),
        0 0 3px rgba(255,225,177,.05) !important;
      filter: none !important;
      opacity: .92 !important;
      pointer-events: none !important;
    }

    html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow .botanical-practical-glow::before {
      content: "";
      position: absolute;
      z-index: 2;
      left: 50%;
      bottom: 7px;
      width: 6px;
      height: 13px;
      transform: translateX(-50%);
      border-radius: 55% 55% 48% 48% / 72% 72% 32% 32%;
      background:
        radial-gradient(ellipse at 50% 72%, #fff5b4 0 18%, #ffc04f 38%, #e87520 66%, rgba(213,70,12,.18) 82%, transparent 86%);
      box-shadow: 0 0 5px rgba(255,190,73,.82), 0 0 11px rgba(228,124,35,.34);
      transform-origin: center bottom;
    }

    html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow .botanical-practical-glow::after {
      content: "";
      position: absolute;
      z-index: 1;
      left: 50%;
      bottom: -13px;
      width: 70px;
      height: 70px;
      transform: translateX(-50%);
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,196,91,.18), rgba(226,133,43,.07) 35%, transparent 68%);
      filter: blur(8px);
      opacity: .8;
      pointer-events: none;
    }

    @media (max-width: 1100px) {
      html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow::before {
        width: 92px !important;
        background-size: 92px 142px !important;
        height: 78px !important;
        transform: translateX(-50%) scaleX(.64) !important;
      }
      html[data-shelf-theme="botanical"] .botanical-row-decor-warm-glow .botanical-practical-glow {
        bottom: 69px !important;
        width: 16px !important;
        height: 56px !important;
      }
    }
  `}</style>;
}
