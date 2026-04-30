import type { CampaignEventType } from "./types";
import eventsData from "@/data/events.json";

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
  marathon: "#c25e3a",
  supersale: "#a8423d",
  blackfriday: "#1f1f1f",
  yearend: "#5b3a2a",
  newyear: "#8b6f47",
  newcollection: "#7a8a5d",
  preorder: "#7a6e8a",
  restock: "#5d7a8a",
  review: "#8a7a5d",
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

/** events.json から取り込んだ楽天キャンペーンカレンダー用の型と関数 */

export type RakutenCalendarEvent = {
  type: string;
  category: string;
  name: string;
  announcementDate: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  pageUrl: string | null;
};

/** events.json の全カテゴリを取得（unique） */
export function getCalendarCategories(): string[] {
  const set = new Set<string>();
  for (const e of eventsData.events as RakutenCalendarEvent[]) {
    if (e.category) set.add(e.category);
  }
  return Array.from(set);
}

export function getCalendarEvents(): RakutenCalendarEvent[] {
  return eventsData.events as RakutenCalendarEvent[];
}

/** カテゴリ別のブランド適合カラー（ナチュラルトーン） */
export const CALENDAR_CATEGORY_COLORS: Record<string, string> = {
  お買い物マラソン: "#8c7b6b",
  楽天スーパーSALE: "#4a3b2d",
  ブラックフライデー: "#3a342f",
  大感謝祭: "#5b3a2a",
  初売り: "#8b6f47",
  ワンダフルデー: "#a89585",
  "5と0のつく日": "#b5a595",
  "18日ご愛顧感謝デー": "#c5b59a",
  "Rakuten Fashion": "#625142",
};

export function getCalendarColor(category: string): string {
  return CALENDAR_CATEGORY_COLORS[category] ?? "#a89585";
}

