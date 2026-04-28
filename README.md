# NOAHL メルマガ管理システム

楽天店舗 NOAHL のメルマガ制作・管理・実績トラッキングを行うシステム。

## 仕組み

- **AI生成役**: Claude Code（CLI）— 楽天RMS APIで商品情報を取得し、テンプレートに流し込んでメルマガHTMLを生成
- **Web UI**: Vercel でホスティング — テンプレート/メルマガの閲覧・プレビュー・HTMLコピー・実績入力
- **データ**: リポジトリ内 JSON ファイルで一元管理（push で Web 自動更新）

API課金が発生しないよう、AI生成は Claude Code 側で実行し、Web は閲覧専用に徹しています。

## ディレクトリ構成

```
.
├── frontend/                 Next.js（Vercel デプロイ）
│   ├── app/                  ページ
│   ├── components/           UIコンポーネント
│   ├── lib/                  データ取得・型定義
│   └── data/
│       ├── templates.json    3パターンのメルマガテンプレ
│       └── outputs.json      生成済みメルマガ一覧
├── scripts/
│   └── fetch-rakuten.mjs     楽天RMS API商品情報取得
└── data/
    ├── config.example.json   認証情報サンプル
    └── config.local.json     実際の認証情報（gitignore）
```

## セットアップ

### 1. 認証情報の登録

`data/config.local.json` を作成:

```json
{
  "rakutenRms": {
    "serviceSecret": "（RMSから発行）",
    "licenseKey": "（RMSから発行）"
  },
  "shopUrl": "noahl"
}
```

このファイルは `.gitignore` 済みなので push されません。

### 2. ローカル動作確認

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

### 3. Vercel デプロイ

1. https://vercel.com/new で「Import Git Repository」→ `tiast2026/Mail-magazine` を選択
2. **Root Directory** を `frontend` に変更（Next.js が `frontend/` 配下にあるため）
3. Framework Preset は自動で `Next.js` が選ばれる
4. 「Deploy」を押すだけ

push のたびに自動で再デプロイされます。Privateリポジトリでも無料プランで利用可能です。

## 使い方（メルマガ制作フロー）

1. **Claude Code に指示**:
   「品番ABC123でセール告知メルマガ作って」
2. **Claude が実行**:
   - `node scripts/fetch-rakuten.mjs ABC123` で商品情報取得
   - 商品の特性・タイミングからテンプレを提案（または指定）
   - テンプレに変数を流し込んで HTML 生成
   - `frontend/data/outputs.json` に追記
   - commit & push
3. **Web で確認**: Vercel デプロイ先で `配信メルマガ` から該当メルマガを開く → プレビュー確認 → 「HTMLをコピー」で楽天RMSのメルマガ管理にペースト
4. **配信後**: Web の実績フォームに開封率・クリック率・売上を入力 → JSON出力 → Claude に渡して `outputs.json` 永続化

## テンプレート

| ID | 名前 | 用途 | 商品数 |
|----|------|------|--------|
| A | 商品フォーカス型 | 新作予約・限定商品の主力訴求 | 1〜2 |
| B | セール告知型 | 楽天マラソン・SS開始時 | 3 |
| C | ランキング型 | マラソン終盤の駆け込み訴求 | 3 |

## 実績データを次回提案に活用

Claude Code は過去の `outputs.json` の results を参照して、
「前回テンプレBで開封率35%だった商品Xでもう一度送りましょう」のような提案ができます。
