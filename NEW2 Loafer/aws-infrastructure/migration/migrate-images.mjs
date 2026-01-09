/**
 * Supabase Storage → S3 画像移行スクリプト
 * 
 * 使用方法:
 * 1. 環境変数を設定
 * 2. node migrate-images.mjs を実行
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import https from 'https';

const { Pool } = pg;

// ==============================================
// 設定
// ==============================================
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    bucket: 'product-images',
  },
  aws: {
    region: 'ap-northeast-1',
    s3Bucket: 'loafer-product-images-917086196108',
    cloudfrontUrl: 'https://d8l6v2r98r1en.cloudfront.net',
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

const s3 = new S3Client({ region: config.aws.region });

const rdsPool = new Pool({
  ...config.rds,
  ssl: { rejectUnauthorized: false },
});

// ==============================================
// ヘルパー関数
// ==============================================
function fetchImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        data: Buffer.concat(chunks),
        contentType: res.headers['content-type'] || 'image/jpeg',
      }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ==============================================
// 画像移行
// ==============================================
async function migrateImages() {
  console.log('==============================================');
  console.log('  Supabase Storage → S3 画像移行');
  console.log('==============================================\n');

  try {
    // 1. Supabase Storageから画像一覧を取得
    console.log('📦 Supabase Storageから画像を取得...');
    
    const { data: files, error } = await supabase.storage
      .from(config.supabase.bucket)
      .list('', { limit: 1000, offset: 0 });

    if (error) {
      throw new Error(`Storage エラー: ${error.message}`);
    }

    console.log(`✅ ${files.length} 個のファイルを取得\n`);

    // 2. 各画像を移行
    let successCount = 0;
    let errorCount = 0;
    const urlMappings = [];

    for (const file of files) {
      if (file.id === null) continue; // フォルダはスキップ

      console.log(`📤 移行中: ${file.name}`);

      try {
        // Supabaseから画像URLを取得
        const { data: urlData } = supabase.storage
          .from(config.supabase.bucket)
          .getPublicUrl(file.name);

        const oldUrl = urlData.publicUrl;

        // 画像をダウンロード
        const { data: imageData, contentType } = await fetchImage(oldUrl);

        // S3にアップロード
        const s3Key = `products/${file.name}`;
        const putCommand = new PutObjectCommand({
          Bucket: config.aws.s3Bucket,
          Key: s3Key,
          Body: imageData,
          ContentType: contentType,
        });

        await s3.send(putCommand);

        const newUrl = `${config.aws.cloudfrontUrl}/${s3Key}`;

        urlMappings.push({
          oldUrl,
          newUrl,
          fileName: file.name,
        });

        console.log(`  ✅ 成功: ${file.name}`);
        successCount++;

      } catch (err) {
        console.log(`  ❌ エラー: ${file.name} - ${err.message}`);
        errorCount++;
      }
    }

    // 3. フォルダ内のファイルも取得
    const folders = files.filter(f => f.id === null);
    for (const folder of folders) {
      const { data: subFiles, error: subError } = await supabase.storage
        .from(config.supabase.bucket)
        .list(folder.name, { limit: 1000 });

      if (subError) continue;

      for (const file of subFiles) {
        if (file.id === null) continue;

        const fullPath = `${folder.name}/${file.name}`;
        console.log(`📤 移行中: ${fullPath}`);

        try {
          const { data: urlData } = supabase.storage
            .from(config.supabase.bucket)
            .getPublicUrl(fullPath);

          const oldUrl = urlData.publicUrl;
          const { data: imageData, contentType } = await fetchImage(oldUrl);

          const s3Key = fullPath;
          const putCommand = new PutObjectCommand({
            Bucket: config.aws.s3Bucket,
            Key: s3Key,
            Body: imageData,
            ContentType: contentType,
          });

          await s3.send(putCommand);

          const newUrl = `${config.aws.cloudfrontUrl}/${s3Key}`;

          urlMappings.push({ oldUrl, newUrl, fileName: fullPath });
          console.log(`  ✅ 成功: ${fullPath}`);
          successCount++;

        } catch (err) {
          console.log(`  ❌ エラー: ${fullPath} - ${err.message}`);
          errorCount++;
        }
      }
    }

    // 4. データベース内のURLを更新
    console.log('\n📦 データベース内の画像URLを更新...');

    for (const mapping of urlMappings) {
      // product_images テーブル
      await rdsPool.query(
        `UPDATE product_images SET url = $1 WHERE url = $2`,
        [mapping.newUrl, mapping.oldUrl]
      );

      // products テーブル
      await rdsPool.query(
        `UPDATE products SET image_url = $1 WHERE image_url = $2`,
        [mapping.newUrl, mapping.oldUrl]
      );

      // styling テーブル
      await rdsPool.query(
        `UPDATE styling SET image_url = $1 WHERE image_url = $2`,
        [mapping.newUrl, mapping.oldUrl]
      );

      // styling_images テーブル
      await rdsPool.query(
        `UPDATE styling_images SET url = $1 WHERE url = $2`,
        [mapping.newUrl, mapping.oldUrl]
      );
    }

    // 5. 結果サマリー
    console.log('\n==============================================');
    console.log('  移行結果サマリー');
    console.log('==============================================');
    console.log(`  成功: ${successCount}`);
    console.log(`  エラー: ${errorCount}`);
    console.log(`  URL更新: ${urlMappings.length} 件`);
    console.log(`\n  新しいベースURL: ${config.aws.cloudfrontUrl}\n`);

    return urlMappings;

  } catch (error) {
    console.error('移行エラー:', error);
    throw error;
  } finally {
    await rdsPool.end();
  }
}

// 実行
migrateImages()
  .then(results => {
    console.log('画像移行完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('移行失敗:', error);
    process.exit(1);
  });

