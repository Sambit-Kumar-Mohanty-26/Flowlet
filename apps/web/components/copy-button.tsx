"use client";

import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [message, setMessage] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied");
    } catch {
      setMessage("Select the text to copy it.");
    }
  }

  return (
    <div className="row-actions">
      <button type="button" className="button small" onClick={copy}>{label}</button>
      <span className="secondary" role="status">{message}</span>
    </div>
  );
}
