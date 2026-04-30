import { NextRequest } from "next/server";
import { updateJsonFile } from "@/lib/github";
import type { BrandColors, BrandConfig, ButtonStyle } from "@/lib/types";

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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX_RE.test(v);
}

const COLOR_KEYS: (keyof BrandColors)[] = [
  "primary",
  "accent",
  "muted",
  "text",
  "subtext",
  "panel",
  "border",
  "white",
];

const BUTTON_TYPES = ["coupon", "product", "secondary"] as const;
type ButtonType = (typeof BUTTON_TYPES)[number];

type Patch = {
  colors?: Partial<BrandColors>;
  buttons?: Partial<Record<ButtonType, Partial<ButtonStyle>>>;
};

function validatePatch(body: unknown): { ok: true; patch: Patch } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "リクエストボディが不正です" };
  }
  const b = body as Record<string, unknown>;
  const patch: Patch = {};

  if (b.colors !== undefined) {
    if (!b.colors || typeof b.colors !== "object") {
      return { ok: false, error: "colors は object である必要があります" };
    }
    const colors: Partial<BrandColors> = {};
    for (const [k, v] of Object.entries(b.colors as Record<string, unknown>)) {
      if (!COLOR_KEYS.includes(k as keyof BrandColors)) {
        return { ok: false, error: `colors.${k} は許可されていません` };
      }
      if (!isHex(v)) {
        return { ok: false, error: `colors.${k} は #rrggbb 形式の hex である必要があります` };
      }
      colors[k as keyof BrandColors] = v;
    }
    patch.colors = colors;
  }

  if (b.buttons !== undefined) {
    if (!b.buttons || typeof b.buttons !== "object") {
      return { ok: false, error: "buttons は object である必要があります" };
    }
    const buttons: Partial<Record<ButtonType, Partial<ButtonStyle>>> = {};
    for (const [type, style] of Object.entries(b.buttons as Record<string, unknown>)) {
      if (!BUTTON_TYPES.includes(type as ButtonType)) {
        return { ok: false, error: `buttons.${type} は許可されていません` };
      }
      if (!style || typeof style !== "object") {
        return { ok: false, error: `buttons.${type} は object である必要があります` };
      }
      const s = style as Record<string, unknown>;
      const out: Partial<ButtonStyle> = {};
      for (const [k, v] of Object.entries(s)) {
        if (k === "bg" || k === "fg") {
          if (!isHex(v)) {
            return { ok: false, error: `buttons.${type}.${k} は hex` };
          }
          out[k] = v;
        } else if (k === "border") {
          if (v === null) {
            out.border = null;
          } else if (isHex(v)) {
            out.border = v;
          } else {
            return { ok: false, error: `buttons.${type}.border は hex か null` };
          }
        } else if (k === "width" || k === "size" || k === "padding") {
          if (typeof v !== "string") {
            return { ok: false, error: `buttons.${type}.${k} は文字列` };
          }
          out[k] = v;
        } else {
          return { ok: false, error: `buttons.${type}.${k} は許可されていません` };
        }
      }
      buttons[type as ButtonType] = out;
    }
    patch.buttons = buttons;
  }

  if (patch.colors === undefined && patch.buttons === undefined) {
    return { ok: false, error: "colors か buttons を指定してください" };
  }

  return { ok: true, patch };
}

function fileFor(brandId: string): string {
  return `frontend/data/brands/${brandId}/config.json`;
}

/** ブランド config の colors / buttons を部分更新する */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  if (!originOk(req)) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 });
  }
  const { brandId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validatePatch(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  const { patch } = result;

  try {
    await updateJsonFile<BrandConfig>(
      fileFor(brandId),
      (current) => {
        const next = { ...current };
        if (patch.colors) {
          next.colors = { ...current.colors, ...patch.colors };
        }
        if (patch.buttons) {
          const existing = current.buttons ?? ({} as NonNullable<BrandConfig["buttons"]>);
          next.buttons = {
            ...existing,
            coupon: { ...existing.coupon, ...(patch.buttons.coupon ?? {}) } as ButtonStyle,
            product: { ...existing.product, ...(patch.buttons.product ?? {}) } as ButtonStyle,
            secondary: { ...existing.secondary, ...(patch.buttons.secondary ?? {}) } as ButtonStyle,
          };
        }
        return next;
      },
      `chore: update ${brandId} brand config via settings UI`,
    );
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "更新失敗", detail: String(e) },
      { status: 500 },
    );
  }
}
