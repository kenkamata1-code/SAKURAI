#!/bin/bash
#
# 00-setup-aws-cli.sh
# AWS CLIのインストールと初期設定
#

set -e

echo "=============================================="
echo "  AWS CLI セットアップスクリプト"
echo "=============================================="

# OSの検出
OS="$(uname -s)"

case "$OS" in
    Darwin)
        echo "🍎 macOS を検出しました"
        
        # Homebrewがインストールされているか確認
        if ! command -v brew &> /dev/null; then
            echo "📦 Homebrewをインストールしています..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        # AWS CLIのインストール
        if ! command -v aws &> /dev/null; then
            echo "📦 AWS CLIをインストールしています..."
            brew install awscli
        else
            echo "✅ AWS CLIは既にインストールされています"
        fi
        ;;
    Linux)
        echo "🐧 Linux を検出しました"
        
        if ! command -v aws &> /dev/null; then
            echo "📦 AWS CLIをインストールしています..."
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip awscliv2.zip
            sudo ./aws/install
            rm -rf aws awscliv2.zip
        else
            echo "✅ AWS CLIは既にインストールされています"
        fi
        ;;
    *)
        echo "❌ サポートされていないOS: $OS"
        exit 1
        ;;
esac

# バージョン確認
echo ""
echo "AWS CLI バージョン:"
aws --version

echo ""
echo "=============================================="
echo "  AWS認証情報の設定"
echo "=============================================="
echo ""
echo "AWS認証情報を設定します。"
echo "AWSコンソールからアクセスキーを取得してください："
echo "https://console.aws.amazon.com/iam/home#/security_credentials"
echo ""

# 認証情報が既に設定されているか確認
if aws sts get-caller-identity &> /dev/null; then
    echo "✅ AWS認証情報は既に設定されています"
    aws sts get-caller-identity
else
    echo "AWS認証情報を設定してください："
    aws configure
fi

echo ""
echo "=============================================="
echo "  セットアップ完了"
echo "=============================================="
echo ""
echo "次のステップ："
echo "  1. ./01-create-vpc.sh を実行してVPCを作成"
echo "  2. ./02-create-rds.sh を実行してRDSを作成"
echo "  3. 以降のスクリプトを順番に実行"
echo ""

