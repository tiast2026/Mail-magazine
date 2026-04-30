"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BrandButtons,
  BrandColors,
  BrandConfig,
  BrandSummary,
  ButtonStyle,
} from "@/lib/types";

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

type SaveState =
  | { state: "idle" }
  | { state: "saving" }
  | { state: "ok" }
  | { state: "error"; message: string };

const COLOR_FIELDS: Array<{
  key: keyof BrandColors;
  label: string;
  description: string;
}> = [
  { key: "primary", label: "プライマリ", description: "ロゴ・帯・主 CTA 背景" },
  { key: "accent", label: "アクセント", description: "強調・クーポン背景" },
  { key: "muted", label: "ミュート", description: "補助・薄い印字" },
  { key: "text", label: "本文", description: "メイン本文の文字色" },
  { key: "subtext", label: "サブテキスト", description: "補足・小さい注釈" },
  { key: "panel", label: "パネル", description: "帯・カード背景の薄色" },
  { key: "border", label: "ボーダー", description: "区切り線・枠線" },
];

const BUTTON_TYPES: Array<{
  key: keyof BrandButtons;
  label: string;
  description: string;
}> = [
  {
    key: "coupon",
    label: "クーポン",
    description: "クーポン取得など最も強い CTA",
  },
  {
    key: "product",
    label: "商品",
    description: "商品ページへの主 CTA",
  },
  {
    key: "secondary",
    label: "セカンダリ",
    description: "新作一覧・もっと見る等の補助 CTA",
  },
];

/** ブランド config に buttons が無い旧データ用のフォールバック */
function defaultButtons(colors: BrandColors): BrandButtons {
  return {
    coupon: {
      bg: colors.accent,
      fg: colors.white,
      width: "80%",
      size: "3",
      padding: "16px 24px",
      border: null,
    },
    product: {
      bg: colors.primary,
      fg: colors.white,
      width: "80%",
      size: "3",
      padding: "14px 20px",
      border: null,
    },
    secondary: {
      bg: colors.panel,
      fg: colors.primary,
      width: "80%",
      size: "2",
      padding: "14px 20px",
      border: colors.border,
    },
  };
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default function SettingsForm({
  brands,
  defaultBrandId,
  brandConfigs,
}: {
  brands: BrandSummary[];
  defaultBrandId: string;
  brandConfigs: Record<string, BrandConfig>;
}) {
  const [brandId, setBrandId] = useState(defaultBrandId);
  const [manageNumber, setManageNumber] = useState("");
  const [result, setResult] = useState<ApiTestResult>({ state: "idle" });

  const initialConfig = brandConfigs[brandId];
  const [colors, setColors] = useState<BrandColors>(initialConfig.colors);
  const [buttons, setButtons] = useState<BrandButtons>(
    initialConfig.buttons ?? defaultButtons(initialConfig.colors),
  );
  const [saveColorState, setSaveColorState] = useState<SaveState>({
    state: "idle",
  });
  const [saveButtonState, setSaveButtonState] = useState<SaveState>({
    state: "idle",
  });

  // ブランド切替時にフォーム初期化
  useEffect(() => {
    const c = brandConfigs[brandId];
    if (!c) return;
    setColors(c.colors);
    setButtons(c.buttons ?? defaultButtons(c.colors));
    setSaveColorState({ state: "idle" });
    setSaveButtonState({ state: "idle" });
    setResult({ state: "idle" });
  }, [brandId, brandConfigs]);

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

  async function saveColors() {
    setSaveColorState({ state: "saving" });
    try {
      const res = await fetch(
        `/api/brands/${encodeURIComponent(brandId)}/config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ colors }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setSaveColorState({
          state: "error",
          message: data.error ?? "保存に失敗しました",
        });
        return;
      }
      setSaveColorState({ state: "ok" });
    } catch (e) {
      setSaveColorState({ state: "error", message: String(e) });
    }
  }

  async function saveButtons() {
    setSaveButtonState({ state: "saving" });
    // 既知の type のみ送る（API バリデーションは未知キーを拒否する）
    const cleanButtons: BrandButtons = {
      coupon: buttons.coupon,
      product: buttons.product,
      secondary: buttons.secondary,
    };
    try {
      const res = await fetch(
        `/api/brands/${encodeURIComponent(brandId)}/config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buttons: cleanButtons }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setSaveButtonState({
          state: "error",
          message: data.error ?? "保存に失敗しました",
        });
        return;
      }
      setSaveButtonState({ state: "ok" });
    } catch (e) {
      setSaveButtonState({ state: "error", message: String(e) });
    }
  }

  const colorsDirty = useMemo(() => {
    if (!initialConfig) return false;
    return COLOR_FIELDS.some(
      (f) => colors[f.key] !== initialConfig.colors[f.key],
    );
  }, [colors, initialConfig]);

  const buttonsDirty = useMemo(() => {
    const initial =
      initialConfig?.buttons ?? defaultButtons(initialConfig.colors);
    return BUTTON_TYPES.some((bt) => {
      const a = buttons[bt.key];
      const b = initial[bt.key];
      if (!a || !b) return !!a !== !!b;
      return (
        a.bg !== b.bg ||
        a.fg !== b.fg ||
        (a.border ?? null) !== (b.border ?? null)
      );
    });
  }, [buttons, initialConfig]);

  const envPrefix = `RAKUTEN_${brandId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;

  return (
    <div className="space-y-6">
      {/* ━━━━━ ブランド選択 ━━━━━ */}
      <section className="card p-5 space-y-2">
        <h2 className="font-semibold">編集対象ブランド</h2>
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
        <div className="text-[11px] text-stone-500">
          以下の編集はすべて選択中のブランドに対して保存されます。
        </div>
      </section>

      {/* ━━━━━ ブランドカラー ━━━━━ */}
      <section className="card p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">ブランドカラー</h2>
          <span className="text-[11px] text-stone-500">
            ロゴ・帯・本文・パネル等の色
          </span>
        </div>
        <p className="text-xs text-stone-600">
          ここで変更した色は、新規メルマガ生成時の{" "}
          <code className="bg-stone-100 px-1 rounded">{"{{COLOR_*}}"}</code>{" "}
          置換と既存メルマガの再描画の両方に使われます。
        </p>

        <div className="space-y-2">
          {COLOR_FIELDS.map((f) => (
            <ColorRow
              key={f.key}
              label={f.label}
              description={f.description}
              value={colors[f.key]}
              onChange={(v) => setColors({ ...colors, [f.key]: v })}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={saveColors}
            disabled={
              !colorsDirty ||
              saveColorState.state === "saving" ||
              !allHex(colors)
            }
            className="text-sm rounded px-4 py-2 text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {saveColorState.state === "saving" ? "保存中..." : "保存"}
          </button>
          {colorsDirty && (
            <button
              type="button"
              onClick={() => setColors(initialConfig.colors)}
              className="text-xs text-stone-500 hover:text-stone-800 underline"
            >
              リセット
            </button>
          )}
          <SaveStatus state={saveColorState} />
        </div>
      </section>

      {/* ━━━━━ ボタンスタイル ━━━━━ */}
      <section className="card p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">ボタンスタイル</h2>
          <span className="text-[11px] text-stone-500">
            メルマガ内ボタンの用途別の色
          </span>
        </div>
        <p className="text-xs text-stone-600">
          テンプレ内の{" "}
          <code className="bg-stone-100 px-1 rounded">
            [[BUTTON:type|url|label]]
          </code>{" "}
          マクロが、ここで定義した色で展開されます。
        </p>

        <div className="space-y-4">
          {BUTTON_TYPES.map((bt) => (
            <ButtonRow
              key={bt.key}
              label={bt.label}
              description={bt.description}
              value={buttons[bt.key]}
              onChange={(s) => setButtons({ ...buttons, [bt.key]: s })}
              showBorder={bt.key === "secondary"}
            />
          ))}
        </div>

        {/* ライブプレビュー */}
        <div className="bg-stone-50 border border-stone-200 rounded p-4 space-y-2">
          <div className="text-[11px] text-stone-500 mb-1">プレビュー</div>
          <ButtonPreview style={buttons.coupon} label="クーポンを取得する →" />
          <ButtonPreview style={buttons.product} label="商品を見る →" />
          <ButtonPreview style={buttons.secondary} label="新作一覧を見る →" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={saveButtons}
            disabled={
              !buttonsDirty ||
              saveButtonState.state === "saving" ||
              !allButtonsHex(buttons)
            }
            className="text-sm rounded px-4 py-2 text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {saveButtonState.state === "saving" ? "保存中..." : "保存"}
          </button>
          {buttonsDirty && (
            <button
              type="button"
              onClick={() =>
                setButtons(
                  initialConfig.buttons ?? defaultButtons(initialConfig.colors),
                )
              }
              className="text-xs text-stone-500 hover:text-stone-800 underline"
            >
              リセット
            </button>
          )}
          <SaveStatus state={saveButtonState} />
        </div>
      </section>

      {/* ━━━━━ 楽天 RMS 認証 ━━━━━ */}
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
          <div className="text-[10px] text-stone-500">
            使用する環境変数: <code>{envPrefix}_*</code>
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

function ColorRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = HEX_RE.test(value);
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-28 shrink-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[10px] text-stone-500">{description}</div>
      </div>
      <input
        type="color"
        value={valid ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-9 border border-stone-300 rounded cursor-pointer p-0.5"
        aria-label={`${label} カラーピッカー`}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={`w-28 text-sm border rounded px-2 py-1.5 font-mono focus:outline-none focus:ring-2 ${
          valid
            ? "border-stone-300 focus:ring-stone-400"
            : "border-rose-400 focus:ring-rose-300"
        }`}
        placeholder="#rrggbb"
      />
    </div>
  );
}

function ButtonRow({
  label,
  description,
  value,
  onChange,
  showBorder,
}: {
  label: string;
  description: string;
  value: ButtonStyle;
  onChange: (s: ButtonStyle) => void;
  showBorder: boolean;
}) {
  return (
    <div className="border border-stone-200 rounded p-3 space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[10px] text-stone-500">{description}</div>
      </div>
      <div className="flex flex-wrap gap-3">
        <ColorPair
          label="背景"
          value={value.bg}
          onChange={(v) => onChange({ ...value, bg: v })}
        />
        <ColorPair
          label="文字"
          value={value.fg}
          onChange={(v) => onChange({ ...value, fg: v })}
        />
        {showBorder && (
          <ColorPair
            label="枠線"
            value={value.border ?? "#000000"}
            onChange={(v) => onChange({ ...value, border: v })}
            allowNone
            isNone={value.border == null}
            onToggleNone={() =>
              onChange({
                ...value,
                border: value.border == null ? "#e8e2db" : null,
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function ColorPair({
  label,
  value,
  onChange,
  allowNone,
  isNone,
  onToggleNone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowNone?: boolean;
  isNone?: boolean;
  onToggleNone?: () => void;
}) {
  const valid = HEX_RE.test(value);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-600 w-8">{label}</span>
      <input
        type="color"
        value={valid ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        disabled={isNone}
        className="w-8 h-8 border border-stone-300 rounded cursor-pointer p-0.5 disabled:opacity-40"
        aria-label={`${label} カラーピッカー`}
      />
      <input
        type="text"
        value={isNone ? "なし" : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isNone}
        spellCheck={false}
        className={`w-24 text-xs border rounded px-2 py-1 font-mono focus:outline-none focus:ring-2 disabled:bg-stone-100 disabled:text-stone-400 ${
          valid || isNone
            ? "border-stone-300 focus:ring-stone-400"
            : "border-rose-400 focus:ring-rose-300"
        }`}
        placeholder="#rrggbb"
      />
      {allowNone && (
        <label className="text-[10px] text-stone-500 flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={isNone ?? false}
            onChange={onToggleNone}
          />
          なし
        </label>
      )}
    </div>
  );
}

function ButtonPreview({ style, label }: { style: ButtonStyle; label: string }) {
  return (
    <div
      style={{
        backgroundColor: style.bg,
        color: style.fg,
        padding: style.padding ?? "14px 20px",
        border: style.border ? `1px solid ${style.border}` : "none",
        textAlign: "center",
        width: style.width ?? "80%",
        margin: "8px auto",
        fontSize: fontSizePx(style.size),
        fontWeight: 700,
        borderRadius: 2,
      }}
    >
      {label}
    </div>
  );
}

function fontSizePx(size?: string): string {
  // <font size="N"> 互換: 1=10, 2=13, 3=16, 4=18, 5=24
  switch (size) {
    case "1":
      return "10px";
    case "2":
      return "13px";
    case "3":
      return "16px";
    case "4":
      return "18px";
    case "5":
      return "24px";
    default:
      return "16px";
  }
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state.state === "ok") {
    return (
      <span className="text-xs text-emerald-700">
        ✓ 保存しました（数十秒後の Vercel 再デプロイ完了で反映）
      </span>
    );
  }
  if (state.state === "error") {
    return (
      <span className="text-xs text-rose-700">エラー: {state.message}</span>
    );
  }
  return null;
}

function allHex(c: BrandColors): boolean {
  return COLOR_FIELDS.every((f) => HEX_RE.test(c[f.key] ?? ""));
}

function allButtonsHex(b: BrandButtons): boolean {
  return BUTTON_TYPES.every((bt) => {
    const s = b[bt.key];
    if (!s || typeof s !== "object") return false;
    if (!HEX_RE.test(s.bg) || !HEX_RE.test(s.fg)) return false;
    if (s.border != null && !HEX_RE.test(s.border)) return false;
    return true;
  });
}
