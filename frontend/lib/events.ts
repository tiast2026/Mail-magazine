import type { CampaignEventType } from "./types";

export const EVENT_LABELS: Record<CampaignEventType, string> = {
  marathon: "楽天お買い物マラソン",
  supersale: "楽天スーパーSALE",
  blackfriday: "ブラックフライデー",
  yearend: "年末年始・大感謝祭",
  newyear: "新春初売り",
  newcollection: "新作・新商品",
  preorder: "予約販売",
  restock: "再入荷",
  review: "レビュー依頼",
  regular: "通常配信",
  custom: "その他",
};

export const EVENT_COLORS: Record<CampaignEventType, string> = {
  marathon: "#c25e3a", // やや明るめのオレンジ系（楽天マラソン感）
  supersale: "#a8423d", // 深めの赤
  blackfriday: "#1f1f1f",
  yearend: "#5b3a2a",
  newyear: "#8b6f47",
  newcollection: "#7a8a5d", // 緑系（新緑感）
  preorder: "#7a6e8a", // 紫系（特別感）
  restock: "#5d7a8a", // 青系（在庫の安心感）
  review: "#8a7a5d", // ベージュ系
  regular: "#a89585",
  custom: "#a89585",
};

export const EVENT_ORDER: CampaignEventType[] = [
  "marathon",
  "supersale",
  "blackfriday",
  "yearend",
  "newyear",
  "newcollection",
  "preorder",
  "restock",
  "review",
  "regular",
  "custom",
];

export function getEventLabel(type?: CampaignEventType): string {
  if (!type) return "未指定";
  return EVENT_LABELS[type] ?? type;
}

export function getEventColor(type?: CampaignEventType): string {
  if (!type) return "#a89585";
  return EVENT_COLORS[type] ?? "#a89585";
}
