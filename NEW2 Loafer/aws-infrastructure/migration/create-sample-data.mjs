import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'loafer-db.cfqws4u4qtw7.ap-northeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'loafer',
  user: 'loafer_admin',
  password: 'LoaferDB2026!Secure',
  ssl: { rejectUnauthorized: false },
});

async function createSampleData() {
  console.log('==============================================');
  console.log('  サンプルデータ作成');
  console.log('==============================================\n');

  const client = await pool.connect();
  
  try {
    // カテゴリ
    console.log('📦 カテゴリを作成...');
    await client.query(`
      INSERT INTO categories (id, name, slug, description) VALUES
        ('c1000000-0000-0000-0000-000000000001', 'ローファー', 'loafer', '上質な革を使用したクラシックなローファー'),
        ('c1000000-0000-0000-0000-000000000002', 'アクセサリー', 'accessory', 'シューケア用品やアクセサリー')
      ON CONFLICT (slug) DO NOTHING
    `);
    console.log('  ✅ カテゴリ作成完了');

    // 商品
    console.log('📦 商品を作成...');
    await client.query(`
      INSERT INTO products (id, name, slug, description, price, image_url, category_id, category, stock, featured, display_order) VALUES
        ('p1000000-0000-0000-0000-000000000001', 'クラシック ペニーローファー', 'classic-penny-loafer', 
         '伝統的なデザインのペニーローファー。上質なカーフレザーを使用し、熟練の職人が一足一足丁寧に仕上げました。', 
         38500, 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800', 
         'c1000000-0000-0000-0000-000000000001', 'shoes', 10, true, 1),
        ('p1000000-0000-0000-0000-000000000002', 'タッセル ローファー', 'tassel-loafer', 
         'エレガントなタッセルが特徴のローファー。ビジネスからカジュアルまで幅広いシーンで活躍します。', 
         42000, 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800', 
         'c1000000-0000-0000-0000-000000000001', 'shoes', 8, true, 2),
        ('p1000000-0000-0000-0000-000000000003', 'ビットローファー', 'bit-loafer', 
         '金属のビットが上品なアクセント。イタリアンスタイルの洗練されたデザインです。', 
         45000, 'https://images.unsplash.com/photo-1582897085656-c636d006a246?w=800', 
         'c1000000-0000-0000-0000-000000000001', 'shoes', 5, true, 3),
        ('p1000000-0000-0000-0000-000000000004', 'シューケアセット', 'shoe-care-set', 
         '革靴のお手入れに必要なアイテムをセットにしました。クリーム、ブラシ、クロス入り。', 
         5500, 'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=800', 
         'c1000000-0000-0000-0000-000000000002', 'accessory', 20, false, 4)
      ON CONFLICT (slug) DO NOTHING
    `);
    console.log('  ✅ 商品作成完了');

    // 商品バリエーション（サイズ）
    console.log('📦 商品バリエーションを作成...');
    const sizes = ['24.5', '25.0', '25.5', '26.0', '26.5', '27.0', '27.5', '28.0'];
    const products = [
      'p1000000-0000-0000-0000-000000000001',
      'p1000000-0000-0000-0000-000000000002',
      'p1000000-0000-0000-0000-000000000003'
    ];
    
    let variantIndex = 1;
    for (const productId of products) {
      for (const size of sizes) {
        await client.query(`
          INSERT INTO product_variants (id, product_id, size, stock, sku)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [
          `v1000000-0000-0000-0000-00000000${String(variantIndex).padStart(4, '0')}`,
          productId,
          size,
          Math.floor(Math.random() * 5) + 1,
          `SKU-${variantIndex}`
        ]);
        variantIndex++;
      }
    }
    console.log('  ✅ バリエーション作成完了');

    // スタイリング
    console.log('📦 スタイリングを作成...');
    await client.query(`
      INSERT INTO styling (id, title, description, image_url, color, size, height, slug, display_order) VALUES
        ('s1000000-0000-0000-0000-000000000001', 'ビジネスカジュアル', 
         'クラシックペニーローファーを使ったビジネスカジュアルコーディネート。ネイビーのジャケットと相性抜群です。',
         'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
         'ネイビー×ブラウン', 'M', '175cm', 'business-casual', 1),
        ('s1000000-0000-0000-0000-000000000002', 'カジュアルスタイル', 
         'タッセルローファーで作る大人のカジュアルスタイル。デニムとの相性も抜群。',
         'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800',
         'インディゴ×タン', 'L', '180cm', 'casual-style', 2),
        ('s1000000-0000-0000-0000-000000000003', 'フォーマルスタイル', 
         'ビットローファーで作るフォーマルスタイル。特別な日のコーディネートに。',
         'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
         'チャコール×ブラック', 'M', '172cm', 'formal-style', 3)
      ON CONFLICT (slug) DO NOTHING
    `);
    console.log('  ✅ スタイリング作成完了');

    // 結果確認
    console.log('\n==============================================');
    console.log('  作成結果');
    console.log('==============================================');
    
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM product_variants) as variants,
        (SELECT COUNT(*) FROM styling) as styling
    `);
    
    console.log(`  カテゴリ: ${counts.rows[0].categories} 件`);
    console.log(`  商品: ${counts.rows[0].products} 件`);
    console.log(`  バリエーション: ${counts.rows[0].variants} 件`);
    console.log(`  スタイリング: ${counts.rows[0].styling} 件`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

createSampleData()
  .then(() => console.log('\n✅ サンプルデータ作成完了!'))
  .catch(err => console.error('エラー:', err));
