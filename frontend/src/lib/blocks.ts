export type BlockType =
  | "header"
  | "banner"
  | "message"
  | "productSingle"
  | "productGrid"
  | "ctaButton"
  | "couponButton"
  | "divider"
  | "textLink"
  | "footer";

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
}

export interface PaletteItem {
  type: BlockType;
  label: string;
  icon: string;
}

export const paletteItems: PaletteItem[] = [
  { type: "header", label: "ヘッダー", icon: "🏷" },
  { type: "banner", label: "バナー画像", icon: "🖼" },
  { type: "message", label: "メッセージ", icon: "💬" },
  { type: "productSingle", label: "商品（大）", icon: "👗" },
  { type: "productGrid", label: "商品グリッド", icon: "▦" },
  { type: "ctaButton", label: "CTAボタン", icon: "▶" },
  { type: "couponButton", label: "クーポン", icon: "🎟" },
  { type: "divider", label: "区切り線", icon: "─" },
  { type: "textLink", label: "テキストリンク", icon: "🔗" },
  { type: "footer", label: "フッター", icon: "📋" },
];

export function getDefaultProps(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "header":
      return {
        brandName: "ＮＯＡＨＬ",
        subtitle: "ノアル / レディースファッション",
      };
    case "banner":
      return {
        imageUrl: "",
        linkUrl: "https://example.com",
        altText: "バナー画像",
      };
    case "message":
      return {
        subtitle: "NEW ARRIVAL",
        title: "新作アイテムが入荷しました",
        description:
          "今シーズンのおすすめアイテムをご紹介いたします。\nぜひご覧くださいませ。",
        bgColor: "#f7f4f1",
      };
    case "productSingle":
      return {
        imageUrl: "",
        productName: "商品名をここに入力",
        originalPrice: "¥12,800",
        salePrice: "¥9,800",
        linkUrl: "https://example.com",
        buttonText: "商品を見る →",
        rank: "",
      };
    case "productGrid":
      return {
        columns: 2,
        rows: 2,
        products: [
          { imageUrl: "", linkUrl: "https://example.com", altText: "商品1" },
          { imageUrl: "", linkUrl: "https://example.com", altText: "商品2" },
          { imageUrl: "", linkUrl: "https://example.com", altText: "商品3" },
          { imageUrl: "", linkUrl: "https://example.com", altText: "商品4" },
        ],
      };
    case "ctaButton":
      return {
        text: "詳しくはこちら →",
        linkUrl: "https://example.com",
        bgColor: "#8c7b6b",
      };
    case "couponButton":
      return {
        text: "クーポンを獲得する →",
        linkUrl: "https://example.com",
      };
    case "divider":
      return {};
    case "textLink":
      return {
        text: "▽ 新作一覧を見る ▽",
        linkUrl: "https://example.com",
      };
    case "footer":
      return {
        newItemsUrl: "https://example.com/new",
        reviewUrl: "https://example.com/review",
      };
    default:
      return {};
  }
}

export function createBlock(type: BlockType, propsOverride?: Record<string, unknown>): Block {
  return {
    id: crypto.randomUUID(),
    type,
    props: { ...getDefaultProps(type), ...propsOverride },
  };
}

export interface TemplateDefinition {
  name: string;
  blocks: Array<{ type: BlockType; props?: Record<string, unknown> }>;
}

export const templates: TemplateDefinition[] = [
  {
    name: "新商品紹介（自社EC）",
    blocks: [
      { type: "header" },
      { type: "banner", props: { altText: "新作バナー" } },
      {
        type: "message",
        props: {
          subtitle: "NEW ARRIVAL",
          title: "新作アイテムが入荷しました",
          description:
            "今シーズンのトレンドを取り入れた新作アイテムが続々入荷中。\nぜひお気に入りの一着を見つけてください。",
        },
      },
      {
        type: "productGrid",
        props: {
          columns: 2,
          rows: 2,
          products: [
            { imageUrl: "", linkUrl: "https://example.com", altText: "新作1" },
            { imageUrl: "", linkUrl: "https://example.com", altText: "新作2" },
            { imageUrl: "", linkUrl: "https://example.com", altText: "新作3" },
            { imageUrl: "", linkUrl: "https://example.com", altText: "新作4" },
          ],
        },
      },
      { type: "ctaButton", props: { text: "新作一覧を見る →" } },
      {
        type: "message",
        props: {
          subtitle: "TOPICS",
          title: "今週のおすすめ特集",
          description: "スタッフが厳選したコーディネートをご紹介。",
          bgColor: "#f7f4f1",
        },
      },
      {
        type: "productGrid",
        props: {
          columns: 2,
          rows: 1,
          products: [
            { imageUrl: "", linkUrl: "https://example.com", altText: "特集1" },
            { imageUrl: "", linkUrl: "https://example.com", altText: "特集2" },
          ],
        },
      },
      {
        type: "banner",
        props: { altText: "LINE友だち追加", imageUrl: "", linkUrl: "https://example.com" },
      },
      { type: "ctaButton", props: { text: "公式サイトを見る →" } },
      { type: "footer" },
    ],
  },
  {
    name: "商品フォーカス（楽天）",
    blocks: [
      { type: "header" },
      {
        type: "message",
        props: {
          subtitle: "PICK UP",
          title: "今週の注目アイテム",
          description: "スタッフイチオシのアイテムをご紹介します。",
        },
      },
      {
        type: "productSingle",
        props: {
          productName: "メイン商品名",
          originalPrice: "¥15,800",
          salePrice: "¥11,800",
          buttonText: "商品ページを見る →",
        },
      },
      {
        type: "productGrid",
        props: {
          columns: 2,
          rows: 1,
          products: [
            { imageUrl: "", linkUrl: "https://example.com", altText: "カラー1" },
            { imageUrl: "", linkUrl: "https://example.com", altText: "カラー2" },
          ],
        },
      },
      { type: "ctaButton", props: { text: "カラー一覧を見る →" } },
      { type: "divider" },
      {
        type: "productSingle",
        props: {
          productName: "サブ商品名",
          originalPrice: "¥9,800",
          salePrice: "¥7,800",
          buttonText: "商品を見る →",
        },
      },
      { type: "footer" },
    ],
  },
  {
    name: "セール告知（楽天）",
    blocks: [
      { type: "header" },
      { type: "banner", props: { altText: "セールバナー" } },
      {
        type: "message",
        props: {
          subtitle: "SALE",
          title: "期間限定セール開催中！",
          description:
            "お得なクーポンをご用意しました。\nこの機会をお見逃しなく。",
        },
      },
      { type: "couponButton", props: { text: "1,000円OFFクーポンを獲得 →" } },
      { type: "divider" },
      {
        type: "productSingle",
        props: {
          productName: "注目のセール商品",
          originalPrice: "¥14,800",
          salePrice: "¥9,800",
          buttonText: "セール商品を見る →",
        },
      },
      {
        type: "productGrid",
        props: {
          columns: 2,
          rows: 1,
          products: [
            { imageUrl: "", linkUrl: "https://example.com", altText: "セール商品1" },
            { imageUrl: "", linkUrl: "https://example.com", altText: "セール商品2" },
          ],
        },
      },
      { type: "footer" },
    ],
  },
  {
    name: "ランキング（楽天）",
    blocks: [
      { type: "header" },
      { type: "banner", props: { altText: "ランキングバナー" } },
      {
        type: "message",
        props: {
          subtitle: "RANKING",
          title: "人気ランキング TOP3",
          description: "今週の売れ筋アイテムをご紹介。",
        },
      },
      {
        type: "productSingle",
        props: {
          rank: "1",
          productName: "ランキング1位 商品名",
          originalPrice: "¥12,800",
          salePrice: "¥9,800",
          buttonText: "商品を見る →",
        },
      },
      { type: "divider" },
      {
        type: "productSingle",
        props: {
          rank: "2",
          productName: "ランキング2位 商品名",
          originalPrice: "¥10,800",
          salePrice: "¥8,800",
          buttonText: "商品を見る →",
        },
      },
      { type: "divider" },
      {
        type: "productSingle",
        props: {
          rank: "3",
          productName: "ランキング3位 商品名",
          originalPrice: "¥9,800",
          salePrice: "¥7,800",
          buttonText: "商品を見る →",
        },
      },
      { type: "couponButton", props: { text: "クーポンを獲得する →" } },
      { type: "footer" },
    ],
  },
  {
    name: "新商品紹介（楽天）",
    blocks: [
      { type: "header" },
      {
        type: "message",
        props: {
          subtitle: "NEW ARRIVAL",
          title: "新商品のご案内",
          description: "新しいアイテムが入荷しました。ぜひチェックしてください。",
        },
      },
      {
        type: "productGrid",
        props: {
          columns: 2,
          rows: 2,
          products: [
            { imageUrl: "", linkUrl: "https://example.com", altText: "新商品1" },
            { imageUrl: "", linkUrl: "https://example.com", altText: "新商品2" },
            { imageUrl: "", linkUrl: "https://example.com", altText: "新商品3" },
            { imageUrl: "", linkUrl: "https://example.com", altText: "新商品4" },
          ],
        },
      },
      { type: "textLink", props: { text: "▽ 新作一覧を見る ▽" } },
      { type: "couponButton", props: { text: "500円OFFクーポンを獲得 →" } },
      { type: "footer" },
    ],
  },
];

export function loadTemplate(template: TemplateDefinition): Block[] {
  return template.blocks.map((b) => createBlock(b.type, b.props));
}
