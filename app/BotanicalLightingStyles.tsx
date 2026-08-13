"use client";

export default function BotanicalLightingStyles() {
  return <style>{`
    html[data-shelf-theme="botanical"] body {
      background:
        radial-gradient(ellipse at 12% 2%, rgba(222,235,181,.10), transparent 27%),
        linear-gradient(90deg, rgba(21,43,27,.72), rgba(8,20,12,.90)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/black_walnut_veneer_01/black_walnut_veneer_01_diff_2k.jpg") center top / 980px 980px repeat !important;
      background-attachment: fixed !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room {
      background: #0c1b11 !important;
      border-bottom-color: rgba(89,55,31,.70) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__plate {
      background:
        linear-gradient(90deg, rgba(29,57,35,.58), rgba(12,31,19,.76) 50%, rgba(5,15,9,.90)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/black_walnut_veneer_01/black_walnut_veneer_01_diff_2k.jpg") center / 980px 980px repeat !important;
      filter: saturate(.82) contrast(1.06) brightness(.84) !important;
    }

    html[data-shelf-theme="botanical"] .cinematic-room__daylight {
      left: -8% !important;
      top: -34% !important;
      width: 70% !important;
      height: 172% !important;
      background: linear-gradient(111deg, rgba(250,248,209,.31), rgba(226,235,190,.15) 25%, rgba(197,217,168,.055) 46%, transparent 67%) !important;
      transform: skewX(-9deg) !important;
      filter: blur(15px) !important;
      opacity: .92 !important;
      mix-blend-mode: normal !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row,
    html[data-shelf-theme="botanical"] .shelf-row {
      background:
        linear-gradient(112deg, rgba(237,244,199,.115), rgba(218,232,181,.055) 14%, transparent 30%),
        linear-gradient(to bottom, rgba(255,194,105,.105), rgba(225,145,65,.05) 12%, transparent 35%),
        linear-gradient(90deg, rgba(0,0,0,.31), transparent 6%, transparent 92%, rgba(0,0,0,.38)),
        repeating-linear-gradient(90deg, transparent 0 236px, rgba(3,10,6,.20) 236px 238px, rgba(230,235,201,.022) 238px 239px),
        linear-gradient(rgba(17,49,28,.77), rgba(8,27,15,.84)),
        url("https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/black_walnut_veneer_01/black_walnut_veneer_01_diff_2k.jpg") center / 920px 920px repeat !important;
      background-color: #122719 !important;
      box-shadow:
        inset 25px 0 34px rgba(0,0,0,.38),
        inset -27px 0 38px rgba(0,0,0,.43),
        inset 0 20px 28px rgba(1,8,4,.27),
        inset 0 -18px 28px rgba(0,0,0,.20) !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row::before,
    html[data-shelf-theme="botanical"] .shelf-row::before {
      box-shadow:
        0 2px 2px rgba(255,226,178,.075),
        0 7px 12px rgba(255,181,91,.18),
        0 18px 28px rgba(236,145,55,.095),
        0 30px 42px rgba(169,89,27,.035),
        0 10px 18px rgba(0,0,0,.40),
        inset 0 2px rgba(255,229,188,.18),
        inset 0 -3px rgba(11,5,2,.34) !important;
    }

    html[data-shelf-theme="botanical"] .modular-shelf-row > .wood-shelf,
    html[data-shelf-theme="botanical"] .shelf-row > .wood-shelf {
      border-top-color: rgba(255,220,171,.42) !important;
      box-shadow:
        0 -4px 10px rgba(244,166,80,.075),
        0 5px 9px rgba(10,5,2,.32),
        0 18px 28px rgba(0,0,0,.70),
        inset 0 3px rgba(255,226,184,.20),
        inset 0 -5px rgba(12,5,2,.38) !important;
    }

    html[data-shelf-theme="botanical"] .shelf-occupant-flow {
      filter: drop-shadow(5px 8px 7px rgba(0,0,0,.14));
    }

    @media (max-width: 760px) {
      html[data-shelf-theme="botanical"] .cinematic-room__daylight { width: 82% !important; opacity: .66 !important; }
      html[data-shelf-theme="botanical"] .modular-shelf-row::before,
      html[data-shelf-theme="botanical"] .shelf-row::before {
        box-shadow: 0 5px 10px rgba(255,180,89,.10), 0 14px 24px rgba(220,133,50,.05), 0 8px 14px rgba(0,0,0,.38), inset 0 2px rgba(255,229,188,.14), inset 0 -3px rgba(11,5,2,.30) !important;
      }
    }
  `}</style>;
}
