"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CampaignEventType, MailOutput } from "@/lib/types";
import { EVENT_LABELS, EVENT_ORDER } from "@/lib/events";

type Props = {
  brandId: string;
  output: MailOutput;
};

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  // YYYY-MM-DDTHH:mm
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toDateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function OutputEditor({ brandId, output }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(output.title);
  const [tags, setTags] = useState((output.tags ?? []).join(", "));
  const [eventType, setEventType] = useState<CampaignEventType>(
    output.event?.type ?? "regular",
  );
  const [eventName, setEventName] = useState(output.event?.name ?? "");
  const [eventStart, setEventStart] = useState(
    toDateInput(output.event?.startDate),
  );
  const [eventEnd, setEventEnd] = useState(toDateInput(output.event?.endDate));
  const [scheduledAt, setScheduledAt] = useState(
    toLocalInput(output.scheduledAt),
  );
  const [sentAt, setSentAt] = useState(toLocalInput(output.sentAt));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: Partial<MailOutput> = {
        title,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        event: {
          type: eventType,
          name: eventName || undefined,
          startDate: eventStart
            ? new Date(eventStart).toISOString()
            : undefined,
          endDate: eventEnd ? new Date(eventEnd).toISOString() : undefined,
        },
        scheduledAt: fromLocalInput(scheduledAt),
        sentAt: fromLocalInput(sentAt),
      };
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
        throw new Error(data.error ?? data.detail ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      // データ反映には Vercel 再デプロイが必要なので、リロードしても効果は約30秒後
      alert(
        "保存しました。Vercel の再デプロイ（約30〜60秒）後に Web に反映されます。",
      );
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
        `「${output.title}」を削除します。元に戻せません。よろしいですか？`,
      )
    )
      return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/brands/${encodeURIComponent(brandId)}/outputs/${encodeURIComponent(output.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? data.detail ?? `HTTP ${res.status}`);
      }
      alert(
        "削除しました。Vercel の再デプロイ（約30〜60秒）後に一覧から消えます。",
      );
      router.push("/outputs/");
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
        <h3 className="font-semibold">編集</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-500 hover:text-stone-900"
        >
          閉じる
        </button>
      </div>

      <div className="space-y-3">
        <Field label="タイトル">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm border border-stone-300 rounded px-3 py-2"
          />
        </Field>

        <Field label="タグ（カンマ区切り）">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="例: 春新作, クーポン, 5月マラソン"
            className="w-full text-sm border border-stone-300 rounded px-3 py-2"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="イベント種別">
            <select
              value={eventType}
              onChange={(e) =>
                setEventType(e.target.value as CampaignEventType)
              }
              className="w-full text-sm border border-stone-300 rounded px-3 py-2"
            >
              {EVENT_ORDER.map((t) => (
                <option key={t} value={t}>
                  {EVENT_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="イベント表示名">
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="例: 2026年5月お買い物マラソン"
              className="w-full text-sm border border-stone-300 rounded px-3 py-2"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="イベント開始日">
            <input
              type="date"
              value={eventStart}
              onChange={(e) => setEventStart(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded px-3 py-2"
            />
          </Field>
          <Field label="イベント終了日">
            <input
              type="date"
              value={eventEnd}
              onChange={(e) => setEventEnd(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded px-3 py-2"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="配信予定日時">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded px-3 py-2"
            />
          </Field>
          <Field label="実配信日時">
            <input
              type="datetime-local"
              value={sentAt}
              onChange={(e) => setSentAt(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded px-3 py-2"
            />
          </Field>
        </div>
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

      <p className="text-xs text-stone-500">
        ※ 保存すると GitHub の outputs.json が直接更新され、Vercel
        が再ビルド（約30〜60秒）後に反映されます。
      </p>
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
