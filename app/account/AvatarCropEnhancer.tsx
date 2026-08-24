"use client";

import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

const OUTPUT_SIZE = 720;
const INPUT_SELECTOR = 'input[type="file"][accept*="image"]';
type Point = { x: number; y: number };

export default function AvatarCropEnhancer() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [busy, setBusy] = useState(false);
  const targetInput = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const dragStart = useRef<Point | null>(null);
  const offsetStart = useRef<Point>({ x: 0, y: 0 });
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    function intercept(event: Event) {
      const input = event.target as HTMLInputElement | null;
      if (!input?.matches?.(INPUT_SELECTOR) || input.dataset.cropReady === "true") return;
      const file = input.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      event.stopImmediatePropagation(); event.preventDefault();
      targetInput.current = input; setSourceFile(file); setZoom(1); setOffset({ x: 0, y: 0 });
      const url = URL.createObjectURL(file);
      setSourceUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
    }
    document.addEventListener("change", intercept, true);
    return () => document.removeEventListener("change", intercept, true);
  }, []);

  function close() { if (sourceUrl) URL.revokeObjectURL(sourceUrl); setSourceUrl(""); setSourceFile(null); pointers.current.clear(); pinchStart.current=null; dragStart.current=null; if(targetInput.current) targetInput.current.value=""; }
  function fittedScale(nextZoom=zoom){ return Math.max(OUTPUT_SIZE/imageSize.width,OUTPUT_SIZE/imageSize.height)*nextZoom; }
  function clampOffset(next:Point,nextZoom=zoom){ const base=fittedScale(nextZoom); const maxX=Math.max(0,(imageSize.width*base-OUTPUT_SIZE)/2); const maxY=Math.max(0,(imageSize.height*base-OUTPUT_SIZE)/2); return{x:Math.max(-maxX,Math.min(maxX,next.x)),y:Math.max(-maxY,Math.min(maxY,next.y))}; }
  function pointerDown(e:ReactPointerEvent<HTMLDivElement>){ e.currentTarget.setPointerCapture(e.pointerId); pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(pointers.current.size===1){dragStart.current={x:e.clientX,y:e.clientY};offsetStart.current=offset;}else if(pointers.current.size===2){const[a,b]=[...pointers.current.values()];pinchStart.current={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};}}
  function pointerMove(e:ReactPointerEvent<HTMLDivElement>){ if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2&&pinchStart.current){const[a,b]=[...pointers.current.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const z=Math.max(1,Math.min(4,pinchStart.current.zoom*d/Math.max(1,pinchStart.current.distance)));setZoom(z);setOffset(c=>clampOffset(c,z));return;}if(pointers.current.size===1&&dragStart.current)setOffset(clampOffset({x:offsetStart.current.x+e.clientX-dragStart.current.x,y:offsetStart.current.y+e.clientY-dragStart.current.y}));}
  function pointerUp(e:ReactPointerEvent<HTMLDivElement>){pointers.current.delete(e.pointerId);if(pointers.current.size<2)pinchStart.current=null;if(pointers.current.size===1){dragStart.current=[...pointers.current.values()][0];offsetStart.current=offset;}else if(!pointers.current.size)dragStart.current=null;}

  async function usePhoto(){if(!imageRef.current||!sourceFile||!targetInput.current)return;setBusy(true);try{const image=imageRef.current;const canvas=document.createElement("canvas");canvas.width=OUTPUT_SIZE;canvas.height=OUTPUT_SIZE;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas unavailable");const scale=fittedScale();const w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,OUTPUT_SIZE/2-w/2+offset.x,OUTPUT_SIZE/2-h/2+offset.y,w,h);const blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,"image/jpeg",.9));if(!blob)throw new Error("Could not crop photo");const transfer=new DataTransfer();transfer.items.add(new File([blob],`avatar-${Date.now()}.jpg`,{type:"image/jpeg"}));const input=targetInput.current;input.files=transfer.files;input.dataset.cropReady="true";input.dispatchEvent(new Event("change",{bubbles:true}));delete input.dataset.cropReady;if(sourceUrl)URL.revokeObjectURL(sourceUrl);setSourceUrl("");setSourceFile(null);}finally{setBusy(false);}}

  if(!sourceUrl)return null;
  const scale=fittedScale(),previewScale=280/OUTPUT_SIZE,previewW=imageSize.width*scale*previewScale,previewH=imageSize.height*scale*previewScale;
  return <div className="avatar-crop-backdrop" role="dialog" aria-modal="true" aria-label="Crop profile photo"><div className="avatar-crop-card"><div className="avatar-crop-heading"><div><small>PROFILE PHOTO</small><h2>Crop your photo</h2></div><button type="button" onClick={close} aria-label="Cancel crop">×</button></div><p>Drag to reposition. Pinch or use the slider to zoom. The circle is exactly what will show on your profile.</p><div className="avatar-crop-stage" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}><div className="avatar-crop-circle"><img ref={imageRef} src={sourceUrl} alt="Crop preview" draggable={false} onLoad={e=>setImageSize({width:e.currentTarget.naturalWidth,height:e.currentTarget.naturalHeight})} style={{width:previewW,height:previewH,transform:`translate(calc(-50% + ${offset.x*previewScale}px), calc(-50% + ${offset.y*previewScale}px))`}}/></div></div><label className="avatar-crop-zoom"><span>−</span><input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e:ChangeEvent<HTMLInputElement>)=>{const z=Number(e.target.value);setZoom(z);setOffset(c=>clampOffset(c,z));}} aria-label="Zoom photo"/><span>＋</span></label><div className="avatar-crop-actions"><button type="button" className="avatar-crop-cancel" onClick={close}>Cancel</button><button type="button" className="avatar-crop-use" onClick={()=>void usePhoto()} disabled={busy}>{busy?"Preparing…":"Use photo"}</button></div></div><style jsx global>{`
.avatar-crop-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:18px;background:rgba(24,17,12,.72);backdrop-filter:blur(8px)}.avatar-crop-card{width:min(430px,100%);padding:20px;border:1px solid rgba(70,43,27,.16);border-radius:22px;background:#f7efe3;color:#2c2119;box-shadow:0 24px 70px rgba(20,12,8,.38)}.avatar-crop-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.avatar-crop-heading small{font:700 10px/1 Arial,sans-serif;letter-spacing:.17em;color:#9a4b3f}.avatar-crop-heading h2{margin:4px 0 0;font-size:28px}.avatar-crop-heading>button{border:0;background:transparent;font-size:32px;line-height:.8;cursor:pointer;padding:4px 2px}.avatar-crop-card>p{margin:10px 0 18px;color:#74665b;font-size:14px;line-height:1.4}.avatar-crop-stage{display:grid;place-items:center;height:300px;border-radius:18px;background:#1d1713;overflow:hidden;touch-action:none;user-select:none;cursor:grab}.avatar-crop-stage:active{cursor:grabbing}.avatar-crop-circle{position:relative;width:280px;height:280px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px rgba(255,255,255,.95),0 0 0 100px rgba(0,0,0,.42)}.avatar-crop-circle img{position:absolute;left:50%;top:50%;max-width:none;max-height:none;object-fit:fill;pointer-events:none}.avatar-crop-zoom{display:grid;grid-template-columns:24px 1fr 24px;align-items:center;gap:8px;margin:18px 4px 14px}.avatar-crop-zoom span{text-align:center;font:700 18px/1 Arial,sans-serif}.avatar-crop-zoom input{width:100%;accent-color:#6b4934}.avatar-crop-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:10px}.avatar-crop-actions button{min-height:46px;border-radius:999px;font-weight:700;cursor:pointer}.avatar-crop-cancel{border:1px solid rgba(68,42,27,.2);background:transparent}.avatar-crop-use{border:0;background:#2c2119;color:#fffaf0}.avatar-crop-use:disabled{opacity:.55}@media(max-width:480px){.avatar-crop-backdrop{align-items:end;padding:0}.avatar-crop-card{border-radius:24px 24px 0 0;padding:20px 18px max(20px,env(safe-area-inset-bottom))}.avatar-crop-stage{height:min(330px,43vh)}.avatar-crop-circle{width:min(280px,76vw);height:min(280px,76vw)}}`}</style></div>;
}
