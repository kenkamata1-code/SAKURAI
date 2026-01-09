import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xutbjoctkxwywizblrio.supabase.co',
  'sb_secret_ECfq5xY2dJGPznKsDuayEA_m8rrqems',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkTables() {
  console.log('Supabaseのデータを確認...\n');
  
  // 各テーブルのデータを取得
  const tables = ['categories', 'products', 'product_images', 'product_variants', 'styling', 'styling_images'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(5);
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${data?.length || 0} 件取得`);
      if (data && data.length > 0) {
        console.log(`   サンプル: ${JSON.stringify(data[0]).substring(0, 100)}...`);
      }
    }
  }
}

checkTables().catch(console.error);
