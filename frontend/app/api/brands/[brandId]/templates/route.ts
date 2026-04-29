import { NextRequest } from "next/server";
import { updateJsonFile } from "@/lib/github";
import type { Template } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originOk(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) return true;
  try {
    const o = new URL(origin);
    return o.host === host;
  } catch {
    return false;
  }
}

function fileFor(brandId: string): string {
  return `frontend/data/brands/${brandId}/templates.json`;
}

/** 新規テンプレ追加 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  if (!originOk(req)) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 });
  }
  const { brandId } = await params;
  let body: Template;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id || !body.name) {
    return Response.json(
      { error: "id と name は必須です" },
      { status: 400 },
    );
  }

  try {
    await updateJsonFile<Template[]>(
      fileFor(brandId),
      (templates) => {
        if (templates.find((t) => t.id === body.id)) {
          throw new Error(`Template ${body.id} は既に存在します`);
        }
        templates.push(body);
        return templates;
      },
      `feat: add template ${body.id} via web`,
    );
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "作成失敗", detail: String(e) },
      { status: 500 },
    );
  }
}
