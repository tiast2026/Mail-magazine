# CLAUDE.md — メルマガ管理システム運用ガイド

このリポジトリは楽天店舗向けメルマガ制作・配信実績管理システムです。
このファイルは Claude Code が新セッション開始時に参照する想定で書かれています。

## システム概要

- **AI 生成役**: Claude Code（このセッション）— 楽天 RMS API で商品情報取得 → テンプレに流し込み → outputs.json に追記 → push
- **Web UI**: Vercel 静的ホスティング — 閲覧・プレビュー・HTML コピー・実績入力
- **データ**: リポジトリ内 JSON で一元管理（push が即 Web 反映）
- API 課金は発生しない設計（生成は CLI 側で完結）

## 主要ファイル

| パス | 役割 |
|------|------|
| `frontend/data/templates.json` | 3 パターンのテンプレート（A/B/C）+ メタデータ |
| `frontend/data/outputs.json` | 生成済みメルマガと配信実績 |
| `scripts/fetch-rakuten.mjs` | RMS API で商品情報取得 |
| `scripts/fetch-rakuten-public.mjs` | 公開ページから OGP 取得（フォールバック） |

## 楽天 RMS 認証情報の扱い

**認証情報はリポジトリに保存しません**。Web UI の `/settings` ページで
ユーザーが入力 → ブラウザの localStorage に保存されています。

### セッション開始時のフロー

ユーザーが楽天 RMS API を使う作業（品番からの商品取得など）を依頼してきたら：

1. ユーザーが Web の「設定」ページの「JSONとしてコピー」ボタンを押す → JSON を貼ってもらう
2. その JSON を `data/config.local.json` に書き込む（`.gitignore` 済み、push されない）
3. `scripts/fetch-rakuten.mjs` を実行して商品情報取得
4. セッション終了後はサンドボックス環境ごとファイルが消えるため、永続化されない

ユーザーがまだ JSON を貼ってない場合は、貼ってもらうよう促してから作業に入る。

## メルマガ制作フロー

### パターン1: 品番渡される（API 経由生成）

```bash
node scripts/fetch-rakuten.mjs <品番1> <品番2> ...
```

1. 商品情報取得 → JSON で読み取り
2. テンプレ選定（後述「テンプレ選定ロジック」参照）
3. 必要画像のチェック（不足してたらユーザーに確認）
4. 変数に値を埋めて HTML 生成
5. `frontend/data/outputs.json` に追記
6. commit & push → Vercel 自動デプロイ

### パターン2: 「こういうイベント打ちたい」と相談される

ユーザーから企画概要・商品リスト・画像が共有されたら：

1. **テンプレートを提案**: 商品数・タイミング・訴求ポイントから A/B/C のどれが合うか提案
2. 不足情報があれば確認（画像数、価格、CTA 文言など）
3. 揃ったらパターン1 と同じ流れで生成

### パターン3: 「テンプレB 使いたい」と指定される

1. `templates.json` の B の `requiredImages` / `requiredText` を見て **必要なものを伝える**
2. 揃ったら生成

## テンプレ選定ロジック

| シーン | 推奨テンプレ |
|--------|-------------|
| 新作予約・限定商品の単品プッシュ | A |
| 1〜2 商品の主力訴求 | A |
| 楽天マラソン・SS 開始時の盛り上げ | B |
| 全品クーポン配布告知 | B |
| マラソン終盤・残り24時間の駆け込み | C |
| 「みんなが買った」社会的証明訴求 | C |
| 売れ筋ランキング訴求 | C |

詳細は `templates.json` 各テンプレの `bestFor` / `notRecommendedFor` / `exampleScenario` 参照。

## 過去実績の活用（提案の根拠に使う）

`outputs.json` の各エントリに `results` がある。これを参照して：

- 「前回テンプレBで開封率35%だった商品Xでもう一度送りましょう」
- 「テンプレAの新作予約は反応が良い傾向」
- 「ランキング型は終盤の駆け込みで売上が伸びる」

など、データに基づいた提案を行う。

## 重要な制約

- `data/config.local.json` は **絶対にコミットしない**（`.gitignore` 済み）
- 楽天 RMS 認証情報をチャットに表示・ログ出力しない
- メルマガ生成時、楽天の cabinet 画像 URL は `https://image.rakuten.co.jp/<shopUrl>/cabinet/...` 形式を使う
- HTML 内の改行・特殊文字は楽天 RMS のメルマガ管理画面に貼った時の表示崩れに注意

## デプロイ

- リポジトリ: `tiast2026/Mail-magazine`
- Vercel プロジェクト: `mail-magazine`
- Production Branch: `main`（現在新システム）
- Root Directory: `frontend`
- push でビルド → 自動デプロイ
