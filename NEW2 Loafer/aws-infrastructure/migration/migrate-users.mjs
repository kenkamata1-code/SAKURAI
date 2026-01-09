/**
 * Supabase Auth → Cognito ユーザー移行スクリプト
 * 
 * 使用方法:
 * 1. 環境変数を設定
 * 2. node migrate-users.mjs を実行
 */

import { createClient } from '@supabase/supabase-js';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import pg from 'pg';

const { Pool } = pg;

// ==============================================
// 設定（環境変数から取得）
// ==============================================
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  aws: {
    region: 'ap-northeast-1',
    userPoolId: 'ap-northeast-1_Z4r3hFLyg',
  },
  rds: {
    host: 'loafer-db.cfqws4u4qtw7.ap-northeast-1.rds.amazonaws.com',
    port: 5432,
    database: 'loafer',
    user: 'loafer_admin',
    password: process.env.RDS_PASSWORD || 'LoaferDB2026!Secure',
  },
};

// 一時パスワード（ユーザーは初回ログイン時に変更必要）
const TEMP_PASSWORD = 'TempPassword123!';

// ==============================================
// クライアント初期化
// ==============================================
const supabase = createClient(config.supabase.url, config.supabase.serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const cognito = new CognitoIdentityProviderClient({ region: config.aws.region });

const rdsPool = new Pool({
  ...config.rds,
  ssl: { rejectUnauthorized: false },
});

// ==============================================
// ユーザー移行
// ==============================================
async function migrateUsers() {
  console.log('==============================================');
  console.log('  Supabase → AWS ユーザー移行');
  console.log('==============================================\n');

  try {
    // 1. Supabaseからユーザー一覧を取得
    console.log('📦 Supabaseからユーザーを取得...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Supabase Auth エラー: ${authError.message}`);
    }

    console.log(`✅ ${authUsers.users.length} 人のユーザーを取得\n`);

    // 2. Supabaseのプロフィールを取得
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*');

    if (profileError) {
      throw new Error(`Profile取得エラー: ${profileError.message}`);
    }

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // 3. 各ユーザーを移行
    let successCount = 0;
    let errorCount = 0;
    const migrationResults = [];

    for (const user of authUsers.users) {
      const profile = profileMap.get(user.id);
      
      console.log(`\n📤 移行中: ${user.email}`);
      
      try {
        // Cognitoにユーザーを作成
        const createUserCommand = new AdminCreateUserCommand({
          UserPoolId: config.aws.userPoolId,
          Username: user.email,
          UserAttributes: [
            { Name: 'email', Value: user.email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'custom:supabase_id', Value: user.id },
          ],
          MessageAction: 'SUPPRESS', // 招待メールを送らない
        });

        const newUser = await cognito.send(createUserCommand);
        const cognitoUserId = newUser.User.Username;

        // 一時パスワードを設定
        const setPasswordCommand = new AdminSetUserPasswordCommand({
          UserPoolId: config.aws.userPoolId,
          Username: user.email,
          Password: TEMP_PASSWORD,
          Permanent: false, // 初回ログイン時に変更を要求
        });
        await cognito.send(setPasswordCommand);

        // RDSにプロフィールを作成
        await rdsPool.query(`
          INSERT INTO profiles (
            cognito_user_id, email, is_admin, full_name, first_name, last_name,
            phone, postal_code, address, gender, birth_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (cognito_user_id) DO NOTHING
        `, [
          cognitoUserId,
          user.email,
          profile?.is_admin || false,
          profile?.full_name || null,
          profile?.first_name || null,
          profile?.last_name || null,
          profile?.phone || null,
          profile?.postal_code || null,
          profile?.address || null,
          profile?.gender || null,
          profile?.birth_date || null,
        ]);

        migrationResults.push({
          email: user.email,
          supabaseId: user.id,
          cognitoId: cognitoUserId,
          status: 'success',
        });

        console.log(`  ✅ 成功: ${user.email} → ${cognitoUserId}`);
        successCount++;

      } catch (error) {
        if (error.name === 'UsernameExistsException') {
          console.log(`  ⚠️  スキップ: ${user.email} は既に存在します`);
        } else {
          console.log(`  ❌ エラー: ${user.email} - ${error.message}`);
          errorCount++;
        }

        migrationResults.push({
          email: user.email,
          supabaseId: user.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    // 4. 結果サマリー
    console.log('\n==============================================');
    console.log('  移行結果サマリー');
    console.log('==============================================');
    console.log(`  成功: ${successCount}`);
    console.log(`  エラー: ${errorCount}`);
    console.log(`  合計: ${authUsers.users.length}`);
    console.log('\n⚠️  移行されたユーザーは初回ログイン時にパスワード変更が必要です');
    console.log(`   一時パスワード: ${TEMP_PASSWORD}\n`);

    return migrationResults;

  } catch (error) {
    console.error('移行エラー:', error);
    throw error;
  } finally {
    await rdsPool.end();
  }
}

// 実行
migrateUsers()
  .then(results => {
    console.log('移行完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('移行失敗:', error);
    process.exit(1);
  });

