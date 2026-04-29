export type BrandColors = {
  primary: string;
  accent: string;
  muted: string;
  text: string;
  subtext: string;
  panel: string;
  border: string;
  white: string;
};

export type BrandConfig = {
  id: string;
  name: string;
  tagline: string;
  logoText: string;
  colors: BrandColors;
  channel: "rakuten" | "own";
  rakutenShopUrl?: string;
  siteBaseUrl?: string;
  fixedUrls: Record<string, string>;
  footer: {
    newArrivalsLabel: string;
    reviewLabel: string;
  };
};

export type BrandSummary = {
  id: string;
  name: string;
  default?: boolean;
};

export type Template = {
  id: string;
  name: string;
  description: string;
  useCases: string[];
  productSlots: string;
  html: string;
  requiredProductCount?: { min: number; max: number };
  requiredImages?: Array<{
    key: string;
    label: string;
    description: string;
    recommended?: string;
  }>;
  requiredText?: Array<{
    key: string;
    label: string;
    example?: string;
  }>;
  bestFor?: string[];
  notRecommendedFor?: string[];
  exampleScenario?: string;
};

export type Product = {
  manageNumber?: string;
  name: string;
  url: string;
  imageUrl: string;
  regularPrice?: string;
  salePrice?: string;
  color?: string;
};

export type OutputResults = {
  sentCount?: number;
  openRate?: number;
  clickRate?: number;
  salesCount?: number;
  salesAmount?: number;
  notes?: string;
};

export type CampaignEventType =
  | "marathon" // 楽天お買い物マラソン
  | "supersale" // 楽天スーパーSALE
  | "blackfriday" // ブラックフライデー
  | "yearend" // 年末年始・大感謝祭
  | "newyear" // 新春初売り
  | "newcollection" // 新作・新商品
  | "preorder" // 予約販売
  | "restock" // 再入荷
  | "review" // レビュー依頼
  | "regular" // 通常配信（イベントなし）
  | "custom"; // その他

export type CampaignEvent = {
  type: CampaignEventType;
  name?: string; // 表示名（例: "2026年5月お買い物マラソン"）
  startDate?: string; // ISO 日付（イベント開始）
  endDate?: string; // ISO 日付（イベント終了）
};

export type MailOutput = {
  id: string;
  title: string;
  templateId: string;
  createdAt: string;
  scheduledAt?: string; // 配信予定日時（ISO datetime）
  sentAt?: string; // 実際の配信日時（ISO datetime）
  event?: CampaignEvent;
  products: Product[];
  variables: Record<string, string>;
  html: string;
  results?: OutputResults;
  tags?: string[];
};
