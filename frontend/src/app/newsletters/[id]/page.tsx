"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { GeneratedNewsletter } from "@/types";

type TabType = "ec" | "rakuten";
type ViewMode = "preview" | "source";

export default function NewsletterDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [newsletter, setNewsletter] = useState<GeneratedNewsletter | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("ec");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [regenerateInput, setRegenerateInput] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadNewsletter = useCallback(async () => {
    try {
      const data = await api.getNewsletter(id);
      setNewsletter(data);
    } catch {
      setNewsletter(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadNewsletter();
  }, [loadNewsletter]);

  const currentHtml =
    activeTab === "ec" ? newsletter?.html_ec : newsletter?.html_rakuten;

  const handleRegenerate = async (slotKey: string, instruction: string) => {
    if (!newsletter) return;
    setRegenerating(true);
    try {
      const res = await api.regenerateSlot(newsletter.id, slotKey, instruction);
      setNewsletter((prev) =>
        prev
          ? { ...prev, html_ec: res.html_ec, html_rakuten: res.html_rakuten }
          : prev
      );
    } catch {
      // silent fail
    } finally {
      setRegenerating(false);
    }
  };

  const handleQuickAction = (instruction: string) => {
    handleRegenerate("__all__", instruction);
  };

  const handleFreeRegenerate = () => {
    if (!regenerateInput.trim()) return;
    handleRegenerate("__all__", regenerateInput);
    setRegenerateInput("");
  };

  const handleCopyHtml = () => {
    if (currentHtml) {
      navigator.clipboard.writeText(currentHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadHtml = () => {
    if (!currentHtml || !newsletter) return;
    const suffix = activeTab === "ec" ? "ec" : "rakuten";
    const blob = new Blob([currentHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter_${newsletter.id}_${suffix}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-gray-500">メルマガが見つかりません</p>
        <Link
          href="/newsletters"
          className="text-sm text-blue-600 hover:underline"
        >
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/newsletters"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            メルマガ一覧に戻る
          </Link>
          <h1 className="mt-1 text-xl font-bold">{newsletter.subject}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyHtml}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {copied ? "コピーしました" : "HTMLをコピー"}
          </button>
          <button
            onClick={handleDownloadHtml}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            ダウンロード
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Tab switching */}
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setActiveTab("ec")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "ec"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                自社EC版
              </button>
              <button
                onClick={() => setActiveTab("rakuten")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "rakuten"
                    ? "bg-red-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                楽天版
              </button>
            </div>
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setViewMode("preview")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "preview"
                    ? "bg-gray-800 text-white"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                プレビュー
              </button>
              <button
                onClick={() => setViewMode("source")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  viewMode === "source"
                    ? "bg-gray-800 text-white"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                HTMLソース
              </button>
            </div>
          </div>

          {/* Preview / Source */}
          <div className="rounded-lg bg-white shadow-sm">
            {viewMode === "preview" ? (
              <iframe
                srcDoc={currentHtml || "<p>HTMLがありません</p>"}
                className="h-[600px] w-full rounded-lg border-0"
                title="Newsletter Preview"
              />
            ) : (
              <pre className="max-h-[600px] overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-green-400">
                <code>{currentHtml || "HTMLがありません"}</code>
              </pre>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 shrink-0 space-y-4">
          {regenerating && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              再生成中...
            </div>
          )}

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">クイックアクション</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleQuickAction("もっとカジュアルなトーンにしてください")}
                disabled={regenerating}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                もっとカジュアルに
              </button>
              <button
                onClick={() => handleQuickAction("CTAボタンをもっと目立たせてください")}
                disabled={regenerating}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                CTAを目立たせて
              </button>
              <button
                onClick={() => handleQuickAction("導入文だけを書き直してください")}
                disabled={regenerating}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                導入文だけ再生成
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">自由入力で再生成</h3>
            <textarea
              placeholder="修正指示を入力..."
              value={regenerateInput}
              onChange={(e) => setRegenerateInput(e.target.value)}
              rows={3}
              className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleFreeRegenerate}
              disabled={regenerating || !regenerateInput.trim()}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              再生成
            </button>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">スロット別再生成</h3>
            {newsletter.generation_params?.slots ? (
              <div className="space-y-2">
                {Object.keys(newsletter.generation_params.slots).map((key) => (
                  <button
                    key={key}
                    onClick={() => handleRegenerate(key, "このスロットを再生成してください")}
                    disabled={regenerating}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {key}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">スロット情報がありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
