#!/bin/bash
#
# 02-create-rds.sh
# Amazon RDS PostgreSQLの作成
#

set -e

# 設定ファイルの読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/env.sh"
source "$SCRIPT_DIR/../output/vpc-output.sh"

echo "=============================================="
echo "  Amazon RDS PostgreSQL 構築"
echo "=============================================="

# RDSマスターパスワードの入力
if [ -z "$RDS_MASTER_PASSWORD" ]; then
    echo ""
    echo "RDSマスターパスワードを入力してください（8文字以上）:"
    read -s RDS_MASTER_PASSWORD
    echo ""
    
    if [ ${#RDS_MASTER_PASSWORD} -lt 8 ]; then
        echo "❌ パスワードは8文字以上である必要があります"
        exit 1
    fi
fi

# RDS用セキュリティグループの作成
echo "📦 RDS用セキュリティグループを作成しています..."
RDS_SG_ID=$(aws ec2 create-security-group \
    --group-name "${PROJECT_NAME}-rds-sg" \
    --description "Security group for RDS PostgreSQL" \
    --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-rds-sg},{Key=Project,Value=${PROJECT_NAME}}]" \
    --region "$AWS_REGION" \
    --query 'GroupId' \
    --output text)

echo "✅ RDSセキュリティグループ作成完了: $RDS_SG_ID"

# Lambda用セキュリティグループの作成（後でLambdaからRDSに接続するため）
echo "📦 Lambda用セキュリティグループを作成しています..."
LAMBDA_SG_ID=$(aws ec2 create-security-group \
    --group-name "${PROJECT_NAME}-lambda-sg" \
    --description "Security group for Lambda functions" \
    --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-lambda-sg},{Key=Project,Value=${PROJECT_NAME}}]" \
    --region "$AWS_REGION" \
    --query 'GroupId' \
    --output text)

echo "✅ Lambdaセキュリティグループ作成完了: $LAMBDA_SG_ID"

# RDSセキュリティグループにLambdaからの接続を許可
echo "📦 セキュリティグループルールを追加しています..."
aws ec2 authorize-security-group-ingress \
    --group-id "$RDS_SG_ID" \
    --protocol tcp \
    --port 5432 \
    --source-group "$LAMBDA_SG_ID" \
    --region "$AWS_REGION"

# VPC内からの接続を許可（開発用）
aws ec2 authorize-security-group-ingress \
    --group-id "$RDS_SG_ID" \
    --protocol tcp \
    --port 5432 \
    --cidr "$VPC_CIDR" \
    --region "$AWS_REGION"

echo "✅ セキュリティグループルール追加完了"

# DBサブネットグループの作成
echo "📦 DBサブネットグループを作成しています..."
aws rds create-db-subnet-group \
    --db-subnet-group-name "${PROJECT_NAME}-db-subnet-group" \
    --db-subnet-group-description "Subnet group for ${PROJECT_NAME} RDS" \
    --subnet-ids "$PRIVATE_SUBNET_1_ID" "$PRIVATE_SUBNET_2_ID" \
    --tags "Key=Name,Value=${PROJECT_NAME}-db-subnet-group" "Key=Project,Value=${PROJECT_NAME}" \
    --region "$AWS_REGION"

echo "✅ DBサブネットグループ作成完了"

# RDSパラメータグループの作成（日本語対応）
echo "📦 DBパラメータグループを作成しています..."
aws rds create-db-parameter-group \
    --db-parameter-group-name "${PROJECT_NAME}-pg15-params" \
    --db-parameter-group-family "postgres15" \
    --description "Parameter group for ${PROJECT_NAME} PostgreSQL 15" \
    --tags "Key=Name,Value=${PROJECT_NAME}-pg15-params" "Key=Project,Value=${PROJECT_NAME}" \
    --region "$AWS_REGION"

# タイムゾーンを日本時間に設定
aws rds modify-db-parameter-group \
    --db-parameter-group-name "${PROJECT_NAME}-pg15-params" \
    --parameters "ParameterName=timezone,ParameterValue=Asia/Tokyo,ApplyMethod=pending-reboot" \
    --region "$AWS_REGION"

echo "✅ DBパラメータグループ作成完了"

# RDSインスタンスの作成
echo "📦 RDSインスタンスを作成しています（5-10分かかります）..."
aws rds create-db-instance \
    --db-instance-identifier "${PROJECT_NAME}-db" \
    --db-instance-class "$RDS_INSTANCE_CLASS" \
    --engine "$RDS_ENGINE" \
    --engine-version "$RDS_ENGINE_VERSION" \
    --master-username "$RDS_MASTER_USERNAME" \
    --master-user-password "$RDS_MASTER_PASSWORD" \
    --allocated-storage "$RDS_ALLOCATED_STORAGE" \
    --max-allocated-storage "$RDS_MAX_ALLOCATED_STORAGE" \
    --db-name "$RDS_DB_NAME" \
    --vpc-security-group-ids "$RDS_SG_ID" \
    --db-subnet-group-name "${PROJECT_NAME}-db-subnet-group" \
    --db-parameter-group-name "${PROJECT_NAME}-pg15-params" \
    --backup-retention-period 7 \
    --preferred-backup-window "18:00-19:00" \
    --preferred-maintenance-window "sun:19:00-sun:20:00" \
    --storage-type gp3 \
    --storage-encrypted \
    --no-publicly-accessible \
    --auto-minor-version-upgrade \
    --deletion-protection \
    --tags "Key=Name,Value=${PROJECT_NAME}-db" "Key=Project,Value=${PROJECT_NAME}" \
    --region "$AWS_REGION"

echo "⏳ RDSインスタンスの起動を待機しています..."

# RDSインスタンスが利用可能になるまで待機
aws rds wait db-instance-available \
    --db-instance-identifier "${PROJECT_NAME}-db" \
    --region "$AWS_REGION"

# RDSエンドポイントを取得
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "${PROJECT_NAME}-db" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region "$AWS_REGION")

RDS_PORT=$(aws rds describe-db-instances \
    --db-instance-identifier "${PROJECT_NAME}-db" \
    --query 'DBInstances[0].Endpoint.Port' \
    --output text \
    --region "$AWS_REGION")

echo "✅ RDSインスタンス作成完了"

# 出力ファイルに保存
cat > "$SCRIPT_DIR/../output/rds-output.sh" << EOF
# RDS構築結果
export RDS_SG_ID="$RDS_SG_ID"
export LAMBDA_SG_ID="$LAMBDA_SG_ID"
export RDS_ENDPOINT="$RDS_ENDPOINT"
export RDS_PORT="$RDS_PORT"
export RDS_DB_NAME="$RDS_DB_NAME"
export RDS_MASTER_USERNAME="$RDS_MASTER_USERNAME"
EOF

# 接続情報を別ファイルに保存（セキュリティ注意）
cat > "$SCRIPT_DIR/../output/rds-connection.txt" << EOF
# RDS接続情報（本番環境では適切に管理してください）
Host: $RDS_ENDPOINT
Port: $RDS_PORT
Database: $RDS_DB_NAME
Username: $RDS_MASTER_USERNAME
Password: [設定したパスワード]

# psqlでの接続コマンド:
# psql -h $RDS_ENDPOINT -p $RDS_PORT -U $RDS_MASTER_USERNAME -d $RDS_DB_NAME
EOF

echo ""
echo "=============================================="
echo "  RDS PostgreSQL 構築完了"
echo "=============================================="
echo ""
echo "作成されたリソース:"
echo "  RDS Instance:      ${PROJECT_NAME}-db"
echo "  Endpoint:          $RDS_ENDPOINT"
echo "  Port:              $RDS_PORT"
echo "  Database:          $RDS_DB_NAME"
echo "  Security Group:    $RDS_SG_ID"
echo ""
echo "⚠️  接続情報は output/rds-connection.txt に保存されました"
echo "⚠️  本番環境では AWS Secrets Manager での管理を推奨します"
echo ""
echo "次のステップ: ./03-create-cognito.sh を実行"
echo ""

