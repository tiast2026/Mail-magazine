# scripts/

Claude Code がメルマガ生成時に使用する補助スクリプト群。

## fetch-rakuten.mjs（認証あり・推奨）

楽天RMS API (Item API v2) で商品情報を取得します。
通常価格・販売価格・色違いなど詳細情報まで取れます。

### 事前準備

`data/config.local.json` に楽天RMSの認証情報を入れてください（`.gitignore` 済み）。

```json
{
  "rakutenRms": {
    "serviceSecret": "XXXXXXXX",
    "licenseKey": "XXXXXXXX"
  },
  "shopUrl": "noahl"
}
```

### 使い方

```bash
node scripts/fetch-rakuten.mjs ABC123
node scripts/fetch-rakuten.mjs ABC123 DEF456 GHI789
```

商品名・販売価格・通常価格・1枚目画像URL・商品ページURL が JSON で返ります。

## fetch-rakuten-public.mjs（認証なしフォールバック）

楽天市場の公開商品ページから OGP メタタグをスクレイピングして商品情報を取得します。
認証情報がまだ無い時のテスト用、または閲覧側で十分な情報が取れる場合に使用。

```bash
# URL指定
node scripts/fetch-rakuten-public.mjs https://item.rakuten.co.jp/noahl/abc123/
# ショップURL + 品番指定
node scripts/fetch-rakuten-public.mjs noahl abc123
```

商品名・画像URL・URLが取得できます。価格は取得できる場合とできない場合があります（楽天の表示形式により）。

## メルマガ生成の流れ（Claude Code で実行）

1. ユーザー: 「品番ABC123でセール告知メルマガ作って」
2. Claude: `node scripts/fetch-rakuten.mjs ABC123` で商品情報取得
3. Claude: テンプレB を `frontend/data/templates.json` から読み出し、変数を商品情報で埋める
4. Claude: `frontend/data/outputs.json` に新エントリ追記（id, title, products, html, etc.）
5. Claude: commit & push → GitHub Pages 自動デプロイ → Web で確認可能
