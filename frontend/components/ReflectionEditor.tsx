"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MailOutput, OutputResults } from "@/lib/types";
import { setOutputOverride } from "@/lib/optimistic";

type Props = {
  brandId: string;
  output: MailOutput;
};

const RATING_LABELS: Record<number, string> = {
  1: "イマイチ",
  2: "今後は工夫したい",
  3: "ふつう",
  4: "良かった",
  5: "今後の参考にしたい",
};

export default function ReflectionEditor({ brandId, output }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(output.results?.notes ?? "");
  const [rating, setRating] = useState<number | undefined>(
    output.results?.rating,
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const nextResults: OutputResults = {
        ...(output.results ?? {}),
        notes: notes || undefined,
        rating: rating ?? undefined,
      };
      const body: Partial<MailOutput> = { results: nextResults };
      const res = await fetch(
        `/api/brands/${encodeURIComponent(brandId)}/outputs/${encodeURIComponent(output.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = [data.error, data.detail].filter(Boolean).join(": ");
        throw new Error(msg || `HTTP ${res.status}`);
      }
      setOutputOverride(output.id, body);
      setSavedAt(new Date().toLocaleTimeString("ja-JP"));
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-stone-200 rounded bg-white p-5 space-y-4">
      <div>
        <label className="text-xs text-stone-600 block mb-2">評価</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? undefined : n)}
              className={`text-2xl transition-opacity ${
                rating != null && n <= rating ? "opacity-100" : "opacity-25 hover:opacity-60"
              }`}
              title={RATING_LABELS[n]}
            >
              ★
            </button>
          ))}
          {rating != null && (
            <span className="text-xs text-stone-600 self-center ml-2">
              {RATING_LABELS[rating]}
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs text-stone-600 block mb-1">
          振り返りメモ
        </label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full text-sm border border-stone-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
          placeholder="例: 件名のクーポン訴求が効いた / 配信時間を21時に変えたら開封率が伸びた / 母の日訴求は来年も使いたい"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-sm bg-stone-800 text-white rounded px-4 py-2 hover:bg-stone-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {savedAt && (
          <span className="text-xs text-emerald-700">
            保存しました ({savedAt})
          </span>
        )}
        {error && <span className="text-xs text-rose-700">{error}</span>}
      </div>
    </div>
  );
}
