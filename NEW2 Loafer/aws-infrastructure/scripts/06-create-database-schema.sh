#!/bin/bash
#
# 06-create-database-schema.sh
# RDSデータベースのスキーマ作成
#

set -e

# 設定ファイルの読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/env.sh"
source "$SCRIPT_DIR/../output/rds-output.sh"

echo "=============================================="
echo "  データベーススキーマ作成"
echo "=============================================="

# パスワードの入力
if [ -z "$RDS_MASTER_PASSWORD" ]; then
    echo ""
    echo "RDSマスターパスワードを入力してください:"
    read -s RDS_MASTER_PASSWORD
    echo ""
fi

# SQLスキーマファイルの作成
cat > "$SCRIPT_DIR/../database/schema.sql" << 'EOF'
-- ============================================
-- Loafer ECサイト データベーススキーマ
-- AWS RDS PostgreSQL用
-- ============================================

-- UUIDの生成関数を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- カテゴリテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ============================================
-- 商品テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT DEFAULT '',
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category TEXT CHECK (category IS NULL OR category IN ('shoes', 'accessory')),
    stock INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);

-- ============================================
-- 商品画像テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    display_order INTEGER NOT NULL CHECK (display_order >= 1 AND display_order <= 6),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(product_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(product_id, display_order);

-- ============================================
-- 商品バリエーション（サイズ・在庫）テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    sku TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- ============================================
-- ユーザープロフィールテーブル
-- ※ Cognito User IDを使用（Supabaseのauth.usersから変更）
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_user_id VARCHAR(255) UNIQUE NOT NULL,
    email TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    postal_code TEXT,
    address TEXT,
    gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
    birth_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_cognito_user_id ON profiles(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- カートアイテムテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_user_id VARCHAR(255) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cognito_user_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(cognito_user_id);

-- ============================================
-- 注文テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_user_id VARCHAR(255) NOT NULL,
    total_amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    shipping_name TEXT NOT NULL,
    shipping_postal_code TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- 注文明細テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_price INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================
-- スタイリングテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS styling (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    image_url TEXT NOT NULL,
    color TEXT DEFAULT '',
    size TEXT DEFAULT '',
    height TEXT DEFAULT '',
    slug TEXT UNIQUE NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_styling_slug ON styling(slug);
CREATE INDEX IF NOT EXISTS idx_styling_display_order ON styling(display_order);

-- ============================================
-- スタイリング画像テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS styling_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    styling_id UUID NOT NULL REFERENCES styling(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_styling_images_styling_id ON styling_images(styling_id);
CREATE INDEX IF NOT EXISTS idx_styling_images_display_order ON styling_images(display_order);

-- ============================================
-- ページビュー（アナリティクス）テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_path TEXT NOT NULL,
    page_title TEXT NOT NULL,
    cognito_user_id VARCHAR(255),
    session_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(cognito_user_id);

-- ============================================
-- 管理者チェック関数
-- ============================================
CREATE OR REPLACE FUNCTION is_user_admin(user_id VARCHAR(255))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE cognito_user_id = user_id
        AND is_admin = TRUE
    );
END;
$$;

-- ============================================
-- updated_at自動更新トリガー関数
-- ============================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- トリガーの作成
DROP TRIGGER IF EXISTS on_products_updated ON products;
CREATE TRIGGER on_products_updated
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS on_product_variants_updated ON product_variants;
CREATE TRIGGER on_product_variants_updated
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS on_profiles_updated ON profiles;
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS on_cart_items_updated ON cart_items;
CREATE TRIGGER on_cart_items_updated
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS on_orders_updated ON orders;
CREATE TRIGGER on_orders_updated
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS on_styling_updated ON styling;
CREATE TRIGGER on_styling_updated
    BEFORE UPDATE ON styling
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- ============================================
-- サンプルデータの挿入
-- ============================================
INSERT INTO categories (name, slug, description) VALUES
    ('アウトドアウェア', 'outdoor-wear', 'アウトドアアクティビティに最適なウェア'),
    ('アクセサリー', 'accessories', 'スタイリッシュなアクセサリー'),
    ('フットウェア', 'footwear', '快適で耐久性のあるシューズ'),
    ('バッグ', 'bags', '機能的なバッグとバックパック')
ON CONFLICT (slug) DO NOTHING;

-- サンプル商品の挿入
INSERT INTO products (name, slug, description, price, image_url, category_id, stock, featured, category)
SELECT 
    'マウンテンジャケット', 
    'mountain-jacket',
    '耐久性のある防水ジャケット。山での冒険に最適。',
    28000,
    'https://images.pexels.com/photos/1159670/pexels-photo-1159670.jpeg',
    c.id,
    50,
    TRUE,
    'accessory'
FROM categories c WHERE c.slug = 'outdoor-wear'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, price, image_url, category_id, stock, featured, category)
SELECT 
    'トレイルランニングシューズ',
    'trail-running-shoes',
    '優れたグリップ力と快適性を備えたシューズ。',
    15000,
    'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg',
    c.id,
    75,
    TRUE,
    'shoes'
FROM categories c WHERE c.slug = 'footwear'
ON CONFLICT (slug) DO NOTHING;

COMMIT;
EOF

mkdir -p "$SCRIPT_DIR/../database"
echo "✅ スキーマファイル作成完了"

# データベースに接続してスキーマを実行
echo "📦 データベースにスキーマを適用しています..."

# psqlコマンドが利用可能か確認
if ! command -v psql &> /dev/null; then
    echo "⚠️  psqlがインストールされていません"
    echo ""
    echo "以下の方法でインストールしてください:"
    echo ""
    echo "macOS:"
    echo "  brew install postgresql"
    echo ""
    echo "または、以下のコマンドで手動でスキーマを適用してください:"
    echo ""
    echo "psql -h $RDS_ENDPOINT -p $RDS_PORT -U $RDS_MASTER_USERNAME -d $RDS_DB_NAME -f $SCRIPT_DIR/../database/schema.sql"
    echo ""
    exit 0
fi

# 環境変数でパスワードを設定
export PGPASSWORD="$RDS_MASTER_PASSWORD"

psql \
    -h "$RDS_ENDPOINT" \
    -p "$RDS_PORT" \
    -U "$RDS_MASTER_USERNAME" \
    -d "$RDS_DB_NAME" \
    -f "$SCRIPT_DIR/../database/schema.sql"

unset PGPASSWORD

echo ""
echo "=============================================="
echo "  データベーススキーマ作成完了"
echo "=============================================="
echo ""
echo "作成されたテーブル:"
echo "  - categories"
echo "  - products"
echo "  - product_images"
echo "  - product_variants"
echo "  - profiles"
echo "  - cart_items"
echo "  - orders"
echo "  - order_items"
echo "  - styling"
echo "  - styling_images"
echo "  - page_views"
echo ""
echo "作成された関数:"
echo "  - is_user_admin()"
echo "  - handle_updated_at()"
echo ""
echo "✅ すべてのインフラ構築が完了しました！"
echo ""

