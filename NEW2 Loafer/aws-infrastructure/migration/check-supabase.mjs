import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xutbjoctkxwywizblrio.supabase.co',
  'sb_secret_ECfq5xY2dJGPznKsDuayEA_m8rrqems',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkTables() {
  console.log('Supabaseのテーブルを確認...\n');
  
  // 各テーブルのデータ数を確認
  const tables = ['categories', 'products', 'product_images', 'product_variants', 'styling', 'styling_images'];
  
  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count} 件`);
    }
  }
}

checkTables().catch(console.error);
