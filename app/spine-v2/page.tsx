import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type SpineRecipe = {
  key: string;
  title: string;
  author: string;
  color: string;
  foil: string;
  ornament: "moon-botanical" | "snake-rose" | "mountain";
};

const LIGHTS_OUT: SpineRecipe = {
  key: "lights-out",
  title: "LIGHTS OUT",
  author: "NAVESSA ALLEN",
  color: "#24201f",
  foil: "#d7b56d",
  ornament: "moon-botanical",
};

const SHELLS: SpineRecipe[] = [
  { ...LIGHTS_OUT, key: "charcoal", title: "", author: "", color: "#24201f" },
  { ...LIGHTS_OUT, key: "burgundy", title: "", author: "", color: "#5d1f2a" },
  { ...LIGHTS_OUT, key: "forest", title: "", author: "", color: "#244032" },
  { ...LIGHTS_OUT, key: "navy", title: "", author: "", color: "#24354e" },
  { ...LIGHTS_OUT, key: "plum", title: "", author: "", color: "#4a3153" },
  { ...LIGHTS_OUT, key: "umber", title: "", author: "", color: "#563725" },
];

function MoonBotanical() {
  return (
    <svg viewBox="0 0 100 142" aria-hidden="true" className="spineV2OrnamentSvg">
      <path d="M65 14c-21 4-32 25-25 43 7 19 29 27 46 16-11 2-24-5-28-17-5-15 1-31 7-42Z" fill="currentColor" opacity=".96" />
      <path d="M48 75v43M48 92c-11-8-20-10-29-10M48 101c10-8 19-11 28-11M39 86c-2 5-5 9-10 12M59 94c2 5 6 9 11 12M48 118l-10 11M48 118l11 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17 81c4-4 8-4 12 0-5 0-8 3-9 7M78 88c-4-4-8-4-12 0 5 0 8 3 9 7M30 97c4-3 8-3 11 1-5 0-7 3-8 7M64 102c-4-3-8-3-11 1 5 0 7 3 8 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="27" cy="31" r="1.7" fill="currentColor" />
      <circle cx="75" cy="37" r="1.2" fill="currentColor" />
      <path d="M22 47h8M26 43v8M76 57h7M79.5 53.5v7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function Ornament({ kind }: { kind: SpineRecipe["ornament"] }) {
  if (kind === "moon-botanical") return <MoonBotanical />;
  return <MoonBotanical />;
}

function BookSpineV2({ recipe, bare = false }: { recipe: SpineRecipe; bare?: boolean }) {
  const noiseId = `cloth-noise-${recipe.key}`;
  const style = {
    "--spine-color": recipe.color,
    "--foil-color": recipe.foil,
  } as CSSProperties;

  return (
    <article className="spineV2" style={style} aria-label={bare ? "Blank cloth spine shell" : `${recipe.title} by ${recipe.author}`}>
      <div className="spineV2Base" />

      <svg className="spineV2FiberNoise" viewBox="0 0 88 352" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id={noiseId} x="-20%" y="-5%" width="140%" height="110%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.78 0.135" numOctaves="3" seed="17" result="noise" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="1.85 0 0 0 -.46  0 1.85 0 0 -.46  0 0 1.85 0 -.46  0 0 0 1 0"
              result="contrastNoise"
            />
            <feComponentTransfer in="contrastNoise">
              <feFuncR type="gamma" amplitude="1" exponent="1.35" offset="0" />
              <feFuncG type="gamma" amplitude="1" exponent="1.35" offset="0" />
              <feFuncB type="gamma" amplitude="1" exponent="1.35" offset="0" />
            </feComponentTransfer>
          </filter>
        </defs>
        <rect width="88" height="352" fill="#8b8b8b" filter={`url(#${noiseId})`} />
      </svg>

      <div className="spineV2Weave" aria-hidden="true" />
      <div className="spineV2Curvature" aria-hidden="true" />
      <div className="spineV2Hotspot" aria-hidden="true" />
      <div className="spineV2Wear" aria-hidden="true" />

      {!bare ? (
        <div className="spineV2Content">
          <div className="spineV2Ornament spineV2Foil"><Ornament kind={recipe.ornament} /></div>
          <h2 className="spineV2Title spineV2Foil">
            <span>LIGHTS</span>
            <span>OUT</span>
          </h2>
          <div className="spineV2Rule spineV2Foil" aria-hidden="true"><span>✦</span></div>
          <p className="spineV2Author spineV2Foil">{recipe.author}</p>
          <div className="spineV2Tail spineV2Foil" aria-hidden="true">⌁</div>
        </div>
      ) : null}
    </article>
  );
}

function LabPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="labPanel">
      <div className="labPanelLabel">{title}</div>
      {children}
    </section>
  );
}

export default function SpineV2PrototypePage() {
  return (
    <main className="spineV2Page">
      <style>{STYLES}</style>

      <header className="spineV2Header">
        <div>
          <p className="spineV2Eyebrow">SHELF OF FAME LAB · SPINES V2</p>
          <h1>Physical Cloth Spine Prototype</h1>
          <p className="spineV2Lead">
            No cover crop. No AI lettering. The book is assembled from a dynamic base color, procedural cloth grain,
            curvature lighting, edge wear, vector ornament, and real browser typography.
          </p>
        </div>
        <Link href="/" className="spineV2Back">← Shelf of Fame</Link>
      </header>

      <div className="spineV2Grid">
        <LabPanel title="FULL-SIZE MATERIAL TEST">
          <div className="heroStage">
            <BookSpineV2 recipe={LIGHTS_OUT} />
          </div>
        </LabPanel>

        <LabPanel title="ACTUAL SHELF-SIZE TEST">
          <div className="actualStage">
            <div className="actualScale"><BookSpineV2 recipe={LIGHTS_OUT} /></div>
            <div className="actualShelfLip" />
          </div>
          <p className="labNote">Rendered at 88×352, displayed at 44×176. Typography and ornaments remain vector/browser-rendered.</p>
        </LabPanel>
      </div>

      <LabPanel title="THE SAME PHYSICAL SHELL, RECOLORED">
        <div className="shellRow">
          {SHELLS.map((recipe) => (
            <div className="shellScale" key={recipe.key}><BookSpineV2 recipe={recipe} bare /></div>
          ))}
        </div>
      </LabPanel>

      <section className="layerReadout" aria-label="Spine V2 rendering layers">
        <span>BASE COLOR</span>
        <i>→</i>
        <span>PROCEDURAL CLOTH</span>
        <i>→</i>
        <span>CURVATURE</span>
        <i>→</i>
        <span>HOTSPOT</span>
        <i>→</i>
        <span>EDGE WEAR</span>
        <i>→</i>
        <span>SVG ORNAMENT</span>
        <i>→</i>
        <span>HTML FOIL TYPE</span>
      </section>
    </main>
  );
}

const STYLES = String.raw`
.spineV2Page {
  min-height: 100vh;
  padding: 42px clamp(18px, 4vw, 64px) 72px;
  color: #eadfca;
  background:
    radial-gradient(circle at 22% -10%, rgba(167, 124, 66, .12), transparent 34%),
    linear-gradient(180deg, #17130f 0%, #0f0d0b 48%, #090807 100%);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.spineV2Header {
  width: min(1060px, 100%);
  margin: 0 auto 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 28px;
}

.spineV2Eyebrow,
.labPanelLabel {
  margin: 0 0 9px;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: .2em;
  color: #bfa579;
}

.spineV2Header h1 {
  margin: 0;
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  font-weight: 500;
  font-size: clamp(32px, 5vw, 54px);
  letter-spacing: -.025em;
  color: #f3ead8;
}

.spineV2Lead {
  max-width: 740px;
  margin: 14px 0 0;
  color: #bcb09f;
  line-height: 1.65;
}

.spineV2Back {
  flex: none;
  color: #dfcda9;
  text-decoration: none;
  border: 1px solid rgba(223, 205, 169, .24);
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
  background: rgba(255,255,255,.025);
}

.spineV2Grid {
  width: min(1060px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, .9fr);
  gap: 18px;
}

.labPanel {
  width: min(1060px, 100%);
  margin: 18px auto 0;
  padding: 18px;
  border: 1px solid rgba(222, 195, 151, .13);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,.028), rgba(255,255,255,.012));
  box-shadow: inset 0 1px rgba(255,255,255,.025);
}

.spineV2Grid > .labPanel { margin-top: 0; }

.heroStage,
.actualStage {
  position: relative;
  min-height: 438px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 13px;
  background:
    radial-gradient(circle at 35% 24%, rgba(195, 143, 79, .12), transparent 32%),
    linear-gradient(145deg, #1a1511, #0a0908 66%);
  box-shadow: inset 0 0 70px rgba(0,0,0,.5);
}

.actualStage {
  min-height: 438px;
  align-content: center;
}

.actualScale {
  width: 44px;
  height: 176px;
  transform: translateY(27px);
}

.actualScale > .spineV2 {
  transform: scale(.5);
  transform-origin: left top;
}

.actualShelfLip {
  position: absolute;
  left: 14%;
  right: 14%;
  top: calc(50% + 116px);
  height: 18px;
  border-radius: 3px;
  background: linear-gradient(#745038, #3b271c 37%, #211710 100%);
  box-shadow: 0 13px 26px rgba(0,0,0,.55), inset 0 1px rgba(255,255,255,.12);
}

.labNote {
  margin: 13px 4px 1px;
  color: #958a7c;
  font-size: 12px;
  line-height: 1.5;
}

.spineV2 {
  --spine-color: #24201f;
  --foil-color: #d7b56d;
  position: relative;
  width: 88px;
  height: 352px;
  isolation: isolate;
  overflow: hidden;
  border-radius: 9px 6px 6px 9px / 8px 7px 7px 8px;
  background: var(--spine-color);
  box-shadow:
    -1px 0 0 rgba(0,0,0,.8),
    1px 0 0 rgba(255,244,218,.07),
    3px 8px 12px rgba(0,0,0,.46),
    12px 14px 27px rgba(0,0,0,.30);
}

.spineV2Base {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse at 38% 12%, rgba(255,255,255,.055), transparent 35%),
    linear-gradient(180deg, rgba(255,255,255,.018), rgba(0,0,0,.045)),
    var(--spine-color);
}

.spineV2FiberNoise {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  opacity: .34;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.spineV2Weave {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: .38;
  mix-blend-mode: overlay;
  background:
    repeating-linear-gradient(88deg, rgba(255,255,255,.22) 0 .42px, rgba(0,0,0,.24) .42px .9px, transparent .9px 1.75px),
    repeating-linear-gradient(2deg, rgba(255,255,255,.13) 0 .34px, rgba(0,0,0,.20) .34px .8px, transparent .8px 2.2px);
  background-size: 4px 100%, 100% 5px;
  filter: contrast(1.3);
  pointer-events: none;
}

.spineV2Curvature {
  position: absolute;
  inset: 0;
  z-index: 3;
  mix-blend-mode: multiply;
  background: linear-gradient(90deg,
    rgba(0,0,0,.74) 0%,
    rgba(0,0,0,.58) 2.2%,
    rgba(0,0,0,.18) 7%,
    rgba(0,0,0,.025) 16%,
    transparent 30%,
    transparent 70%,
    rgba(0,0,0,.08) 82%,
    rgba(0,0,0,.38) 94%,
    rgba(0,0,0,.76) 100%);
  pointer-events: none;
}

.spineV2Hotspot {
  position: absolute;
  inset: 0;
  z-index: 4;
  mix-blend-mode: soft-light;
  background:
    linear-gradient(90deg,
      transparent 0%,
      rgba(255,255,255,.05) 8%,
      rgba(255,255,255,.34) 13%,
      rgba(255,255,255,.10) 19%,
      transparent 31%,
      transparent 100%),
    radial-gradient(ellipse at 34% 28%, rgba(255,236,202,.16), transparent 42%);
  pointer-events: none;
}

.spineV2Wear {
  position: absolute;
  inset: 0;
  z-index: 5;
  border-radius: inherit;
  box-shadow:
    inset 0 2px 1px rgba(239,211,171,.17),
    inset 0 -2px 1px rgba(226,194,151,.13),
    inset 2px 0 1px rgba(235,204,163,.08),
    inset -2px 0 2px rgba(0,0,0,.42),
    inset 0 0 0 1px rgba(221,191,151,.06);
  background:
    linear-gradient(180deg, rgba(221,190,146,.08), transparent 3.2%, transparent 96.6%, rgba(217,184,139,.09)),
    linear-gradient(90deg, rgba(221,190,146,.07), transparent 3%, transparent 97%, rgba(0,0,0,.18));
  pointer-events: none;
}

.spineV2Wear::before,
.spineV2Wear::after {
  content: "";
  position: absolute;
  left: 5px;
  right: 5px;
  height: 3px;
  opacity: .42;
  background: repeating-linear-gradient(90deg, rgba(222,190,146,.42) 0 2px, rgba(0,0,0,.14) 2px 4px, transparent 4px 7px);
  filter: blur(.15px);
}

.spineV2Wear::before { top: 1px; }
.spineV2Wear::after { bottom: 1px; opacity: .31; }

.spineV2Content {
  position: absolute;
  inset: 12px 8px 13px;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  pointer-events: none;
}

.spineV2Foil {
  color: var(--foil-color);
  filter:
    drop-shadow(-.45px -.65px 0 rgba(20, 10, 3, .74))
    drop-shadow(.5px .65px .45px rgba(255, 244, 198, .19));
}

.spineV2Ornament {
  width: 60px;
  height: 109px;
  margin-top: 4px;
  opacity: .97;
}

.spineV2OrnamentSvg { width: 100%; height: 100%; overflow: visible; }

.spineV2Title {
  margin: 7px 0 0;
  display: grid;
  gap: 0;
  font-family: "Iowan Old Style", Baskerville, "Baskerville Old Face", "Palatino Linotype", Georgia, serif;
  font-weight: 600;
  font-size: 19px;
  line-height: .96;
  letter-spacing: -.035em;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
}

.spineV2Title span:last-child { font-size: 21px; }

.spineV2Rule {
  width: 42px;
  height: 20px;
  margin: 7px 0 0;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 7px;
}

.spineV2Rule::before,
.spineV2Rule::after {
  content: "";
  height: 1px;
  flex: 1;
  background: currentColor;
  opacity: .72;
}

.spineV2Author {
  margin: auto 0 0;
  max-width: 64px;
  font-family: "Iowan Old Style", Baskerville, Georgia, serif;
  font-size: 9.1px;
  line-height: 1.08;
  letter-spacing: .085em;
  text-wrap: balance;
}

.spineV2Tail {
  margin-top: 7px;
  font-size: 13px;
  line-height: 1;
  opacity: .77;
}

.shellRow {
  min-height: 210px;
  padding: 22px 12px 4px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: clamp(7px, 2vw, 18px);
  overflow-x: auto;
  border-radius: 12px;
  background: linear-gradient(180deg, #17120e, #0d0a08);
}

.shellScale {
  flex: 0 0 44px;
  width: 44px;
  height: 176px;
}

.shellScale > .spineV2 {
  transform: scale(.5);
  transform-origin: left top;
}

.layerReadout {
  width: min(1060px, 100%);
  margin: 18px auto 0;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: #887b6a;
  font-size: 10px;
  letter-spacing: .12em;
}

.layerReadout span {
  padding: 7px 9px;
  border-radius: 999px;
  border: 1px solid rgba(207, 176, 129, .12);
  background: rgba(255,255,255,.018);
}

.layerReadout i { color: #645747; font-style: normal; }

@media (max-width: 760px) {
  .spineV2Page { padding-top: 24px; }
  .spineV2Header { display: block; }
  .spineV2Back { display: inline-block; margin-top: 18px; }
  .spineV2Grid { grid-template-columns: 1fr; }
  .heroStage, .actualStage { min-height: 400px; }
  .shellRow { justify-content: flex-start; }
}
`;
