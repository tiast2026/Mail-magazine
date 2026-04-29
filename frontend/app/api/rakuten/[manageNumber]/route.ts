import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawImage = { location?: string; alt?: string; type?: string };
type RawVariant = {
  selectorValues?: Record<string, string>;
  images?: RawImage[];
  standardPrice?: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ manageNumber: string }> },
) {
  const { manageNumber } = await params;

  const serviceSecret = process.env.RAKUTEN_SERVICE_SECRET;
  const licenseKey = process.env.RAKUTEN_LICENSE_KEY;
  const shopUrl = process.env.RAKUTEN_SHOP_URL ?? "";

  if (!serviceSecret || !licenseKey) {
    return Response.json(
      {
        error:
          "楽天RMS認証情報が設定されていません。Vercel ダッシュボードで RAKUTEN_SERVICE_SECRET と RAKUTEN_LICENSE_KEY を設定してください。",
      },
      { status: 500 },
    );
  }

  const auth =
    "ESA " +
    Buffer.from(`${serviceSecret}:${licenseKey}`).toString("base64");

  const url = `https://api.rms.rakuten.co.jp/es/2.0/items/manage-numbers/${encodeURIComponent(manageNumber)}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: auth, Accept: "application/json" },
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        {
          error: `楽天RMS API エラー HTTP ${res.status}`,
          detail: text.slice(0, 800),
        },
        { status: res.status },
      );
    }

    const data = await res.json();

    const cabinetBase = shopUrl
      ? `https://image.rakuten.co.jp/${shopUrl}/cabinet`
      : "";

    const images: { location: string; fullUrl: string; alt?: string }[] = (
      (data.images as RawImage[]) ?? []
    ).map((img) => ({
      location: img.location ?? "",
      fullUrl: cabinetBase + (img.location ?? ""),
      alt: img.alt,
    }));

    const variants: Record<
      string,
      { images: string[]; standardPrice?: string }
    > = {};
    if (data.variants && typeof data.variants === "object") {
      for (const [key, v] of Object.entries(data.variants as Record<string, RawVariant>)) {
        const colorName = v.selectorValues?.["カラー"] ?? key;
        variants[colorName] = {
          images: (v.images ?? []).map((img) => cabinetBase + (img.location ?? "")),
          standardPrice: v.standardPrice,
        };
      }
    }

    return Response.json({
      manageNumber,
      name: data.title ?? null,
      tagline: data.tagline ?? null,
      url: shopUrl
        ? `https://item.rakuten.co.jp/${shopUrl}/${manageNumber}/`
        : null,
      mainImage: images[0]?.fullUrl ?? null,
      images,
      variants,
      itemNumber: data.itemNumber,
      itemType: data.itemType,
      hideItem: data.hideItem,
    });
  } catch (e) {
    return Response.json(
      { error: "商品情報取得失敗", detail: String(e) },
      { status: 500 },
    );
  }
}
