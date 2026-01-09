#!/bin/bash
#
# env.sh
# AWS インフラストラクチャの環境設定
#

# ==============================================
# プロジェクト設定
# ==============================================
export PROJECT_NAME="loafer"
export ENVIRONMENT="production"

# ==============================================
# AWS基本設定
# ==============================================
export AWS_REGION="ap-northeast-1"  # 東京リージョン
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "ACCOUNT_ID_NOT_SET")

# ==============================================
# VPC設定
# ==============================================
export VPC_CIDR="10.0.0.0/16"
export PUBLIC_SUBNET_1_CIDR="10.0.1.0/24"
export PUBLIC_SUBNET_2_CIDR="10.0.2.0/24"
export PRIVATE_SUBNET_1_CIDR="10.0.10.0/24"
export PRIVATE_SUBNET_2_CIDR="10.0.11.0/24"

# ==============================================
# RDS設定
# ==============================================
export RDS_INSTANCE_CLASS="db.t3.micro"
export RDS_ENGINE="postgres"
export RDS_ENGINE_VERSION="15.12"
export RDS_DB_NAME="loafer"
export RDS_MASTER_USERNAME="loafer_admin"
# パスワードは実行時に設定（セキュリティのため）
# export RDS_MASTER_PASSWORD="your-secure-password"
export RDS_ALLOCATED_STORAGE="20"
export RDS_MAX_ALLOCATED_STORAGE="100"

# ==============================================
# Cognito設定
# ==============================================
export COGNITO_USER_POOL_NAME="${PROJECT_NAME}-users"
export COGNITO_CLIENT_NAME="${PROJECT_NAME}-web-client"

# ==============================================
# S3設定
# ==============================================
export S3_BUCKET_NAME="${PROJECT_NAME}-product-images-${AWS_ACCOUNT_ID}"

# ==============================================
# CloudFront設定
# ==============================================
export CLOUDFRONT_COMMENT="${PROJECT_NAME} product images distribution"

# ==============================================
# Lambda設定
# ==============================================
export LAMBDA_RUNTIME="nodejs18.x"
export LAMBDA_TIMEOUT="30"
export LAMBDA_MEMORY="256"

# ==============================================
# API Gateway設定
# ==============================================
export API_NAME="${PROJECT_NAME}-api"
export API_STAGE="v1"

# ==============================================
# タグ設定
# ==============================================
export DEFAULT_TAGS="Key=Project,Value=${PROJECT_NAME} Key=Environment,Value=${ENVIRONMENT} Key=ManagedBy,Value=aws-cli"

# 出力ディレクトリの作成
mkdir -p "$(dirname "${BASH_SOURCE[0]}")/../output"

