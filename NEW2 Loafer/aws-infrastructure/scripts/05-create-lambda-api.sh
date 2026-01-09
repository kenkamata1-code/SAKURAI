#!/bin/bash
#
# 05-create-lambda-api.sh
# AWS Lambda関数とAPI Gatewayの作成
#

set -e

# 設定ファイルの読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/env.sh"
source "$SCRIPT_DIR/../output/vpc-output.sh"
source "$SCRIPT_DIR/../output/rds-output.sh"
source "$SCRIPT_DIR/../output/cognito-output.sh"

echo "=============================================="
echo "  AWS Lambda + API Gateway 構築"
echo "=============================================="

# IAMロールの作成
echo "📦 Lambda実行ロールを作成しています..."

# 信頼ポリシードキュメント
cat > /tmp/lambda-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

LAMBDA_ROLE_ARN=$(aws iam create-role \
    --role-name "${PROJECT_NAME}-lambda-role" \
    --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
    --tags "Key=Project,Value=${PROJECT_NAME}" "Key=Environment,Value=${ENVIRONMENT}" \
    --query 'Role.Arn' \
    --output text)

echo "✅ Lambda実行ロール作成完了: $LAMBDA_ROLE_ARN"

# 必要なポリシーをアタッチ
echo "📦 ポリシーをアタッチしています..."

# 基本実行ロール（CloudWatch Logs）
aws iam attach-role-policy \
    --role-name "${PROJECT_NAME}-lambda-role" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

# VPC内でのLambda実行
aws iam attach-role-policy \
    --role-name "${PROJECT_NAME}-lambda-role" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"

# カスタムポリシーの作成（Cognito、S3、RDS Secrets Manager）
cat > /tmp/lambda-custom-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminDeleteUser",
                "cognito-idp:AdminSetUserPassword",
                "cognito-idp:AdminUpdateUserAttributes",
                "cognito-idp:AdminGetUser",
                "cognito-idp:AdminAddUserToGroup",
                "cognito-idp:ListUsers"
            ],
            "Resource": "arn:aws:cognito-idp:${AWS_REGION}:${AWS_ACCOUNT_ID}:userpool/${USER_POOL_ID}"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${S3_BUCKET_NAME}",
                "arn:aws:s3:::${S3_BUCKET_NAME}/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:${PROJECT_NAME}/*"
        }
    ]
}
EOF

aws iam put-role-policy \
    --role-name "${PROJECT_NAME}-lambda-role" \
    --policy-name "${PROJECT_NAME}-lambda-custom-policy" \
    --policy-document file:///tmp/lambda-custom-policy.json

rm /tmp/lambda-trust-policy.json /tmp/lambda-custom-policy.json

echo "✅ ポリシーアタッチ完了"

# ロールが伝播するまで待機
echo "⏳ IAMロールの伝播を待機しています（10秒）..."
sleep 10

# Lambda関数用のディレクトリとファイルを作成
mkdir -p "$SCRIPT_DIR/../lambda/create-user"

# create-user Lambda関数のコード
cat > "$SCRIPT_DIR/../lambda/create-user/index.mjs" << 'EOF'
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import pg from 'pg';

const { Pool } = pg;
const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

let pool = null;

const getPool = () => {
    if (!pool) {
        pool = new Pool({
            host: process.env.RDS_HOST,
            port: parseInt(process.env.RDS_PORT || '5432'),
            database: process.env.RDS_DATABASE,
            user: process.env.RDS_USER,
            password: process.env.RDS_PASSWORD,
            ssl: { rejectUnauthorized: false },
            max: 1,
        });
    }
    return pool;
};

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers: corsHeaders, body: "" };
    }

    try {
        // 認証チェック
        const claims = event.requestContext?.authorizer?.claims;
        if (!claims || !claims.sub) {
            return {
                statusCode: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ error: "認証が必要です" }),
            };
        }

        const requesterId = claims.sub;
        const db = getPool();

        // 管理者チェック
        const adminCheck = await db.query(
            "SELECT is_admin FROM profiles WHERE cognito_user_id = $1",
            [requesterId]
        );

        if (!adminCheck.rows[0]?.is_admin) {
            return {
                statusCode: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ error: "管理者権限が必要です" }),
            };
        }

        const { email, password, full_name, is_admin } = JSON.parse(event.body || "{}");

        if (!email || !password) {
            return {
                statusCode: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ error: "メールアドレスとパスワードは必須です" }),
            };
        }

        // Cognitoでユーザー作成
        const createUserCommand = new AdminCreateUserCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: email,
            UserAttributes: [
                { Name: "email", Value: email },
                { Name: "email_verified", Value: "true" },
            ],
            MessageAction: "SUPPRESS",
        });

        const newUser = await cognito.send(createUserCommand);
        const cognitoUserId = newUser.User?.Username;

        // パスワードを設定
        const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Username: email,
            Password: password,
            Permanent: true,
        });
        await cognito.send(setPasswordCommand);

        // プロフィールを作成
        await db.query(
            `INSERT INTO profiles (cognito_user_id, email, full_name, is_admin)
             VALUES ($1, $2, $3, $4)`,
            [cognitoUserId, email, full_name || "", is_admin || false]
        );

        return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
                success: true,
                user: { id: cognitoUserId, email },
            }),
        };
    } catch (error) {
        console.error("Error creating user:", error);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ error: "内部サーバーエラー" }),
        };
    }
};
EOF

# package.jsonの作成
cat > "$SCRIPT_DIR/../lambda/create-user/package.json" << EOF
{
  "name": "create-user",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-cognito-identity-provider": "^3.400.0",
    "pg": "^8.11.0"
  }
}
EOF

echo "✅ Lambda関数コード作成完了"

# Lambda関数のパッケージング
echo "📦 Lambda関数をパッケージングしています..."
cd "$SCRIPT_DIR/../lambda/create-user"
npm install --production
zip -r ../create-user.zip .
cd "$SCRIPT_DIR"

echo "✅ パッケージング完了"

# Lambda関数の作成
echo "📦 Lambda関数をデプロイしています..."

# 環境変数を設定ファイルから読み込み
source "$SCRIPT_DIR/../output/s3-cloudfront-output.sh" 2>/dev/null || true

CREATE_USER_FUNCTION_ARN=$(aws lambda create-function \
    --function-name "${PROJECT_NAME}-create-user" \
    --runtime "nodejs18.x" \
    --role "$LAMBDA_ROLE_ARN" \
    --handler "index.handler" \
    --timeout "$LAMBDA_TIMEOUT" \
    --memory-size "$LAMBDA_MEMORY" \
    --zip-file "fileb://$SCRIPT_DIR/../lambda/create-user.zip" \
    --vpc-config "SubnetIds=${PRIVATE_SUBNET_1_ID},${PRIVATE_SUBNET_2_ID},SecurityGroupIds=${LAMBDA_SG_ID}" \
    --environment "Variables={
        USER_POOL_ID=${USER_POOL_ID},
        RDS_HOST=${RDS_ENDPOINT},
        RDS_PORT=${RDS_PORT},
        RDS_DATABASE=${RDS_DB_NAME},
        RDS_USER=${RDS_MASTER_USERNAME},
        RDS_PASSWORD=PLACEHOLDER_SET_VIA_SECRETS
    }" \
    --tags "Project=${PROJECT_NAME},Environment=${ENVIRONMENT}" \
    --region "$AWS_REGION" \
    --query 'FunctionArn' \
    --output text)

echo "✅ Lambda関数デプロイ完了: $CREATE_USER_FUNCTION_ARN"

# API Gatewayの作成
echo "📦 API Gatewayを作成しています..."

API_ID=$(aws apigatewayv2 create-api \
    --name "$API_NAME" \
    --protocol-type HTTP \
    --cors-configuration '{
        "AllowOrigins": ["http://localhost:3000", "https://your-domain.com"],
        "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "AllowHeaders": ["Content-Type", "Authorization"],
        "MaxAge": 3600
    }' \
    --tags "Project=${PROJECT_NAME},Environment=${ENVIRONMENT}" \
    --region "$AWS_REGION" \
    --query 'ApiId' \
    --output text)

echo "✅ API Gateway作成完了: $API_ID"

# Cognito Authorizerの作成
echo "📦 Cognito Authorizerを作成しています..."

AUTHORIZER_ID=$(aws apigatewayv2 create-authorizer \
    --api-id "$API_ID" \
    --authorizer-type JWT \
    --identity-source '$request.header.Authorization' \
    --name "${PROJECT_NAME}-cognito-authorizer" \
    --jwt-configuration '{
        "Audience": ["'${COGNITO_WEB_CLIENT_ID}'"],
        "Issuer": "https://cognito-idp.'${AWS_REGION}'.amazonaws.com/'${USER_POOL_ID}'"
    }' \
    --region "$AWS_REGION" \
    --query 'AuthorizerId' \
    --output text)

echo "✅ Authorizer作成完了: $AUTHORIZER_ID"

# Lambda統合の作成
echo "📦 Lambda統合を作成しています..."

INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$CREATE_USER_FUNCTION_ARN" \
    --payload-format-version "2.0" \
    --region "$AWS_REGION" \
    --query 'IntegrationId' \
    --output text)

echo "✅ 統合作成完了: $INTEGRATION_ID"

# ルートの作成
echo "📦 APIルートを作成しています..."

aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "POST /admin/users" \
    --authorization-type JWT \
    --authorizer-id "$AUTHORIZER_ID" \
    --target "integrations/$INTEGRATION_ID" \
    --region "$AWS_REGION"

echo "✅ ルート作成完了"

# デフォルトステージの作成
echo "📦 APIステージを作成しています..."

aws apigatewayv2 create-stage \
    --api-id "$API_ID" \
    --stage-name "$API_STAGE" \
    --auto-deploy \
    --region "$AWS_REGION"

echo "✅ ステージ作成完了"

# API GatewayにLambda呼び出し権限を付与
echo "📦 Lambda呼び出し権限を設定しています..."

aws lambda add-permission \
    --function-name "${PROJECT_NAME}-create-user" \
    --statement-id "apigateway-invoke" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
    --region "$AWS_REGION"

echo "✅ 権限設定完了"

# APIエンドポイントを取得
API_ENDPOINT=$(aws apigatewayv2 get-api \
    --api-id "$API_ID" \
    --query 'ApiEndpoint' \
    --output text \
    --region "$AWS_REGION")

# 出力ファイルに保存
cat > "$SCRIPT_DIR/../output/lambda-api-output.sh" << EOF
# Lambda・API Gateway構築結果
export LAMBDA_ROLE_ARN="$LAMBDA_ROLE_ARN"
export CREATE_USER_FUNCTION_ARN="$CREATE_USER_FUNCTION_ARN"
export API_ID="$API_ID"
export API_ENDPOINT="$API_ENDPOINT"
export API_STAGE="$API_STAGE"
export AUTHORIZER_ID="$AUTHORIZER_ID"
EOF

echo ""
echo "=============================================="
echo "  Lambda + API Gateway 構築完了"
echo "=============================================="
echo ""
echo "作成されたリソース:"
echo "  Lambda Role:         $LAMBDA_ROLE_ARN"
echo "  Lambda Function:     ${PROJECT_NAME}-create-user"
echo "  API Gateway ID:      $API_ID"
echo "  API Endpoint:        $API_ENDPOINT"
echo ""
echo "APIエンドポイント:"
echo "  POST ${API_ENDPOINT}/${API_STAGE}/admin/users - ユーザー作成"
echo ""
echo "⚠️  RDSパスワードは AWS Secrets Manager で管理することを推奨"
echo "⚠️  Lambda環境変数 RDS_PASSWORD を更新してください"
echo ""
echo "次のステップ: ./06-create-database-schema.sh を実行"
echo ""

