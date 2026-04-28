"use client";

import { useEffect, useState } from "react";
import type { OutputResults } from "@/lib/types";

const STORAGE_PREFIX = "noahl-mail-results:";

export default function ResultsForm({
  outputId,
  initial,
}: {
  outputId: string;
  initial: OutputResults;
}) {
  const [results, setResults] = useState<OutputResults>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_PREFIX + outputId);
    if (stored) {
      try {
        setResults({ ...initial, ...JSON.parse(stored) });
      } catch {}
    }
  }, [outputId, initial]);

  function update<K extends keyof OutputResults>(
    key: K,
    value: OutputResults[K],
  ) {
    setResults((r) => ({ ...r, [key]: value }));
  }

  function saveLocal() {
    localStorage.setItem(STORAGE_PREFIX + outputId, JSON.stringify(results));
    setSavedAt(new Date().toLocaleTimeString("ja-JP"));
  }

  function clearLocal() {
    localStorage.removeItem(STORAGE_PREFIX + outputId);
    setResults(initial);
    setSavedAt(null);
  }

  const json = JSON.stringify(
    { id: outputId, results: cleanResults(results) },
    null,
    2,
  );

  return (
    <div className="border border-stone-200 rounded bg-white p-5 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field
          label="配信数"
          value={results.sentCount}
          onChange={(v) => update("sentCount", v)}
          unit="通"
        />
        <Field
          label="開封率"
          value={results.openRate}
          onChange={(v) => update("openRate", v)}
          unit="%"
          step="0.1"
        />
        <Field
          label="クリック率"
          value={results.clickRate}
          onChange={(v) => update("clickRate", v)}
          unit="%"
          step="0.1"
        />
        <Field
          label="売上件数"
          value={results.salesCount}
          onChange={(v) => update("salesCount", v)}
          unit="件"
        />
        <Field
          label="売上金額"
          value={results.salesAmount}
          onChange={(v) => update("salesAmount", v)}
          unit="円"
        />
      </div>
      <div>
        <label className="text-xs text-stone-600 block mb-1">メモ</label>
        <textarea
          rows={2}
          value={results.notes ?? ""}
          onChange={(e) => update("notes", e.target.value)}
          className="w-full text-sm border border-stone-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
          placeholder="配信時の所感や改善点など"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={saveLocal}
          className="text-sm bg-stone-800 text-white rounded px-4 py-2 hover:bg-stone-700"
        >
          ブラウザに保存
        </button>
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          className="text-sm bg-white border border-stone-300 rounded px-4 py-2 hover:bg-stone-50"
        >
          {showJson ? "JSONを隠す" : "JSON出力（永続化用）"}
        </button>
        <button
          type="button"
          onClick={clearLocal}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          ブラウザの保存値をクリア
        </button>
        {savedAt && (
          <span className="text-xs text-emerald-700">
            保存しました ({savedAt})
          </span>
        )}
      </div>

      {showJson && (
        <div className="space-y-2">
          <p className="text-xs text-stone-600">
            このJSONを Claude Code に貼って「これで実績を更新して」と言うと、
            <code className="bg-stone-100 rounded px-1 py-0.5">outputs.json</code>{" "}
            に反映されてリポジトリに永続化されます（次回ビルド時に Web にも表示）。
          </p>
          <pre className="bg-stone-900 text-stone-100 text-xs rounded p-3 overflow-auto">
            {json}
          </pre>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  unit,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  unit: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-xs text-stone-600 block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step ?? "1"}
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          className="w-full text-sm border border-stone-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <span className="text-xs text-stone-500">{unit}</span>
      </div>
    </div>
  );
}

function cleanResults(r: OutputResults): OutputResults {
  const out: OutputResults = {};
  (Object.keys(r) as (keyof OutputResults)[]).forEach((k) => {
    const v = r[k];
    if (v !== undefined && v !== "" && !(typeof v === "number" && isNaN(v))) {
      // @ts-expect-error narrowing handled above
      out[k] = v;
    }
  });
  return out;
}
