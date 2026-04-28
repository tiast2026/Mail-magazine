export type Template = {
  id: string;
  name: string;
  description: string;
  useCases: string[];
  productSlots: string;
  html: string;
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
