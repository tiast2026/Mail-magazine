import SettingsForm from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">設定</h1>
        <p className="text-stone-600 text-sm">
          楽天 RMS の認証情報をブラウザに保存します。Claude Code への指示時に
          「JSONとしてコピー」ボタンでコピー → チャットに貼って使ってください。
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mt-3">
          ⚠️ 認証情報はこのブラウザの localStorage にのみ保存されます。サーバーには送信されません。
          別の端末でも使う場合は、その端末でも入力が必要です。
        </p>
      </section>

      <SettingsForm />
    </div>
  );
}
