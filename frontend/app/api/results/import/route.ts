import { NextRequest } from "next/server";
import { updateJsonFile } from "@/lib/github";
import type {
  MailOutput,
  OutputResults,
  RakutenRMailMetrics,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportPayload = {
  brandId?: string;
  /** 直接 outputs.json の id を指定する場合 */
  outputId?: string;
  /** 楽天 R-Mail のメルマガID（既存 results.rakuten.mailId とマッチ） */
  rakutenMailId?: string;
  /** R-Mail 件名（タイトル部分一致でフォールバック） */
  subject?: string;
  /** 配信日（YYYY-MM-DD） title マッチ補助 */
  sentDate?: string;
  /** メイン指標 */
  results?: Partial<OutputResults>;
  /** 楽天専用の詳細指標 */
  rakuten?: Partial<RakutenRMailMetrics>;
  /** dry run（マッチ確認のみ、書き込まない） */
  dryRun?: boolean;
};

const ALLOWED_ORIGIN_PATTERN = /(^https?:\/\/[^/]*\.rakuten\.co\.jp$)|(^https?:\/\/[^/]*\.rms\.rakuten\.co\.jp$)/i;

function corsHeaders(origin: string | null): Record<string, string> {
  const allow =
    origin && ALLOWED_ORIGIN_PATTERN.test(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Ingest-Token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function authorize(req: NextRequest): boolean {
  const expected = process.env.RESULTS_INGEST_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const headerToken = req.headers.get("x-ingest-token") ?? "";
  return bearer === expected || headerToken === expected;
}

function fileFor(brandId: string): string {
  return `frontend/data/brands/${brandId}/outputs.json`;
}

function findMatch(
  outputs: MailOutput[],
  payload: ImportPayload,
): { index: number; reason: string } | null {
  if (payload.outputId) {
    const i = outputs.findIndex((o) => o.id === payload.outputId);
    if (i !== -1) return { index: i, reason: "outputId" };
  }
  if (payload.rakutenMailId) {
    const i = outputs.findIndex(
      (o) => o.results?.rakuten?.mailId === payload.rakutenMailId,
    );
    if (i !== -1) return { index: i, reason: "rakutenMailId" };
  }
  if (payload.subject) {
    const sentDate = payload.sentDate;
    const candidates = outputs
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => {
        if (!sentDate) return true;
        const d =
          (o.sentAt ?? o.scheduledAt ?? o.createdAt).slice(0, 10);
        return d === sentDate;
      });
    const subjectKey = normalize(payload.subject);
    const exact = candidates.find(
      ({ o }) => normalize(o.title) === subjectKey,
    );
    if (exact) return { index: exact.i, reason: "subject:exact" };
    const partial = candidates.find(
      ({ o }) =>
        normalize(o.title).includes(subjectKey) ||
        subjectKey.includes(normalize(o.title)),
    );
    if (partial) return { index: partial.i, reason: "subject:partial" };
  }
  return null;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function mergeResults(
  current: OutputResults | undefined,
  incoming: ImportPayload,
): OutputResults {
  const base = current ?? {};
  const next: OutputResults = { ...base, ...(incoming.results ?? {}) };
  next.rakuten = {
    ...(base.rakuten ?? {}),
    ...(incoming.rakuten ?? {}),
    importedAt: new Date().toISOString(),
  };
  return next;
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req.headers.get("origin"));

  if (!authorize(req)) {
    return Response.json(
      { error: "Unauthorized. Set Authorization: Bearer <RESULTS_INGEST_TOKEN>." },
      { status: 401, headers: cors },
    );
  }

  let body: ImportPayload;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: cors },
    );
  }

  const brandId = body.brandId ?? "noahl";

  try {
    let matched: { id: string; reason: string; title: string } | null = null;
    let mergedPreview: OutputResults | null = null;

    const mutator = (outputs: MailOutput[]): MailOutput[] => {
      const m = findMatch(outputs, body);
      if (!m) {
        throw Object.assign(new Error("no-match"), { code: "no-match" });
      }
      const merged = mergeResults(outputs[m.index].results, body);
      matched = {
        id: outputs[m.index].id,
        reason: m.reason,
        title: outputs[m.index].title,
      };
      mergedPreview = merged;
      if (body.dryRun) return outputs;
      outputs[m.index] = { ...outputs[m.index], results: merged };
      return outputs;
    };

    if (body.dryRun) {
      // dry run: 読み込みだけして match 結果を返す
      const res = await fetch(
        `https://api.github.com/repos/tiast2026/Mail-magazine/contents/${fileFor(brandId)}?ref=${process.env.WRITE_BRANCH ?? process.env.VERCEL_GIT_COMMIT_REF ?? "main"}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ""}`,
            Accept: "application/vnd.github+json",
          },
          cache: "no-store",
        },
      );
      if (!res.ok) {
        return Response.json(
          { error: "outputs.json 読み込み失敗", detail: await res.text() },
          { status: 500, headers: cors },
        );
      }
      const data = await res.json();
      const content = Buffer.from(data.content, "base64").toString("utf8");
      const outputs = JSON.parse(content) as MailOutput[];
      mutator(outputs);
      return Response.json(
        { ok: true, dryRun: true, matched, preview: mergedPreview },
        { headers: cors },
      );
    }

    await updateJsonFile<MailOutput[]>(
      fileFor(brandId),
      mutator,
      `chore: import rakuten r-mail metrics${body.rakutenMailId ? ` (${body.rakutenMailId})` : ""}`,
    );

    return Response.json(
      { ok: true, matched, preview: mergedPreview },
      { headers: cors },
    );
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "no-match") {
      return Response.json(
        {
          error: "対応するメルマガが outputs.json に見つかりませんでした",
          hint: "outputId / rakutenMailId / subject + sentDate のいずれかでマッチさせてください",
        },
        { status: 404, headers: cors },
      );
    }
    return Response.json(
      { error: "取り込み失敗", detail: String(e) },
      { status: 500, headers: cors },
    );
  }
}
