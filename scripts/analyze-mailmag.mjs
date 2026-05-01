#!/usr/bin/env node
/**
 * 配信から 7日以上経過したメルマガを Claude API で分析し、
 * 結果を outputs.json の results.aiAnalysis に書き戻す。
 *
 * 必要環境変数:
 *   - ANTHROPIC_API_KEY: Claude API キー
 *
 * オプション:
 *   --brand <id>      対象ブランド（省略時は brands.json 全件）
 *   --id <outputId>   特定のメルマガだけ分析（7日経過チェックをスキップ）
 *   --force           既存の aiAnalysis があっても再生成
 *   --dry-run         API は叩くが outputs.json は書き換えない
 *   --max <n>         1回の実行で分析する最大件数（デフォルト 10）
 *
 * 使い方:
 *   ANTHROPIC_API_KEY=sk-... node scripts/analyze-mailmag.mjs
 *   ANTHROPIC_API_KEY=sk-... node scripts/analyze-mailmag.mjs --brand noahl --id rmail-26431856 --force
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(REPO_ROOT, "frontend", "data");

const MODEL = "claude-sonnet-4-6";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const args = parseArgs(process.argv.slice(2));
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("[ERROR] ANTHROPIC_API_KEY が未設定");
  process.exit(1);
}

const brands = args.brand
  ? [{ id: args.brand }]
  : JSON.parse(
      await fs.readFile(path.join(DATA_DIR, "brands.json"), "utf8"),
    );

let totalAnalyzed = 0;
const maxRuns = args.max ?? 10;

for (const brand of brands) {
  if (totalAnalyzed >= maxRuns) break;
  const outputsPath = path.join(DATA_DIR, "brands", brand.id, "outputs.json");
  let outputs;
  try {
    outputs = JSON.parse(await fs.readFile(outputsPath, "utf8"));
  } catch {
    console.warn(`[skip] ${brand.id}: outputs.json なし`);
    continue;
  }

  const candidates = outputs.filter((o) => isCandidate(o, args));
  if (candidates.length === 0) {
    console.log(`[${brand.id}] 分析対象なし`);
    continue;
  }

  console.log(`[${brand.id}] 分析候補 ${candidates.length}件`);

  for (const target of candidates) {
    if (totalAnalyzed >= maxRuns) break;
    try {
      const analysis = await analyzeOne(target, outputs);
      target.results = target.results ?? {};
      target.results.aiAnalysis = analysis;
      totalAnalyzed++;
      console.log(
        `  ✓ ${target.id} → score:${analysis.score} ${analysis.summary.slice(0, 60)}...`,
      );
    } catch (e) {
      console.error(`  ✗ ${target.id}: ${e.message}`);
    }
  }

  if (!args.dryRun && totalAnalyzed > 0) {
    await fs.writeFile(outputsPath, JSON.stringify(outputs, null, 2) + "\n");
    console.log(`  → ${outputsPath} 更新`);
  }
}

console.log(`\n完了: ${totalAnalyzed}件 分析`);

// ----------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--brand") out.brand = argv[++i];
    else if (a === "--id") out.id = argv[++i];
    else if (a === "--force") out.force = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--max") out.max = Number(argv[++i]);
  }
  return out;
}

function isCandidate(o, args) {
  if (args.id) return o.id === args.id;
  if (!o.results?.rakuten) return false;
  if (!args.force && o.results.aiAnalysis) return false;
  const sendBase = o.results.rakuten.sentStartAt ?? o.sentAt;
  if (!sendBase) return false;
  const age = Date.now() - new Date(sendBase).getTime();
  return age >= SEVEN_DAYS_MS;
}

async function analyzeOne(target, allOutputs) {
  const peers = pickPeers(target, allOutputs);
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

function pickPeers(target, all) {
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

  // 同テンプレ・同イベントを優先、最大 8件
  const sameTemplate = eligible.filter((o) => o.templateId === target.templateId);
  const sameEvent = eligible.filter(
    (o) => target.event?.type && o.event?.type === target.event.type,
  );
  const seen = new Set();
  const peers = [];
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

function buildPrompt(target, peers) {
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

function formatPeer(o) {
  const r = o.results ?? {};
  const m = r.rakuten ?? {};
  return `- ${o.id}（${o.templateId}/${o.event?.type ?? "—"}/${(o.sentAt ?? "").slice(0, 10)}）: 開封 ${r.openRate ?? "—"}% / 送客率 ${m.conversionVisitRate ?? "—"}% / 転換率 ${m.transactionRate ?? "—"}% / 売上/通 ${m.revenuePerSent ?? "—"}円 — ${o.title}`;
}

function extractJson(text) {
  // ```json ... ``` ブロック or 純粋 JSON を抽出
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

function clampScore(n) {
  const i = Math.round(Number(n));
  if (!Number.isFinite(i)) return 3;
  return Math.max(1, Math.min(5, i));
}

function arrayOfStrings(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter((s) => s.trim().length > 0);
}
