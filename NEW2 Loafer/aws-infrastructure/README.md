# Loafer AWS Infrastructure

Supabaseから移行したAWSインフラストラクチャを構築するためのスクリプト集です。

## 📁 ディレクトリ構造

```
aws-infrastructure/
├── config/
│   └── env.sh              # 環境設定（リージョン、名前など）
├── scripts/
│   ├── 00-setup-aws-cli.sh     # AWS CLIのセットアップ
│   ├── 01-create-vpc.sh        # VPC・ネットワーク構築
│   ├── 02-create-rds.sh        # RDS PostgreSQL構築
│   ├── 03-create-cognito.sh    # Amazon Cognito構築
│   ├── 04-create-s3-cloudfront.sh  # S3・CloudFront構築
│   ├── 05-create-lambda-api.sh     # Lambda・API Gateway構築
│   ├── 06-create-database-schema.sh # データベーススキーマ作成
│   ├── deploy-all.sh           # 一括デプロイ
│   └── cleanup.sh              # リソース削除
├── lambda/
│   └── create-user/            # ユーザー作成Lambda関数
├── database/
│   └── schema.sql              # データベーススキーマ
└── output/                     # 構築結果の出力先
```

## 🚀 クイックスタート

### 前提条件

- AWS CLIがインストールされていること
- AWS IAMユーザーに適切な権限があること
- Node.js（Lambda関数のビルド用）
- PostgreSQL Client（psqlコマンド、オプション）

### 1. AWS CLIのセットアップ

```bash
cd aws-infrastructure/scripts
chmod +x *.sh

# AWS CLIのインストールと設定
./00-setup-aws-cli.sh
```

### 2. 一括デプロイ

```bash
# すべてのインフラを一括でデプロイ
./deploy-all.sh
```

または、個別に実行：

```bash
./01-create-vpc.sh
./02-create-rds.sh
./03-create-cognito.sh
./04-create-s3-cloudfront.sh
./05-create-lambda-api.sh
./06-create-database-schema.sh
```

### 3. リソースの削除

```bash
./cleanup.sh
```

## 🏗️ 作成されるAWSリソース

### ネットワーク
- VPC（10.0.0.0/16）
- パブリックサブネット x 2（AZ-a, AZ-c）
- プライベートサブネット x 2（AZ-a, AZ-c）
- インターネットゲートウェイ
- ルートテーブル

### データベース
- Amazon RDS for PostgreSQL 15
  - インスタンス: db.t3.micro
  - ストレージ: 20GB（自動拡張100GBまで）
  - マルチAZ: 無効（コスト削減）
  - 暗号化: 有効

### 認証
- Amazon Cognito User Pool
  - メールアドレスでのサインイン
  - パスワードポリシー設定
  - Webクライアント（フロントエンド用）
  - サーバークライアント（バックエンド用）

### ストレージ
- Amazon S3バケット
  - バージョニング有効
  - 暗号化有効
  - パブリックアクセスブロック
- Amazon CloudFront
  - HTTPS強制
  - OAC（Origin Access Control）

### コンピューティング
- AWS Lambda
  - Node.js 18.x
  - VPC内で実行
- Amazon API Gateway（HTTP API）
  - Cognito Authorizer
  - CORS設定

## 📝 設定のカスタマイズ

`config/env.sh`を編集して設定を変更できます：

```bash
# プロジェクト名
export PROJECT_NAME="loafer"

# AWSリージョン
export AWS_REGION="ap-northeast-1"

# RDSインスタンスクラス
export RDS_INSTANCE_CLASS="db.t3.micro"
```

## 💰 コスト見積もり（月額）

| サービス | スペック | 月額（概算） |
|---------|---------|-------------|
| RDS PostgreSQL | db.t3.micro | $15 |
| Cognito | 50,000 MAU無料 | $0 |
| Lambda | 100万リクエスト | $0.20 |
| S3 | 10GB | $3 |
| CloudFront | 10GB転送 | $1 |
| API Gateway | 100万リクエスト | $3.50 |
| **合計** | | **約$22-25** |

## 🔐 セキュリティに関する注意

1. **RDSパスワード**: 本番環境では AWS Secrets Manager で管理してください
2. **Cognitoシークレット**: `output/cognito-credentials.txt`は安全に保管してください
3. **IAMポリシー**: 最小権限の原則に従ってください
4. **VPC**: プライベートサブネットにRDSを配置しています

## 📚 移行後のアプリケーション変更

### フロントエンド

```typescript
// Before: Supabase
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// After: AWS Amplify
import { Amplify, Auth } from 'aws-amplify';
Amplify.configure({
  Auth: {
    region: 'ap-northeast-1',
    userPoolId: USER_POOL_ID,
    userPoolWebClientId: WEB_CLIENT_ID,
  },
});
```

### API呼び出し

```typescript
// Before: Supabase Functions
const { data } = await supabase.functions.invoke('create-user', { body: { ... } });

// After: API Gateway
const response = await fetch(`${API_ENDPOINT}/v1/admin/users`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
```

## 🐛 トラブルシューティング

### RDS接続エラー
- セキュリティグループでLambdaからの接続が許可されているか確認
- VPCエンドポイントが正しく設定されているか確認

### Lambda タイムアウト
- VPC設定を確認（NAT Gatewayが必要な場合あり）
- メモリサイズを増やす

### CloudFront 403エラー
- S3バケットポリシーを確認
- OAC設定を確認

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. `output/` ディレクトリの出力ファイル
2. AWS CloudWatch Logs
3. AWS Management Console

---

**注意**: このスクリプトは開発・検証用です。本番環境では追加のセキュリティ設定を推奨します。

