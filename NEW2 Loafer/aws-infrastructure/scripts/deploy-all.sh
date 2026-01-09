#!/bin/bash
#
# deploy-all.sh
# すべてのAWSインフラを一括でデプロイ
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================="
echo "  Loafer AWS Infrastructure デプロイ"
echo "=============================================="
echo ""
echo "このスクリプトは以下のAWSリソースを作成します:"
echo ""
echo "  1. VPC・サブネット・ルートテーブル"
echo "  2. Amazon RDS PostgreSQL"
echo "  3. Amazon Cognito ユーザープール"
echo "  4. Amazon S3 + CloudFront"
echo "  5. AWS Lambda + API Gateway"
echo "  6. データベーススキーマ"
echo ""
echo "⚠️  注意:"
echo "  - AWSの利用料金が発生します"
echo "  - RDSインスタンスの作成には5-10分かかります"
echo "  - CloudFrontのデプロイには15-20分かかる場合があります"
echo ""
read -p "続行しますか？ (y/N): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 0
fi

# RDSパスワードの入力
echo ""
echo "RDSマスターパスワードを入力してください（8文字以上）:"
read -s RDS_MASTER_PASSWORD
export RDS_MASTER_PASSWORD
echo ""

# 出力ディレクトリの作成
mkdir -p "$SCRIPT_DIR/../output"

# 1. VPCの作成
echo ""
echo "========== Step 1/6: VPC作成 =========="
bash "$SCRIPT_DIR/01-create-vpc.sh"

# 2. RDSの作成
echo ""
echo "========== Step 2/6: RDS作成 =========="
bash "$SCRIPT_DIR/02-create-rds.sh"

# 3. Cognitoの作成
echo ""
echo "========== Step 3/6: Cognito作成 =========="
bash "$SCRIPT_DIR/03-create-cognito.sh"

# 4. S3・CloudFrontの作成
echo ""
echo "========== Step 4/6: S3・CloudFront作成 =========="
bash "$SCRIPT_DIR/04-create-s3-cloudfront.sh"

# 5. Lambda・API Gatewayの作成
echo ""
echo "========== Step 5/6: Lambda・API Gateway作成 =========="
bash "$SCRIPT_DIR/05-create-lambda-api.sh"

# 6. データベーススキーマの作成
echo ""
echo "========== Step 6/6: データベーススキーマ作成 =========="
bash "$SCRIPT_DIR/06-create-database-schema.sh"

# サマリーの出力
echo ""
echo "=============================================="
echo "  🎉 デプロイ完了！"
echo "=============================================="
echo ""

# 出力ファイルの読み込み
source "$SCRIPT_DIR/../output/vpc-output.sh" 2>/dev/null || true
source "$SCRIPT_DIR/../output/rds-output.sh" 2>/dev/null || true
source "$SCRIPT_DIR/../output/cognito-output.sh" 2>/dev/null || true
source "$SCRIPT_DIR/../output/s3-cloudfront-output.sh" 2>/dev/null || true
source "$SCRIPT_DIR/../output/lambda-api-output.sh" 2>/dev/null || true

echo "作成されたリソース:"
echo ""
echo "【VPC】"
echo "  VPC ID: ${VPC_ID:-N/A}"
echo ""
echo "【RDS PostgreSQL】"
echo "  Endpoint: ${RDS_ENDPOINT:-N/A}"
echo "  Database: ${RDS_DB_NAME:-N/A}"
echo ""
echo "【Cognito】"
echo "  User Pool ID: ${USER_POOL_ID:-N/A}"
echo "  Web Client ID: ${COGNITO_WEB_CLIENT_ID:-N/A}"
echo ""
echo "【S3 + CloudFront】"
echo "  Bucket: ${S3_BUCKET_NAME:-N/A}"
echo "  CloudFront URL: ${CLOUDFRONT_URL:-N/A}"
echo ""
echo "【API Gateway】"
echo "  API Endpoint: ${API_ENDPOINT:-N/A}"
echo ""
echo "詳細な情報は output/ ディレクトリを確認してください"
echo ""
echo "次のステップ:"
echo "  1. output/cognito-credentials.txt のClient IDをフロントエンドに設定"
echo "  2. output/rds-connection.txt の接続情報を確認"
echo "  3. Lambda環境変数のRDS_PASSWORDを更新"
echo "  4. フロントエンドのAPIエンドポイントを更新"
echo ""

