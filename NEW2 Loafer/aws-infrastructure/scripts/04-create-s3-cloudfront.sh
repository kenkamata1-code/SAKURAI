#!/bin/bash
#
# 04-create-s3-cloudfront.sh
# Amazon S3バケットとCloudFront配信の作成
#

set -e

# 設定ファイルの読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/env.sh"

echo "=============================================="
echo "  Amazon S3 + CloudFront 構築"
echo "=============================================="

# S3バケットの作成
echo "📦 S3バケットを作成しています..."

# 東京リージョンの場合はLocationConstraintを指定
if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket \
        --bucket "$S3_BUCKET_NAME" \
        --region "$AWS_REGION"
else
    aws s3api create-bucket \
        --bucket "$S3_BUCKET_NAME" \
        --region "$AWS_REGION" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION"
fi

echo "✅ S3バケット作成完了: $S3_BUCKET_NAME"

# バケットのパブリックアクセスをブロック
echo "📦 パブリックアクセスブロックを設定しています..."
aws s3api put-public-access-block \
    --bucket "$S3_BUCKET_NAME" \
    --public-access-block-configuration '{
        "BlockPublicAcls": true,
        "IgnorePublicAcls": true,
        "BlockPublicPolicy": true,
        "RestrictPublicBuckets": true
    }' \
    --region "$AWS_REGION"

echo "✅ パブリックアクセスブロック設定完了"

# バケットの暗号化を設定
echo "📦 サーバーサイド暗号化を設定しています..."
aws s3api put-bucket-encryption \
    --bucket "$S3_BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                },
                "BucketKeyEnabled": true
            }
        ]
    }' \
    --region "$AWS_REGION"

echo "✅ 暗号化設定完了"

# バケットのバージョニングを有効化
echo "📦 バージョニングを有効化しています..."
aws s3api put-bucket-versioning \
    --bucket "$S3_BUCKET_NAME" \
    --versioning-configuration Status=Enabled \
    --region "$AWS_REGION"

echo "✅ バージョニング有効化完了"

# CORSの設定
echo "📦 CORS設定を適用しています..."
aws s3api put-bucket-cors \
    --bucket "$S3_BUCKET_NAME" \
    --cors-configuration '{
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
                "ExposeHeaders": ["ETag"],
                "MaxAgeSeconds": 3600
            }
        ]
    }' \
    --region "$AWS_REGION"

echo "✅ CORS設定完了"

# バケットタグの設定
echo "📦 タグを設定しています..."
aws s3api put-bucket-tagging \
    --bucket "$S3_BUCKET_NAME" \
    --tagging "TagSet=[{Key=Project,Value=${PROJECT_NAME}},{Key=Environment,Value=${ENVIRONMENT}}]" \
    --region "$AWS_REGION"

echo "✅ タグ設定完了"

# CloudFront OAC（Origin Access Control）の作成
echo "📦 CloudFront OACを作成しています..."
OAC_ID=$(aws cloudfront create-origin-access-control \
    --origin-access-control-config '{
        "Name": "'${PROJECT_NAME}'-s3-oac",
        "Description": "OAC for '${PROJECT_NAME}' S3 bucket",
        "SigningProtocol": "sigv4",
        "SigningBehavior": "always",
        "OriginAccessControlOriginType": "s3"
    }' \
    --query 'OriginAccessControl.Id' \
    --output text)

echo "✅ OAC作成完了: $OAC_ID"

# CloudFrontディストリビューションの作成
echo "📦 CloudFrontディストリビューションを作成しています..."

# ディストリビューション設定をJSONファイルとして作成
cat > /tmp/cloudfront-config.json << EOF
{
    "CallerReference": "${PROJECT_NAME}-$(date +%s)",
    "Comment": "${CLOUDFRONT_COMMENT}",
    "Enabled": true,
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-${S3_BUCKET_NAME}",
                "DomainName": "${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                },
                "OriginAccessControlId": "${OAC_ID}"
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-${S3_BUCKET_NAME}",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["GET", "HEAD"]
            }
        },
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "Compress": true
    },
    "PriceClass": "PriceClass_200",
    "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true
    },
    "HttpVersion": "http2"
}
EOF

DISTRIBUTION_RESULT=$(aws cloudfront create-distribution \
    --distribution-config file:///tmp/cloudfront-config.json \
    --query 'Distribution.[Id,DomainName]' \
    --output text)

DISTRIBUTION_ID=$(echo "$DISTRIBUTION_RESULT" | awk '{print $1}')
CLOUDFRONT_DOMAIN=$(echo "$DISTRIBUTION_RESULT" | awk '{print $2}')

rm /tmp/cloudfront-config.json

echo "✅ CloudFrontディストリビューション作成完了: $DISTRIBUTION_ID"

# S3バケットポリシーの設定（CloudFrontからのアクセスを許可）
echo "📦 S3バケットポリシーを設定しています..."
aws s3api put-bucket-policy \
    --bucket "$S3_BUCKET_NAME" \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowCloudFrontServicePrincipal",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudfront.amazonaws.com"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::'${S3_BUCKET_NAME}'/*",
                "Condition": {
                    "StringEquals": {
                        "AWS:SourceArn": "arn:aws:cloudfront::'${AWS_ACCOUNT_ID}':distribution/'${DISTRIBUTION_ID}'"
                    }
                }
            }
        ]
    }' \
    --region "$AWS_REGION"

echo "✅ バケットポリシー設定完了"

# サンプルフォルダの作成
echo "📦 サンプルフォルダを作成しています..."
aws s3api put-object \
    --bucket "$S3_BUCKET_NAME" \
    --key "products/" \
    --region "$AWS_REGION"

aws s3api put-object \
    --bucket "$S3_BUCKET_NAME" \
    --key "styling/" \
    --region "$AWS_REGION"

echo "✅ サンプルフォルダ作成完了"

# 出力ファイルに保存
cat > "$SCRIPT_DIR/../output/s3-cloudfront-output.sh" << EOF
# S3・CloudFront構築結果
export S3_BUCKET_NAME="$S3_BUCKET_NAME"
export CLOUDFRONT_OAC_ID="$OAC_ID"
export CLOUDFRONT_DISTRIBUTION_ID="$DISTRIBUTION_ID"
export CLOUDFRONT_DOMAIN="$CLOUDFRONT_DOMAIN"
export CLOUDFRONT_URL="https://$CLOUDFRONT_DOMAIN"
EOF

echo ""
echo "=============================================="
echo "  S3 + CloudFront 構築完了"
echo "=============================================="
echo ""
echo "作成されたリソース:"
echo "  S3 Bucket:           $S3_BUCKET_NAME"
echo "  CloudFront OAC:      $OAC_ID"
echo "  Distribution ID:     $DISTRIBUTION_ID"
echo "  CloudFront URL:      https://$CLOUDFRONT_DOMAIN"
echo ""
echo "画像のアップロード例:"
echo "  aws s3 cp image.jpg s3://${S3_BUCKET_NAME}/products/"
echo ""
echo "アクセスURL例:"
echo "  https://${CLOUDFRONT_DOMAIN}/products/image.jpg"
echo ""
echo "⚠️  CloudFrontのデプロイには15-20分かかる場合があります"
echo ""
echo "次のステップ: ./05-create-lambda-api.sh を実行"
echo ""

