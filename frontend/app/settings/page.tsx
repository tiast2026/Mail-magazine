import SettingsForm from "@/components/SettingsForm";
import { getBrandList, getDefaultBrandId } from "@/lib/data";

export default function SettingsPage() {
  const brands = getBrandList();
  const defaultBrandId = getDefaultBrandId();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">設定</h1>
        <p className="text-stone-600 text-sm">
          各ブランドの楽天 RMS API 認証情報の設定方法と、商品取得テストができます。
        </p>
      </section>

      <SettingsForm brands={brands} defaultBrandId={defaultBrandId} />
    </div>
  );
}
