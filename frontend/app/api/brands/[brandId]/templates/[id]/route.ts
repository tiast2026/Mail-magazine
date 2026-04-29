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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string; id: string }> },
) {
  if (!originOk(req)) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 });
  }
  const { brandId, id } = await params;
  let body: Partial<Template>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await updateJsonFile<Template[]>(
      fileFor(brandId),
      (templates) => {
        const idx = templates.findIndex((t) => t.id === id);
        if (idx === -1) {
          throw new Error(`Template ${id} not found in ${brandId}`);
        }
        templates[idx] = { ...templates[idx], ...body, id };
        return templates;
      },
      `chore: update template ${id} via web edit`,
    );
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "更新失敗", detail: String(e) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string; id: string }> },
) {
  if (!originOk(req)) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 });
  }
  const { brandId, id } = await params;

  try {
    await updateJsonFile<Template[]>(
      fileFor(brandId),
      (templates) => {
        const filtered = templates.filter((t) => t.id !== id);
        if (filtered.length === templates.length) {
          throw new Error(`Template ${id} not found in ${brandId}`);
        }
        return filtered;
      },
      `chore: delete template ${id} via web`,
    );
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "削除失敗", detail: String(e) },
      { status: 500 },
    );
  }
}
