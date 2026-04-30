import SettingsForm from "@/components/SettingsForm";
import {
  getAllBrandConfigs,
  getBrandList,
  getDefaultBrandId,
} from "@/lib/data";

export default function SettingsPage() {
  const brands = getBrandList();
  const defaultBrandId = getDefaultBrandId();
  const brandConfigs = getAllBrandConfigs();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">設定</h1>
        <p className="text-stone-600 text-sm">
          ブランドカラー・ボタンスタイルの編集と、楽天 RMS API 認証情報の確認・取得テストができます。
        </p>
      </section>

      <SettingsForm
        brands={brands}
        defaultBrandId={defaultBrandId}
        brandConfigs={brandConfigs}
      />
    </div>
  );
}
