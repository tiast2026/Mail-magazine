# CI/CD セットアップ手順

## 仕組み

```
コードをpush
    │
    ▼
┌────────────────────────┐
│ 自動テスト（毎回実行）    │
│ ・Pythonコード品質       │
│ ・Next.jsビルド         │
│ ・Dockerビルド          │
└────────┬───────────────┘
         │ 全部OK
         ▼
┌────────────────────────┐
│ mainブランチなら         │
│ → サーバーに自動デプロイ  │
└────────────────────────┘
```

**テスト部分は設定不要で動きます。**
デプロイを有効にするには、下の「やること」を実施してください。

---

## やること（これだけ）

GitHub → リポジトリ → **Settings** → **Secrets and variables** → **Actions**

以下の4つを「**New repository secret**」で登録：

| 登録名 | 何を入れる？ |
|--------|------------|
| `DEPLOY_HOST` | サーバーのIPアドレス（例: `123.456.78.90`） |
| `DEPLOY_USER` | SSHユーザー名（例: `ubuntu`） |
| `DEPLOY_SSH_KEY` | SSH秘密鍵（`-----BEGIN OPENSSH...` から全文） |
| `ANTHROPIC_API_KEY` | Claude APIキー（`sk-ant-...`） |

**以上。** あとはmainにpushすれば自動デプロイされます。
未登録の場合はデプロイだけスキップ、テストは通常通り実行されます。

---

## サーバー側の準備

デプロイ先サーバーに以下が必要です：

```bash
# Docker と Docker Compose をインストール（Ubuntu の場合）
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

---

## 手動デプロイしたいとき

1. GitHub → **Actions** タブ
2. 左の **「手動デプロイ」** をクリック
3. **「Run workflow」** → 環境を選んで実行
