import pg from "pg";
const { Client } = pg;

export const handler = async (event) => {
    const client = new Client({
        host: process.env.RDS_HOST,
        port: parseInt(process.env.RDS_PORT || "5432"),
        database: process.env.RDS_DATABASE,
        user: process.env.RDS_USER,
        password: process.env.RDS_PASSWORD,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log("Connected to database");
        
        // 各テーブルを個別に作成
        const queries = [
            `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
            
            `CREATE TABLE IF NOT EXISTS categories (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )`,
            
            `CREATE TABLE IF NOT EXISTS products (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS product_images (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                url TEXT NOT NULL,
                display_order INTEGER NOT NULL CHECK (display_order >= 1 AND display_order <= 6),
                created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                UNIQUE(product_id, display_order)
            )`,
            
            `CREATE TABLE IF NOT EXISTS product_variants (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                size TEXT NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                sku TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )`,
            
            `CREATE TABLE IF NOT EXISTS profiles (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS cart_items (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                cognito_user_id VARCHAR(255) NOT NULL,
                product_id UUID REFERENCES products(id) ON DELETE CASCADE,
                variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(cognito_user_id, product_id, variant_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS orders (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                cognito_user_id VARCHAR(255) NOT NULL,
                total_amount INTEGER NOT NULL,
                status TEXT DEFAULT 'pending' NOT NULL,
                shipping_name TEXT,
                shipping_postal_code TEXT,
                shipping_address TEXT,
                shipping_phone TEXT,
                stripe_session_id VARCHAR(255),
                stripe_payment_intent_id VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
            )`,
            
            `CREATE TABLE IF NOT EXISTS order_items (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
                product_id UUID REFERENCES products(id) ON DELETE SET NULL,
                product_name TEXT NOT NULL,
                product_price INTEGER NOT NULL,
                quantity INTEGER DEFAULT 1 NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
            )`,
            
            `CREATE TABLE IF NOT EXISTS styling (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS styling_images (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                styling_id UUID NOT NULL REFERENCES styling(id) ON DELETE CASCADE,
                url TEXT NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )`,
            
            `CREATE TABLE IF NOT EXISTS page_views (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                page_path TEXT NOT NULL,
                page_title TEXT NOT NULL,
                cognito_user_id VARCHAR(255),
                session_id TEXT NOT NULL,
                referrer TEXT DEFAULT 'direct',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )`,
            
            // page_viewsにreferrerカラムがなければ追加
            `ALTER TABLE page_views ADD COLUMN IF NOT EXISTS referrer TEXT DEFAULT 'direct'`,
            
            // ==================== WARDROBE テーブル ====================
            `CREATE TABLE IF NOT EXISTS wardrobe_items (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                cognito_user_id VARCHAR(255) NOT NULL,
                name TEXT NOT NULL,
                brand TEXT,
                product_number TEXT,
                size TEXT,
                size_details JSONB,
                model_worn_size TEXT,
                measurements TEXT,
                color TEXT,
                category TEXT CHECK (category IS NULL OR category IN (
                    'トップス', 'アウター／ジャケット', 'パンツ', 
                    'その他（スーツ／ワンピース等）', 'バッグ', 'シューズ', 'アクセサリー／小物'
                )),
                wear_scene TEXT CHECK (wear_scene IS NULL OR wear_scene IN ('casual', 'formal', 'both')),
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS wardrobe_styling_photos (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                cognito_user_id VARCHAR(255) NOT NULL,
                image_url TEXT NOT NULL,
                title TEXT,
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
            )`,
            
            `CREATE TABLE IF NOT EXISTS wardrobe_styling_items (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                styling_photo_id UUID NOT NULL REFERENCES wardrobe_styling_photos(id) ON DELETE CASCADE,
                wardrobe_item_id UUID NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                UNIQUE(styling_photo_id, wardrobe_item_id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS foot_measurements (
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
            )`,
            
            `CREATE TABLE IF NOT EXISTS brand_size_mappings (
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
            )`,
            
            // WARDROBE インデックス
            `CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user ON wardrobe_items(cognito_user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_wardrobe_styling_photos_user ON wardrobe_styling_photos(cognito_user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_foot_measurements_user ON foot_measurements(cognito_user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_brand_size_mappings_user ON brand_size_mappings(cognito_user_id)`,
            
            // インデックス
            `CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)`,
            `CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`,
            `CREATE INDEX IF NOT EXISTS idx_profiles_cognito_user_id ON profiles(cognito_user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(cognito_user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(cognito_user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC)`,
            
            // サンプルデータ
            `INSERT INTO categories (name, slug, description) VALUES
                ('アウトドアウェア', 'outdoor-wear', 'アウトドアアクティビティに最適なウェア'),
                ('フットウェア', 'footwear', '快適で耐久性のあるシューズ'),
                ('アクセサリー', 'accessories', 'スタイリッシュなアクセサリー')
            ON CONFLICT (slug) DO NOTHING`,
            
            // profiles テーブルにオンボーディング用カラムを追加（既存DBマイグレーション）
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm INTEGER`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg INTEGER`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_type TEXT CHECK (body_type IS NULL OR body_type IN ('straight', 'wave', 'natural'))`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_features TEXT[]`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_features_note TEXT`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_initial TEXT`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_wardrobe_public BOOLEAN DEFAULT FALSE`,
            `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_styling_public BOOLEAN DEFAULT FALSE`,

            // wardrobe_items テーブルに新カラムを追加（既存DBマイグレーション）
            `ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS product_number TEXT`,
            `ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS model_worn_size TEXT`,
            `ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS measurements TEXT`,
            `ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS wear_scene TEXT CHECK (wear_scene IS NULL OR wear_scene IN ('casual', 'formal', 'both'))`,

            // 管理者ユーザーを作成
            `INSERT INTO profiles (cognito_user_id, email, is_admin) VALUES
                ('87649a98-e0e1-7067-4c8a-b7fd0f084e3f', 'test@example.com', true),
                ('37347a98-00b1-702b-cb14-199bcbe37634', 'ken.kamata1@gmail.com', true)
            ON CONFLICT (cognito_user_id) DO UPDATE SET is_admin = true, updated_at = NOW()`,
            
            // メールアドレスで管理者権限を付与（既存ユーザー用）
            `UPDATE profiles SET is_admin = true, updated_at = NOW() WHERE email = 'ken.kamata1@gmail.com'`,
            
            // サンプル商品データ（IDを自動生成）
            `INSERT INTO products (name, slug, description, price, image_url, category, stock, featured, display_order) VALUES
                ('クラシック ペニーローファー', 'classic-penny-loafer', 
                 '伝統的なデザインのペニーローファー。上質なカーフレザーを使用し、熟練の職人が一足一足丁寧に仕上げました。', 
                 38500, 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800', 
                 'shoes', 10, true, 1),
                ('タッセル ローファー', 'tassel-loafer', 
                 'エレガントなタッセルが特徴のローファー。ビジネスからカジュアルまで幅広いシーンで活躍します。', 
                 42000, 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800', 
                 'shoes', 8, true, 2),
                ('ビットローファー', 'bit-loafer', 
                 '金属のビットが上品なアクセント。イタリアンスタイルの洗練されたデザインです。', 
                 45000, 'https://images.unsplash.com/photo-1582897085656-c636d006a246?w=800', 
                 'shoes', 5, true, 3),
                ('シューケアセット', 'shoe-care-set', 
                 '革靴のお手入れに必要なアイテムをセットにしました。クリーム、ブラシ、クロス入り。', 
                 5500, 'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=800', 
                 'accessory', 20, false, 4)
            ON CONFLICT (slug) DO NOTHING`,
            
            // サンプルスタイリングデータ（IDを自動生成）
            `INSERT INTO styling (title, description, image_url, color, size, height, slug, display_order) VALUES
                ('ビジネスカジュアル', 
                 'クラシックペニーローファーを使ったビジネスカジュアルコーディネート。ネイビーのジャケットと相性抜群です。',
                 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
                 'ネイビー×ブラウン', 'M', '175cm', 'business-casual', 1),
                ('カジュアルスタイル', 
                 'タッセルローファーで作る大人のカジュアルスタイル。デニムとの相性も抜群。',
                 'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800',
                 'インディゴ×タン', 'L', '180cm', 'casual-style', 2),
                ('フォーマルスタイル', 
                 'ビットローファーで作るフォーマルスタイル。特別な日のコーディネートに。',
                 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
                 'チャコール×ブラック', 'M', '172cm', 'formal-style', 3)
            ON CONFLICT (slug) DO NOTHING`
        ];
        
        for (const query of queries) {
            try {
                await client.query(query);
                console.log("Executed query successfully");
            } catch (err) {
                console.log("Query error (may be OK if already exists):", err.message);
            }
        }
        
        const tables = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Schema applied successfully",
                tables: tables.rows.map(r => r.table_name)
            })
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    } finally {
        await client.end();
    }
};
