"use client";

export default function BotanicalMaterialStyles() {
  return <style>{`
    html[data-shelf-theme="botanical"] body {
      background-image:
        linear-gradient(90deg, rgba(12,29,17,.92), rgba(5,14,9,.97)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/plastered_wall/plastered_wall_diff_2k.jpg") !important;
      background-size: auto, 620px 620px !important;
      background-repeat: no-repeat, repeat !important;
      background-blend-mode: normal, multiply !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room {
      min-height: clamp(330px, 37vh, 405px) !important;
      background: #0c1710 !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__plate {
      z-index: 0 !important;
      background:
        linear-gradient(90deg, rgba(28,53,31,.70), rgba(12,31,18,.80) 47%, rgba(5,15,9,.92)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/plastered_wall/plastered_wall_diff_2k.jpg") center / 620px 620px repeat !important;
      background-blend-mode: multiply, normal !important;
      filter: saturate(.80) contrast(1.10) brightness(.82) !important;
      transform: none !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__daylight {
      z-index: 3 !important;
      left: -4% !important;
      top: -24% !important;
      width: 62% !important;
      height: 155% !important;
      filter: blur(12px) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__vignette { z-index: 4 !important; }
    html[data-shelf-theme="botanical"] .cinematic-room__content { z-index: 6 !important; }

    html[data-shelf-theme="botanical"] .modular-shelf-row,
    html[data-shelf-theme="botanical"] .shelf-row {
      border-left: 18px solid transparent !important;
      border-right: 18px solid transparent !important;
      border-image-source: url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/lacquered_cherry_wood/lacquered_cherry_wood_diff_2k.jpg") !important;
      border-image-slice: 32% !important;
      border-image-width: 0 18px !important;
      border-image-repeat: stretch !important;
      background:
        linear-gradient(112deg, rgba(255,235,195,.09), rgba(255,226,180,.03) 19%, transparent 39%),
        linear-gradient(to bottom, rgba(20,9,5,.18), transparent 35%, rgba(11,5,3,.38)),
        linear-gradient(90deg, rgba(255,220,172,.035), transparent 25%, transparent 76%, rgba(0,0,0,.16)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/lacquered_cherry_wood/lacquered_cherry_wood_diff_2k.jpg") center / 720px 720px repeat !important;
      background-color: #29170f !important;
      box-shadow:
        inset 22px 0 30px rgba(0,0,0,.34),
        inset -24px 0 34px rgba(0,0,0,.40),
        inset 0 18px 24px rgba(0,0,0,.24),
        inset 0 -18px 30px rgba(7,3,2,.24) !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row::before,
    html[data-shelf-theme="botanical"] .shelf-row::before {
      height: 20px !important;
      background:
        linear-gradient(to bottom,
          rgba(255,239,205,.28) 0%,
          rgba(255,222,178,.10) 12%,
          rgba(62,31,17,.08) 42%,
          rgba(22,10,5,.46) 100%),
        linear-gradient(90deg, rgba(255,235,198,.10), transparent 23%, transparent 80%, rgba(0,0,0,.22)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/lacquered_cherry_wood/lacquered_cherry_wood_diff_2k.jpg") center 47% / 900px auto repeat-x !important;
      border-bottom: 1px solid rgba(12,5,2,.82) !important;
      box-shadow:
        0 2px 2px rgba(255,228,187,.06),
        0 8px 16px rgba(0,0,0,.46),
        0 16px 24px rgba(0,0,0,.18),
        inset 0 2px rgba(255,229,188,.18),
        inset 0 -3px rgba(11,5,2,.34) !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row > .wood-shelf,
    html[data-shelf-theme="botanical"] .shelf-row > .wood-shelf {
      height: 34px !important;
      border-top: 1px solid rgba(255,214,163,.34) !important;
      border-radius: 1px 1px 4px 4px !important;
      background:
        linear-gradient(to bottom,
          rgba(255,238,202,.24) 0%,
          rgba(255,225,184,.10) 10%,
          rgba(80,42,24,.04) 34%,
          rgba(25,11,5,.38) 78%,
          rgba(9,4,2,.60) 100%),
        linear-gradient(90deg, rgba(255,235,197,.08), transparent 29%, transparent 81%, rgba(0,0,0,.18)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/lacquered_cherry_wood/lacquered_cherry_wood_diff_2k.jpg") center 56% / 860px auto repeat-x !important;
      box-shadow:
        0 -4px 8px rgba(0,0,0,.28),
        0 5px 8px rgba(10,5,2,.30),
        0 16px 25px rgba(0,0,0,.66),
        inset 0 3px rgba(255,226,184,.18),
        inset 0 -5px rgba(12,5,2,.34) !important;
    }

    html[data-shelf-theme="botanical"] .wood-shelf::before {
      top: 2px !important;
      height: 2px !important;
      background: linear-gradient(90deg,
        transparent,
        rgba(255,236,201,.18) 8%,
        rgba(255,236,201,.10) 55%,
        rgba(255,236,201,.04) 86%,
        transparent) !important;
    }

    html[data-shelf-theme="botanical"] .wood-shelf::after {
      bottom: -11px !important;
      height: 13px !important;
      background: radial-gradient(ellipse at 50% 0%, rgba(0,0,0,.52), transparent 72%) !important;
      filter: blur(3px) !important;
    }

    @media (max-width: 760px) {
      html[data-shelf-theme="botanical"] .cinematic-room { min-height: 300px !important; }
      html[data-shelf-theme="botanical"] .cinematic-room__plate { background-size: auto, 420px 420px !important; }
      html[data-shelf-theme="botanical"] .modular-shelf-row,
      html[data-shelf-theme="botanical"] .shelf-row {
        border-left-width: 12px !important;
        border-right-width: 12px !important;
        border-image-width: 0 12px !important;
        background-size: auto, auto, auto, 480px 480px !important;
      }
      html[data-shelf-theme="botanical"] .modular-shelf-row::before,
      html[data-shelf-theme="botanical"] .shelf-row::before {
        background-size: auto, auto, 620px auto !important;
      }
      html[data-shelf-theme="botanical"] .modular-shelf-row > .wood-shelf,
      html[data-shelf-theme="botanical"] .shelf-row > .wood-shelf {
        height: 30px !important;
        background-size: auto, auto, 600px auto !important;
      }
    }
  `}</style>;
}
