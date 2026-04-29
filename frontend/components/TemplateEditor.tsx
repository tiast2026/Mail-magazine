"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Template } from "@/lib/types";

type Props = {
  brandId: string;
  template: Template;
};

export default function TemplateEditor({ brandId, template }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [useCases, setUseCases] = useState(
    (template.useCases ?? []).join(", "),
  );
  const [productSlots, setProductSlots] = useState(template.productSlots);
  const [bestFor, setBestFor] = useState(
    (template.bestFor ?? []).join("\n"),
  );
  const [notRecommendedFor, setNotRecommendedFor] = useState(
    (template.notRecommendedFor ?? []).join("\n"),
  );
  const [exampleScenario, setExampleScenario] = useState(
    template.exampleScenario ?? "",
  );
  const [html, setHtml] = useState(template.html);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: Partial<Template> = {
        name,
        description,
        useCases: useCases
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        productSlots,
        bestFor: bestFor
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        notRecommendedFor: notRecommendedFor
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        exampleScenario: exampleScenario || undefined,
        html,
      };
      const res = await fetch(
        `/api/brands/${encodeURIComponent(brandId)}/templates/${encodeURIComponent(template.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? data.detail ?? `HTTP ${res.status}`);
      }
      alert(
        "保存しました。Vercel の再デプロイ（約30〜60秒）後に反映されます。",
      );
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        `テンプレ ${template.id}「${template.name}」を削除します。\n\n注意: このテンプレを使った過去メルマガは残りますが、テンプレ自体は復元できません。\n\n本当に削除しますか？`,
      )
    )
      return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/brands/${encodeURIComponent(brandId)}/templates/${encodeURIComponent(template.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? data.detail ?? `HTTP ${res.status}`);
      }
      alert(
        "削除しました。Vercel の再デプロイ（約30〜60秒）後に一覧から消えます。",
      );
      router.push("/templates/");
    } catch (e) {
      setError(String(e));
      setDeleting(false);
    }
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm rounded px-4 py-2 text-white"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          編集
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="text-sm rounded px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          {deleting ? "削除中..." : "削除"}
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">テンプレ {template.id} 編集</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-500 hover:text-stone-900"
        >
          閉じる
        </button>
      </div>

      <div className="space-y-3">
        <Field label="名前">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm border border-stone-300 rounded px-3 py-2"
          />
        </Field>

        <Field label="説明">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm border border-stone-300 rounded px-3 py-2"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ユースケース（カンマ区切り）">
            <input
              type="text"
              value={useCases}
              onChange={(e) => setUseCases(e.target.value)}
              placeholder="例: 新作予約, 限定商品"
              className="w-full text-sm border border-stone-300 rounded px-3 py-2"
            />
          </Field>
          <Field label="商品数">
            <input
              type="text"
              value={productSlots}
              onChange={(e) => setProductSlots(e.target.value)}
              placeholder="例: 1〜2 / 3"
              className="w-full text-sm border border-stone-300 rounded px-3 py-2"
            />
          </Field>
        </div>

        <Field label="bestFor（こんな時に使う、改行区切り）">
          <textarea
            value={bestFor}
            onChange={(e) => setBestFor(e.target.value)}
            rows={4}
            className="w-full text-sm border border-stone-300 rounded px-3 py-2 font-mono"
          />
        </Field>

        <Field label="notRecommendedFor（不向きシーン、改行区切り）">
          <textarea
            value={notRecommendedFor}
            onChange={(e) => setNotRecommendedFor(e.target.value)}
            rows={3}
            className="w-full text-sm border border-stone-300 rounded px-3 py-2 font-mono"
          />
        </Field>

        <Field label="exampleScenario（例）">
          <input
            type="text"
            value={exampleScenario}
            onChange={(e) => setExampleScenario(e.target.value)}
            className="w-full text-sm border border-stone-300 rounded px-3 py-2"
          />
        </Field>

        <Field label="HTML本体（{{COLOR_*}}や{{PRODUCT_*}}等の変数を含む）">
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={20}
            className="w-full text-xs border border-stone-300 rounded px-3 py-2 font-mono"
            spellCheck={false}
          />
          <p className="text-[10px] text-stone-500 mt-1">
            ⚠️ HTML を編集する際は、変数（{`{{COLOR_PRIMARY}}`} 等）を消さないように注意。
            ブランド統一性のため、カラーコードを直書きせず変数を使用してください。
          </p>
        </Field>
      </div>

      {error && (
        <div className="border border-rose-200 bg-rose-50 rounded p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-sm rounded px-4 py-2 text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          {saving ? "保存中..." : "保存（GitHub に commit）"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm rounded px-4 py-2 border border-stone-300 text-stone-600 hover:bg-stone-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-stone-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}
