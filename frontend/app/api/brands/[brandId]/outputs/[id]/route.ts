import { NextRequest } from "next/server";
import { updateJsonFile } from "@/lib/github";
import type { MailOutput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originOk(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) return true; // same-origin or no-cors fetch
  try {
    const o = new URL(origin);
    return o.host === host;
  } catch {
    return false;
  }
}

function fileFor(brandId: string): string {
  return `frontend/data/brands/${brandId}/outputs.json`;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string; id: string }> },
) {
  if (!originOk(req)) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 });
  }
  const { brandId, id } = await params;
  let body: Partial<MailOutput>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await updateJsonFile<MailOutput[]>(
      fileFor(brandId),
      (outputs) => {
        const idx = outputs.findIndex((o) => o.id === id);
        if (idx === -1) {
          throw new Error(`Output ${id} not found in ${brandId}`);
        }
        outputs[idx] = { ...outputs[idx], ...body, id };
        return outputs;
      },
      `chore: update output ${id} via web edit`,
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
    await updateJsonFile<MailOutput[]>(
      fileFor(brandId),
      (outputs) => {
        const filtered = outputs.filter((o) => o.id !== id);
        if (filtered.length === outputs.length) {
          throw new Error(`Output ${id} not found in ${brandId}`);
        }
        return filtered;
      },
      `chore: delete output ${id} via web`,
    );
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "削除失敗", detail: String(e) },
      { status: 500 },
    );
  }
}
