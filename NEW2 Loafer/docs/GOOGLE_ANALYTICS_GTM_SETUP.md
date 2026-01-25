# Google Analytics & Google Tag Manager 設定ガイド

## 概要

このドキュメントでは、THE LONG GAMEのECサイトにGoogle Analytics 4（GA4）とGoogle Tag Manager（GTM）を導入する手順を説明します。

### 対象サイト構成

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THE LONG GAME ECサイト                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  【一般ページ】                        【EC機能】                          │
│  ├── / (ホーム)                       ├── /shop (商品一覧)                │
│  ├── /about (ブランド紹介)             ├── /shop/:slug (商品詳細)          │
│  ├── /details (詳細)                  ├── /cart (カート)                  │
│  ├── /contact (お問い合わせ)           └── /checkout/success (購入完了)    │
│  ├── /styling (スタイリング一覧)                                          │
│  └── /styling/:slug (スタイリング詳細)                                    │
│                                                                          │
│  【会員機能】                          【管理者機能】                       │
│  ├── /login (ログイン)                 ├── /admin (ダッシュボード)          │
│  └── /my-account (マイアカウント)      ├── /admin/products (商品管理)       │
│                                       ├── /admin/styling (スタイリング管理) │
│                                       ├── /admin/orders (注文管理)         │
│                                       ├── /admin/accounts (アカウント管理)  │
│                                       └── /admin/analytics (分析)          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 計測アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React App     │────▶│  Google Tag     │────▶│  Google         │
│  (dataLayer)    │     │  Manager        │     │  Analytics 4    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ├────▶ Google Ads (将来対応)
        │                       └────▶ その他のツール
        │
        └────▶ Stripe決済イベント連携
```

---

## 1. Google Analytics 4 (GA4) の設定

### 1.1 GA4 プロパティの作成

1. [Google Analytics](https://analytics.google.com/) にアクセス
2. 「管理」→「プロパティを作成」
3. 以下の情報を入力：
   - **プロパティ名**: THE LONG GAME
   - **タイムゾーン**: 日本
   - **通貨**: 日本円 (JPY)
4. ビジネス情報を入力
5. データストリームを作成:
   - **プラットフォーム**: ウェブ
   - **URL**: `https://main.d3o5fndieuvuu2.amplifyapp.com`（本番URL）
   - **ストリーム名**: THE LONG GAME - Web

### 1.2 測定IDの取得

GA4 管理画面から以下を取得：
```
測定ID: G-801XNRYDSQ
```

### 1.3 GA4 推奨イベント設定

GA4 管理画面 → データストリーム → 拡張計測機能で以下を有効化：

| 機能 | 説明 | 有効化 |
|-----|------|-------|
| ページビュー | ページ閲覧を計測 | ✅ |
| スクロール | 90%スクロールを計測 | ✅ |
| 離脱クリック | 外部リンククリック | ✅ |
| サイト内検索 | 検索クエリを計測 | ✅ |
| フォームの操作 | フォーム送信を計測 | ✅ |
| 動画エンゲージメント | 動画再生を計測 | ✅ |
| ファイルのダウンロード | ダウンロードを計測 | ✅ |

---

## 2. Google Tag Manager (GTM) の設定

### 2.1 GTM コンテナの作成

1. [Google Tag Manager](https://tagmanager.google.com/) にアクセス
2. 「アカウントを作成」または既存アカウントに「コンテナを追加」
3. 以下の情報を入力：
   - **コンテナ名**: THE LONG GAME
   - **ターゲットプラットフォーム**: ウェブ
4. コンテナIDを取得：`GTM-KMKK8KZM`

### 2.2 GTM スニペットのインストール

`index.html` の `<head>` タグ内に追加：

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
```

`<body>` タグ直後に追加：

```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

---

## 3. dataLayer の実装（React）

### 3.1 型定義の追加

`src/types/gtm.d.ts`:

```typescript
interface Window {
  dataLayer: DataLayerEvent[];
  gtag: (...args: any[]) => void;
}

interface DataLayerEvent {
  event?: string;
  ecommerce?: EcommerceData | null;
  [key: string]: any;
}

interface EcommerceData {
  currency?: string;
  value?: number;
  items?: EcommerceItem[];
  transaction_id?: string;
  shipping?: number;
  tax?: number;
}

interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
  index?: number;
}
```

### 3.2 GTM ユーティリティの作成

`src/lib/gtm.ts`:

```typescript
/**
 * Google Tag Manager / GA4 イベント送信ユーティリティ
 */

// dataLayerの初期化
declare global {
  interface Window {
    dataLayer: any[];
  }
}

// dataLayerにイベントをプッシュ
export const pushToDataLayer = (data: Record<string, any>) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
};

// Eコマースデータをクリア
export const clearEcommerce = () => {
  pushToDataLayer({ ecommerce: null });
};

// ======================================
// ページビュー関連
// ======================================

export const trackPageView = (pagePath: string, pageTitle: string) => {
  pushToDataLayer({
    event: 'page_view',
    page_path: pagePath,
    page_title: pageTitle,
  });
};

// ======================================
// Eコマースイベント（GA4拡張eコマース）
// ======================================

interface ProductItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity?: number;
  index?: number;
}

// 商品一覧表示
export const trackViewItemList = (
  listName: string,
  items: ProductItem[]
) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'view_item_list',
    ecommerce: {
      item_list_name: listName,
      items: items.map((item, index) => ({
        ...item,
        item_brand: 'THE LONG GAME',
        index: index + 1,
      })),
    },
  });
};

// 商品詳細表示
export const trackViewItem = (item: ProductItem) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'view_item',
    ecommerce: {
      currency: 'JPY',
      value: item.price,
      items: [{
        ...item,
        item_brand: 'THE LONG GAME',
        quantity: 1,
      }],
    },
  });
};

// 商品クリック
export const trackSelectItem = (
  listName: string,
  item: ProductItem
) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'select_item',
    ecommerce: {
      item_list_name: listName,
      items: [{
        ...item,
        item_brand: 'THE LONG GAME',
      }],
    },
  });
};

// カートに追加
export const trackAddToCart = (
  item: ProductItem,
  quantity: number = 1
) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'JPY',
      value: item.price * quantity,
      items: [{
        ...item,
        item_brand: 'THE LONG GAME',
        quantity,
      }],
    },
  });
};

// カートから削除
export const trackRemoveFromCart = (
  item: ProductItem,
  quantity: number = 1
) => {
  clearEcommerce();
  pushToDataLayer({
    event: 'remove_from_cart',
    ecommerce: {
      currency: 'JPY',
      value: item.price * quantity,
      items: [{
        ...item,
        item_brand: 'THE LONG GAME',
        quantity,
      }],
    },
  });
};

// カート表示
export const trackViewCart = (items: ProductItem[]) => {
  const value = items.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  
  clearEcommerce();
  pushToDataLayer({
    event: 'view_cart',
    ecommerce: {
      currency: 'JPY',
      value,
      items: items.map((item, index) => ({
        ...item,
        item_brand: 'THE LONG GAME',
        index: index + 1,
      })),
    },
  });
};

// チェックアウト開始
export const trackBeginCheckout = (items: ProductItem[]) => {
  const value = items.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  
  clearEcommerce();
  pushToDataLayer({
    event: 'begin_checkout',
    ecommerce: {
      currency: 'JPY',
      value,
      items: items.map((item, index) => ({
        ...item,
        item_brand: 'THE LONG GAME',
        index: index + 1,
      })),
    },
  });
};

// 配送情報追加
export const trackAddShippingInfo = (
  items: ProductItem[],
  shippingTier: string = '通常配送'
) => {
  const value = items.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  
  clearEcommerce();
  pushToDataLayer({
    event: 'add_shipping_info',
    ecommerce: {
      currency: 'JPY',
      value,
      shipping_tier: shippingTier,
      items: items.map((item, index) => ({
        ...item,
        item_brand: 'THE LONG GAME',
        index: index + 1,
      })),
    },
  });
};

// 決済情報追加
export const trackAddPaymentInfo = (
  items: ProductItem[],
  paymentType: string = 'Credit Card'
) => {
  const value = items.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  
  clearEcommerce();
  pushToDataLayer({
    event: 'add_payment_info',
    ecommerce: {
      currency: 'JPY',
      value,
      payment_type: paymentType,
      items: items.map((item, index) => ({
        ...item,
        item_brand: 'THE LONG GAME',
        index: index + 1,
      })),
    },
  });
};

// 購入完了
export const trackPurchase = (
  transactionId: string,
  items: ProductItem[],
  shipping: number = 0,
  tax: number = 0
) => {
  const value = items.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  
  clearEcommerce();
  pushToDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionId,
      currency: 'JPY',
      value: value + shipping,
      shipping,
      tax,
      items: items.map((item, index) => ({
        ...item,
        item_brand: 'THE LONG GAME',
        index: index + 1,
      })),
    },
  });
};

// ======================================
// ユーザーエンゲージメントイベント
// ======================================

// ログイン
export const trackLogin = (method: string = 'email') => {
  pushToDataLayer({
    event: 'login',
    method,
  });
};

// 会員登録
export const trackSignUp = (method: string = 'email') => {
  pushToDataLayer({
    event: 'sign_up',
    method,
  });
};

// 検索
export const trackSearch = (searchTerm: string) => {
  pushToDataLayer({
    event: 'search',
    search_term: searchTerm,
  });
};

// お問い合わせフォーム送信
export const trackContactSubmit = () => {
  pushToDataLayer({
    event: 'generate_lead',
    currency: 'JPY',
    value: 0,
  });
};

// スタイリング閲覧
export const trackViewStyling = (stylingId: string, stylingName: string) => {
  pushToDataLayer({
    event: 'view_styling',
    styling_id: stylingId,
    styling_name: stylingName,
  });
};

// ======================================
// ユーザープロパティ設定
// ======================================

export const setUserProperties = (
  userId?: string,
  userType?: 'guest' | 'member' | 'admin'
) => {
  pushToDataLayer({
    event: 'set_user_properties',
    user_id: userId,
    user_type: userType,
  });
};
```

### 3.3 各ページへの実装

#### 商品一覧ページ（Shop.tsx）

```typescript
import { useEffect } from 'react';
import { trackViewItemList, trackSelectItem } from '../lib/gtm';

// 商品一覧を取得した後
useEffect(() => {
  if (products.length > 0) {
    trackViewItemList('商品一覧', products.map(p => ({
      item_id: p.id,
      item_name: p.name,
      item_category: p.category,
      price: p.price,
    })));
  }
}, [products]);

// 商品クリック時
const handleProductClick = (product: Product) => {
  trackSelectItem('商品一覧', {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    price: product.price,
  });
};
```

#### 商品詳細ページ（ProductDetail.tsx）

```typescript
import { useEffect } from 'react';
import { trackViewItem, trackAddToCart } from '../lib/gtm';

// 商品詳細を取得した後
useEffect(() => {
  if (product) {
    trackViewItem({
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      item_variant: selectedSize,
      price: product.price,
    });
  }
}, [product]);

// カートに追加時
const handleAddToCart = () => {
  trackAddToCart({
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    item_variant: selectedSize,
    price: product.price,
  }, quantity);
};
```

#### カートページ（Cart.tsx）

```typescript
import { useEffect } from 'react';
import { trackViewCart, trackRemoveFromCart, trackBeginCheckout } from '../lib/gtm';

// カート表示時
useEffect(() => {
  if (cartItems.length > 0) {
    trackViewCart(cartItems.map(item => ({
      item_id: item.product_id,
      item_name: item.product_name,
      item_variant: item.variant_size,
      price: item.price,
      quantity: item.quantity,
    })));
  }
}, [cartItems]);

// 商品削除時
const handleRemoveItem = (item: CartItem) => {
  trackRemoveFromCart({
    item_id: item.product_id,
    item_name: item.product_name,
    item_variant: item.variant_size,
    price: item.price,
  }, item.quantity);
};

// チェックアウトボタンクリック時
const handleCheckout = () => {
  trackBeginCheckout(cartItems.map(item => ({
    item_id: item.product_id,
    item_name: item.product_name,
    item_variant: item.variant_size,
    price: item.price,
    quantity: item.quantity,
  })));
};
```

#### 購入完了ページ（CheckoutSuccess.tsx）

```typescript
import { useEffect } from 'react';
import { trackPurchase } from '../lib/gtm';

// 購入完了時（一度だけ実行）
useEffect(() => {
  if (orderDetails && sessionId) {
    // 重複送信防止
    const purchaseTracked = sessionStorage.getItem(`purchase_tracked_${sessionId}`);
    if (!purchaseTracked) {
      trackPurchase(
        sessionId,
        orderDetails.items.map(item => ({
          item_id: item.product_id,
          item_name: item.product_name,
          item_variant: item.variant_size,
          price: item.price,
          quantity: item.quantity,
        })),
        orderDetails.shipping || 0,
        orderDetails.tax || 0
      );
      sessionStorage.setItem(`purchase_tracked_${sessionId}`, 'true');
    }
  }
}, [orderDetails, sessionId]);
```

---

## 4. GTM でのタグ設定

### 4.1 変数の設定

#### データレイヤー変数

| 変数名 | 変数タイプ | データレイヤーの変数名 |
|-------|-----------|---------------------|
| DLV - ecommerce | データレイヤーの変数 | ecommerce |
| DLV - ecommerce.items | データレイヤーの変数 | ecommerce.items |
| DLV - ecommerce.value | データレイヤーの変数 | ecommerce.value |
| DLV - ecommerce.transaction_id | データレイヤーの変数 | ecommerce.transaction_id |
| DLV - user_id | データレイヤーの変数 | user_id |
| DLV - user_type | データレイヤーの変数 | user_type |

### 4.2 トリガーの設定

| トリガー名 | トリガータイプ | 条件 |
|-----------|--------------|------|
| Event - view_item_list | カスタムイベント | Event equals view_item_list |
| Event - view_item | カスタムイベント | Event equals view_item |
| Event - select_item | カスタムイベント | Event equals select_item |
| Event - add_to_cart | カスタムイベント | Event equals add_to_cart |
| Event - remove_from_cart | カスタムイベント | Event equals remove_from_cart |
| Event - view_cart | カスタムイベント | Event equals view_cart |
| Event - begin_checkout | カスタムイベント | Event equals begin_checkout |
| Event - add_shipping_info | カスタムイベント | Event equals add_shipping_info |
| Event - add_payment_info | カスタムイベント | Event equals add_payment_info |
| Event - purchase | カスタムイベント | Event equals purchase |
| Event - login | カスタムイベント | Event equals login |
| Event - sign_up | カスタムイベント | Event equals sign_up |
| Event - search | カスタムイベント | Event equals search |
| Event - generate_lead | カスタムイベント | Event equals generate_lead |

### 4.3 タグの設定

#### GA4 設定タグ

| 設定項目 | 値 |
|---------|-----|
| タグ名 | GA4 - Configuration |
| タグタイプ | Google タグ |
| タグ ID | G-801XNRYDSQ |
| トリガー | All Pages |

#### GA4 Eコマースイベントタグ

各Eコマースイベントに対してタグを作成：

**タグ名**: GA4 Event - view_item_list
| 設定項目 | 値 |
|---------|-----|
| タグタイプ | Google アナリティクス: GA4 イベント |
| 設定タグ | GA4 - Configuration |
| イベント名 | view_item_list |
| イベントパラメータ | |
| - items | {{DLV - ecommerce.items}} |
| トリガー | Event - view_item_list |

**タグ名**: GA4 Event - view_item
| 設定項目 | 値 |
|---------|-----|
| タグタイプ | Google アナリティクス: GA4 イベント |
| 設定タグ | GA4 - Configuration |
| イベント名 | view_item |
| イベントパラメータ | |
| - currency | JPY |
| - value | {{DLV - ecommerce.value}} |
| - items | {{DLV - ecommerce.items}} |
| トリガー | Event - view_item |

**タグ名**: GA4 Event - add_to_cart
| 設定項目 | 値 |
|---------|-----|
| タグタイプ | Google アナリティクス: GA4 イベント |
| 設定タグ | GA4 - Configuration |
| イベント名 | add_to_cart |
| イベントパラメータ | |
| - currency | JPY |
| - value | {{DLV - ecommerce.value}} |
| - items | {{DLV - ecommerce.items}} |
| トリガー | Event - add_to_cart |

**タグ名**: GA4 Event - purchase
| 設定項目 | 値 |
|---------|-----|
| タグタイプ | Google アナリティクス: GA4 イベント |
| 設定タグ | GA4 - Configuration |
| イベント名 | purchase |
| イベントパラメータ | |
| - transaction_id | {{DLV - ecommerce.transaction_id}} |
| - currency | JPY |
| - value | {{DLV - ecommerce.value}} |
| - items | {{DLV - ecommerce.items}} |
| トリガー | Event - purchase |

> 💡 他のEコマースイベントも同様のパターンで設定

---

## 5. 管理画面のトラッキング除外

管理者ページのトラッキングを除外する場合：

### 5.1 GTM トリガーの例外設定

「All Pages」トリガーに例外を追加：

```
Page Path does not match RegEx ^/admin.*
```

### 5.2 フロントエンドでの制御

`src/lib/gtm.ts` に追加：

```typescript
// 管理者ページかどうかを判定
const isAdminPage = () => {
  return window.location.pathname.startsWith('/admin');
};

// pushToDataLayerを修正
export const pushToDataLayer = (data: Record<string, any>) => {
  // 管理者ページではトラッキングしない
  if (isAdminPage()) {
    console.log('[GTM] Skipped (admin page):', data);
    return;
  }
  
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
};
```

---

## 6. テスト・デバッグ

### 6.1 GTM プレビューモード

1. GTM 管理画面で「プレビュー」をクリック
2. サイトURLを入力して接続
3. 各ページ・アクションでタグの発火を確認

### 6.2 GA4 リアルタイムレポート

1. GA4 管理画面 → レポート → リアルタイム
2. イベントが正しく計測されているか確認

### 6.3 Chrome DevTools での確認

```javascript
// コンソールでdataLayerを確認
console.log(window.dataLayer);

// 特定イベントをフィルタ
window.dataLayer.filter(e => e.event === 'purchase');
```

### 6.4 GA4 DebugView

1. GA4 管理画面 → 管理 → DebugView
2. Chrome拡張「Google Analytics Debugger」をインストール
3. 拡張を有効にしてサイトを操作
4. DebugViewでイベントを確認

---

## 7. コンバージョン設定

### 7.1 GA4 コンバージョン設定

GA4 管理画面 → 管理 → コンバージョン で以下を設定：

| イベント名 | コンバージョン |
|-----------|--------------|
| purchase | ✅ |
| generate_lead | ✅ |
| sign_up | ✅ |
| add_to_cart | （オプション） |
| begin_checkout | （オプション） |

### 7.2 カスタムディメンション設定

GA4 管理画面 → 管理 → カスタム定義：

| ディメンション名 | スコープ | イベントパラメータ |
|-----------------|---------|------------------|
| ユーザータイプ | ユーザー | user_type |
| 商品カテゴリ | イベント | item_category |
| 商品バリアント | イベント | item_variant |

---

## 8. 将来の拡張（Google Ads連携）

### 8.1 コンバージョンリンカー

GTMで設定：

| 設定項目 | 値 |
|---------|-----|
| タグ名 | Conversion Linker |
| タグタイプ | コンバージョンリンカー |
| トリガー | All Pages |

### 8.2 Google Ads リマーケティングタグ

| 設定項目 | 値 |
|---------|-----|
| タグ名 | Google Ads - Remarketing |
| タグタイプ | Google 広告のリマーケティング |
| コンバージョンID | AW-XXXXXXXXXX |
| トリガー | All Pages |

### 8.3 Google Ads コンバージョントラッキング

| 設定項目 | 値 |
|---------|-----|
| タグ名 | Google Ads - Purchase Conversion |
| タグタイプ | Google 広告のコンバージョントラッキング |
| コンバージョンID | AW-XXXXXXXXXX |
| コンバージョンラベル | XXXXXXXXXX |
| コンバージョン値 | {{DLV - ecommerce.value}} |
| 通貨コード | JPY |
| トリガー | Event - purchase |

---

## 9. 実装チェックリスト

### 9.1 GA4 設定

- [ ] GA4 プロパティ作成
- [ ] 測定ID取得（G-XXXXXXXXXX）
- [ ] 拡張計測機能の有効化
- [ ] コンバージョン設定
- [ ] カスタムディメンション設定

### 9.2 GTM 設定

- [ ] GTM コンテナ作成
- [ ] コンテナID取得（GTM-XXXXXXX）
- [ ] `index.html` にGTMスニペット追加
- [ ] 変数の設定
- [ ] トリガーの設定
- [ ] タグの設定

### 9.3 フロントエンド実装

- [ ] 型定義ファイルの追加
- [ ] GTMユーティリティの作成
- [ ] 商品一覧ページへの実装
- [ ] 商品詳細ページへの実装
- [ ] カートページへの実装
- [ ] 購入完了ページへの実装
- [ ] ログイン/会員登録のトラッキング
- [ ] お問い合わせフォームのトラッキング

### 9.4 テスト

- [ ] GTMプレビューモードでの確認
- [ ] GA4 リアルタイムレポートでの確認
- [ ] 全Eコマースイベントの動作確認
- [ ] コンバージョンの計測確認

---

## 10. 環境変数の管理

### 10.1 開発環境・本番環境の分離

`.env.development`:
```bash
VITE_GTM_ID=GTM-XXXXXXX  # テスト用コンテナ
```

`.env.production`:
```bash
VITE_GTM_ID=GTM-XXXXXXX  # 本番用コンテナ
```

### 10.2 動的なGTMスニペット

`index.html` を修正するか、React内でスクリプトを動的に挿入：

```typescript
// src/lib/gtm-init.ts
export const initGTM = (gtmId: string) => {
  if (!gtmId) return;
  
  // Head script
  const script = document.createElement('script');
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${gtmId}');
  `;
  document.head.appendChild(script);

  // Body noscript
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(noscript, document.body.firstChild);
};
```

`src/main.tsx`:
```typescript
import { initGTM } from './lib/gtm-init';

// GTM初期化
initGTM(import.meta.env.VITE_GTM_ID);
```

---

## 11. 参考リンク

- [Google Analytics 4 公式ドキュメント](https://developers.google.com/analytics/devguides/collection/ga4)
- [Google Tag Manager 公式ドキュメント](https://developers.google.com/tag-manager)
- [GA4 Eコマース実装ガイド](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [GA4 推奨イベント一覧](https://support.google.com/analytics/answer/9267735)
- [GTM プレビューモード](https://support.google.com/tagmanager/answer/6107056)

---

## 12. 実装スケジュール

| フェーズ | 作業内容 | 所要時間 |
|---------|---------|---------|
| 1 | GA4・GTM アカウント設定 | 30分 |
| 2 | GTMスニペットのインストール | 15分 |
| 3 | 基本タグ・トリガー設定 | 1時間 |
| 4 | フロントエンドGTM実装 | 2-3時間 |
| 5 | Eコマースタグ設定 | 1時間 |
| 6 | テスト・デバッグ | 1-2時間 |
| 7 | コンバージョン設定 | 30分 |

**合計: 約1日**

---

## 次のステップ

ドキュメント確認後、以下の順序で実装を進めます：

1. GA4 プロパティの作成と設定
2. GTM コンテナの作成
3. `index.html` へのGTMスニペット追加
4. `src/lib/gtm.ts` ユーティリティの作成
5. 各ページへのトラッキングコード追加
6. GTM管理画面でのタグ・トリガー設定
7. テスト環境での動作確認
8. 本番環境へのデプロイ

実装を開始しますか？

