"use client";

import { useEffect, useState } from "react";
import type { BrandSummary } from "@/lib/types";

type ApiTestResult =
  | { state: "idle" }
  | { state: "loading" }
  | {
      state: "ok";
      manageNumber: string;
      name: string | null;
      mainImage: string | null;
    }
  | {
      state: "error";
      status: number | null;
      message: string;
      expectedVars?: string[];
    };

export default function SettingsForm({
  brands,
  defaultBrandId,
}: {
  brands: BrandSummary[];
  defaultBrandId: string;
}) {
  const [brandId, setBrandId] = useState(defaultBrandId);
  const [manageNumber, setManageNumber] = useState("");
  const [result, setResult] = useState<ApiTestResult>({ state: "idle" });

  useEffect(() => {
    setResult({ state: "idle" });
  }, [brandId]);

  async function testFetch() {
    if (!manageNumber.trim()) return;
    setResult({ state: "loading" });
    try {
      const res = await fetch(
        `/api/rakuten/${encodeURIComponent(brandId)}/${encodeURIComponent(manageNumber.trim())}/`,
      );
      const data = await res.json();
      if (!res.ok) {
        setResult({
          state: "error",
          status: res.status,
          message: data.error ?? "不明なエラー",
          expectedVars: data.expectedVars,
        });
        return;
      }
      setResult({
        state: "ok",
        manageNumber: data.manageNumber,
        name: data.name,
        mainImage: data.mainImage,
      });
    } catch (e) {
      setResult({ state: "error", status: null, message: String(e) });
    }
  }

  const envPrefix = `RAKUTEN_${brandId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;

  return (
    <div className="space-y-6">
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">楽天 RMS 認証情報の設定方法</h2>
        <p className="text-sm text-stone-600">
          各ブランドの認証情報は <b>Vercel の環境変数</b>{" "}
          に設定します。チームメンバー全員が共通で使え、
          ブラウザに認証情報を保存する必要はありません。
        </p>

        <div className="bg-stone-50 border border-stone-200 rounded p-3 text-xs text-stone-700 space-y-2">
          <div className="font-semibold">ブランドごとの環境変数命名規則:</div>
          <code className="block bg-white border rounded px-2 py-1.5">
            RAKUTEN_<b>{"<ブランドID大文字>"}</b>_SERVICE_SECRET
            <br />
            RAKUTEN_<b>{"<ブランドID大文字>"}</b>_LICENSE_KEY
            <br />
            RAKUTEN_<b>{"<ブランドID大文字>"}</b>_SHOP_URL
          </code>

          <div className="mt-3 pt-3 border-t border-stone-200">
            <div className="font-semibold mb-1">
              現在登録されているブランド:
            </div>
            <ul className="space-y-1">
              {brands.map((b) => {
                const p = `RAKUTEN_${b.id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
                return (
                  <li key={b.id} className="text-xs">
                    <span className="font-medium">{b.name}</span>:{" "}
                    <code className="bg-white border rounded px-1">
                      {p}_SERVICE_SECRET
                    </code>{" "}
                    <code className="bg-white border rounded px-1">
                      {p}_LICENSE_KEY
                    </code>{" "}
                    <code className="bg-white border rounded px-1">
                      {p}_SHOP_URL
                    </code>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-3 pt-3 border-t border-stone-200">
            <div className="font-semibold mb-1">設定手順:</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Vercel ダッシュボード → mail-magazine プロジェクト → Settings
                → Environment Variables
              </li>
              <li>上記3つの環境変数をブランドごとに追加</li>
              <li>
                Production / Preview / Development 全てにチェック → Save
              </li>
              <li>Deployments で Redeploy（環境変数を反映）</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">商品取得テスト</h2>
        <p className="text-xs text-stone-600">
          ブランドと品番を指定すると、API 経由で楽天 RMS から商品情報を取得します。
        </p>

        <div className="space-y-2">
          <div>
            <label className="text-xs text-stone-600 block mb-1">
              ブランド
            </label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}（{b.id}）
                </option>
              ))}
            </select>
            <div className="text-[10px] text-stone-500 mt-1">
              使用する環境変数: <code>{envPrefix}_*</code>
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1">品番</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manageNumber}
                onChange={(e) => setManageNumber(e.target.value)}
                placeholder="例: nlwp315-2505"
                className="flex-1 text-sm border border-stone-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
              />
              <button
                type="button"
                onClick={testFetch}
                disabled={!manageNumber.trim() || result.state === "loading"}
                className="text-sm rounded px-4 py-2 text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                {result.state === "loading" ? "取得中..." : "取得"}
              </button>
            </div>
          </div>
        </div>

        {result.state === "ok" && (
          <div className="border border-emerald-200 bg-emerald-50 rounded p-3 text-sm">
            <div className="text-xs text-emerald-700 mb-2">✓ 取得成功</div>
            <div className="flex gap-3 items-start">
              {result.mainImage && (
                <img
                  src={result.mainImage}
                  alt={result.name ?? ""}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div className="text-sm">
                <div className="text-xs text-stone-500">
                  {result.manageNumber}
                </div>
                <div className="font-medium mt-0.5">{result.name}</div>
              </div>
            </div>
          </div>
        )}

        {result.state === "error" && (
          <div className="border border-rose-200 bg-rose-50 rounded p-3 text-sm text-rose-800">
            <div className="text-xs font-semibold mb-1">
              エラー {result.status ? `(${result.status})` : ""}
            </div>
            <div className="text-xs">{result.message}</div>
            {result.expectedVars && (
              <div className="mt-2 text-xs">
                必要な環境変数:
                <ul className="list-disc list-inside mt-1">
                  {result.expectedVars.map((v) => (
                    <li key={v}>
                      <code className="bg-white border rounded px-1">{v}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card p-5 text-xs text-stone-600">
        <h3 className="font-semibold text-stone-800 mb-2 text-sm">
          Claude Code 経由での生成
        </h3>
        <p>
          Claude Code に「品番〇〇 でメルマガ作って」と指示するだけで、
          内部で API 経由で商品情報を取得し、現在編集中のブランドのテンプレに流し込みます。
        </p>
      </section>
    </div>
  );
}
