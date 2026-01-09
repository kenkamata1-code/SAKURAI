# Supabase から AWS への移行ガイド

## 目次

1. [概要](#概要)
2. [現在のSupabase実装](#現在のsupabase実装)
3. [AWSサービスへのマッピング](#awsサービスへのマッピング)
4. [重要な注意事項：Redshiftについて](#重要な注意事項redshiftについて)
5. [推奨アーキテクチャ](#推奨アーキテクチャ)
6. [データベース移行](#データベース移行)
7. [認証システムの移行](#認証システムの移行)
8. [ストレージの移行](#ストレージの移行)
9. [Edge Functionsの移行](#edge-functionsの移行)
10. [移行手順チェックリスト](#移行手順チェックリスト)
11. [コスト見積もり](#コスト見積もり)

---

## 概要

このドキュメントでは、現在Supabaseで実装されているECシステム「Loafer」をAWSに移行するための手順を説明します。

### 移行対象

| Supabaseコンポーネント | 説明 |
|----------------------|------|
| PostgreSQL Database | 11テーブル、RLS、トリガー、関数 |
| Supabase Auth | ユーザー認証・管理 |
| Supabase Storage | 商品画像の保存 |
| Edge Functions | ユーザー作成API |

---

## 現在のSupabase実装

### データベーステーブル一覧

```
┌─────────────────────┐      ┌─────────────────────┐
│     categories      │      │      profiles       │
├─────────────────────┤      ├─────────────────────┤
│ id (uuid, PK)       │      │ id (uuid, PK)       │
│ name                │      │ email               │
│ slug (unique)       │      │ is_admin            │
│ description         │      │ full_name           │
│ created_at          │      │ first_name          │
└─────────────────────┘      │ last_name           │
         │                   │ phone               │
         │                   │ postal_code         │
         ▼                   │ address             │
┌─────────────────────┐      │ gender              │
│      products       │      │ birth_date          │
├─────────────────────┤      │ created_at          │
│ id (uuid, PK)       │      │ updated_at          │
│ name                │      └─────────────────────┘
│ slug (unique)       │               │
│ description         │               │
│ price               │               ▼
│ image_url           │      ┌─────────────────────┐
│ category_id (FK)    │      │       orders        │
│ category            │      ├─────────────────────┤
│ stock               │      │ id (uuid, PK)       │
│ featured            │      │ user_id (FK)        │
│ display_order       │      │ total_amount        │
│ created_at          │      │ status              │
│ updated_at          │      │ shipping_name       │
└─────────────────────┘      │ shipping_postal_code│
         │                   │ shipping_address    │
         │                   │ shipping_phone      │
         ▼                   │ created_at          │
┌─────────────────────┐      │ updated_at          │
│  product_variants   │      └─────────────────────┘
├─────────────────────┤               │
│ id (uuid, PK)       │               │
│ product_id (FK)     │               ▼
│ size                │      ┌─────────────────────┐
│ stock               │      │    order_items      │
│ sku                 │      ├─────────────────────┤
│ created_at          │      │ id (uuid, PK)       │
│ updated_at          │      │ order_id (FK)       │
└─────────────────────┘      │ product_id (FK)     │
         │                   │ product_name        │
         │                   │ product_price       │
         ▼                   │ quantity            │
┌─────────────────────┐      │ created_at          │
│   product_images    │      └─────────────────────┘
├─────────────────────┤
│ id (uuid, PK)       │      ┌─────────────────────┐
│ product_id (FK)     │      │    cart_items       │
│ url                 │      ├─────────────────────┤
│ display_order (1-6) │      │ id (uuid, PK)       │
│ created_at          │      │ user_id (FK)        │
└─────────────────────┘      │ product_id (FK)     │
                             │ variant_id (FK)     │
┌─────────────────────┐      │ quantity            │
│      styling        │      │ created_at          │
├─────────────────────┤      │ updated_at          │
│ id (uuid, PK)       │      └─────────────────────┘
│ title               │
│ description         │      ┌─────────────────────┐
│ image_url           │      │     page_views      │
│ color               │      ├─────────────────────┤
│ size                │      │ id (uuid, PK)       │
│ height              │      │ page_path           │
│ slug (unique)       │      │ page_title          │
│ display_order       │      │ user_id (FK)        │
│ created_at          │      │ session_id          │
│ updated_at          │      │ created_at          │
└─────────────────────┘      └─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   styling_images    │
├─────────────────────┤
│ id (uuid, PK)       │
│ styling_id (FK)     │
│ url                 │
│ display_order       │
│ created_at          │
└─────────────────────┘
```

### Row Level Security (RLS) ポリシー

| テーブル | ポリシー |
|---------|---------|
| categories | 全員が読み取り可能、認証済みユーザーが管理可能 |
| products | 全員が読み取り可能、認証済みユーザーが管理可能 |
| product_images | 全員が読み取り可能、認証済みユーザーが管理可能 |
| product_variants | 全員が読み取り可能、管理者のみ管理可能 |
| cart_items | 自分のカートのみアクセス可能 |
| orders | 自分の注文のみ、管理者は全て閲覧可能 |
| order_items | 自分の注文明細のみ、管理者は全て閲覧可能 |
| profiles | 自分のプロフィールのみ、管理者は全て閲覧・更新可能 |
| styling | 全員が読み取り可能、認証済みユーザーが管理可能 |
| styling_images | 全員が読み取り可能、管理者のみ管理可能 |
| page_views | 誰でも挿入可能、管理者のみ閲覧可能 |

### データベース関数

```sql
-- 管理者チェック関数
public.is_user_admin(user_id uuid) RETURNS boolean

-- 新規ユーザー作成時のトリガー関数（初回ユーザーは自動的に管理者に）
public.handle_new_user() RETURNS trigger

-- updated_at 自動更新関数
public.handle_updated_at() RETURNS trigger
```

### Supabase Storage

- **バケット名**: `product-images`
- **用途**: 商品画像、スタイリング画像の保存
- **アクセス制御**: 全員が読み取り可能、認証済みユーザーが管理可能

### Edge Functions

- **create-user**: 管理者が新規ユーザーを作成するためのAPI

---

## 重要な注意事項：Redshiftについて

### ⚠️ AWS Redshiftの特性

**AWS Redshiftはデータウェアハウス（OLAP）向けのサービスです。**

| 特性 | Redshift | 通常のRDBMS (PostgreSQL等) |
|-----|----------|-------------------------|
| 用途 | 分析・レポート（OLAP） | トランザクション処理（OLTP） |
| データ量 | ペタバイト級 | ギガバイト〜テラバイト |
| クエリタイプ | 集計・分析クエリ | CRUD操作 |
| 同時接続 | 制限あり（500まで） | 数千まで |
| レイテンシ | 秒〜分 | ミリ秒 |
| コスト | 高い（$0.25/hour〜） | 比較的安価 |

### Redshiftが適していない理由

1. **リアルタイムのCRUD操作には向かない** - ECサイトではカート追加、注文作成など頻繁な書き込みが発生
2. **Row Level Security (RLS) 非対応** - Supabaseで使用しているRLSポリシーは移行できない
3. **同時接続数の制限** - 複数ユーザーの同時アクセスに制約
4. **コストが高い** - 常時起動で月額$180〜（on-demand）
5. **認証システムがない** - Supabase Authの代替が必要

### 推奨される選択肢

| 用途 | 推奨サービス |
|-----|------------|
| **アプリケーションDB** | Amazon RDS for PostgreSQL |
| **サーバーレスDB** | Amazon Aurora Serverless v2 |
| **分析用途のみ** | Amazon Redshift Serverless |
| **フルマネージドBaaS** | AWS Amplify |

---

## 推奨アーキテクチャ

### Option A: Amazon RDS + 関連サービス（推奨）

```
┌──────────────────────────────────────────────────────────┐
│                      フロントエンド                        │
│                    (Next.js / React)                     │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                   Amazon API Gateway                     │
│              + AWS Lambda (API Layer)                    │
└─────────┬──────────────────┬──────────────────┬─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐  ┌───────────────┐  ┌─────────────────┐
│ Amazon Cognito  │  │ Amazon RDS    │  │   Amazon S3     │
│   (認証)        │  │ PostgreSQL    │  │ (画像ストレージ)  │
└─────────────────┘  │   (データ)     │  └─────────────────┘
                     └───────────────┘          │
                             │                  │
                             ▼                  ▼
                     ┌───────────────┐  ┌─────────────────┐
                     │ Redshift      │  │ CloudFront      │
                     │ (分析用)      │  │ (CDN)           │
                     └───────────────┘  └─────────────────┘
```

### Supabase → AWS サービスマッピング

| Supabase | AWS | 説明 |
|----------|-----|------|
| PostgreSQL | Amazon RDS for PostgreSQL | メインデータベース |
| Row Level Security | AWS Lambda + カスタム認可 | アプリケーション層で実装 |
| Supabase Auth | Amazon Cognito | ユーザー認証・管理 |
| Supabase Storage | Amazon S3 + CloudFront | ファイルストレージ + CDN |
| Edge Functions | AWS Lambda | サーバーレス関数 |
| リアルタイム | AWS AppSync / API Gateway WebSocket | リアルタイム通信 |

---

## データベース移行

### Step 1: スキーマ変換

Supabaseの`auth.users`テーブルへの参照を削除し、Cognito User IDを使用するように変更します。

```sql
-- 移行後のprofilesテーブル（Amazon RDS用）
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_user_id VARCHAR(255) UNIQUE NOT NULL,  -- auth.users から変更
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false NOT NULL,
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

-- cart_itemsテーブル
CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_user_id VARCHAR(255) NOT NULL,  -- auth.users から変更
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cognito_user_id, product_id, variant_id)
);

-- ordersテーブル
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_user_id VARCHAR(255) NOT NULL,  -- user_id から変更
  total_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- page_viewsテーブル
CREATE TABLE page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  page_title TEXT NOT NULL,
  cognito_user_id VARCHAR(255),  -- user_id から変更
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 2: RLSの代替実装

RLSはAmazon RDS PostgreSQLでもサポートされていますが、Cognito統合のために追加設定が必要です。

**Option 1: アプリケーション層で実装（推奨）**

```typescript
// Lambda関数でのアクセス制御例
import { APIGatewayProxyHandler } from 'aws-lambda';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.RDS_HOST,
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
});

export const getCartItems: APIGatewayProxyHandler = async (event) => {
  // Cognitoから取得したユーザーID
  const userId = event.requestContext.authorizer?.claims?.sub;
  
  if (!userId) {
    return { statusCode: 401, body: 'Unauthorized' };
  }
  
  // ユーザーIDでフィルタリング（RLSの代替）
  const result = await pool.query(
    'SELECT * FROM cart_items WHERE cognito_user_id = $1',
    [userId]
  );
  
  return {
    statusCode: 200,
    body: JSON.stringify(result.rows),
  };
};
```

**Option 2: PostgreSQL RLS（RDS PostgreSQLで使用可能）**

```sql
-- RDSでRLSを使用する場合、セッション変数を使用
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY cart_items_user_policy ON cart_items
  FOR ALL
  USING (cognito_user_id = current_setting('app.current_user_id', true));

-- Lambda関数からの呼び出し時に設定
SET app.current_user_id = 'cognito-user-sub-xxx';
```

### Step 3: データ移行スクリプト

```bash
# Supabaseからデータをエクスポート
pg_dump \
  --host=your-project.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --no-owner \
  --no-acl \
  --data-only \
  -F c \
  -f supabase_backup.dump

# Amazon RDSにインポート
pg_restore \
  --host=your-rds-instance.region.rds.amazonaws.com \
  --port=5432 \
  --username=admin \
  --dbname=loafer \
  --no-owner \
  --no-acl \
  -d loafer \
  supabase_backup.dump
```

### Step 4: ユーザーデータの移行

SupabaseのauthユーザーをCognitoに移行する必要があります。

```python
# migrate_users.py
import boto3
import csv
from supabase import create_client

# Supabaseクライアント
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Cognitoクライアント
cognito = boto3.client('cognito-idp', region_name='ap-northeast-1')

def migrate_users():
    # Supabaseからユーザー一覧を取得
    users = supabase.auth.admin.list_users()
    
    for user in users:
        try:
            # Cognitoにユーザーを作成
            response = cognito.admin_create_user(
                UserPoolId=USER_POOL_ID,
                Username=user.email,
                UserAttributes=[
                    {'Name': 'email', 'Value': user.email},
                    {'Name': 'email_verified', 'Value': 'true'},
                    {'Name': 'custom:supabase_id', 'Value': user.id},
                ],
                MessageAction='SUPPRESS',  # 招待メールを送らない
            )
            
            # Cognitoユーザーの仮パスワードを設定
            cognito.admin_set_user_password(
                UserPoolId=USER_POOL_ID,
                Username=user.email,
                Password=TEMP_PASSWORD,  # ユーザーに初回ログイン時に変更を促す
                Permanent=False,
            )
            
            print(f"Migrated user: {user.email}")
            
        except Exception as e:
            print(f"Error migrating {user.email}: {e}")
```

---

## 認証システムの移行

### Amazon Cognito設定

```typescript
// AWS CDKでの設定例
import * as cognito from 'aws-cdk-lib/aws-cognito';

const userPool = new cognito.UserPool(this, 'LoaferUserPool', {
  userPoolName: 'loafer-users',
  selfSignUpEnabled: true,
  signInAliases: {
    email: true,
  },
  standardAttributes: {
    email: {
      required: true,
      mutable: false,
    },
    fullname: {
      required: false,
      mutable: true,
    },
  },
  customAttributes: {
    isAdmin: new cognito.BooleanAttribute({ mutable: true }),
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: false,
  },
  accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
});

const userPoolClient = userPool.addClient('LoaferWebClient', {
  authFlows: {
    userPassword: true,
    userSrp: true,
  },
  oAuth: {
    flows: {
      authorizationCodeGrant: true,
    },
    scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
  },
});
```

### フロントエンド認証の変更

```typescript
// Before: Supabase Auth
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
await supabase.auth.signInWithPassword({ email, password });

// After: AWS Amplify Auth
import { Amplify, Auth } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: 'ap-northeast-1',
    userPoolId: USER_POOL_ID,
    userPoolWebClientId: USER_POOL_CLIENT_ID,
  },
});

await Auth.signIn(email, password);
```

---

## ストレージの移行

### Amazon S3バケット設定

```typescript
// AWS CDKでの設定例
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

const bucket = new s3.Bucket(this, 'ProductImagesBucket', {
  bucketName: 'loafer-product-images',
  publicReadAccess: false,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  cors: [
    {
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
      allowedOrigins: ['https://your-domain.com'],
      allowedHeaders: ['*'],
    },
  ],
});

// CloudFront配信
const distribution = new cloudfront.Distribution(this, 'ImageDistribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  },
});
```

### 画像移行スクリプト

```python
# migrate_images.py
import boto3
import requests
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
s3 = boto3.client('s3')

def migrate_images():
    # Supabase Storageから画像一覧を取得
    images = supabase.storage.from_('product-images').list()
    
    for image in images:
        # 画像をダウンロード
        url = supabase.storage.from_('product-images').get_public_url(image['name'])
        response = requests.get(url)
        
        # S3にアップロード
        s3.put_object(
            Bucket='loafer-product-images',
            Key=image['name'],
            Body=response.content,
            ContentType=response.headers.get('Content-Type', 'image/jpeg'),
        )
        
        print(f"Migrated: {image['name']}")

# URLの更新（product_imagesテーブル）
def update_image_urls(rds_connection):
    cursor = rds_connection.cursor()
    
    # 旧URLを新URLに更新
    cursor.execute("""
        UPDATE product_images 
        SET url = REPLACE(
            url, 
            'https://your-project.supabase.co/storage/v1/object/public/product-images/',
            'https://cloudfront-distribution.cloudfront.net/'
        )
    """)
    
    rds_connection.commit()
```

---

## Edge Functionsの移行

### Supabase Edge Function → AWS Lambda

**Before: Supabase Edge Function (create-user)**

```typescript
// supabase/functions/create-user/index.ts
Deno.serve(async (req: Request) => {
  // ... Supabase版の実装
});
```

**After: AWS Lambda**

```typescript
// lambda/create-user/index.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminCreateUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { Pool } from 'pg';

const cognito = new CognitoIdentityProviderClient({ region: 'ap-northeast-1' });
const pool = new Pool({
  host: process.env.RDS_HOST,
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
});

interface CreateUserRequest {
  email: string;
  password: string;
  full_name?: string;
  is_admin?: boolean;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    // Cognitoから認証情報を取得
    const requesterId = event.requestContext.authorizer?.claims?.sub;
    
    if (!requesterId) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: '認証が必要です' }),
      };
    }

    // 管理者チェック
    const adminCheck = await pool.query(
      'SELECT is_admin FROM profiles WHERE cognito_user_id = $1',
      [requesterId]
    );

    if (!adminCheck.rows[0]?.is_admin) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: '管理者権限が必要です' }),
      };
    }

    const { email, password, full_name, is_admin }: CreateUserRequest = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'メールアドレスとパスワードは必須です' }),
      };
    }

    // Cognitoでユーザー作成
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
      TemporaryPassword: password,
      MessageAction: 'SUPPRESS',
    });

    const newUser = await cognito.send(createUserCommand);
    const cognitoUserId = newUser.User?.Username;

    // プロフィールを作成
    await pool.query(
      `INSERT INTO profiles (cognito_user_id, email, full_name, is_admin)
       VALUES ($1, $2, $3, $4)`,
      [cognitoUserId, email, full_name || '', is_admin || false]
    );

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        user: { id: cognitoUserId, email },
      }),
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: '内部サーバーエラー' }),
    };
  }
};
```

---

## 移行手順チェックリスト

### Phase 1: 準備（1-2週間）

- [ ] AWSアカウントのセットアップ
- [ ] VPCとセキュリティグループの設計
- [ ] IAMロールとポリシーの設定
- [ ] Amazon RDS PostgreSQLインスタンスの作成
- [ ] Amazon Cognitoユーザープールの作成
- [ ] S3バケットとCloudFrontの設定

### Phase 2: スキーマ移行（1週間）

- [ ] データベーススキーマの変換
- [ ] auth.usersへの参照をCognito User IDに変更
- [ ] インデックスの作成
- [ ] トリガーと関数の移行

### Phase 3: データ移行（1週間）

- [ ] ユーザーデータの移行（Supabase Auth → Cognito）
- [ ] 商品・カテゴリデータの移行
- [ ] 注文・カートデータの移行
- [ ] 画像ファイルの移行（Storage → S3）
- [ ] URL参照の更新

### Phase 4: アプリケーション更新（2-3週間）

- [ ] フロントエンドの認証ロジック変更
- [ ] APIエンドポイントの移行（Lambda + API Gateway）
- [ ] ストレージ操作の移行
- [ ] RLSに相当するアクセス制御の実装

### Phase 5: テスト（1-2週間）

- [ ] 単体テスト
- [ ] 統合テスト
- [ ] 性能テスト
- [ ] セキュリティテスト

### Phase 6: 本番移行（1週間）

- [ ] 本番データの最終同期
- [ ] DNS切り替え
- [ ] モニタリング設定
- [ ] ロールバック計画の確認

---

## コスト見積もり（月額）

### Supabase（現在）

| サービス | プラン | 月額 |
|---------|--------|------|
| Supabase Pro | 固定 | $25 |
| **合計** | | **$25** |

### AWS（移行後）

| サービス | スペック | 月額（概算） |
|---------|---------|-------------|
| Amazon RDS PostgreSQL | db.t3.micro | $15 |
| Amazon Cognito | 50,000 MAU無料枠 | $0 |
| AWS Lambda | 100万リクエスト/月 | $0.20 |
| Amazon S3 | 10GB + 転送 | $3 |
| Amazon CloudFront | 10GB転送 | $1 |
| API Gateway | 100万リクエスト/月 | $3.50 |
| **合計** | | **約$22-25** |

### Amazon Redshiftを使う場合（分析用途のみ）

| サービス | スペック | 月額（概算） |
|---------|---------|-------------|
| Redshift Serverless | 8 RPU | $43/月〜（使用量による） |
| Redshift DC2.large | オンデマンド | $180/月 |

---

## 結論

**推奨事項:**

1. **メインデータベースにはAmazon RDS for PostgreSQLを使用** - Redshiftは分析専用
2. **Supabase AuthはAmazon Cognitoに移行** - 無料枠で十分
3. **Edge FunctionsはAWS Lambdaに移行** - サーバーレスで低コスト
4. **StorageはS3 + CloudFrontに移行** - 高いパフォーマンスとスケーラビリティ
5. **分析が必要な場合のみRedshift Serverlessを追加** - OLAPワークロード用

移行作業は段階的に行い、各フェーズでテストを実施することを強くお勧めします。

