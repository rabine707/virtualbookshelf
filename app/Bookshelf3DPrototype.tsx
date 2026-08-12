"use client";

import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loadSharedSpineCatalog, titleAuthorKey } from "./shared-spines";

const DB_NAME = "shelf-of-fame-art";
const STORE_NAME = "generated-spines";
const DB_VERSION = 1;
const MODE_KEY_PREFIX = "mode:";
const COVER_DATA_VERSION = "multi-cover-v9-romanceio";

type SpineRenderMode = "integrated" | "overlay";

type CoverResult = {
  url: string;
  source: string;
};

export type PrototypeBook = {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  color: string;
  preferredCover?: CoverResult;
};

type PrototypeArt = {
  coverUrl?: string;
  spineUrl?: string;
  renderMode: SpineRenderMode;
};

type PositionedBook = PrototypeBook & PrototypeArt & {
  x: number;
  width: number;
  height: number;
  depth: number;
  lean: number;
  index: number;
};

function cleanIsbn(value?: string) {
  if (!value) return undefined;
  const cleaned = value.replace(/[=\"'\s-]/g, "").trim();
  return /^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned) ? cleaned : undefined;
}

function coverRequestUrl(book: PrototypeBook) {
  const params = new URLSearchParams({
    title: book.title,
    author: book.author,
    coverVersion: COVER_DATA_VERSION,
  });
  const isbn = cleanIsbn(book.isbn) || cleanIsbn(book.id);
  if (isbn) params.set("isbn", isbn);
  return `/api/cover?${params.toString()}`;
}

function cropSpineUrl(coverUrl: string) {
  return `/api/spine?v=3&position=center&cover=${encodeURIComponent(coverUrl)}`;
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStoredValue(db: IDBDatabase, key: string) {
  return new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function localSpineForCover(coverUrl: string): Promise<{ image?: string; renderMode: SpineRenderMode }> {
  try {
    const db = await openDb();
    const [image, mode] = await Promise.all([
      readStoredValue(db, coverUrl),
      readStoredValue(db, `${MODE_KEY_PREFIX}${coverUrl}`),
    ]);
    db.close();
    return {
      image: typeof image === "string" && image ? image : undefined,
      renderMode: mode === "integrated" ? "integrated" : "overlay",
    };
  } catch {
    return { renderMode: "overlay" };
  }
}

async function findCover(book: PrototypeBook) {
  if (book.preferredCover?.url) return book.preferredCover.url;
  try {
    const response = await fetch(coverRequestUrl(book), { cache: "no-store" });
    if (!response.ok) return undefined;
    const result = await response.json() as { url?: string | null; options?: CoverResult[] };
    return result.options?.[0]?.url || result.url || undefined;
  } catch {
    return undefined;
  }
}

async function resolveArtwork(book: PrototypeBook): Promise<PrototypeArt> {
  const coverUrl = await findCover(book);
  if (!coverUrl) return { renderMode: "overlay" };

  const local = await localSpineForCover(coverUrl);
  if (local.image) {
    return { coverUrl, spineUrl: local.image, renderMode: local.renderMode };
  }

  try {
    const shared = await loadSharedSpineCatalog();
    const entry = shared.byCover.get(coverUrl)
      || shared.byIsbn.get(cleanIsbn(book.isbn) || "")
      || shared.byTitleAuthor.get(titleAuthorKey(book.title, book.author));
    if (entry?.url) return { coverUrl, spineUrl: entry.url, renderMode: entry.renderMode };
  } catch {
    // The same-origin cover crop below is the reliable visual fallback.
  }

  return { coverUrl, spineUrl: cropSpineUrl(coverUrl), renderMode: "overlay" };
}

function useImageTexture(url?: string) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }

    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (next) => {
        if (cancelled) {
          next.dispose();
          return;
        }
        loaded = next;
        next.colorSpace = THREE.SRGBColorSpace;
        next.wrapS = THREE.ClampToEdgeWrapping;
        next.wrapT = THREE.ClampToEdgeWrapping;
        next.minFilter = THREE.LinearMipmapLinearFilter;
        next.magFilter = THREE.LinearFilter;
        next.anisotropy = 6;
        next.needsUpdate = true;
        setTexture(next);
      },
      undefined,
      () => {
        if (!cancelled) setTexture(null);
      },
    );

    return () => {
      cancelled = true;
      if (loaded) loaded.dispose();
    };
  }, [url]);

  return texture;
}

function useWoodTexture() {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#5b321d");
    gradient.addColorStop(0.45, "#3d2114");
    gradient.addColorStop(1, "#27150d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 95; i += 1) {
      const y = (i / 95) * canvas.height;
      const wobble = 10 + (i % 7) * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 48) {
        const offset = Math.sin((x * 0.015) + (i * 0.73)) * wobble;
        ctx.lineTo(x, y + offset);
      }
      ctx.strokeStyle = i % 4 === 0 ? "rgba(237,180,118,.095)" : "rgba(13,7,4,.12)";
      ctx.lineWidth = i % 4 === 0 ? 2.2 : 1.1;
      ctx.stroke();
    }

    for (let i = 0; i < 10; i += 1) {
      const x = 80 + i * 94;
      const y = 85 + ((i * 53) % 300);
      ctx.beginPath();
      ctx.ellipse(x, y, 48, 15, -0.12, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(19,10,6,.22)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.wrapS = THREE.RepeatWrapping;
    next.wrapT = THREE.RepeatWrapping;
    next.repeat.set(2.4, 1.15);
    next.anisotropy = 4;
    next.needsUpdate = true;
    return next;
  }, []);

  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startSize: number, minSize: number) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `700 ${size}px Georgia, serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

function useTypographyTexture(title: string, author: string, renderMode: SpineRenderMode) {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 2048;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(247, 240, 219, .97)";
    ctx.strokeStyle = "rgba(12, 10, 8, .62)";
    ctx.lineWidth = 8;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,.58)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;

    if (renderMode !== "integrated") {
      ctx.save();
      ctx.translate(256, 930);
      ctx.rotate(-Math.PI / 2);
      const titleText = title.length > 48 ? `${title.slice(0, 45).trim()}…` : title;
      const titleSize = fitFont(ctx, titleText, 1540, 132, 72);
      ctx.font = `700 ${titleSize}px Georgia, serif`;
      ctx.strokeText(titleText, 0, 0, 1540);
      ctx.fillText(titleText, 0, 0, 1540);
      ctx.restore();
    }

    if (author) {
      ctx.save();
      ctx.translate(256, 1740);
      ctx.rotate(-Math.PI / 2);
      const authorText = author.length > 30 ? `${author.slice(0, 27).trim()}…` : author;
      const authorSize = fitFont(ctx, authorText, 760, 70, 44);
      ctx.font = `600 ${authorSize}px Georgia, serif`;
      ctx.strokeText(authorText, 0, 0, 760);
      ctx.fillText(authorText, 0, 0, 760);
      ctx.restore();
    }

    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.minFilter = THREE.LinearMipmapLinearFilter;
    next.magFilter = THREE.LinearFilter;
    next.needsUpdate = true;
    return next;
  }, [author, renderMode, title]);

  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function Book3D({
  book,
  active,
  onSelect,
  onHover,
}: {
  book: PositionedBook;
  active: boolean;
  onSelect: (book: PrototypeBook) => void;
  onHover: (book: PrototypeBook | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const imageTexture = useImageTexture(book.spineUrl);
  const typographyTexture = useTypographyTexture(book.title, book.author, book.renderMode);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
  }, [active, hovered, invalidate]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const targetZ = active ? 0.34 : hovered ? 0.16 : 0;
    const targetY = 0.1 + (active ? 0.07 : hovered ? 0.025 : 0);
    const targetScale = active ? 1.035 : hovered ? 1.018 : 1;
    const targetTurn = active ? -0.055 : 0;

    group.position.z = THREE.MathUtils.damp(group.position.z, targetZ, 11, delta);
    group.position.y = THREE.MathUtils.damp(group.position.y, targetY, 11, delta);
    group.scale.x = THREE.MathUtils.damp(group.scale.x, targetScale, 12, delta);
    group.scale.y = THREE.MathUtils.damp(group.scale.y, targetScale, 12, delta);
    group.scale.z = THREE.MathUtils.damp(group.scale.z, targetScale, 12, delta);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetTurn, 10, delta);

    const moving = Math.abs(group.position.z - targetZ) > 0.001
      || Math.abs(group.position.y - targetY) > 0.001
      || Math.abs(group.scale.x - targetScale) > 0.001
      || Math.abs(group.rotation.y - targetTurn) > 0.001;
    if (moving) invalidate();
  });

  const handlePointer = (event: ThreeEvent<PointerEvent>, next: boolean) => {
    event.stopPropagation();
    setHovered(next);
    onHover(next ? book : null);
    document.body.style.cursor = next ? "pointer" : "";
  };

  return (
    <group
      ref={groupRef}
      position={[book.x, 0.1, 0]}
      rotation={[0, 0, book.lean]}
      onPointerOver={(event) => handlePointer(event, true)}
      onPointerOut={(event) => handlePointer(event, false)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(book);
      }}
    >
      <RoundedBox
        args={[book.width, book.height, book.depth]}
        radius={Math.min(0.032, book.width * 0.12)}
        smoothness={5}
        position={[0, book.height / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={book.color || "#5f5146"}
          roughness={0.7}
          metalness={0.01}
        />
      </RoundedBox>

      <mesh position={[book.width / 2 + 0.004, book.height * 0.5, -0.015]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[book.depth * 0.78, book.height * 0.86]} />
        <meshStandardMaterial color="#d9cfb9" roughness={0.96} />
      </mesh>

      <mesh position={[0.012, book.height + 0.004, -0.015]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[book.width * 0.82, book.depth * 0.78]} />
        <meshStandardMaterial color="#e3dac7" roughness={0.98} />
      </mesh>

      <RoundedBox
        args={[book.width * 0.945, book.height * 0.972, 0.036]}
        radius={Math.min(0.017, book.width * 0.07)}
        smoothness={4}
        position={[0, book.height / 2, book.depth / 2 + 0.008]}
        castShadow
        renderOrder={2}
      >
        <meshStandardMaterial
          map={imageTexture || undefined}
          color={imageTexture ? "#ffffff" : book.color || "#6c5948"}
          roughness={0.53}
          metalness={0.008}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </RoundedBox>

      <mesh position={[0, book.height * 0.055, book.depth / 2 + 0.031]} renderOrder={3}>
        <planeGeometry args={[book.width * 0.78, 0.018]} />
        <meshBasicMaterial color="#efe4c9" transparent opacity={0.32} toneMapped={false} />
      </mesh>
      <mesh position={[0, book.height * 0.945, book.depth / 2 + 0.031]} renderOrder={3}>
        <planeGeometry args={[book.width * 0.78, 0.018]} />
        <meshBasicMaterial color="#efe4c9" transparent opacity={0.24} toneMapped={false} />
      </mesh>

      {typographyTexture ? (
        <mesh position={[0, book.height / 2, book.depth / 2 + 0.034]} renderOrder={4}>
          <planeGeometry args={[book.width * 0.89, book.height * 0.946]} />
          <meshBasicMaterial
            map={typographyTexture}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function BrassBookend({ x, mirrored = false }: { x: number; mirrored?: boolean }) {
  return (
    <group position={[x, 0.13, 0.02]} rotation={[0, mirrored ? Math.PI : 0, 0]}>
      <RoundedBox args={[0.08, 0.78, 0.62]} radius={0.018} smoothness={4} position={[0, 0.39, 0]} castShadow>
        <meshStandardMaterial color="#8b7041" roughness={0.36} metalness={0.55} />
      </RoundedBox>
      <RoundedBox args={[0.34, 0.065, 0.72]} radius={0.015} smoothness={4} position={[0.13, 0.018, 0]} castShadow>
        <meshStandardMaterial color="#6f582f" roughness={0.42} metalness={0.48} />
      </RoundedBox>
    </group>
  );
}

function ShelfScene({
  books,
  activeId,
  onSelect,
  onHover,
}: {
  books: PositionedBook[];
  activeId: string | null;
  onSelect: (book: PrototypeBook) => void;
  onHover: (book: PrototypeBook | null) => void;
}) {
  const woodTexture = useWoodTexture();

  return (
    <>
      <color attach="background" args={["#0b100d"]} />
      <fog attach="fog" args={["#0b100d", 5.8, 9]} />

      <ambientLight intensity={0.24} />
      <hemisphereLight args={["#d7dfc8", "#1a0f0a", 0.44]} />
      <spotLight
        position={[-3.8, 4.9, 4.2]}
        intensity={3.2}
        color="#fff1d0"
        angle={0.66}
        penumbra={0.72}
        distance={11}
        decay={1.65}
        castShadow
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-bias={-0.00012}
      />
      <pointLight position={[2.45, 1.25, 1.7]} intensity={1.0} color="#d58a43" distance={4.5} decay={2} />
      <pointLight position={[-2.25, 0.5, 1.2]} intensity={0.34} color="#9fb98b" distance={3.6} decay={2} />

      <group position={[0, -0.9, 0]}>
        <mesh position={[0, 1.02, -0.69]} receiveShadow>
          <boxGeometry args={[5.2, 2.12, 0.13]} />
          <meshStandardMaterial color="#172419" roughness={0.94} metalness={0} />
        </mesh>

        <mesh position={[0, 1.07, -0.615]} receiveShadow>
          <planeGeometry args={[4.98, 1.88]} />
          <meshStandardMaterial color="#213224" roughness={0.9} metalness={0} />
        </mesh>

        <RoundedBox args={[5.36, 0.18, 1.27]} radius={0.035} smoothness={5} position={[0, 0.03, 0]} receiveShadow castShadow>
          <meshStandardMaterial map={woodTexture || undefined} color={woodTexture ? "#ffffff" : "#4a2817"} roughness={0.48} metalness={0.01} />
        </RoundedBox>
        <RoundedBox args={[5.52, 0.17, 1.36]} radius={0.035} smoothness={5} position={[0, -0.085, 0.018]} receiveShadow castShadow>
          <meshStandardMaterial map={woodTexture || undefined} color={woodTexture ? "#d7b18e" : "#2e170d"} roughness={0.56} metalness={0.008} />
        </RoundedBox>

        <RoundedBox args={[0.19, 2.2, 1.29]} radius={0.025} smoothness={5} position={[-2.67, 1.03, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={woodTexture || undefined} color={woodTexture ? "#dfb798" : "#3d2114"} roughness={0.51} />
        </RoundedBox>
        <RoundedBox args={[0.19, 2.2, 1.29]} radius={0.025} smoothness={5} position={[2.67, 1.03, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={woodTexture || undefined} color={woodTexture ? "#dfb798" : "#3d2114"} roughness={0.51} />
        </RoundedBox>
        <RoundedBox args={[5.52, 0.19, 1.31]} radius={0.03} smoothness={5} position={[0, 2.1, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={woodTexture || undefined} color={woodTexture ? "#d7ac89" : "#3b1e11"} roughness={0.5} />
        </RoundedBox>

        <RoundedBox args={[4.86, 0.045, 0.04]} radius={0.012} smoothness={3} position={[0, 1.97, -0.585]}>
          <meshStandardMaterial color="#8d7144" roughness={0.38} metalness={0.45} />
        </RoundedBox>

        <BrassBookend x={-2.22} />
        <BrassBookend x={2.22} mirrored />

        {books.map((book) => (
          <Book3D
            key={book.id}
            book={book}
            active={activeId === book.id}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}

        <ContactShadows
          position={[0, 0.135, 0.19]}
          opacity={0.56}
          scale={[5.15, 1.15]}
          blur={1.8}
          far={0.82}
          resolution={512}
        />
      </group>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={0.48}
        zoomSpeed={0.7}
        minDistance={4.05}
        maxDistance={5.8}
        minPolarAngle={Math.PI * 0.38}
        maxPolarAngle={Math.PI * 0.59}
        minAzimuthAngle={-0.34}
        maxAzimuthAngle={0.34}
        target={[0, 0.15, 0]}
      />
    </>
  );
}

export default function Bookshelf3DPrototype({
  books,
  onSelect,
  onClose,
}: {
  books: PrototypeBook[];
  onSelect: (book: PrototypeBook) => void;
  onClose: () => void;
}) {
  const sample = useMemo(() => books.slice(0, 8), [books]);
  const [artwork, setArtwork] = useState<Record<string, PrototypeArt>>({});
  const [loading, setLoading] = useState(true);
  const [hoveredBook, setHoveredBook] = useState<PrototypeBook | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all(sample.map(async (book) => [book.id, await resolveArtwork(book)] as const))
      .then((resolved) => {
        if (cancelled) return;
        setArtwork(Object.fromEntries(resolved));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      document.body.style.cursor = "";
    };
  }, [sample]);

  const positioned = useMemo(() => {
    const gap = 0.026;
    const dimensions = sample.map((book, index) => ({
      book,
      width: 0.35 + ((index * 17) % 5) * 0.014,
      height: 1.5 + ((index * 13) % 5) * 0.034,
      depth: 0.68 + ((index * 11) % 4) * 0.022,
      lean: (((index % 5) - 2) * Math.PI) / 820,
    }));
    const total = dimensions.reduce((sum, item) => sum + item.width, 0) + gap * Math.max(0, dimensions.length - 1);
    let cursor = -total / 2;
    return dimensions.map((item, index) => {
      const x = cursor + item.width / 2;
      cursor += item.width + gap;
      return {
        ...item.book,
        ...artwork[item.book.id],
        renderMode: artwork[item.book.id]?.renderMode || "overlay" as SpineRenderMode,
        x,
        width: item.width,
        height: item.height,
        depth: item.depth,
        lean: item.lean,
        index,
      } satisfies PositionedBook;
    });
  }, [artwork, sample]);

  const handleSelect = (book: PrototypeBook) => {
    setActiveId(book.id);
    onSelect(book);
  };

  return (
    <section className="bookshelf-3d-prototype" aria-label="Cinematic 3D bookshelf row">
      <div className="bookshelf-3d-header">
        <div>
          <span className="bookshelf-3d-kicker">CINEMATIC SHELF V1</span>
          <strong>One shelf. Eight real books. Built like objects.</strong>
          <small>{loading ? "Loading your saved spine artwork…" : "Drag gently to look around • scroll to zoom • hover or tap a book"}</small>
        </div>
        <button type="button" className="bookshelf-3d-close" onClick={onClose}>Back to full shelf</button>
      </div>

      <div className="bookshelf-3d-canvas-wrap">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          frameloop="demand"
          camera={{ position: [0, 0.44, 4.92], fov: 32, near: 0.1, far: 20 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onPointerMissed={() => setActiveId(null)}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.04;
          }}
        >
          <Suspense fallback={null}>
            <ShelfScene
              books={positioned}
              activeId={activeId}
              onSelect={handleSelect}
              onHover={setHoveredBook}
            />
          </Suspense>
        </Canvas>

        <div className="bookshelf-3d-vignette" aria-hidden="true" />
        <div className={`bookshelf-3d-hud ${hoveredBook ? "is-visible" : ""}`} aria-live="polite">
          <span>{hoveredBook ? "ON THE SHELF" : "SHELF OF FAME"}</span>
          <strong>{hoveredBook?.title || "Move across a spine"}</strong>
          <small>{hoveredBook ? `by ${hoveredBook.author}` : "Books pull forward instead of jumping or leaning."}</small>
        </div>

        {loading ? <div className="bookshelf-3d-loading">Preparing your shelf…</div> : null}
      </div>

      <div className="bookshelf-3d-status-row" aria-label="Prototype goals">
        <span>Physical depth</span>
        <span>Real spine art</span>
        <span>Subtle motion</span>
        <span>Mobile-safe controls</span>
      </div>

      <p className="bookshelf-3d-note">
        V1 keeps the production shelf untouched while we judge the thing that matters most: whether opening Shelf of Fame feels like looking at a real, beautiful collection.
      </p>
    </section>
  );
}
