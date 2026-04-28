#!/usr/bin/env node
// 楽天RMS API (Item API v2) で商品情報を取得するスクリプト
//
// 使い方:
//   node scripts/fetch-rakuten.mjs <商品管理番号> [<商品管理番号> ...]
//
// 必要設定: data/config.local.json
//   {
//     "rakutenRms": { "serviceSecret": "...", "licenseKey": "..." },
//     "shopUrl": "noahl"
//   }

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "..", "data", "config.local.json");

let config;
try {
  config = JSON.parse(await fs.readFile(configPath, "utf8"));
} catch (e) {
  console.error(
    `[ERROR] data/config.local.json が見つかりません。data/config.example.json を参考に作成してください。`,
  );
  process.exit(1);
}

const { serviceSecret, licenseKey } = config.rakutenRms ?? {};
if (!serviceSecret || !licenseKey) {
  console.error(
    "[ERROR] config.local.json の rakutenRms.serviceSecret / licenseKey が設定されていません。",
  );
  process.exit(1);
}

const shopUrl = config.shopUrl ?? "";
const auth =
  "ESA " + Buffer.from(`${serviceSecret}:${licenseKey}`).toString("base64");

const manageNumbers = process.argv.slice(2);
if (manageNumbers.length === 0) {
  console.error("Usage: node scripts/fetch-rakuten.mjs <商品管理番号> [...]");
  process.exit(1);
}

async function fetchOne(manageNumber) {
  const url = `https://api.rms.rakuten.co.jp/es/2.0/items/manage-numbers/${encodeURIComponent(manageNumber)}`;
  const res = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    return {
      manageNumber,
      error: `HTTP ${res.status}`,
      detail: text.slice(0, 500),
    };
  }
  const data = await res.json();
  return normalize(manageNumber, data);
}

function normalize(manageNumber, data) {
  const images = data.images ?? data.itemImages ?? [];
  const firstImage =
    (Array.isArray(images) && (images[0]?.location || images[0]?.imageUrl)) ||
    null;
  return {
    manageNumber,
    name: data.title ?? data.itemName ?? null,
    url:
      data.url ??
      (shopUrl
        ? `https://item.rakuten.co.jp/${shopUrl}/${manageNumber}/`
        : null),
    imageUrl: firstImage,
    regularPrice: data.standardPrice ?? data.itemPriceMax ?? null,
    salePrice: data.price ?? data.itemPrice ?? null,
    raw: data,
  };
}

const results = [];
for (const m of manageNumbers) {
  results.push(await fetchOne(m));
}
console.log(JSON.stringify(results, null, 2));
