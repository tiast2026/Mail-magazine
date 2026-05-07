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

/**
 * 楽天 R-Mail 互換のボタンスタイル定義（用途別）。
 * テンプレ／メルマガ HTML 内では `{{BUTTON:type|url|label}}` マクロで利用し、
 * applyBrandToHtml() が下記スタイルを使った <table>+<a> ブロックに展開する。
 */
export type ButtonStyle = {
  /** 背景色（hex） */
  bg: string;
  /** 文字色（hex） */
  fg: string;
  /** 横幅（"80%" / "100%" など） */
  width?: string;
  /** font size 属性（"1"〜"7"） */
  size?: string;
  /** padding（CSS 値） */
  padding?: string;
  /** 枠線色（hex／null で枠線なし） */
  border?: string | null;
};

export type BrandButtons = {
  /** クーポン取得など最も強い CTA。デフォルトは accent 色 */
  coupon: ButtonStyle;
  /** 商品ページへの主 CTA。デフォルトは primary 色 */
  product: ButtonStyle;
  /** 補助 CTA（新作一覧／もっと見る等）。デフォルトは panel 背景＋primary 文字 */
  secondary: ButtonStyle;
};

export type BrandConfig = {
  id: string;
  name: string;
  tagline: string;
  logoText: string;
  colors: BrandColors;
  /** ボタン用途別スタイル。未設定の場合は colors からフォールバック */
  buttons?: BrandButtons;
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
  /** 完成版プレビュー用のサンプルデータ */
  sampleVariables?: Record<string, string>;
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

export type DeviceMetric = {
  device: "pc" | "smartphone" | "tablet" | "app" | "total";
  opens?: number;
  openRate?: number;
  clicks?: number;
  sent?: number;
  sendRate?: number;
  favorites?: number;
  favoriteRate?: number;
  conversions?: number;
  conversionRate?: number;
  revenue?: number;
};

export type DailyMetric = {
  date: string; // YYYY-MM-DD
  opens?: number;
  sends?: number;
  conversions?: number;
};

export type RakutenRMailMetrics = {
  /** R-Mail 管理画面のメルマガID（例: "26431856"） */
  mailId?: string;
  /** R-Mail で記録されている件名（取り込み確認用） */
  subject?: string;
  /** 配信開始日時（R-Mail から取得） */
  sentStartAt?: string;
  /** 配信完了日時 */
  sentEndAt?: string;
  /** R-Mail のリスト条件（配信対象セグメント。「指定はありません」= 全件） */
  listCondition?: string;
  /** 集計期間 */
  aggregateFrom?: string;
  aggregateTo?: string;
  /** 送客率（%） */
  conversionVisitRate?: number;
  /** 送客数 */
  conversionVisitCount?: number;
  /** 開封率前月比（pt） */
  openRateDiffPt?: number;
  /** 送客率前月比（pt） */
  conversionVisitRateDiffPt?: number;
  /** お気に入り登録数 */
  favoriteCount?: number;
  favoriteRate?: number;
  /** 転換数（購入数） */
  transactionCount?: number;
  transactionRate?: number;
  /** 売上/通 */
  revenuePerSent?: number;
  /** デバイス別 */
  deviceBreakdown?: DeviceMetric[];
  /** 日別推移 */
  dailyTrend?: DailyMetric[];
  /** Tampermonkey から取り込んだ日時 */
  importedAt?: string;
  /** 取り込み元 URL */
  sourceUrl?: string;
};

export type AiAnalysis = {
  /** ISO 8601 */
  analyzedAt: string;
  /** 使用モデル ID（例: "claude-sonnet-4-6"） */
  model: string;
  /** 1〜5 の総合スコア（5: 大成功 / 1: 大苦戦） */
  score: number;
  /** 1〜2行の総括。リスト先頭で表示 */
  summary: string;
  /** 良かった点（コピー・件名・タイミング・商品力など切り口別） */
  strengths: string[];
  /** 改善余地のある点（数値根拠付き） */
  weaknesses: string[];
  /** 次回への具体的アクション提案 */
  nextActions: string[];
  /** 比較に使った過去メルマガの id 一覧（再現性確保） */
  comparedAgainst?: string[];
};

export type OutputResults = {
  sentCount?: number;
  openRate?: number;
  openCount?: number;
  clickRate?: number;
  clickCount?: number;
  salesCount?: number;
  salesAmount?: number;
  notes?: string;
  /** 振り返り評価 (1-5) */
  rating?: number;
  /** 楽天 R-Mail から自動取り込みしたメトリクス */
  rakuten?: RakutenRMailMetrics;
  /** AI による配信実績の自動分析（配信から7日以上経過後に生成） */
  aiAnalysis?: AiAnalysis;
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

export type Coupon = {
  label: string; // 表示名（例: "50%OFF クーポン"）
  url: string; // 楽天クーポン取得URL
  rate?: number; // 割引率（%）
  startDate?: string; // ISO
  endDate?: string; // ISO
  note?: string; // 補足（例: "5/5 のみ" 等）
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
  coupons?: Coupon[]; // 使用したクーポン
  html: string;
  results?: OutputResults;
  tags?: string[];
};
