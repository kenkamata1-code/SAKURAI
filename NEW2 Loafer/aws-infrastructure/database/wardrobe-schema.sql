-- ============================================
-- WARDROBE モジュール データベーススキーマ
-- AWS RDS PostgreSQL用
-- ============================================

-- ============================================
-- ワードローブアイテムテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS wardrobe_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_user_id VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    size TEXT,
    size_details JSONB,
    color TEXT,
    category TEXT CHECK (category IS NULL OR category IN (
        'トップス', 
        'アウター／ジャケット', 
        'パンツ', 
        'その他（スーツ／ワンピース等）', 
        'バッグ', 
        'シューズ', 
        'アクセサリー／小物'
    )),
    purchase_date DATE,
    purchase_price INTEGER,
    currency TEXT DEFAULT 'JPY',
    purchase_location TEXT,
    source_url TEXT,
    image_url TEXT,
    image_url_2 TEXT,
    image_url_3 TEXT,
    notes TEXT,
    is_from_shop BOOLEAN DEFAULT FALSE,
    is_discarded BOOLEAN DEFAULT FALSE,
    discarded_at TIMESTAMPTZ,
    is_sold BOOLEAN DEFAULT FALSE,
    sold_date DATE,
    sold_price INTEGER,
    sold_currency TEXT,
    sold_location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user ON wardrobe_items(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_category ON wardrobe_items(category);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_created_at ON wardrobe_items(created_at DESC);

-- ============================================
-- ワードローブスタイリング写真テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS wardrobe_styling_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_user_id VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    title TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wardrobe_styling_photos_user ON wardrobe_styling_photos(cognito_user_id);

-- ============================================
-- スタイリング写真とアイテムの関連テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS wardrobe_styling_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    styling_photo_id UUID NOT NULL REFERENCES wardrobe_styling_photos(id) ON DELETE CASCADE,
    wardrobe_item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(styling_photo_id, wardrobe_item_id)
);

-- ============================================
-- 足の測定テーブル
-- ============================================
CREATE TABLE IF NOT EXISTS foot_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_user_id VARCHAR(255) NOT NULL,
    foot_type TEXT NOT NULL CHECK (foot_type IN ('left', 'right')),
    length_mm NUMERIC(5, 1) NOT NULL,
    width_mm NUMERIC(5, 1) NOT NULL,
    arch_height_mm NUMERIC(5, 1),
    instep_height_mm NUMERIC(5, 1),
    scan_image_url TEXT,
    measurement_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_foot_measurements_user ON foot_measurements(cognito_user_id);

-- ============================================
-- ブランドサイズマッピングテーブル
-- ============================================
CREATE TABLE IF NOT EXISTS brand_size_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_user_id VARCHAR(255) NOT NULL,
    brand_name TEXT NOT NULL,
    size TEXT NOT NULL,
    size_system TEXT NOT NULL CHECK (size_system IN ('JP', 'US', 'UK', 'EU')),
    numeric_size NUMERIC(4, 1),
    fit_rating INTEGER DEFAULT 3 CHECK (fit_rating >= 1 AND fit_rating <= 5),
    comfort_rating INTEGER DEFAULT 3 CHECK (comfort_rating >= 1 AND comfort_rating <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_brand_size_mappings_user ON brand_size_mappings(cognito_user_id);
CREATE INDEX IF NOT EXISTS idx_brand_size_mappings_brand ON brand_size_mappings(brand_name);

-- ============================================
-- トリガーの作成
-- ============================================
DROP TRIGGER IF EXISTS on_wardrobe_items_updated ON wardrobe_items;
CREATE TRIGGER on_wardrobe_items_updated
    BEFORE UPDATE ON wardrobe_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

COMMIT;

