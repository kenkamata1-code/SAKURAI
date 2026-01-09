#!/bin/bash
#
# 01-create-vpc.sh
# VPCとネットワークリソースの作成
#

set -e

# 設定ファイルの読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/env.sh"

echo "=============================================="
echo "  VPC・ネットワーク構築"
echo "=============================================="

# VPCの作成
echo "📦 VPCを作成しています..."
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block "$VPC_CIDR" \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PROJECT_NAME}-vpc},{Key=Project,Value=${PROJECT_NAME}}]" \
    --region "$AWS_REGION" \
    --query 'Vpc.VpcId' \
    --output text)

echo "✅ VPC作成完了: $VPC_ID"

# DNSホスト名を有効化
aws ec2 modify-vpc-attribute \
    --vpc-id "$VPC_ID" \
    --enable-dns-hostnames "{\"Value\":true}" \
    --region "$AWS_REGION"

aws ec2 modify-vpc-attribute \
    --vpc-id "$VPC_ID" \
    --enable-dns-support "{\"Value\":true}" \
    --region "$AWS_REGION"

echo "✅ DNS設定完了"

# インターネットゲートウェイの作成
echo "📦 インターネットゲートウェイを作成しています..."
IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PROJECT_NAME}-igw},{Key=Project,Value=${PROJECT_NAME}}]" \
    --region "$AWS_REGION" \
    --query 'InternetGateway.InternetGatewayId' \
    --output text)

aws ec2 attach-internet-gateway \
    --internet-gateway-id "$IGW_ID" \
    --vpc-id "$VPC_ID" \
    --region "$AWS_REGION"

echo "✅ インターネットゲートウェイ作成完了: $IGW_ID"

# パブリックサブネット1の作成 (AZ-a)
echo "📦 パブリックサブネット1を作成しています..."
PUBLIC_SUBNET_1_ID=$(aws ec2 create-subnet \
    --vpc-id "$VPC_ID" \
    --cidr-block "$PUBLIC_SUBNET_1_CIDR" \
    --availability-zone "${AWS_REGION}a" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-subnet-1},{Key=Project,Value=${PROJECT_NAME}}]" \
    --region "$AWS_REGION" \
    --query 'Subnet.SubnetId' \
    --output text)

aws ec2 modify-subnet-attribute \
    --subnet-id "$PUBLIC_SUBNET_1_ID" \
    --map-public-ip-on-launch \
    --region "$AWS_REGION"

echo "✅ パブリックサブネット1作成完了: $PUBLIC_SUBNET_1_ID"

# パブリックサブネット2の作成 (AZ-c)
echo "📦 パブリックサブネット2を作成しています..."
PUBLIC_SUBNET_2_ID=$(aws ec2 create-subnet \
    --vpc-id "$VPC_ID" \
    --cidr-block "$PUBLIC_SUBNET_2_CIDR" \
    --availability-zone "${AWS_REGION}c" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-subnet-2},{Key=Project,Value=${PROJECT_NAME}}]" \
    --region "$AWS_REGION" \
    --query 'Subnet.SubnetId' \
    --output text)

aws ec2 modify-subnet-attribute \
    --subnet-id "$PUBLIC_SUBNET_2_ID" \
    --map-public-ip-on-launch \
    --region "$AWS_REGION"

echo "✅ パブリックサブネット2作成完了: $PUBLIC_SUBNET_2_ID"

# プライベートサブネット1の作成 (AZ-a) - RDS用
echo "📦 プライベートサブネット1を作成しています..."
PRIVATE_SUBNET_1_ID=$(aws ec2 create-subnet \
    --vpc-id "$VPC_ID" \
    --cidr-block "$PRIVATE_SUBNET_1_CIDR" \
    --availability-zone "${AWS_REGION}a" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-subnet-1},{Key=Project,Value=${PROJECT_NAME}}]" \
    --region "$AWS_REGION" \
    --query 'Subnet.SubnetId' \
    --output text)

echo "✅ プライベートサブネット1作成完了: $PRIVATE_SUBNET_1_ID"

# プライベートサブネット2の作成 (AZ-c) - RDS用
echo "📦 プライベートサブネット2を作成しています..."
PRIVATE_SUBNET_2_ID=$(aws ec2 create-subnet \
    --vpc-id "$VPC_ID" \
    --cidr-block "$PRIVATE_SUBNET_2_CIDR" \
    --availability-zone "${AWS_REGION}c" \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-subnet-2},{Key=Project,Value=${PROJECT_NAME}}]" \
    --region "$AWS_REGION" \
    --query 'Subnet.SubnetId' \
    --output text)

echo "✅ プライベートサブネット2作成完了: $PRIVATE_SUBNET_2_ID"

# パブリックルートテーブルの作成
echo "📦 パブリックルートテーブルを作成しています..."
PUBLIC_RTB_ID=$(aws ec2 create-route-table \
    --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-rtb},{Key=Project,Value=${PROJECT_NAME}}]" \
    --region "$AWS_REGION" \
    --query 'RouteTable.RouteTableId' \
    --output text)

# インターネットゲートウェイへのルートを追加
aws ec2 create-route \
    --route-table-id "$PUBLIC_RTB_ID" \
    --destination-cidr-block "0.0.0.0/0" \
    --gateway-id "$IGW_ID" \
    --region "$AWS_REGION"

# パブリックサブネットにルートテーブルを関連付け
aws ec2 associate-route-table \
    --route-table-id "$PUBLIC_RTB_ID" \
    --subnet-id "$PUBLIC_SUBNET_1_ID" \
    --region "$AWS_REGION"

aws ec2 associate-route-table \
    --route-table-id "$PUBLIC_RTB_ID" \
    --subnet-id "$PUBLIC_SUBNET_2_ID" \
    --region "$AWS_REGION"

echo "✅ パブリックルートテーブル作成完了: $PUBLIC_RTB_ID"

# プライベートルートテーブルの作成
echo "📦 プライベートルートテーブルを作成しています..."
PRIVATE_RTB_ID=$(aws ec2 create-route-table \
    --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-rtb},{Key=Project,Value=${PROJECT_NAME}}]" \
    --region "$AWS_REGION" \
    --query 'RouteTable.RouteTableId' \
    --output text)

# プライベートサブネットにルートテーブルを関連付け
aws ec2 associate-route-table \
    --route-table-id "$PRIVATE_RTB_ID" \
    --subnet-id "$PRIVATE_SUBNET_1_ID" \
    --region "$AWS_REGION"

aws ec2 associate-route-table \
    --route-table-id "$PRIVATE_RTB_ID" \
    --subnet-id "$PRIVATE_SUBNET_2_ID" \
    --region "$AWS_REGION"

echo "✅ プライベートルートテーブル作成完了: $PRIVATE_RTB_ID"

# 出力ファイルに保存
cat > "$SCRIPT_DIR/../output/vpc-output.sh" << EOF
# VPC構築結果
export VPC_ID="$VPC_ID"
export IGW_ID="$IGW_ID"
export PUBLIC_SUBNET_1_ID="$PUBLIC_SUBNET_1_ID"
export PUBLIC_SUBNET_2_ID="$PUBLIC_SUBNET_2_ID"
export PRIVATE_SUBNET_1_ID="$PRIVATE_SUBNET_1_ID"
export PRIVATE_SUBNET_2_ID="$PRIVATE_SUBNET_2_ID"
export PUBLIC_RTB_ID="$PUBLIC_RTB_ID"
export PRIVATE_RTB_ID="$PRIVATE_RTB_ID"
EOF

echo ""
echo "=============================================="
echo "  VPC構築完了"
echo "=============================================="
echo ""
echo "作成されたリソース:"
echo "  VPC ID:              $VPC_ID"
echo "  IGW ID:              $IGW_ID"
echo "  Public Subnet 1:     $PUBLIC_SUBNET_1_ID"
echo "  Public Subnet 2:     $PUBLIC_SUBNET_2_ID"
echo "  Private Subnet 1:    $PRIVATE_SUBNET_1_ID"
echo "  Private Subnet 2:    $PRIVATE_SUBNET_2_ID"
echo ""
echo "次のステップ: ./02-create-rds.sh を実行"
echo ""

