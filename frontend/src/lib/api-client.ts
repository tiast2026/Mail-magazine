import type {
  Client,
  Product,
  Template,
  GeneratedNewsletter,
  GenerateRequest,
  GenerateResponse,
  DashboardStats,
} from "@/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API Error");
  }
  return res.json();
}

export const api = {
  // Clients
  getClients: () => fetchApi<Client[]>("/clients"),
  getClient: (id: number) => fetchApi<Client>(`/clients/${id}`),
  createClient: (data: Partial<Client>) =>
    fetchApi<Client>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateClient: (id: number, data: Partial<Client>) =>
    fetchApi<Client>(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Products
  getProducts: (params?: {
    client_id?: number;
    category?: string;
    search?: string;
  }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== "")
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : "";
    return fetchApi<Product[]>(`/products${query ? `?${query}` : ""}`);
  },
  getProduct: (id: number) => fetchApi<Product>(`/products/${id}`),
  createProduct: (data: Partial<Product>) =>
    fetchApi<Product>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProduct: (id: number, data: Partial<Product>) =>
    fetchApi<Product>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: number) =>
    fetchApi<void>(`/products/${id}`, { method: "DELETE" }),
  importCsv: async (file: File, clientId: number) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("client_id", String(clientId));
    const res = await fetch(`${API_BASE}/products/import-csv`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Import failed");
    return res.json();
  },

  // Templates
  getTemplates: (clientId?: number) =>
    fetchApi<Template[]>(
      `/templates${clientId ? `?client_id=${clientId}` : ""}`
    ),
  getTemplate: (id: number) => fetchApi<Template>(`/templates/${id}`),

  // Newsletters
  getNewsletters: (params?: { client_id?: number; status?: string }) => {
    const query = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== "")
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : "";
    return fetchApi<GeneratedNewsletter[]>(
      `/newsletters${query ? `?${query}` : ""}`
    );
  },
  getNewsletter: (id: number) =>
    fetchApi<GeneratedNewsletter>(`/newsletters/${id}`),

  // Generation
  generate: (data: GenerateRequest) =>
    fetchApi<GenerateResponse>("/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  regenerateSlot: (id: number, slotKey: string, instruction: string) =>
    fetchApi<GenerateResponse>(`/generate/${id}/regenerate-slot`, {
      method: "POST",
      body: JSON.stringify({ slot_key: slotKey, instruction }),
    }),
  suggestSubject: (data: {
    client_id: number;
    purpose: string;
    product_ids: number[];
  }) =>
    fetchApi<{ subjects: string[] }>("/generate/suggest-subject", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Dashboard
  getDashboardStats: (clientId: number) =>
    fetchApi<DashboardStats>(`/clients/${clientId}/dashboard-stats`),
};
