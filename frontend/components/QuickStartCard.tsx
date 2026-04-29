"use client";

import { useState } from "react";

export default function QuickStartCard() {
  const [copied, setCopied] = useState(false);
  const sample = "品番 nlwp315-2505 でメルマガ作って";

  async function copy() {
    try {
      await navigator.clipboard.writeText(sample);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div
      className="rounded-lg p-5 text-white"
      style={{
        background:
          "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))",
      }}
    >
      <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">
        quick start
      </div>
      <h2 className="text-lg font-semibold mb-2">
        メルマガ生成は Claude Code で
      </h2>
      <p className="text-sm opacity-90 mb-3 leading-relaxed">
        この画面は閲覧・実績入力用です。新しいメルマガを作るには Claude Code に
        指示してください。最もシンプルな指示は ↓
      </p>
      <div className="flex gap-2 items-stretch">
        <code className="flex-1 bg-white/15 backdrop-blur rounded px-3 py-2 text-sm font-mono">
          {sample}
        </code>
        <button
          type="button"
          onClick={copy}
          className="px-3 py-2 rounded text-sm font-medium bg-white text-stone-900 hover:bg-stone-100 transition"
        >
          {copied ? "✓ コピー" : "コピー"}
        </button>
      </div>
      <div className="mt-3 text-xs opacity-80 leading-relaxed">
        Claude が自動で：商品情報を取得 → 最適なテンプレ選定 → メルマガ生成 →
        push → ここに反映されます
      </div>
    </div>
  );
}
