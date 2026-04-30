# 楽天 R-Mail 実績取り込み Tampermonkey スクリプト

楽天 R-Mail（メルマガ管理）の分析画面から、開封率・送客数・売上などをスクレイプして
Mail-magazine の `outputs.json` に自動取り込みするユーザースクリプトです。

## セットアップ

### 1. Vercel 環境変数を設定

Vercel ダッシュボード → Settings → Environment Variables：

```
RESULTS_INGEST_TOKEN = <長いランダム文字列>
```

例: `openssl rand -hex 32` で生成。

### 2. Tampermonkey をインストール

[Tampermonkey](https://www.tampermonkey.net/) をブラウザに導入。

### 3. ユーザースクリプトをインストール

`tampermonkey/rakuten-rmail-import.user.js` を Tampermonkey に追加：

- Tampermonkey ダッシュボード → 「新規スクリプトを作成」
- ファイル内容を全部コピペ → 保存

または、リポジトリの raw URL を Tampermonkey で開くと自動でインストール画面が立ち上がります。

### 4. 初期設定

楽天 RMS にログイン → R-Mail 分析ページを開く → 右下の「📨 Mail-magazine 取り込み」パネルの ⚙ をクリック：

| 項目 | 値 |
|------|-----|
| API エンドポイント | `https://mail-magazine.vercel.app/api/results/import` |
| Ingest トークン | Vercel に設定したトークン |
| ブランド ID | `noahl`（または対象ブランド） |

「保存」を押す。

## 使い方

1. R-Mail にログインし、`https://rmail.rms.rakuten.co.jp/#/performance/{メルマガID}` を開く
   - 一覧画面（`#/trend`）から個別のメルマガをクリックすれば自動で遷移
2. 右下パネルに「現在のメルマガID: NNNNN」が表示されることを確認
3. **「プレビュー」** をクリック
   - 「推移データを表示」アコーディオンは自動で展開されます
   - スクレイプした JSON とマッチした outputs.json のエントリ名が表示されます
4. 内容が正しければ **「取り込み実行」** をクリック
   - GitHub にコミット → Vercel が再デプロイ → Web に反映

R-Mail は Angular SPA で URL が hash (`#/performance/...`) のみで切り替わります。
スクリプトは hashchange を監視して常に最新のメルマガIDを使います。

## マッチングのロジック

API は次の優先順で `outputs.json` から対象エントリを探します：

1. `outputId`（直接指定）
2. `rakutenMailId`（既に取り込み済みのメルマガ）
3. `subject` + `sentDate`（件名と配信日でマッチ）

初回は件名マッチで取り込まれ、以降は `rakutenMailId` で再取り込みできます。

## 取り込まれるデータ

`outputs.json` の各エントリの `results.rakuten` 以下に保存されます。
`results` 直下にも主要指標（sentCount / openRate / clickCount / salesCount / salesAmount）がコピーされ、
既存の Web UI でそのまま見られます。

## トラブルシューティング

- **「対応するメルマガが見つかりません」** → R-Mail の件名と outputs.json の `title` が一致しているか確認。
  必要なら手動で outputs.json の `results.rakuten.mailId` を埋めてから再取り込み。
- **DOM が変わってスクレイプ失敗** → `parseNumber` / ラベル文字列を調整。
  `extractMainMetrics()` のラベル一覧で網羅しています。
- **CORS エラー** → API は `*.rakuten.co.jp` を許可済み。Tampermonkey の `@connect` も許可されているか確認。
