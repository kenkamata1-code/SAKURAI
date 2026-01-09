#!/bin/bash
#
# cleanup.sh
# 作成したAWSリソースをすべて削除
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/env.sh"

echo "=============================================="
echo "  AWSリソースのクリーンアップ"
echo "=============================================="
echo ""
echo "⚠️  警告: このスクリプトは以下のリソースをすべて削除します:"
echo ""
echo "  - Lambda関数"
echo "  - API Gateway"
echo "  - CloudFront ディストリビューション"
echo "  - S3 バケット（中身も含む）"
echo "  - Cognito ユーザープール"
echo "  - RDS インスタンス"
echo "  - VPC と関連リソース"
echo ""
echo "⚠️  この操作は元に戻せません！"
echo ""
read -p "本当に削除しますか？ (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "キャンセルしました"
    exit 0
fi

# 出力ファイルの読み込み
source "$SCRIPT_DIR/../output/vpc-output.sh" 2>/dev/null || true
source "$SCRIPT_DIR/../output/rds-output.sh" 2>/dev/null || true
source "$SCRIPT_DIR/../output/cognito-output.sh" 2>/dev/null || true
source "$SCRIPT_DIR/../output/s3-cloudfront-output.sh" 2>/dev/null || true
source "$SCRIPT_DIR/../output/lambda-api-output.sh" 2>/dev/null || true

echo ""
echo "========== Lambda関数の削除 =========="
if [ -n "$CREATE_USER_FUNCTION_ARN" ]; then
    aws lambda delete-function \
        --function-name "${PROJECT_NAME}-create-user" \
        --region "$AWS_REGION" 2>/dev/null || echo "Lambda関数は既に削除されています"
fi
echo "✅ 完了"

echo ""
echo "========== API Gatewayの削除 =========="
if [ -n "$API_ID" ]; then
    aws apigatewayv2 delete-api \
        --api-id "$API_ID" \
        --region "$AWS_REGION" 2>/dev/null || echo "API Gatewayは既に削除されています"
fi
echo "✅ 完了"

echo ""
echo "========== IAMロールの削除 =========="
# ポリシーのデタッチ
aws iam detach-role-policy \
    --role-name "${PROJECT_NAME}-lambda-role" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" 2>/dev/null || true
aws iam detach-role-policy \
    --role-name "${PROJECT_NAME}-lambda-role" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole" 2>/dev/null || true
aws iam delete-role-policy \
    --role-name "${PROJECT_NAME}-lambda-role" \
    --policy-name "${PROJECT_NAME}-lambda-custom-policy" 2>/dev/null || true
aws iam delete-role \
    --role-name "${PROJECT_NAME}-lambda-role" 2>/dev/null || echo "IAMロールは既に削除されています"
echo "✅ 完了"

echo ""
echo "========== CloudFrontの削除 =========="
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    # ディストリビューションを無効化
    ETAG=$(aws cloudfront get-distribution-config \
        --id "$CLOUDFRONT_DISTRIBUTION_ID" \
        --query 'ETag' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$ETAG" ]; then
        # 設定を取得して無効化
        aws cloudfront get-distribution-config \
            --id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --query 'DistributionConfig' \
            --output json > /tmp/cf-config.json 2>/dev/null || true
        
        # Enabledをfalseに変更
        jq '.Enabled = false' /tmp/cf-config.json > /tmp/cf-config-disabled.json 2>/dev/null || true
        
        aws cloudfront update-distribution \
            --id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --distribution-config file:///tmp/cf-config-disabled.json \
            --if-match "$ETAG" 2>/dev/null || true
        
        echo "CloudFrontの無効化を待機しています（これには時間がかかります）..."
        aws cloudfront wait distribution-deployed \
            --id "$CLOUDFRONT_DISTRIBUTION_ID" 2>/dev/null || true
        
        # 削除
        NEW_ETAG=$(aws cloudfront get-distribution-config \
            --id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --query 'ETag' \
            --output text 2>/dev/null || echo "")
        
        aws cloudfront delete-distribution \
            --id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --if-match "$NEW_ETAG" 2>/dev/null || true
        
        rm -f /tmp/cf-config.json /tmp/cf-config-disabled.json
    fi
fi

# OACの削除
if [ -n "$CLOUDFRONT_OAC_ID" ]; then
    aws cloudfront delete-origin-access-control \
        --id "$CLOUDFRONT_OAC_ID" 2>/dev/null || true
fi
echo "✅ 完了"

echo ""
echo "========== S3バケットの削除 =========="
if [ -n "$S3_BUCKET_NAME" ]; then
    # バケットの中身を削除
    aws s3 rm "s3://${S3_BUCKET_NAME}" --recursive 2>/dev/null || true
    # バージョニングされたオブジェクトも削除
    aws s3api delete-objects \
        --bucket "$S3_BUCKET_NAME" \
        --delete "$(aws s3api list-object-versions \
            --bucket "$S3_BUCKET_NAME" \
            --query='{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
            --output json 2>/dev/null || echo '{"Objects": []}')" 2>/dev/null || true
    # 削除マーカーも削除
    aws s3api delete-objects \
        --bucket "$S3_BUCKET_NAME" \
        --delete "$(aws s3api list-object-versions \
            --bucket "$S3_BUCKET_NAME" \
            --query='{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' \
            --output json 2>/dev/null || echo '{"Objects": []}')" 2>/dev/null || true
    # バケットの削除
    aws s3api delete-bucket \
        --bucket "$S3_BUCKET_NAME" \
        --region "$AWS_REGION" 2>/dev/null || echo "S3バケットは既に削除されています"
fi
echo "✅ 完了"

echo ""
echo "========== Cognitoの削除 =========="
if [ -n "$USER_POOL_ID" ]; then
    # ドメインの削除
    if [ -n "$USER_POOL_DOMAIN" ]; then
        aws cognito-idp delete-user-pool-domain \
            --domain "$USER_POOL_DOMAIN" \
            --user-pool-id "$USER_POOL_ID" \
            --region "$AWS_REGION" 2>/dev/null || true
    fi
    # ユーザープールの削除
    aws cognito-idp delete-user-pool \
        --user-pool-id "$USER_POOL_ID" \
        --region "$AWS_REGION" 2>/dev/null || echo "ユーザープールは既に削除されています"
fi
echo "✅ 完了"

echo ""
echo "========== RDSの削除 =========="
# 削除保護を無効化
aws rds modify-db-instance \
    --db-instance-identifier "${PROJECT_NAME}-db" \
    --no-deletion-protection \
    --region "$AWS_REGION" 2>/dev/null || true

# RDSインスタンスの削除
aws rds delete-db-instance \
    --db-instance-identifier "${PROJECT_NAME}-db" \
    --skip-final-snapshot \
    --delete-automated-backups \
    --region "$AWS_REGION" 2>/dev/null || echo "RDSは既に削除されています"

echo "RDSの削除を待機しています..."
aws rds wait db-instance-deleted \
    --db-instance-identifier "${PROJECT_NAME}-db" \
    --region "$AWS_REGION" 2>/dev/null || true

# サブネットグループの削除
aws rds delete-db-subnet-group \
    --db-subnet-group-name "${PROJECT_NAME}-db-subnet-group" \
    --region "$AWS_REGION" 2>/dev/null || true

# パラメータグループの削除
aws rds delete-db-parameter-group \
    --db-parameter-group-name "${PROJECT_NAME}-pg15-params" \
    --region "$AWS_REGION" 2>/dev/null || true
echo "✅ 完了"

echo ""
echo "========== VPCリソースの削除 =========="

# セキュリティグループの削除
if [ -n "$RDS_SG_ID" ]; then
    aws ec2 delete-security-group \
        --group-id "$RDS_SG_ID" \
        --region "$AWS_REGION" 2>/dev/null || true
fi
if [ -n "$LAMBDA_SG_ID" ]; then
    aws ec2 delete-security-group \
        --group-id "$LAMBDA_SG_ID" \
        --region "$AWS_REGION" 2>/dev/null || true
fi

# サブネットの削除
for SUBNET_ID in "$PUBLIC_SUBNET_1_ID" "$PUBLIC_SUBNET_2_ID" "$PRIVATE_SUBNET_1_ID" "$PRIVATE_SUBNET_2_ID"; do
    if [ -n "$SUBNET_ID" ]; then
        aws ec2 delete-subnet \
            --subnet-id "$SUBNET_ID" \
            --region "$AWS_REGION" 2>/dev/null || true
    fi
done

# ルートテーブルの削除
for RTB_ID in "$PUBLIC_RTB_ID" "$PRIVATE_RTB_ID"; do
    if [ -n "$RTB_ID" ]; then
        # メインルートテーブルでない場合のみ削除
        aws ec2 delete-route-table \
            --route-table-id "$RTB_ID" \
            --region "$AWS_REGION" 2>/dev/null || true
    fi
done

# インターネットゲートウェイのデタッチと削除
if [ -n "$IGW_ID" ] && [ -n "$VPC_ID" ]; then
    aws ec2 detach-internet-gateway \
        --internet-gateway-id "$IGW_ID" \
        --vpc-id "$VPC_ID" \
        --region "$AWS_REGION" 2>/dev/null || true
    aws ec2 delete-internet-gateway \
        --internet-gateway-id "$IGW_ID" \
        --region "$AWS_REGION" 2>/dev/null || true
fi

# VPCの削除
if [ -n "$VPC_ID" ]; then
    aws ec2 delete-vpc \
        --vpc-id "$VPC_ID" \
        --region "$AWS_REGION" 2>/dev/null || echo "VPCは既に削除されています"
fi
echo "✅ 完了"

# 出力ファイルの削除
echo ""
echo "========== 出力ファイルの削除 =========="
rm -rf "$SCRIPT_DIR/../output/"
echo "✅ 完了"

echo ""
echo "=============================================="
echo "  🧹 クリーンアップ完了"
echo "=============================================="
echo ""

