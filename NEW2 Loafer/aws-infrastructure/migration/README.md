# Supabase → AWS 移行スクリプト

このディレクトリには、SupabaseからAWSへの移行を行うためのスクリプトが含まれています。

## 前提条件

1. Node.js 18以上がインストールされていること
2. AWS CLIが設定されていること
3. Supabaseのサービスキーを持っていること

## セットアップ

```bash
cd aws-infrastructure/migration
npm install
```

## 環境変数の設定

```bash
# Supabase設定
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"

# RDSパスワード（オプション、デフォルト値あり）
export RDS_PASSWORD="LoaferDB2026!Secure"
```

## 移行の実行

### 1. ユーザー移行

SupabaseのAuthユーザーをCognitoに移行します。

```bash
npm run migrate:users
```

**注意:**
- 移行されたユーザーは一時パスワード `TempPassword123!` が設定されます
- 初回ログイン時にパスワード変更が必要です

### 2. データ移行

商品、カテゴリ、スタイリングなどのデータを移行します。

```bash
npm run migrate:data
```

**移行対象:**
- カテゴリ
- 商品
- 商品画像
- 商品バリエーション
- スタイリング
- スタイリング画像

### 3. 画像移行

Supabase StorageからS3に画像を移行し、データベース内のURLを更新します。

```bash
npm run migrate:images
```

### 4. 一括移行

すべての移行を順番に実行します。

```bash
npm run migrate:all
```

## 移行後の確認

1. AWS RDSに接続してデータを確認
2. CloudFrontのURLで画像が表示されるか確認
3. Cognitoでユーザーが作成されているか確認

## ロールバック

移行に問題があった場合は、Supabaseのデータはそのまま残っているため、
フロントエンドの設定を元に戻すことでロールバックできます。

## 注意事項

- 移行中はサービスを停止することを推奨
- 本番環境への移行前に必ずテスト環境で検証してください
- パスワードは移行できないため、ユーザーには新しいパスワードの設定が必要です

