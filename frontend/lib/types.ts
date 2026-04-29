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

export type MailOutput = {
  id: string;
  title: string;
  templateId: string;
  createdAt: string;
  sentAt?: string;
  products: Product[];
  variables: Record<string, string>;
  html: string;
  results?: OutputResults;
  tags?: string[];
};
