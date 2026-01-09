#!/bin/bash
#
# 03-create-cognito.sh
# Amazon Cognitoユーザープールの作成
#

set -e

# 設定ファイルの読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/env.sh"

echo "=============================================="
echo "  Amazon Cognito 構築"
echo "=============================================="

# Cognitoユーザープールの作成
echo "📦 Cognitoユーザープールを作成しています..."
USER_POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name "$COGNITO_USER_POOL_NAME" \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireUppercase": true,
            "RequireLowercase": true,
            "RequireNumbers": true,
            "RequireSymbols": false,
            "TemporaryPasswordValidityDays": 7
        }
    }' \
    --auto-verified-attributes email \
    --username-attributes email \
    --username-configuration '{"CaseSensitive": false}' \
    --mfa-configuration "OFF" \
    --account-recovery-setting '{
        "RecoveryMechanisms": [
            {"Priority": 1, "Name": "verified_email"}
        ]
    }' \
    --schema '[
        {
            "Name": "email",
            "AttributeDataType": "String",
            "Required": true,
            "Mutable": false,
            "StringAttributeConstraints": {
                "MinLength": "1",
                "MaxLength": "256"
            }
        },
        {
            "Name": "name",
            "AttributeDataType": "String",
            "Required": false,
            "Mutable": true,
            "StringAttributeConstraints": {
                "MinLength": "0",
                "MaxLength": "256"
            }
        },
        {
            "Name": "is_admin",
            "AttributeDataType": "String",
            "Required": false,
            "Mutable": true,
            "StringAttributeConstraints": {
                "MinLength": "0",
                "MaxLength": "10"
            }
        }
    ]' \
    --email-configuration '{
        "EmailSendingAccount": "COGNITO_DEFAULT"
    }' \
    --admin-create-user-config '{
        "AllowAdminCreateUserOnly": false,
        "InviteMessageTemplate": {
            "EmailMessage": "あなたのユーザー名は {username} で、一時パスワードは {####} です。",
            "EmailSubject": "Loafer - ユーザー登録完了"
        }
    }' \
    --user-pool-tags "Project=${PROJECT_NAME},Environment=${ENVIRONMENT}" \
    --region "$AWS_REGION" \
    --query 'UserPool.Id' \
    --output text)

echo "✅ ユーザープール作成完了: $USER_POOL_ID"

# ユーザープールドメインの作成
DOMAIN_PREFIX="${PROJECT_NAME}-auth-$(echo $RANDOM | md5sum | head -c 8)"
echo "📦 ユーザープールドメインを作成しています..."
aws cognito-idp create-user-pool-domain \
    --domain "$DOMAIN_PREFIX" \
    --user-pool-id "$USER_POOL_ID" \
    --region "$AWS_REGION"

echo "✅ ドメイン作成完了: $DOMAIN_PREFIX"

# アプリクライアントの作成（Webアプリ用）
echo "📦 Webアプリクライアントを作成しています..."
WEB_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-name "${COGNITO_CLIENT_NAME}" \
    --generate-secret false \
    --explicit-auth-flows "ALLOW_USER_PASSWORD_AUTH" "ALLOW_USER_SRP_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" \
    --supported-identity-providers "COGNITO" \
    --callback-urls "http://localhost:3000/callback" "https://your-domain.com/callback" \
    --logout-urls "http://localhost:3000" "https://your-domain.com" \
    --allowed-o-auth-flows "code" "implicit" \
    --allowed-o-auth-scopes "phone" "email" "openid" "profile" \
    --allowed-o-auth-flows-user-pool-client \
    --prevent-user-existence-errors "ENABLED" \
    --access-token-validity 1 \
    --id-token-validity 1 \
    --refresh-token-validity 30 \
    --token-validity-units '{
        "AccessToken": "hours",
        "IdToken": "hours",
        "RefreshToken": "days"
    }' \
    --region "$AWS_REGION" \
    --query 'UserPoolClient.ClientId' \
    --output text)

echo "✅ Webクライアント作成完了: $WEB_CLIENT_ID"

# サーバー用アプリクライアントの作成（Lambda用、シークレット付き）
echo "📦 サーバーアプリクライアントを作成しています..."
SERVER_CLIENT_RESULT=$(aws cognito-idp create-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-name "${PROJECT_NAME}-server-client" \
    --generate-secret true \
    --explicit-auth-flows "ALLOW_ADMIN_USER_PASSWORD_AUTH" "ALLOW_USER_PASSWORD_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" \
    --prevent-user-existence-errors "ENABLED" \
    --region "$AWS_REGION" \
    --query 'UserPoolClient.[ClientId,ClientSecret]' \
    --output text)

SERVER_CLIENT_ID=$(echo "$SERVER_CLIENT_RESULT" | awk '{print $1}')
SERVER_CLIENT_SECRET=$(echo "$SERVER_CLIENT_RESULT" | awk '{print $2}')

echo "✅ サーバークライアント作成完了: $SERVER_CLIENT_ID"

# 管理者グループの作成
echo "📦 管理者グループを作成しています..."
aws cognito-idp create-group \
    --user-pool-id "$USER_POOL_ID" \
    --group-name "Admins" \
    --description "Administrator group with full access" \
    --precedence 1 \
    --region "$AWS_REGION"

echo "✅ 管理者グループ作成完了"

# 出力ファイルに保存
cat > "$SCRIPT_DIR/../output/cognito-output.sh" << EOF
# Cognito構築結果
export USER_POOL_ID="$USER_POOL_ID"
export USER_POOL_DOMAIN="$DOMAIN_PREFIX"
export COGNITO_WEB_CLIENT_ID="$WEB_CLIENT_ID"
export COGNITO_SERVER_CLIENT_ID="$SERVER_CLIENT_ID"
export COGNITO_REGION="$AWS_REGION"
EOF

# クライアント情報を別ファイルに保存（シークレット含む）
cat > "$SCRIPT_DIR/../output/cognito-credentials.txt" << EOF
# Cognito認証情報（本番環境では適切に管理してください）

User Pool ID: $USER_POOL_ID
Region: $AWS_REGION

Web Client (フロントエンド用):
  Client ID: $WEB_CLIENT_ID
  (シークレットなし - ブラウザから直接使用可能)

Server Client (Lambda/バックエンド用):
  Client ID: $SERVER_CLIENT_ID
  Client Secret: $SERVER_CLIENT_SECRET
  ⚠️ シークレットは安全に保管してください

Hosted UI URL:
  https://${DOMAIN_PREFIX}.auth.${AWS_REGION}.amazoncognito.com

OAuth Endpoints:
  Authorization: https://${DOMAIN_PREFIX}.auth.${AWS_REGION}.amazoncognito.com/oauth2/authorize
  Token: https://${DOMAIN_PREFIX}.auth.${AWS_REGION}.amazoncognito.com/oauth2/token
  UserInfo: https://${DOMAIN_PREFIX}.auth.${AWS_REGION}.amazoncognito.com/oauth2/userInfo
EOF

echo ""
echo "=============================================="
echo "  Cognito 構築完了"
echo "=============================================="
echo ""
echo "作成されたリソース:"
echo "  User Pool ID:       $USER_POOL_ID"
echo "  Domain:             $DOMAIN_PREFIX"
echo "  Web Client ID:      $WEB_CLIENT_ID"
echo "  Server Client ID:   $SERVER_CLIENT_ID"
echo ""
echo "⚠️  認証情報は output/cognito-credentials.txt に保存されました"
echo "⚠️  本番環境では AWS Secrets Manager での管理を推奨します"
echo ""
echo "次のステップ: ./04-create-s3-cloudfront.sh を実行"
echo ""

