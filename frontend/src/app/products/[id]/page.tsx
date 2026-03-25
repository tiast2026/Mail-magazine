"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { Product } from "@/types";

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [ecUrl, setEcUrl] = useState("");
  const [rakutenUrl, setRakutenUrl] = useState("");
  const [clientId, setClientId] = useState<number>(0);

  const loadProduct = useCallback(async () => {
    if (isNew) return;
    try {
      const data = await api.getProduct(Number(id));
      setProductName(data.product_name);
      setDescription(data.description);
      setPrice(String(data.price));
      setCategory(data.category);
      setImageUrls(data.image_urls?.join("\n") || "");
      setEcUrl(data.mall_urls?.ec || "");
      setRakutenUrl(data.mall_urls?.rakuten || "");
      setClientId(data.client_id);
    } catch {
      setError("商品の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const data: Partial<Product> = {
        product_name: productName,
        description,
        price: Number(price),
        category,
        image_urls: imageUrls
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean),
        mall_urls: {
          ...(ecUrl ? { ec: ecUrl } : {}),
          ...(rakutenUrl ? { rakuten: rakutenUrl } : {}),
        },
      };

      if (isNew) {
        if (!clientId) {
          setError("クライアントIDが必要です");
          setSaving(false);
          return;
        }
        data.client_id = clientId;
        await api.createProduct(data);
      } else {
        await api.updateProduct(Number(id), data);
      }
      router.push("/products");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/products"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            商品マスタに戻る
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {isNew ? "商品を追加" : "商品を編集"}
          </h1>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="grid max-w-2xl gap-6">
          {isNew && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                クライアントID
              </label>
              <input
                type="number"
                value={clientId || ""}
                onChange={(e) => setClientId(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              商品名
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                価格
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                カテゴリ
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              画像URL（1行に1URL）
            </label>
            <textarea
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
              rows={3}
              placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                自社EC URL
              </label>
              <input
                type="url"
                value={ecUrl}
                onChange={(e) => setEcUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                楽天 URL
              </label>
              <input
                type="url"
                value={rakutenUrl}
                onChange={(e) => setRakutenUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !productName}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <Link
            href="/products"
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </Link>
        </div>
      </div>
    </div>
  );
}
