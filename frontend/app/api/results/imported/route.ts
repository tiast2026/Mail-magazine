import { NextRequest } from "next/server";
import { getOutputs } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ORIGIN_PATTERN =
  /(^https?:\/\/[^/]*\.rakuten\.co\.jp$)|(^https?:\/\/[^/]*\.rms\.rakuten\.co\.jp$)/i;

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGIN_PATTERN.test(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Ingest-Token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export async function GET(req: NextRequest) {
  const cors = corsHeaders(req.headers.get("origin"));
  const brandId = req.nextUrl.searchParams.get("brandId") ?? "noahl";

  const outputs = getOutputs(brandId);
  const imported = outputs
    .filter((o) => o.results?.rakuten?.mailId)
    .map((o) => ({
      mailId: o.results!.rakuten!.mailId,
      outputId: o.id,
      title: o.title,
      importedAt: o.results!.rakuten!.importedAt,
    }));

  return Response.json(
    { brandId, count: imported.length, imported },
    { headers: cors },
  );
}
