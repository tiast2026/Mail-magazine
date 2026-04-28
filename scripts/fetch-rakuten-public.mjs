#!/usr/bin/env node
// 楽天市場の公開商品ページから商品情報をスクレイピング
// （認証情報不要・OGP メタタグから取得）
//
// 使い方:
//   node scripts/fetch-rakuten-public.mjs <商品URL>
//   node scripts/fetch-rakuten-public.mjs <ショップURL> <商品管理番号>
//
// 例:
//   node scripts/fetch-rakuten-public.mjs https://item.rakuten.co.jp/noahl/abc123/
//   node scripts/fetch-rakuten-public.mjs noahl abc123

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "Usage: node scripts/fetch-rakuten-public.mjs <URL>\n       node scripts/fetch-rakuten-public.mjs <shopUrl> <itemCode>",
  );
  process.exit(1);
}

let url;
let manageNumber = null;
if (args.length === 1 && args[0].startsWith("http")) {
  url = args[0];
  const m = url.match(/item\.rakuten\.co\.jp\/[^\/]+\/([^\/?#]+)/);
  if (m) manageNumber = m[1];
} else if (args.length >= 2) {
  url = `https://item.rakuten.co.jp/${args[0]}/${args[1]}/`;
  manageNumber = args[1];
} else {
  console.error("引数が不正です");
  process.exit(1);
}

const res = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept-Language": "ja",
  },
});
if (!res.ok) {
  console.error(`HTTP ${res.status} ${url}`);
  process.exit(1);
}
const html = await res.text();

function ogp(name) {
  const re = new RegExp(
    `<meta[^>]*property=["']og:${name}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : null;
}
function metaName(name) {
  const re = new RegExp(
    `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : null;
}
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// 価格抽出（複数パターン試行）
let price = null;
const priceMatches = [
  /<meta[^>]*itemprop=["']price["'][^>]*content=["']([\d,]+)["']/i,
  /"price"\s*:\s*"?([\d,]+)"?/,
  /([\d,]+)\s*円(?:\s*\(税込\))?/,
];
for (const re of priceMatches) {
  const m = html.match(re);
  if (m) {
    price = m[1].replace(/,/g, "");
    break;
  }
}

const result = {
  manageNumber,
  url,
  name: ogp("title") || metaName("title"),
  imageUrl: ogp("image"),
  description: ogp("description") || metaName("description"),
  price: price ? `${Number(price).toLocaleString()}円` : null,
};

console.log(JSON.stringify(result, null, 2));
