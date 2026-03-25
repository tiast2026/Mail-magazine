"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import type { Client, Product } from "@/types";

export default function ProductsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .getClients()
      .then((data) => {
        setClients(data);
        if (data.length > 0) setSelectedClientId(String(data[0].id));
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const loadProducts = useCallback(async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const data = await api.getProducts({
        client_id: Number(selectedClientId),
        search: search || undefined,
        category: categoryFilter || undefined,
      });
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, search, categoryFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("この商品を削除しますか？")) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("削除に失敗しました");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const rows = lines.slice(0, 6).map((line) => line.split(","));
      setImportPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile || !selectedClientId) return;
    setImporting(true);
    try {
      await api.importCsv(importFile, Number(selectedClientId));
      setShowImportDialog(false);
      setImportFile(null);
      setImportPreview([]);
      loadProducts();
    } catch {
      alert("インポートに失敗しました");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">商品マスタ</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportDialog(true)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            CSVインポート
          </button>
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            楽天API同期
          </button>
          <Link
            href="/products/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            手動追加
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="" disabled>
            クライアントを選択
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="商品名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Product Table */}
      <div className="rounded-lg bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">画像</th>
                  <th className="px-6 py-3 font-medium">商品名</th>
                  <th className="px-6 py-3 font-medium">価格</th>
                  <th className="px-6 py-3 font-medium">カテゴリ</th>
                  <th className="px-6 py-3 font-medium">自社EC</th>
                  <th className="px-6 py-3 font-medium">楽天</th>
                  <th className="px-6 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      商品がありません
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-6 py-3">
                        {p.image_urls?.[0] ? (
                          <img
                            src={p.image_urls[0]}
                            alt={p.product_name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                            No img
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 font-medium">
                        {p.product_name}
                      </td>
                      <td className="px-6 py-3">{formatPrice(p.price)}</td>
                      <td className="px-6 py-3 text-gray-500">{p.category}</td>
                      <td className="px-6 py-3">
                        {p.mall_urls?.ec ? (
                          <span className="text-green-600">&#10003;</span>
                        ) : (
                          <span className="text-orange-500">&#9888;</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {p.mall_urls?.rakuten ? (
                          <span className="text-green-600">&#10003;</span>
                        ) : (
                          <span className="text-orange-500">&#9888;</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/products/${p.id}`}
                            className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                          >
                            編集
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">CSVインポート</h2>
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportFile(null);
                  setImportPreview([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                &#10005;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
                >
                  {importFile
                    ? importFile.name
                    : "CSVファイルを選択してください"}
                </button>
              </div>

              {importPreview.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    プレビュー（最初の5行）
                  </p>
                  <div className="overflow-x-auto rounded border border-gray-200">
                    <table className="w-full text-xs">
                      <tbody>
                        {importPreview.map((row, i) => (
                          <tr
                            key={i}
                            className={
                              i === 0
                                ? "bg-gray-100 font-medium"
                                : "border-t border-gray-100"
                            }
                          >
                            {row.map((cell, j) => (
                              <td key={j} className="px-2 py-1.5">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowImportDialog(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? "インポート中..." : "インポート"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
