import { NextRequest } from "next/server";
import { updateJsonFile } from "@/lib/github";
import type {
  MailOutput,
  OutputResults,
  RakutenRMailMetrics,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportItem = {
  outputId?: string;
  rakutenMailId?: string;
  subject?: string;
  sentDate?: string;
  results?: Partial<OutputResults>;
  rakuten?: Partial<RakutenRMailMetrics>;
  html?: string;
};

type BatchPayload = {
  brandId?: string;
  items: ImportItem[];
};

type ItemResult =
  | {
      ok: true;
      id: string;
      reason: string;
      rakutenMailId?: string;
    }
  | {
      ok: false;
      rakutenMailId?: string;
      subject?: string;
      error: string;
    };

const ALLOWED_ORIGIN_PATTERN =
  /(^https?:\/\/[^/]*\.rakuten\.co\.jp$)|(^https?:\/\/[^/]*\.rms\.rakuten\.co\.jp$)/i;

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

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function findMatch(
  outputs: MailOutput[],
  item: ImportItem,
): { index: number; reason: string } | null {
  if (item.outputId) {
    const i = outputs.findIndex((o) => o.id === item.outputId);
    if (i !== -1) return { index: i, reason: "outputId" };
  }
  if (item.rakutenMailId) {
    const i = outputs.findIndex(
      (o) => o.results?.rakuten?.mailId === item.rakutenMailId,
    );
    if (i !== -1) return { index: i, reason: "rakutenMailId" };
  }
  if (item.subject) {
    const sentDate = item.sentDate;
    const candidates = outputs
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => {
        if (!sentDate) return true;
        const d = (o.sentAt ?? o.scheduledAt ?? o.createdAt).slice(0, 10);
        return d === sentDate;
      });
    const subjectKey = normalize(item.subject);
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

function mergeResults(
  current: OutputResults | undefined,
  incoming: ImportItem,
  importedAt: string,
): OutputResults {
  const base = current ?? {};
  const next: OutputResults = { ...base, ...(incoming.results ?? {}) };
  next.rakuten = {
    ...(base.rakuten ?? {}),
    ...(incoming.rakuten ?? {}),
    importedAt,
  };
  return next;
}

function createStubFromImport(item: ImportItem, importedAt: string): MailOutput {
  const id =
    item.outputId ||
    (item.rakutenMailId ? `rmail-${item.rakutenMailId}` : `rmail-${Date.now()}`);
  const sentAt =
    item.rakuten?.sentStartAt ??
    (item.sentDate ? `${item.sentDate}T20:00:00+09:00` : undefined);
  return {
    id,
    title: item.subject || "(R-Mail 直配信・件名不明)",
    templateId: "external",
    createdAt: importedAt,
    sentAt,
    products: [],
    variables: {},
    html: item.html ?? "",
    tags: ["R-Mail直配信"],
    results: {
      ...(item.results ?? {}),
      rakuten: {
        ...(item.rakuten ?? {}),
        importedAt,
      },
    },
  };
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

  let body: BatchPayload;
  try {
    body = (await req.json()) as BatchPayload;
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: cors },
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return Response.json(
      { error: "items must be a non-empty array" },
      { status: 400, headers: cors },
    );
  }
  if (body.items.length > 200) {
    return Response.json(
      { error: "items exceeds 200 limit per batch" },
      { status: 400, headers: cors },
    );
  }

  const brandId = body.brandId ?? "noahl";
  const importedAt = new Date().toISOString();
  const itemResults: ItemResult[] = [];

  try {
    await updateJsonFile<MailOutput[]>(
      fileFor(brandId),
      (outputs) => {
        for (const item of body.items) {
          try {
            const m = findMatch(outputs, item);
            if (!m) {
              if (!item.rakutenMailId && !item.subject) {
                itemResults.push({
                  ok: false,
                  rakutenMailId: item.rakutenMailId,
                  subject: item.subject,
                  error: "no-match-key (rakutenMailId or subject required)",
                });
                continue;
              }
              const stub = createStubFromImport(item, importedAt);
              outputs.push(stub);
              itemResults.push({
                ok: true,
                id: stub.id,
                reason: "created",
                rakutenMailId: item.rakutenMailId,
              });
            } else {
              const merged = mergeResults(
                outputs[m.index].results,
                item,
                importedAt,
              );
              const nextHtml = outputs[m.index].html
                ? outputs[m.index].html
                : (item.html ?? "");
              const nextSentAt =
                item.rakuten?.sentStartAt ?? outputs[m.index].sentAt;
              outputs[m.index] = {
                ...outputs[m.index],
                results: merged,
                html: nextHtml,
                sentAt: nextSentAt,
              };
              itemResults.push({
                ok: true,
                id: outputs[m.index].id,
                reason: m.reason,
                rakutenMailId: item.rakutenMailId,
              });
            }
          } catch (e) {
            const err = e as { message?: string };
            itemResults.push({
              ok: false,
              rakutenMailId: item.rakutenMailId,
              subject: item.subject,
              error: err.message ?? "unknown error",
            });
          }
        }
        return outputs;
      },
      `chore: batch import rakuten r-mail metrics (${body.items.length} mails)`,
    );

    const okCount = itemResults.filter((r) => r.ok).length;
    return Response.json(
      {
        ok: true,
        total: itemResults.length,
        successCount: okCount,
        failureCount: itemResults.length - okCount,
        results: itemResults,
      },
      { headers: cors },
    );
  } catch (e) {
    const err = e as { message?: string };
    return Response.json(
      {
        error: "Batch import failed",
        detail: err.message ?? String(e),
        partialResults: itemResults,
      },
      { status: 500, headers: cors },
    );
  }
}
