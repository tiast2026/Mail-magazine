import { NextRequest } from "next/server";
import { getFile, updateFile } from "@/lib/github";
import type { AiAnalysis, MailOutput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `あなたは楽天店舗のメルマガ運用コンサルタントです。
配信実績データを与えられたら、次のスキーマで JSON を返してください（マークダウンや余計な前置きは禁止、JSON のみ）：

{
  "score": 1〜5の整数（5=大成功 / 4=好調 / 3=平均並 / 2=やや低調 / 1=苦戦）,
  "summary": "1〜2行の総括（120字以内）",
  "strengths": ["数値や根拠を含む良かった点", ...],
  "weaknesses": ["数値や根拠を含む改善点", ...],
  "nextActions": ["次回に向けた具体アクション", ...]
}

評価のポイント：
- 過去同テンプレ・同イベントの平均と比較して相対評価する
- 開封率→件名/送信時間、CTR→本文コピー・画像、CVR→オファー強度・商品力 という切り分け
- NOAHL のブランドトーン（ナチュラル・誠実・煽らない）を尊重
- 「激安」「お買い得」など NG 表現は提案にも入れない`;

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ brandId: string; outputId: string }> },
) {
  const { brandId, outputId } = await ctx.params;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY 未設定（Vercel 環境変数）" },
      { status: 500 },
    );
  }

  const filePath = `frontend/data/brands/${brandId}/outputs.json`;

  // 1) outputs.json を読む 2) Claude API で分析 3) 該当エントリに aiAnalysis を書き込む
  const { content, sha } = await getFile(filePath);
  const outputs = JSON.parse(content) as MailOutput[];
  const idx = outputs.findIndex((o) => o.id === outputId);
  if (idx === -1) {
    return Response.json(
      { error: `outputId=${outputId} が見つかりません` },
      { status: 404 },
    );
  }
  const target = outputs[idx];

  let analysis: AiAnalysis;
  try {
    analysis = await analyzeWithClaude(apiKey, target, outputs);
  } catch (e) {
    return Response.json(
      { error: "分析失敗", detail: String(e) },
      { status: 500 },
    );
  }

  outputs[idx] = {
    ...target,
    results: {
      ...(target.results ?? {}),
      aiAnalysis: analysis,
    },
  };

  const newContent = JSON.stringify(outputs, null, 2) + "\n";
  await updateFile(
    filePath,
    newContent,
    `chore: AI分析を更新 (${outputId})`,
    sha,
  );

  return Response.json({ ok: true, analysis });
}

async function analyzeWithClaude(
  apiKey: string,
  target: MailOutput,
  all: MailOutput[],
): Promise<AiAnalysis> {
  const peers = pickPeers(target, all);
  const prompt = buildPrompt(target, peers);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const json = extractJson(text);
  if (!json) throw new Error(`JSON 抽出失敗: ${text.slice(0, 200)}`);

  return {
    analyzedAt: new Date().toISOString(),
    model: MODEL,
    score: clampScore(json.score),
    summary: String(json.summary ?? "").slice(0, 200),
    strengths: arrayOfStrings(json.strengths),
    weaknesses: arrayOfStrings(json.weaknesses),
    nextActions: arrayOfStrings(json.nextActions),
    comparedAgainst: peers.map((p) => p.id),
  };
}

function pickPeers(target: MailOutput, all: MailOutput[]): MailOutput[] {
  const targetTs = new Date(
    target.sentAt ?? target.results?.rakuten?.sentStartAt ?? target.createdAt,
  ).getTime();
  const ninetyDaysAgo = targetTs - 90 * 24 * 60 * 60 * 1000;

  const eligible = all
    .filter((o) => o.id !== target.id)
    .filter((o) => o.results?.rakuten || o.results?.openRate !== undefined)
    .filter((o) => {
      const ts = new Date(o.sentAt ?? o.createdAt).getTime();
      return ts >= ninetyDaysAgo && ts <= targetTs;
    });

  const sameTemplate = eligible.filter(
    (o) => o.templateId === target.templateId,
  );
  const sameEvent = eligible.filter(
    (o) => target.event?.type && o.event?.type === target.event.type,
  );
  const seen = new Set<string>();
  const peers: MailOutput[] = [];
  for (const list of [sameTemplate, sameEvent, eligible]) {
    for (const o of list) {
      if (peers.length >= 8) break;
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      peers.push(o);
    }
  }
  return peers;
}

function buildPrompt(target: MailOutput, peers: MailOutput[]): string {
  const r = target.results ?? {};
  const m = r.rakuten ?? {};
  return `# 分析対象メルマガ

- ID: ${target.id}
- 件名: ${target.title}
- テンプレ: ${target.templateId}
- イベント: ${target.event?.type ?? "(なし)"} / ${target.event?.name ?? ""}
- 配信日時: ${target.sentAt ?? m.sentStartAt ?? "(不明)"}
- 商品: ${(target.products ?? []).map((p) => p.name).join(", ") || "(空)"}

## 実績数値
- 送信数: ${r.sentCount ?? "—"}
- 開封数 / 開封率: ${r.openCount ?? "—"} / ${r.openRate ?? "—"}%
- クリック数: ${r.clickCount ?? "—"}
- 送客数 / 送客率: ${m.conversionVisitCount ?? "—"} / ${m.conversionVisitRate ?? "—"}%
- 転換数 / 転換率: ${m.transactionCount ?? "—"} / ${m.transactionRate ?? "—"}%
- 売上/通: ${m.revenuePerSent ?? "—"}円
- お気に入り登録: ${m.favoriteCount ?? "—"}（${m.favoriteRate ?? "—"}%）

## 過去比較データ（直近90日 / 最大8件）
${peers.length === 0 ? "(過去データなし)" : peers.map(formatPeer).join("\n")}

上記を踏まえ、JSON 形式の分析結果のみ返してください。`;
}

function formatPeer(o: MailOutput): string {
  const r = o.results ?? {};
  const m = r.rakuten ?? {};
  return `- ${o.id}（${o.templateId}/${o.event?.type ?? "—"}/${(o.sentAt ?? "").slice(0, 10)}）: 開封 ${r.openRate ?? "—"}% / 送客率 ${m.conversionVisitRate ?? "—"}% / 転換率 ${m.transactionRate ?? "—"}% / 売上/通 ${m.revenuePerSent ?? "—"}円 — ${o.title}`;
}

function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const raw = fenced ? fenced[1] : text;
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function clampScore(n: unknown): number {
  const i = Math.round(Number(n));
  if (!Number.isFinite(i)) return 3;
  return Math.max(1, Math.min(5, i));
}

function arrayOfStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter((s) => s.trim().length > 0);
}
