/**
 * Supabase → AWS RDS データ移行スクリプト
 * 
 * 移行対象:
 * - カテゴリ
 * - 商品
 * - 商品画像
 * - 商品バリエーション
 * - スタイリング
 * - スタイリング画像
 * - 注文（履歴として）
 * - 注文明細
 * 
 * 使用方法:
 * 1. 環境変数を設定
 * 2. node migrate-data.mjs を実行
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Pool } = pg;

// ==============================================
// 設定
// ==============================================
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  rds: {
    host: 'loafer-db.cfqws4u4qtw7.ap-northeast-1.rds.amazonaws.com',
    port: 5432,
    database: 'loafer',
    user: 'loafer_admin',
    password: process.env.RDS_PASSWORD || 'LoaferDB2026!Secure',
  },
};

// ==============================================
// クライアント初期化
// ==============================================
const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rdsPool = new Pool({
  ...config.rds,
  ssl: { rejectUnauthorized: false },
});

// ==============================================
// データ移行関数
// ==============================================
async function migrateCategories() {
  console.log('📦 カテゴリを移行...');
  
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw error;

  for (const cat of data) {
    await rdsPool.query(`
      INSERT INTO categories (id, name, slug, description, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description
    `, [cat.id, cat.name, cat.slug, cat.description, cat.created_at]);
  }

  console.log(`  ✅ ${data.length} 件のカテゴリを移行`);
  return data.length;
}

async function migrateProducts() {
  console.log('📦 商品を移行...');
  
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;

  for (const prod of data) {
    await rdsPool.query(`
      INSERT INTO products (
        id, name, slug, description, price, image_url, category_id, 
        category, stock, featured, display_order, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        image_url = EXCLUDED.image_url,
        category_id = EXCLUDED.category_id,
        category = EXCLUDED.category,
        stock = EXCLUDED.stock,
        featured = EXCLUDED.featured,
        display_order = EXCLUDED.display_order,
        updated_at = EXCLUDED.updated_at
    `, [
      prod.id, prod.name, prod.slug, prod.description, prod.price,
      prod.image_url, prod.category_id, prod.category, prod.stock,
      prod.featured, prod.display_order || 0, prod.created_at, prod.updated_at
    ]);
  }

  console.log(`  ✅ ${data.length} 件の商品を移行`);
  return data.length;
}

async function migrateProductImages() {
  console.log('📦 商品画像を移行...');
  
  const { data, error } = await supabase.from('product_images').select('*');
  if (error) throw error;

  for (const img of data) {
    await rdsPool.query(`
      INSERT INTO product_images (id, product_id, url, display_order, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        url = EXCLUDED.url,
        display_order = EXCLUDED.display_order
    `, [img.id, img.product_id, img.url, img.display_order, img.created_at]);
  }

  console.log(`  ✅ ${data.length} 件の商品画像を移行`);
  return data.length;
}

async function migrateProductVariants() {
  console.log('📦 商品バリエーションを移行...');
  
  const { data, error } = await supabase.from('product_variants').select('*');
  if (error) throw error;

  for (const variant of data) {
    await rdsPool.query(`
      INSERT INTO product_variants (id, product_id, size, stock, sku, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        size = EXCLUDED.size,
        stock = EXCLUDED.stock,
        sku = EXCLUDED.sku,
        updated_at = EXCLUDED.updated_at
    `, [variant.id, variant.product_id, variant.size, variant.stock, variant.sku, variant.created_at, variant.updated_at]);
  }

  console.log(`  ✅ ${data.length} 件のバリエーションを移行`);
  return data.length;
}

async function migrateStyling() {
  console.log('📦 スタイリングを移行...');
  
  const { data, error } = await supabase.from('styling').select('*');
  if (error) throw error;

  for (const style of data) {
    await rdsPool.query(`
      INSERT INTO styling (
        id, title, description, image_url, color, size, height,
        slug, display_order, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        color = EXCLUDED.color,
        size = EXCLUDED.size,
        height = EXCLUDED.height,
        display_order = EXCLUDED.display_order,
        updated_at = EXCLUDED.updated_at
    `, [
      style.id, style.title, style.description, style.image_url,
      style.color, style.size, style.height, style.slug,
      style.display_order || 0, style.created_at, style.updated_at
    ]);
  }

  console.log(`  ✅ ${data.length} 件のスタイリングを移行`);
  return data.length;
}

async function migrateStylingImages() {
  console.log('📦 スタイリング画像を移行...');
  
  const { data, error } = await supabase.from('styling_images').select('*');
  if (error) throw error;

  for (const img of data) {
    await rdsPool.query(`
      INSERT INTO styling_images (id, styling_id, url, display_order, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        url = EXCLUDED.url,
        display_order = EXCLUDED.display_order
    `, [img.id, img.styling_id, img.url, img.display_order, img.created_at]);
  }

  console.log(`  ✅ ${data.length} 件のスタイリング画像を移行`);
  return data.length;
}

// ==============================================
// メイン
// ==============================================
async function migrateData() {
  console.log('==============================================');
  console.log('  Supabase → AWS RDS データ移行');
  console.log('==============================================\n');

  const results = {
    categories: 0,
    products: 0,
    productImages: 0,
    productVariants: 0,
    styling: 0,
    stylingImages: 0,
  };

  try {
    results.categories = await migrateCategories();
    results.products = await migrateProducts();
    results.productImages = await migrateProductImages();
    results.productVariants = await migrateProductVariants();
    results.styling = await migrateStyling();
    results.stylingImages = await migrateStylingImages();

    console.log('\n==============================================');
    console.log('  移行結果サマリー');
    console.log('==============================================');
    console.log(`  カテゴリ:           ${results.categories} 件`);
    console.log(`  商品:               ${results.products} 件`);
    console.log(`  商品画像:           ${results.productImages} 件`);
    console.log(`  商品バリエーション: ${results.productVariants} 件`);
    console.log(`  スタイリング:       ${results.styling} 件`);
    console.log(`  スタイリング画像:   ${results.stylingImages} 件`);
    console.log('');

    return results;

  } catch (error) {
    console.error('移行エラー:', error);
    throw error;
  } finally {
    await rdsPool.end();
  }
}

// 実行
migrateData()
  .then(() => {
    console.log('データ移行完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('移行失敗:', error);
    process.exit(1);
  });

