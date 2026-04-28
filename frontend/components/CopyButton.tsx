"use client";

import { useState } from "react";

export default function CopyButton({
  text,
  label = "コピー",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-sm rounded px-4 py-2 transition ${
        copied
          ? "bg-emerald-600 text-white"
          : "bg-stone-800 text-white hover:bg-stone-700"
      }`}
    >
      {copied ? "コピーしました" : label}
    </button>
  );
}
