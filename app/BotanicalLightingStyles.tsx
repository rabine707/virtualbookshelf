"use client";

export default function BotanicalLightingStyles() {
  return <style>{`
    html[data-shelf-theme="botanical"] body {
      background:
        radial-gradient(ellipse at 12% 2%, rgba(222,235,181,.08), transparent 27%),
        linear-gradient(90deg, rgba(15,35,21,.78), rgba(5,16,9,.94)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/black_walnut_veneer_01/black_walnut_veneer_01_diff_2k.jpg") center top / 980px 980px repeat !important;
      background-attachment: fixed !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room {
      background: #09170e !important;
      border-bottom-color: rgba(89,55,31,.70) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__plate {
      background:
        linear-gradient(90deg, rgba(24,50,30,.60), rgba(9,27,16,.80) 50%, rgba(4,13,8,.93)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/black_walnut_veneer_01/black_walnut_veneer_01_diff_2k.jpg") center / 980px 980px repeat !important;
      filter: saturate(.78) contrast(1.10) brightness(.78) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__daylight {
      left: -8% !important;
      top: -34% !important;
      width: 70% !important;
      height: 172% !important;
      background: linear-gradient(111deg, rgba(250,248,209,.29), rgba(226,235,190,.13) 25%, rgba(197,217,168,.045) 46%, transparent 67%) !important;
      transform: skewX(-9deg) !important;
      filter: blur(15px) !important;
      opacity: .88 !important;
      mix-blend-mode: normal !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row,
    html[data-shelf-theme="botanical"] .shelf-row {
      background:
        linear-gradient(114deg, rgba(224,237,191,.075), rgba(202,221,173,.025) 16%, transparent 31%),
        linear-gradient(90deg, rgba(0,0,0,.37), transparent 7%, transparent 91%, rgba(0,0,0,.45)),
        repeating-linear-gradient(90deg, transparent 0 355px, rgba(2,9,5,.09) 355px 357px, rgba(227,234,199,.010) 357px 358px),
        linear-gradient(rgba(11,37,21,.88), rgba(5,22,12,.93)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/black_walnut_veneer_01/black_walnut_veneer_01_diff_2k.jpg") center / 920px 920px repeat !important;
      background-color: #0b2113 !important;
      box-shadow:
        inset 28px 0 38px rgba(0,0,0,.44),
        inset -30px 0 42px rgba(0,0,0,.49),
        inset 0 20px 30px rgba(1,7,3,.32),
        inset 0 -20px 32px rgba(0,0,0,.27) !important;
    }

    /* Walnut top rails: visible grain, a bright bevel, darker face and a compact
       amber light source tucked directly underneath the wood. */
    html[data-shelf-theme="botanical"] .modular-shelf-row::before,
    html[data-shelf-theme="botanical"] .shelf-row::before {
      background:
        linear-gradient(to bottom,
          rgba(255,232,194,.30) 0%,
          rgba(214,158,104,.10) 9%,
          rgba(84,44,24,.06) 33%,
          rgba(25,11,6,.42) 78%,
          rgba(9,4,2,.68) 100%),
        linear-gradient(90deg,
          rgba(255,211,160,.08),
          transparent 18%,
          rgba(0,0,0,.08) 47%,
          transparent 72%,
          rgba(0,0,0,.25)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/lacquered_cherry_wood/lacquered_cherry_wood_diff_2k.jpg") center 48% / 690px auto repeat-x !important;
      border-top: 1px solid rgba(255,221,177,.34) !important;
      border-bottom: 1px solid rgba(8,3,2,.90) !important;
      box-shadow:
        0 2px 2px rgba(255,226,178,.08),
        0 5px 7px rgba(255,176,82,.17),
        0 12px 17px rgba(224,132,45,.065),
        0 15px 20px rgba(0,0,0,.46),
        inset 0 2px rgba(255,229,188,.22),
        inset 0 -4px rgba(8,3,2,.46) !important;
      filter: saturate(1.04) contrast(1.14) brightness(.84) !important;
    }

    /* The very top cap gets extra furniture depth so it reads as a substantial
       finished piece rather than a flat brown strip. */
    html[data-shelf-theme="botanical"] .modular-bookcase > .modular-shelf-row:first-child::before {
      height: 24px !important;
      top: -4px !important;
      background:
        linear-gradient(to bottom,
          rgba(255,239,204,.38) 0%,
          rgba(211,151,96,.12) 8%,
          rgba(91,47,25,.04) 32%,
          rgba(34,16,8,.34) 70%,
          rgba(10,4,2,.74) 100%),
        radial-gradient(ellipse at 21% 5%, rgba(255,214,160,.12), transparent 25%),
        linear-gradient(90deg, rgba(255,218,169,.08), transparent 22%, rgba(0,0,0,.09) 54%, transparent 79%, rgba(0,0,0,.28)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/lacquered_cherry_wood/lacquered_cherry_wood_diff_2k.jpg") center 45% / 600px auto repeat-x !important;
      border-top: 2px solid rgba(255,221,175,.38) !important;
      box-shadow:
        0 2px 2px rgba(255,226,178,.10),
        0 6px 8px rgba(247,166,75,.16),
        0 14px 20px rgba(210,116,35,.06),
        0 20px 26px rgba(0,0,0,.54),
        inset 0 3px rgba(255,232,193,.22),
        inset 0 -5px rgba(7,3,1,.52) !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row > .wood-shelf,
    html[data-shelf-theme="botanical"] .shelf-row > .wood-shelf {
      border-top-color: rgba(255,220,171,.42) !important;
      box-shadow:
        0 -3px 8px rgba(232,147,65,.05),
        0 5px 9px rgba(10,5,2,.34),
        0 18px 28px rgba(0,0,0,.72),
        inset 0 3px rgba(255,226,184,.20),
        inset 0 -5px rgba(12,5,2,.38) !important;
    }

    html[data-shelf-theme="botanical"] .shelf-occupant-flow {
      filter: drop-shadow(5px 8px 7px rgba(0,0,0,.16));
    }

    @media (max-width: 760px) {
      html[data-shelf-theme="botanical"] .cinematic-room__daylight { width: 82% !important; opacity: .62 !important; }
      html[data-shelf-theme="botanical"] .modular-shelf-row::before,
      html[data-shelf-theme="botanical"] .shelf-row::before {
        box-shadow: 0 4px 6px rgba(255,176,82,.11), 0 10px 15px rgba(220,133,50,.04), 0 8px 14px rgba(0,0,0,.40), inset 0 2px rgba(255,229,188,.14), inset 0 -3px rgba(11,5,2,.32) !important;
      }
    }
  `}</style>;
}
