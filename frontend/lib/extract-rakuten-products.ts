import type { Product } from "@/lib/types";

/**
 * メルマガHTMLから楽天商品リンクと画像を抽出する。
 * R-Mail 直配信メルマガなど products[] が空のエントリで、
 * HTML 本文から実際に紹介されている商品を割り出すために使う。
 *
 * 抽出ロジック:
 *   1. `https://item.rakuten.co.jp/<shop>/<品番>/` パターンの a タグを全件取得
 *   2. `https://image.rakuten.co.jp/<shop>/cabinet/<path>/<品番ベース>...` パターンの img を取得
 *   3. 品番のプレフィックス（最初のハイフンまで）で画像をマッチ
 *   4. 画像 alt があれば商品名として採用
 */
export function extractRakutenProducts(
  html: string,
  shopUrl: string,
): Product[] {
  if (!html || !shopUrl) return [];

  const escapedShop = shopUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 商品ページURL（item.rakuten.co.jp / soko.rms.rakuten.co.jp 両対応、"c" などは除外）
  const itemUrlRe = new RegExp(
    `https://(?:item\\.rakuten\\.co\\.jp|soko\\.rms\\.rakuten\\.co\\.jp)/${escapedShop}/([^"/]+)/?`,
    "g",
  );
  // 商品画像URL
  const imgRe = new RegExp(
    `https://image\\.rakuten\\.co\\.jp/${escapedShop}/cabinet[^"\\s]+`,
    "g",
  );
  // alt 付き <img> を抽出
  const imgWithAltRe = new RegExp(
    `<img[^>]*src="(https://image\\.rakuten\\.co\\.jp/${escapedShop}/cabinet[^"]+)"[^>]*alt="([^"]*)"`,
    "g",
  );

  // 1. 商品URL一覧（重複・カテゴリページ除外）
  const manageNumbers = new Set<string>();
  const orderedManageNumbers: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = itemUrlRe.exec(html))) {
    const id = m[1];
    if (isLikelyCategoryPath(id)) continue;
    if (!manageNumbers.has(id)) {
      manageNumbers.add(id);
      orderedManageNumbers.push(id);
    }
  }

  // 2. 画像URL→altのマップ作成
  const imageAltMap = new Map<string, string>();
  while ((m = imgWithAltRe.exec(html))) {
    if (!imageAltMap.has(m[1])) imageAltMap.set(m[1], m[2]);
  }

  // 3. 全画像（順番保持）
  const allImages: string[] = [];
  const imgSeen = new Set<string>();
  while ((m = imgRe.exec(html))) {
    if (!imgSeen.has(m[0])) {
      imgSeen.add(m[0]);
      allImages.push(m[0]);
    }
  }

  // 4. 各品番に対して画像とaltをマッチング
  // 画像が見つからない品番は「フッターの推奨商品」など本文外の言及の可能性が高いので除外
  const products: Product[] = [];
  for (const mgmt of orderedManageNumbers) {
    const prefix = mgmt.split("-")[0]; // 例: "nlbi019-82s18-220530" → "nlbi019"
    const matchedImage = allImages.find((url) => {
      const filename = url.split("/").pop() ?? "";
      return filename.startsWith(prefix + "-") || filename.startsWith(prefix + ".");
    });
    if (!matchedImage) continue; // 画像なしは本文外言及とみなして除外
    const alt = imageAltMap.get(matchedImage);
    products.push({
      manageNumber: mgmt,
      name: alt ?? mgmt,
      url: `https://item.rakuten.co.jp/${shopUrl}/${mgmt}/`,
      imageUrl: matchedImage,
    });
  }

  // 同じ画像がフッターと本文で再利用されている場合、品番→画像のマッピングがゆるく
  // 重複検出するケースがあるので、画像URLでも重複排除（同じ商品の画像は1枚に集約）
  const seenImg = new Set<string>();
  return products.filter((p) => {
    if (seenImg.has(p.imageUrl)) return false;
    seenImg.add(p.imageUrl);
    return true;
  });
}

/** "c" や "category" など、カテゴリパスっぽい識別子を除外 */
function isLikelyCategoryPath(id: string): boolean {
  if (id.length <= 2) return true;
  if (/^(c|category|search|item|list)$/i.test(id)) return true;
  return false;
}
