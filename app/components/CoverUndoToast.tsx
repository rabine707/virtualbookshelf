"use client";

type CoverUndoToastProps = {
  kind: "wrong" | "edition";
  onUndo: () => void;
  onDismiss: () => void;
};

export function CoverUndoToast({ kind, onUndo, onDismiss }: CoverUndoToastProps) {
  return (
    <div
      className="cover-undo-toast"
      role="status"
      style={{
        position: "fixed",
        right: 28,
        bottom: 92,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 12,
        maxWidth: 390,
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(24, 27, 22, .96)",
        color: "#f2eadc",
        boxShadow: "0 14px 40px rgba(0,0,0,.34)",
        border: "1px solid rgba(242,234,220,.14)",
        fontSize: 13,
        lineHeight: 1.25,
      }}
    >
      <span style={{ flex: 1 }}>
        {kind === "edition" ? "Edition rejected." : "Cover rejected."} Accident?
      </span>
      <button
        type="button"
        onClick={onUndo}
        style={{
          border: 0,
          borderRadius: 999,
          padding: "7px 12px",
          cursor: "pointer",
          fontWeight: 700,
          background: "#f2eadc",
          color: "#1b1d18",
        }}
      >
        Undo
      </button>
      <button
        type="button"
        aria-label="Dismiss undo"
        onClick={onDismiss}
        style={{
          border: 0,
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: 2,
        }}
      >
        ×
      </button>
    </div>
  );
}
