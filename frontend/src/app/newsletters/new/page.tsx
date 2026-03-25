"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { cn, formatPrice } from "@/lib/utils";
import type {
  Client,
  Product,
  Template,
  GeneratedNewsletter,
} from "@/types";

const PURPOSES = [
  { value: "sale", label: "セール告知" },
  { value: "new_product", label: "新商品紹介" },
  { value: "seasonal", label: "季節提案" },
  { value: "repeat", label: "リピート促進" },
];

const STEPS = ["クライアント・目的", "テンプレート・商品", "追加設定", "生成"];

export default function NewsletterNewPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState("sale");

  // Step 2
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Step 3
  const [subject, setSubject] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [referenceNewsletters, setReferenceNewsletters] = useState<GeneratedNewsletter[]>([]);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<number[]>([]);
  const [suggestingSubject, setSuggestingSubject] = useState(false);

  // General
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getClients()
      .then((data) => {
        setClients(data);
        if (data.length > 0) setSelectedClientId(data[0].id);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const loadTemplatesAndProducts = useCallback(async (clientId: number) => {
    try {
      const [t, p] = await Promise.all([
        api.getTemplates(clientId),
        api.getProducts({ client_id: clientId }),
      ]);
      setTemplates(t);
      setProducts(p);
    } catch {
      setTemplates([]);
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadTemplatesAndProducts(selectedClientId);
      api
        .getNewsletters({ client_id: selectedClientId })
        .then(setReferenceNewsletters)
        .catch(() => setReferenceNewsletters([]));
    }
  }, [selectedClientId, loadTemplatesAndProducts]);

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      !productSearch ||
      p.product_name.toLowerCase().includes(productSearch.toLowerCase());
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const toggleProduct = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSuggestSubject = async () => {
    if (!selectedClientId) return;
    setSuggestingSubject(true);
    try {
      const res = await api.suggestSubject({
        client_id: selectedClientId,
        purpose,
        product_ids: selectedProductIds,
      });
      if (res.subjects.length > 0) {
        setSubject(res.subjects[0]);
      }
    } catch {
      setError("件名の提案に失敗しました");
    } finally {
      setSuggestingSubject(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedClientId || !selectedTemplateId) return;
    setGenerating(true);
    setError("");
    try {
      const res = await api.generate({
        client_id: selectedClientId,
        template_id: selectedTemplateId,
        product_ids: selectedProductIds,
        purpose,
        additional_instructions: additionalInstructions,
        reference_newsletter_ids: selectedReferenceIds,
      });
      router.push(`/newsletters/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
      setGenerating(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedClientId !== null;
      case 1:
        return selectedTemplateId !== null && selectedProductIds.length > 0;
      case 2:
        return true;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">メルマガ生成</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <button
              onClick={() => i < currentStep && setCurrentStep(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                i === currentStep
                  ? "bg-blue-600 text-white"
                  : i < currentStep
                  ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                  : "bg-gray-200 text-gray-400"
              )}
            >
              {i + 1}
            </button>
            <span
              className={cn(
                "text-sm font-medium",
                i === currentStep ? "text-gray-900" : "text-gray-400"
              )}
            >
              {step}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-px w-12",
                  i < currentStep ? "bg-blue-400" : "bg-gray-200"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Step 1: Client & Purpose */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">クライアント選択</h2>
            <select
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              value={selectedClientId ?? ""}
              onChange={(e) => setSelectedClientId(Number(e.target.value))}
            >
              <option value="" disabled>
                クライアントを選択してください
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">配信目的</h2>
            <div className="grid grid-cols-2 gap-4">
              {PURPOSES.map((p) => (
                <label
                  key={p.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors",
                    purpose === p.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="purpose"
                    value={p.value}
                    checked={purpose === p.value}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm font-medium">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Template & Products */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">テンプレート選択</h2>
            {templates.length === 0 ? (
              <p className="text-sm text-gray-400">テンプレートがありません</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={cn(
                      "rounded-lg border-2 p-4 text-left transition-colors",
                      selectedTemplateId === t.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="mb-3 flex h-32 items-center justify-center rounded bg-gray-100 text-gray-400">
                      {t.thumbnail ? (
                        <img
                          src={t.thumbnail}
                          alt={t.name}
                          className="h-full w-full rounded object-cover"
                        />
                      ) : (
                        <span className="text-3xl">📄</span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {t.slots?.length ?? 0} スロット
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">商品選択</h2>
            <div className="mb-4 flex gap-4">
              <input
                type="text"
                placeholder="商品名で検索..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">すべてのカテゴリ</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <p className="mb-2 text-sm text-gray-500">
              {selectedProductIds.length} 件選択中
            </p>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="px-4 py-2 font-medium">選択</th>
                    <th className="px-4 py-2 font-medium">商品名</th>
                    <th className="px-4 py-2 font-medium">価格</th>
                    <th className="px-4 py-2 font-medium">カテゴリ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        商品がありません
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(p.id)}
                            onChange={() => toggleProduct(p.id)}
                            className="h-4 w-4 rounded text-blue-600"
                          />
                        </td>
                        <td className="px-4 py-2">{p.product_name}</td>
                        <td className="px-4 py-2">{formatPrice(p.price)}</td>
                        <td className="px-4 py-2 text-gray-500">
                          {p.category}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Additional Settings */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">件名</h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="メルマガの件名を入力..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleSuggestSubject}
                disabled={suggestingSubject}
                className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {suggestingSubject ? "提案中..." : "AI提案"}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">追加指示</h2>
            <textarea
              placeholder="AIへの追加指示を入力してください（任意）..."
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">参考メルマガ（任意）</h2>
            {referenceNewsletters.length === 0 ? (
              <p className="text-sm text-gray-400">
                過去のメルマガがありません
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {referenceNewsletters.map((nl) => (
                  <label
                    key={nl.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedReferenceIds.includes(nl.id)}
                      onChange={() =>
                        setSelectedReferenceIds((prev) =>
                          prev.includes(nl.id)
                            ? prev.filter((x) => x !== nl.id)
                            : [...prev, nl.id]
                        )
                      }
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span className="text-sm">{nl.subject}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Generate */}
      {currentStep === 3 && (
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-6 text-6xl">✨</div>
            <h2 className="mb-2 text-xl font-bold">メルマガを生成</h2>
            <p className="mb-6 text-sm text-gray-500">
              設定内容を確認して、生成ボタンを押してください。
            </p>
            <div className="mb-6 space-y-2 rounded-lg bg-gray-50 p-4 text-left text-sm">
              <p>
                <span className="font-medium text-gray-500">クライアント：</span>
                {clients.find((c) => c.id === selectedClientId)?.name}
              </p>
              <p>
                <span className="font-medium text-gray-500">目的：</span>
                {PURPOSES.find((p) => p.value === purpose)?.label}
              </p>
              <p>
                <span className="font-medium text-gray-500">テンプレート：</span>
                {templates.find((t) => t.id === selectedTemplateId)?.name}
              </p>
              <p>
                <span className="font-medium text-gray-500">選択商品数：</span>
                {selectedProductIds.length} 件
              </p>
              {subject && (
                <p>
                  <span className="font-medium text-gray-500">件名：</span>
                  {subject}
                </p>
              )}
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  生成中...
                </span>
              ) : (
                "メルマガを生成する"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={currentStep === 0}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:invisible"
        >
          戻る
        </button>
        {currentStep < 3 && (
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed()}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            次へ
          </button>
        )}
      </div>
    </div>
  );
}
