"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border px-4 py-2 text-sm"
    >
      Print
    </button>
  );
}