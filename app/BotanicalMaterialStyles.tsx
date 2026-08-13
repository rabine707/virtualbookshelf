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
      background:
        linear-gradient(112deg, rgba(255,235,195,.09), rgba(255,226,180,.03) 19%, transparent 39%),
        linear-gradient(to bottom, rgba(20,9,5,.18), transparent 35%, rgba(11,5,3,.38)),
        linear-gradient(90deg, rgba(255,220,172,.035), transparent 25%, transparent 76%, rgba(0,0,0,.16)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/lacquered_cherry_wood/lacquered_cherry_wood_diff_2k.jpg") center / 720px 720px repeat !important;
      background-color: #29170f !important;
    }

    @media (max-width: 760px) {
      html[data-shelf-theme="botanical"] .cinematic-room { min-height: 300px !important; }
      html[data-shelf-theme="botanical"] .cinematic-room__plate { background-size: auto, 420px 420px !important; }
      html[data-shelf-theme="botanical"] .modular-shelf-row,
      html[data-shelf-theme="botanical"] .shelf-row { background-size: auto, auto, auto, 480px 480px !important; }
    }
  `}</style>;
}
