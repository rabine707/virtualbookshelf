"use client";

import { Canvas, ThreeEvent } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
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
        next.anisotropy = 4;
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

function Book3D({ book, onSelect }: { book: PositionedBook; onSelect: (book: PrototypeBook) => void }) {
  const [hovered, setHovered] = useState(false);
  const imageTexture = useImageTexture(book.spineUrl);
  const typographyTexture = useTypographyTexture(book.title, book.author, book.renderMode);

  const handlePointer = (event: ThreeEvent<PointerEvent>, next: boolean) => {
    event.stopPropagation();
    setHovered(next);
    document.body.style.cursor = next ? "pointer" : "";
  };

  return (
    <group
      position={[book.x, 0.1, 0]}
      rotation={[0, 0, book.lean]}
      scale={hovered ? 1.025 : 1}
      onPointerOver={(event) => handlePointer(event, true)}
      onPointerOut={(event) => handlePointer(event, false)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(book);
      }}
    >
      <RoundedBox
        args={[book.width, book.height, book.depth]}
        radius={Math.min(0.035, book.width * 0.13)}
        smoothness={5}
        position={[0, book.height / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={book.color || "#5f5146"}
          roughness={0.68}
          metalness={0.015}
        />
      </RoundedBox>

      <mesh position={[0, book.height / 2, book.depth / 2 + 0.006]} renderOrder={2}>
        <planeGeometry args={[book.width * 0.93, book.height * 0.965]} />
        <meshStandardMaterial
          map={imageTexture || undefined}
          color={imageTexture ? "#ffffff" : book.color || "#6c5948"}
          roughness={0.56}
          metalness={0.01}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      {typographyTexture ? (
        <mesh position={[0, book.height / 2, book.depth / 2 + 0.009]} renderOrder={3}>
          <planeGeometry args={[book.width * 0.91, book.height * 0.95]} />
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

function ShelfScene({ books, onSelect }: { books: PositionedBook[]; onSelect: (book: PrototypeBook) => void }) {
  return (
    <>
      <color attach="background" args={["#101713"]} />
      <fog attach="fog" args={["#101713", 5.3, 8]} />

      <ambientLight intensity={0.42} />
      <hemisphereLight args={["#d9e5c2", "#25170f", 0.5]} />
      <directionalLight
        position={[-4.2, 4.6, 3.6]}
        intensity={2.2}
        color="#fff1cf"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-2}
      />
      <pointLight position={[2.0, 1.35, 1.25]} intensity={0.85} color="#ffae62" distance={4.5} decay={2} />

      <group position={[0, -0.9, 0]}>
        <mesh position={[0, 1.0, -0.62]} receiveShadow>
          <boxGeometry args={[5.15, 2.08, 0.1]} />
          <meshStandardMaterial color="#203321" roughness={0.94} metalness={0} />
        </mesh>

        <RoundedBox args={[5.35, 0.17, 1.25]} radius={0.035} smoothness={4} position={[0, 0.03, 0]} receiveShadow castShadow>
          <meshStandardMaterial color="#4a2817" roughness={0.46} metalness={0.015} />
        </RoundedBox>
        <RoundedBox args={[5.5, 0.18, 1.34]} radius={0.035} smoothness={4} position={[0, -0.08, 0.015]} receiveShadow castShadow>
          <meshStandardMaterial color="#2e170d" roughness={0.55} metalness={0.01} />
        </RoundedBox>

        <RoundedBox args={[0.18, 2.18, 1.28]} radius={0.025} smoothness={4} position={[-2.66, 1.02, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#3d2114" roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.18, 2.18, 1.28]} radius={0.025} smoothness={4} position={[2.66, 1.02, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#3d2114" roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[5.5, 0.19, 1.3]} radius={0.03} smoothness={4} position={[0, 2.08, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#3b1e11" roughness={0.5} />
        </RoundedBox>

        {books.map((book) => <Book3D key={book.id} book={book} onSelect={onSelect} />)}

        <ContactShadows
          position={[0, 0.13, 0.16]}
          opacity={0.48}
          scale={[5.0, 1.08]}
          blur={1.7}
          far={0.75}
          resolution={512}
        />
      </group>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.075}
        minDistance={3.65}
        maxDistance={6.0}
        minPolarAngle={Math.PI * 0.34}
        maxPolarAngle={Math.PI * 0.64}
        minAzimuthAngle={-0.46}
        maxAzimuthAngle={0.46}
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
    const gap = 0.035;
    const dimensions = sample.map((book, index) => ({
      book,
      width: 0.36 + ((index * 17) % 7) * 0.018,
      height: 1.42 + ((index * 13) % 8) * 0.045,
      depth: 0.64 + ((index * 11) % 5) * 0.025,
      lean: (((index % 5) - 2) * Math.PI) / 520,
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

  return (
    <section className="bookshelf-3d-prototype" aria-label="Experimental 3D bookshelf row">
      <div className="bookshelf-3d-header">
        <div>
          <span className="bookshelf-3d-kicker">EXPERIMENTAL VIEW</span>
          <strong>One shelf. Eight real books. Actual 3D.</strong>
          <small>{loading ? "Loading your saved spine artwork…" : "Drag gently to look around • scroll to zoom • click a book"}</small>
        </div>
        <button type="button" className="bookshelf-3d-close" onClick={onClose}>Back to full shelf</button>
      </div>

      <div className="bookshelf-3d-canvas-wrap">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          frameloop="demand"
          camera={{ position: [0, 0.45, 4.75], fov: 35, near: 0.1, far: 20 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
          }}
        >
          <Suspense fallback={null}>
            <ShelfScene books={positioned} onSelect={onSelect} />
          </Suspense>
        </Canvas>
        {loading ? <div className="bookshelf-3d-loading">Preparing your shelf…</div> : null}
      </div>

      <p className="bookshelf-3d-note">
        Prototype only: the rest of your library stays in the proven 2D renderer while we judge geometry, lighting, spine readability and mobile performance.
      </p>
    </section>
  );
}
