import SettingsForm from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">設定</h1>
        <p className="text-stone-600 text-sm">
          楽天 RMS API の認証情報設定状況、および商品取得テストができます。
        </p>
      </section>

      <SettingsForm />
    </div>
  );
}
