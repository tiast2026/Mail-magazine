"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { Client, ClientMallSetting } from "@/types";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [toneDescription, setToneDescription] = useState("");
  const [mallSettings, setMallSettings] = useState<ClientMallSetting[]>([]);
  const [showAddMall, setShowAddMall] = useState(false);
  const [newMallType, setNewMallType] = useState("ec");
  const [newMallBaseUrl, setNewMallBaseUrl] = useState("");
  const [newMallImageBaseUrl, setNewMallImageBaseUrl] = useState("");
  const [newMallFooterHtml, setNewMallFooterHtml] = useState("");

  const loadClient = useCallback(async () => {
    try {
      const data = await api.getClient(id);
      setName(data.name);
      setIndustry(data.industry);
      setToneDescription(data.tone_description);
      if (data.mall_settings && Array.isArray(data.mall_settings)) {
        setMallSettings(data.mall_settings as unknown as ClientMallSetting[]);
      } else if (data.mall_settings && typeof data.mall_settings === "object") {
        const settings = Object.entries(data.mall_settings).map(
          ([key, val], idx) => ({
            id: idx,
            client_id: id,
            mall_type: key,
            base_url: (val as Record<string, string>).base_url || "",
            image_base_url:
              (val as Record<string, string>).image_base_url || "",
            html_rules: {},
            footer_html: (val as Record<string, string>).footer_html || "",
          })
        );
        setMallSettings(settings);
      }
    } catch {
      setError("クライアントの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.updateClient(id, {
        name,
        industry,
        tone_description: toneDescription,
      });
      router.push("/clients");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMall = () => {
    const newSetting: ClientMallSetting = {
      id: Date.now(),
      client_id: id,
      mall_type: newMallType,
      base_url: newMallBaseUrl,
      image_base_url: newMallImageBaseUrl,
      html_rules: {},
      footer_html: newMallFooterHtml,
    };
    setMallSettings((prev) => [...prev, newSetting]);
    setShowAddMall(false);
    setNewMallType("ec");
    setNewMallBaseUrl("");
    setNewMallImageBaseUrl("");
    setNewMallFooterHtml("");
  };

  const handleRemoveMall = (mallId: number) => {
    setMallSettings((prev) => prev.filter((m) => m.id !== mallId));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clients"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          クライアント一覧に戻る
        </Link>
        <h1 className="mt-1 text-2xl font-bold">クライアント編集</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">基本情報</h2>
        <div className="grid max-w-2xl gap-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              会社名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              業種
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              トーン説明
            </label>
            <textarea
              value={toneDescription}
              onChange={(e) => setToneDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <Link
            href="/clients"
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </Link>
        </div>
      </div>

      {/* Mall Settings */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">モール設定</h2>
          <button
            onClick={() => setShowAddMall(true)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            モール追加
          </button>
        </div>

        {mallSettings.length === 0 ? (
          <p className="text-sm text-gray-400">モール設定がありません</p>
        ) : (
          <div className="space-y-4">
            {mallSettings.map((mall) => (
              <div
                key={mall.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {mall.mall_type === "ec"
                        ? "自社EC"
                        : mall.mall_type === "rakuten"
                        ? "楽天"
                        : mall.mall_type}
                    </span>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {mall.base_url && (
                        <p>
                          <span className="font-medium">Base URL:</span>{" "}
                          {mall.base_url}
                        </p>
                      )}
                      {mall.image_base_url && (
                        <p>
                          <span className="font-medium">Image Base URL:</span>{" "}
                          {mall.image_base_url}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMall(mall.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Mall Dialog (inline) */}
        {showAddMall && (
          <div className="mt-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 p-4">
            <h3 className="mb-3 text-sm font-semibold">新しいモール設定</h3>
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  モールタイプ
                </label>
                <select
                  value={newMallType}
                  onChange={(e) => setNewMallType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="ec">自社EC</option>
                  <option value="rakuten">楽天</option>
                  <option value="yahoo">Yahoo!</option>
                  <option value="amazon">Amazon</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Base URL
                </label>
                <input
                  type="url"
                  value={newMallBaseUrl}
                  onChange={(e) => setNewMallBaseUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Image Base URL
                </label>
                <input
                  type="url"
                  value={newMallImageBaseUrl}
                  onChange={(e) => setNewMallImageBaseUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Footer HTML
                </label>
                <textarea
                  value={newMallFooterHtml}
                  onChange={(e) => setNewMallFooterHtml(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddMall(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddMall}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
