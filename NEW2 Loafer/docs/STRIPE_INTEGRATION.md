# Stripe決済システム導入ガイド

## 概要

このドキュメントでは、THE LONG GAMEのECサイトにStripe決済を導入する手順を説明します。

### 現在のシステム構成

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   フロントエンド   │────▶│   API Gateway   │────▶│     Lambda      │
│  (React/Amplify) │     │                 │     │   (Node.js)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   RDS PostgreSQL │
                                                └─────────────────┘
```

### Stripe導入後の構成

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   フロントエンド   │────▶│   API Gateway   │────▶│     Lambda      │
│  (React/Amplify) │     │                 │     │   (Node.js)     │
│                 │     │                 │     │                 │
│  Stripe Elements │     │                 │     │   Stripe SDK    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        │                                               ▼
        │                                       ┌─────────────────┐
        │                                       │   RDS PostgreSQL │
        │                                       └─────────────────┘
        │                                               │
        ▼                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Stripe API                               │
│  • Payment Intents (決済処理)                                     │
│  • Checkout Sessions (チェックアウト)                              │
│  • Webhooks (イベント通知)                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Stripeアカウント設定

### 1.1 アカウント作成

1. [Stripe Dashboard](https://dashboard.stripe.com/register) でアカウントを作成
2. ビジネス情報を入力して本番環境を有効化
3. 日本の銀行口座を登録（売上の入金先）

### 1.2 APIキーの取得

**Stripe Dashboard → 開発者 → APIキー**

```
テスト環境:
- 公開可能キー: pk_test_xxxxxxxxxxxx
- シークレットキー: sk_test_xxxxxxxxxxxx

本番環境:
- 公開可能キー: pk_live_xxxxxxxxxxxx
- シークレットキー: sk_live_xxxxxxxxxxxx
```

> ⚠️ **重要**: シークレットキーは絶対にフロントエンドに公開しないでください

### 1.3 Webhookの設定

**Stripe Dashboard → 開発者 → Webhook**

1. 「エンドポイントを追加」をクリック
2. エンドポイントURL: `https://3eal2nthgc.execute-api.ap-northeast-1.amazonaws.com/v1/webhook/stripe`
3. 以下のイベントを選択:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Webhook署名シークレット（`whsec_xxxx`）を保存

---

## 2. 環境変数の設定

### 2.1 Lambda環境変数

AWS Lambda コンソールで以下の環境変数を追加:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx        # テスト用
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx      # Webhook署名検証用
STRIPE_SUCCESS_URL=https://main.d3o5fndieuvuu2.amplifyapp.com/checkout/success
STRIPE_CANCEL_URL=https://main.d3o5fndieuvuu2.amplifyapp.com/cart
```

### 2.2 フロントエンド環境変数

`.env.production` に追加:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
```

---

## 3. バックエンド実装

### 3.1 Lambda依存関係の追加

```bash
cd aws-infrastructure/lambda/api
npm install stripe
```

### 3.2 Stripe初期化

`index.mjs` に追加:

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});
```

### 3.3 チェックアウトセッション作成API

```javascript
// POST /v1/checkout/create-session
if (path === "/v1/checkout/create-session" && method === "POST") {
  if (!userId) {
    return response(401, { error: "認証が必要です" });
  }

  const { items } = JSON.parse(body);
  
  // カート情報からStripeのline_itemsを作成
  const lineItems = items.map(item => ({
    price_data: {
      currency: 'jpy',
      product_data: {
        name: item.product_name,
        description: item.variant_size ? `サイズ: ${item.variant_size}` : undefined,
        images: item.image_url ? [item.image_url] : undefined,
      },
      unit_amount: item.price, // 日本円は最小単位が1円
    },
    quantity: item.quantity,
  }));

  // チェックアウトセッションを作成
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: process.env.STRIPE_CANCEL_URL,
    customer_email: userEmail, // Cognitoから取得したメールアドレス
    metadata: {
      user_id: userId,
    },
    shipping_address_collection: {
      allowed_countries: ['JP'],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: 0,
            currency: 'jpy',
          },
          display_name: '通常配送',
          delivery_estimate: {
            minimum: {
              unit: 'business_day',
              value: 3,
            },
            maximum: {
              unit: 'business_day',
              value: 7,
            },
          },
        },
      },
    ],
    locale: 'ja',
  });

  return response(200, { 
    sessionId: session.id,
    url: session.url 
  });
}
```

### 3.4 Webhook処理

```javascript
// POST /v1/webhook/stripe
if (path === "/v1/webhook/stripe" && method === "POST") {
  const sig = headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return response(400, { error: 'Webhook signature verification failed' });
  }

  // イベント処理
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      
      // 注文を確定
      await handleSuccessfulPayment(db, session);
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.error('Payment failed:', paymentIntent.last_payment_error?.message);
      break;
    }
  }

  return response(200, { received: true });
}

// 決済成功時の処理
async function handleSuccessfulPayment(db, session) {
  const userId = session.metadata.user_id;
  const customerEmail = session.customer_email;
  
  // カートから商品情報を取得
  const cartResult = await db.query(`
    SELECT ci.*, p.name as product_name, p.price, pv.size as variant_size
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE ci.cognito_user_id = $1
  `, [userId]);

  if (cartResult.rows.length === 0) {
    console.error('Cart is empty for user:', userId);
    return;
  }

  // 注文を作成
  const totalAmount = cartResult.rows.reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  );

  const orderResult = await db.query(`
    INSERT INTO orders (cognito_user_id, total_amount, status, stripe_session_id)
    VALUES ($1, $2, 'paid', $3)
    RETURNING id
  `, [userId, totalAmount, session.id]);

  const orderId = orderResult.rows[0].id;

  // 注文明細を作成
  for (const item of cartResult.rows) {
    await db.query(`
      INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity)
      VALUES ($1, $2, $3, $4, $5)
    `, [orderId, item.product_id, item.product_name, item.price, item.quantity]);

    // 在庫を減らす
    if (item.variant_id) {
      await db.query(`
        UPDATE product_variants 
        SET stock = stock - $1 
        WHERE id = $2
      `, [item.quantity, item.variant_id]);
    }
  }

  // カートをクリア
  await db.query(`
    DELETE FROM cart_items WHERE cognito_user_id = $1
  `, [userId]);

  console.log('Order created successfully:', orderId);
}
```

### 3.5 注文確認API

```javascript
// GET /v1/checkout/session/:sessionId
const sessionMatch = path.match(/^\/v1\/checkout\/session\/([^\/]+)$/);
if (sessionMatch && method === "GET") {
  const sessionId = sessionMatch[1];
  
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'shipping_details'],
    });
    
    return response(200, {
      status: session.payment_status,
      customerEmail: session.customer_email,
      amountTotal: session.amount_total,
      shippingDetails: session.shipping_details,
    });
  } catch (error) {
    return response(404, { error: 'Session not found' });
  }
}
```

---

## 4. フロントエンド実装

### 4.1 Stripe.jsのインストール

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 4.2 Stripeプロバイダーの設定

`src/main.tsx`:

```typescript
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Appをラップ
<Elements stripe={stripePromise}>
  <App />
</Elements>
```

### 4.3 チェックアウトボタンの実装

`src/components/CheckoutButton.tsx`:

```typescript
import { useState } from 'react';
import { api } from '../lib/api-client';

interface CheckoutButtonProps {
  items: Array<{
    product_id: string;
    product_name: string;
    price: number;
    quantity: number;
    variant_size?: string;
    image_url?: string;
  }>;
}

export default function CheckoutButton({ items }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const { url } = await api.checkout.createSession(items);
      
      // Stripeのチェックアウトページにリダイレクト
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('決済処理でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading || items.length === 0}
      className="w-full bg-gray-900 text-white py-4 text-sm tracking-wider hover:bg-gray-800 transition disabled:opacity-50"
    >
      {loading ? '処理中...' : 'レジに進む / CHECKOUT'}
    </button>
  );
}
```

### 4.4 決済完了ページ

`src/pages/CheckoutSuccess.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { api } from '../lib/api-client';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadOrderDetails();
    }
  }, [sessionId]);

  async function loadOrderDetails() {
    try {
      const details = await api.checkout.getSession(sessionId!);
      setOrderDetails(details);
    } catch (error) {
      console.error('Error loading order details:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-lg mx-auto text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        
        <h1 className="text-2xl tracking-wider mb-4">
          ご注文ありがとうございます
        </h1>
        <p className="text-sm text-gray-600 mb-2">
          Thank you for your order
        </p>
        
        {orderDetails && (
          <div className="mt-8 p-6 border border-gray-200 text-left">
            <h2 className="text-sm tracking-wider mb-4 font-medium">注文詳細</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">合計金額</span>
                <span>¥{orderDetails.amountTotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">メールアドレス</span>
                <span>{orderDetails.customerEmail}</span>
              </div>
            </div>
          </div>
        )}
        
        <p className="text-sm text-gray-600 mt-8 mb-8">
          ご注文確認メールをお送りしました。<br />
          商品の発送準備が整い次第、発送のご連絡をいたします。
        </p>
        
        <Link
          to="/shop"
          className="inline-block bg-gray-900 text-white px-8 py-3 text-sm tracking-wider hover:bg-gray-800 transition"
        >
          買い物を続ける / CONTINUE SHOPPING
        </Link>
      </div>
    </div>
  );
}
```

### 4.5 APIクライアントの拡張

`src/lib/api-client.ts` に追加:

```typescript
export const api = {
  // ... 既存のAPI ...

  checkout: {
    async createSession(items: Array<{
      product_id: string;
      product_name: string;
      price: number;
      quantity: number;
      variant_size?: string;
      image_url?: string;
    }>): Promise<{ sessionId: string; url: string }> {
      const res = await authFetch(`${apiConfig.baseUrl}/checkout/create-session`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('Failed to create checkout session');
      return res.json();
    },

    async getSession(sessionId: string): Promise<{
      status: string;
      customerEmail: string;
      amountTotal: number;
      shippingDetails: any;
    }> {
      const res = await authFetch(`${apiConfig.baseUrl}/checkout/session/${sessionId}`);
      if (!res.ok) throw new Error('Failed to get session');
      return res.json();
    },
  },
};
```

### 4.6 ルーティングの追加

`src/App.tsx`:

```typescript
import CheckoutSuccess from './pages/CheckoutSuccess';

// Routes内に追加
<Route path="/checkout/success" element={<CheckoutSuccess />} />
```

---

## 5. データベース変更

### 5.1 ordersテーブルの更新

```sql
ALTER TABLE orders 
ADD COLUMN stripe_session_id VARCHAR(255),
ADD COLUMN stripe_payment_intent_id VARCHAR(255);
```

---

## 6. テスト

### 6.1 テストカード番号

| カード番号 | 結果 |
|-----------|------|
| 4242 4242 4242 4242 | 成功 |
| 4000 0000 0000 0002 | 拒否（一般的なエラー） |
| 4000 0000 0000 9995 | 残高不足 |
| 4000 0025 0000 3155 | 3Dセキュア認証が必要 |

有効期限: 任意の将来の日付（例: 12/34）
CVC: 任意の3桁（例: 123）

### 6.2 Webhook テスト

ローカル環境でWebhookをテストする場合、Stripe CLIを使用:

```bash
# Stripe CLIをインストール
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# ローカルのWebhookエンドポイントにフォワード
stripe listen --forward-to localhost:3000/v1/webhook/stripe

# テストイベントを送信
stripe trigger checkout.session.completed
```

---

## 7. 本番環境へのデプロイ

### 7.1 チェックリスト

- [ ] 本番用Stripeアカウントの有効化
- [ ] 本番用APIキーの取得
- [ ] Lambda環境変数を本番用に更新
- [ ] フロントエンド環境変数を本番用に更新
- [ ] 本番用Webhookエンドポイントの設定
- [ ] SSL証明書の確認（HTTPS必須）
- [ ] PCI DSS準拠の確認

### 7.2 環境変数の切り替え

**Lambda (本番)**:
```bash
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx  # 本番用
```

**フロントエンド (本番)**:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
```

---

## 8. セキュリティ考慮事項

### 8.1 重要なポイント

1. **シークレットキーの保護**: `sk_live_xxx` は絶対にフロントエンドに公開しない
2. **Webhook署名検証**: 必ず `stripe.webhooks.constructEvent()` で署名を検証
3. **べき等性**: 同じWebhookイベントが複数回送信される可能性があるため、注文の重複作成を防ぐ
4. **HTTPS必須**: 本番環境では必ずHTTPS通信を使用

### 8.2 べき等性の実装

```javascript
// Webhook処理時に重複チェック
const existingOrder = await db.query(
  'SELECT id FROM orders WHERE stripe_session_id = $1',
  [session.id]
);

if (existingOrder.rows.length > 0) {
  console.log('Order already exists for session:', session.id);
  return response(200, { received: true });
}
```

---

## 9. 実装スケジュール

| フェーズ | 作業内容 | 所要時間 |
|---------|---------|---------|
| 1 | Stripeアカウント設定 | 30分 |
| 2 | バックエンドAPI実装 | 2-3時間 |
| 3 | フロントエンド実装 | 2-3時間 |
| 4 | テスト環境での検証 | 1-2時間 |
| 5 | 本番環境デプロイ | 1時間 |

**合計: 約1日**

---

## 10. 参考リンク

- [Stripe公式ドキュメント](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe.js & React](https://stripe.com/docs/stripe-js/react)
- [Stripe テストカード](https://stripe.com/docs/testing)

---

## 次のステップ

ドキュメントを確認後、実装を開始する場合は以下の順序で進めます：

1. Stripeアカウントを作成し、テスト用APIキーを取得
2. バックエンドのLambda関数にStripe SDKを追加
3. チェックアウトAPIとWebhookを実装
4. フロントエンドにチェックアウトボタンと完了ページを追加
5. テスト環境で動作確認
6. 本番環境にデプロイ

実装を開始しますか？

