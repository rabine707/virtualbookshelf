"use client";

type GoodreadsImportUndoToastProps = {
  message: string;
  coverCount: number;
  onFindCovers: () => void;
  onUndo: () => void;
  onDismiss: () => void;
};

export default function GoodreadsImportUndoToast({ message, coverCount, onFindCovers, onUndo, onDismiss }: GoodreadsImportUndoToastProps) {
  if (!message) return null;

  return (
    <div
      role="region"
      aria-label="Goodreads import completed"
      style={{
        position: "fixed",
        zIndex: 1000,
        left: 14,
        right: 14,
        bottom: "calc(88px + env(safe-area-inset-bottom))",
        width: "min(520px, calc(100% - 28px))",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 10,
        margin: "0 auto",
        padding: "12px 12px 12px 14px",
        border: "1px solid rgba(242,234,220,.15)",
        borderRadius: 15,
        background: "rgba(38, 27, 20, .97)",
        color: "#fff1da",
        boxShadow: "0 14px 38px rgba(0,0,0,.4)",
        font: "600 12px/1.4 Arial, sans-serif",
      }}
    >
      <span role="status" aria-live="polite">{message}</span>
      <button
        type="button"
        aria-label="Dismiss import actions"
        onClick={onDismiss}
        style={{
          width: 36,
          height: 36,
          padding: 0,
          border: 0,
          borderRadius: "50%",
          background: "rgba(255,255,255,.06)",
          color: "inherit",
          fontSize: 19,
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ×
      </button>
      <div
        style={{
          gridColumn: "1 / -1",
          display: "grid",
          gridTemplateColumns: coverCount ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
          gap: 8,
        }}
      >
        {coverCount ? (
          <button
            type="button"
            onClick={onFindCovers}
            style={{
              minHeight: 42,
              padding: "8px 12px",
              border: "1px solid rgba(242,223,197,.24)",
              borderRadius: 11,
              background: "#704d36",
              color: "#fff1da",
              font: "800 11px/1.2 Arial, sans-serif",
              cursor: "pointer",
            }}
          >
            Find {coverCount} {coverCount === 1 ? "cover" : "covers"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onUndo}
          style={{
            minHeight: 42,
            padding: "8px 12px",
            border: "1px solid rgba(255,255,255,.11)",
            borderRadius: 11,
            background: "rgba(255,255,255,.055)",
            color: "inherit",
            font: "800 11px/1.2 Arial, sans-serif",
            cursor: "pointer",
          }}
        >
          Undo import
        </button>
      </div>
    </div>
  );
}
