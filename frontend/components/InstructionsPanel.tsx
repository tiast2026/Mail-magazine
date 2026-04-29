"use client";

import { useState } from "react";

type Example = {
  situation: string;
  prompt: string;
  result: string;
};

const examples: Example[] = [
  {
    situation: "1商品をメイン訴求するメルマガを作りたい",
    prompt: "品番 nlwp315-2505 でメルマガ作って",
    result: "Claude が商品取得 → テンプレA で1商品フォーカス型を生成",
  },
  {
    situation: "セール告知（マラソン・SS開始時）メルマガを作りたい",
    prompt:
      "品番 abc-1, def-2, ghi-3 で 5月マラソン向けセール告知メルマガ作って",
    result: "テンプレB（イチオシ + おすすめ2点）でクーポン訴求型を生成",
  },
  {
    situation: "終盤の駆け込み・ランキング訴求メルマガを作りたい",
    prompt: "品番 abc-1, def-2, ghi-3 でマラソン残り24時間ランキング作って",
    result: "テンプレC で TOP3 ランキング型を生成",
  },
  {
    situation: "ブランド世界観・素材ストーリーで読み物型を作りたい",
    prompt: "品番 nlwp315-2505 で楊柳素材のストーリー型メルマガ作って",
    result: "テンプレD で読み物コラム形式・販促色を抑えて生成",
  },
  {
    situation: "最適なテンプレを Claude に提案させたい",
    prompt:
      "5月のお買い物マラソン開始時に送るメルマガ作りたい、品番 abc, def, ghi。どのテンプレがいい？",
    result: "Claude がイベント・商品数・タイミングから推奨テンプレを提案",
  },
  {
    situation: "配信実績を入力したい",
    prompt:
      "（配信メルマガ詳細ページの実績フォーム → JSON出力 → コピペ）この実績で更新して",
    result: "Claude が outputs.json の results フィールドを更新 → push",
  },
  {
    situation: "過去実績ベースに次回提案を聞きたい",
    prompt: "前回反応良かった商品でもう1回メルマガ送りたい、何がいい？",
    result: "Claude が outputs.json を分析して開封率・売上の高い商品を提案",
  },
  {
    situation: "新しいテンプレートを追加したい",
    prompt:
      "再入荷通知用のテンプレを追加してほしい。シンプルに商品1点 + 「再入荷しました」見出し + CTAで",
    result:
      "Claude が brands/<brandId>/templates.json に新テンプレを追加 → push",
  },
];

export default function InstructionsPanel() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function copy(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {}
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-stone-900">
          Claude Code への指示の書き方
        </h2>
        <p className="text-xs text-stone-600 mt-1">
          Claude Code チャットで以下のように依頼すると自動でメルマガが生成されます。
          コピーボタンで指示文をクリップボードに貼って使えます。
        </p>
      </div>
      <ul className="space-y-3">
        {examples.map((ex, i) => (
          <li
            key={i}
            className="border border-stone-200 rounded-md p-3 bg-stone-50/50"
          >
            <div className="text-xs text-stone-500 mb-1">{ex.situation}</div>
            <div className="flex items-start gap-2">
              <code className="flex-1 text-xs bg-white border border-stone-200 rounded px-2 py-1.5 font-mono text-stone-800 break-all">
                {ex.prompt}
              </code>
              <button
                type="button"
                onClick={() => copy(ex.prompt, i)}
                className="shrink-0 text-[10px] rounded px-2 py-1 transition"
                style={{
                  backgroundColor:
                    copiedIdx === i ? "#059669" : "var(--brand-primary)",
                  color: "white",
                }}
              >
                {copiedIdx === i ? "✓" : "コピー"}
              </button>
            </div>
            <div className="text-[11px] text-stone-500 mt-1.5 flex items-start gap-1">
              <span className="mt-0.5">→</span>
              <span>{ex.result}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
