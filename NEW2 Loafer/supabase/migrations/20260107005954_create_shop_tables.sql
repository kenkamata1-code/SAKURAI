/*
  # Create E-commerce Shop Tables

  ## New Tables
  
  ### Categories
  - `id` (uuid, primary key)
  - `name` (text)
  - `slug` (text, unique)
  - `description` (text)
  - `created_at` (timestamptz)
  
  ### Products
  - `id` (uuid, primary key)
  - `name` (text)
  - `slug` (text, unique)
  - `description` (text)
  - `price` (numeric)
  - `image_url` (text)
  - `category_id` (uuid, foreign key)
  - `stock` (integer)
  - `featured` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### Cart Items
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `product_id` (uuid, foreign key)
  - `quantity` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Categories: Public read access
  - Products: Public read access, authenticated users can manage
  - Cart Items: Users can only manage their own cart items
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  price numeric(10, 2) NOT NULL,
  image_url text DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  stock integer DEFAULT 0,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Categories policies: Public read
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

-- Products policies: Public read
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- Cart items policies: Users can only manage their own cart
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
  ('アウトドアウェア', 'outdoor-wear', 'アウトドアアクティビティに最適なウェア'),
  ('アクセサリー', 'accessories', 'スタイリッシュなアクセサリー'),
  ('フットウェア', 'footwear', '快適で耐久性のあるシューズ'),
  ('バッグ', 'bags', '機能的なバッグとバックパック')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, slug, description, price, image_url, category_id, stock, featured) 
SELECT 
  'マウンテンジャケット', 
  'mountain-jacket',
  '耐久性のある防水ジャケット。山での冒険に最適。',
  28000,
  'https://images.pexels.com/photos/1159670/pexels-photo-1159670.jpeg',
  c.id,
  50,
  true
FROM categories c WHERE c.slug = 'outdoor-wear'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, price, image_url, category_id, stock, featured)
SELECT 
  'サーファーキャップ',
  'surfer-cap',
  'クラシックなデザインのキャップ。長時間の使用に最適。',
  4800,
  'https://images.pexels.com/photos/984619/pexels-photo-984619.jpeg',
  c.id,
  100,
  true
FROM categories c WHERE c.slug = 'accessories'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, price, image_url, category_id, stock, featured)
SELECT 
  'トレイルランニングシューズ',
  'trail-running-shoes',
  '優れたグリップ力と快適性を備えたシューズ。',
  15000,
  'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg',
  c.id,
  75,
  true
FROM categories c WHERE c.slug = 'footwear'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, slug, description, price, image_url, category_id, stock, featured)
SELECT 
  'アドベンチャーバックパック',
  'adventure-backpack',
  '大容量で軽量なバックパック。長期旅行に最適。',
  12000,
  'https://images.pexels.com/photos/2416653/pexels-photo-2416653.jpeg',
  c.id,
  60,
  false
FROM categories c WHERE c.slug = 'bags'
ON CONFLICT (slug) DO NOTHING;