export interface Client {
  id: number;
  name: string;
  industry: string;
  tone_description: string;
  mall_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ClientMallSetting {
  id: number;
  client_id: number;
  mall_type: string;
  base_url: string;
  image_base_url: string;
  html_rules: Record<string, any>;
  footer_html: string;
}

export interface Product {
  id: number;
  client_id: number;
  product_name: string;
  description: string;
  price: number;
  category: string;
  image_urls: string[];
  mall_urls: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: number;
  client_id: number | null;
  name: string;
  base_html: string;
  thumbnail: string;
  slots: TemplateSlot[];
  created_at: string;
}

export interface TemplateSlot {
  id: number;
  template_id: number;
  slot_key: string;
  slot_type: string;
  default_prompt: string;
  sort_order: number;
}

export interface GeneratedNewsletter {
  id: number;
  client_id: number;
  subject: string;
  html_ec: string;
  html_rakuten: string;
  prompt_used: string;
  generation_params: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GenerateRequest {
  client_id: number;
  template_id: number;
  product_ids: number[];
  purpose: string;
  additional_instructions: string;
  reference_newsletter_ids: number[];
}

export interface GenerateResponse {
  id: number;
  subject: string;
  html_ec: string;
  html_rakuten: string;
}

export interface DashboardStats {
  generated_this_month: number;
  pending_download: number;
  product_count: number;
}
