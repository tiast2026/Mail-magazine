"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Template } from "@/types";

function slotTypeBadge(type: string) {
  switch (type) {
    case "ai":
      return { label: "AI生成", className: "bg-purple-100 text-purple-700" };
    case "fixed":
      return { label: "固定", className: "bg-gray-100 text-gray-700" };
    case "product_loop":
      return { label: "商品ループ", className: "bg-blue-100 text-blue-700" };
    default:
      return { label: type, className: "bg-gray-100 text-gray-600" };
  }
}

export default function TemplateDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHtml, setShowHtml] = useState(false);

  const loadTemplate = useCallback(async () => {
    try {
      const data = await api.getTemplate(id);
      setTemplate(data);
    } catch {
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-gray-500">テンプレートが見つかりません</p>
        <Link
          href="/templates"
          className="text-sm text-blue-600 hover:underline"
        >
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/templates"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          テンプレート一覧に戻る
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{template.name}</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Preview */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHtml(false)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                !showHtml
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              プレビュー
            </button>
            <button
              onClick={() => setShowHtml(true)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                showHtml
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              HTMLソース
            </button>
          </div>

          <div className="rounded-lg bg-white shadow-sm">
            {showHtml ? (
              <pre className="max-h-[600px] overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-green-400">
                <code>{template.base_html || "HTMLがありません"}</code>
              </pre>
            ) : (
              <iframe
                srcDoc={template.base_html || "<p>HTMLがありません</p>"}
                className="h-[600px] w-full rounded-lg border-0"
                title="Template Preview"
              />
            )}
          </div>
        </div>

        {/* Slots */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">スロット一覧</h2>
          {!template.slots || template.slots.length === 0 ? (
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-400">スロットがありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {template.slots
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((slot) => {
                  const badge = slotTypeBadge(slot.slot_type);
                  return (
                    <div
                      key={slot.id}
                      className="rounded-lg bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{slot.slot_key}</p>
                          {slot.default_prompt && (
                            <p className="mt-1 text-xs text-gray-500">
                              {slot.default_prompt}
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
