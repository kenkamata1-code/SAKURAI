/**
 * Google Tag Manager / GA4 イベント送信ユーティリティ
 * 
 * GA4 Eコマースイベント一覧:
 * - view_item_list: 商品一覧表示
 * - view_item: 商品詳細表示
 * - select_item: 商品クリック
 * - add_to_cart: カートに追加
 * - remove_from_cart: カートから削除
 * - view_cart: カート表示
 * - begin_checkout: チェックアウト開始
 * - add_shipping_info: 配送情報追加
 * - add_payment_info: 決済情報追加
 * - purchase: 購入完了
 */

import type { ProductItem } from '../types/gtm';

const BRAND_NAME = 'THE LONG GAME';

// ======================================
// 基本関数
// ======================================

/**
 * 管理者ページかどうかを判定
 */
const isAdminPage = (): boolean => {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
};

/**
 * dataLayerにイベントをプッシュ
 */
export const pushToDataLayer = (data: Record<string, unknown>): void => {
  if (typeof window === 'undefined') return;
  
  // 管理者ページではトラッキングしない
  if (isAdminPage()) {
    console.log('[GTM] Skipped (admin page):', data);
    return;
  }
  
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
  
  // デバッグ用ログ（本番では削除可能）
  if (import.meta.env.DEV) {
    console.log('[GTM] Push:', data);
  }
};

/**
 * Eコマースデータをクリア
 */
export const clearEcommerce = (): void => {
  pushToDataLayer({ ecommerce: null });
};

// ======================================
// ページビュー関連
// ======================================

/**
 * ページビューをトラッキング
 */
export const trackPageView = (pagePath: string, pageTitle: string): void => {
  pushToDataLayer({
    event: 'page_view',
    page_path: pagePath,
    page_title: pageTitle,
  });
};

// ======================================
// Eコマースイベント（GA4拡張eコマース）
// ======================================

/**
 * 商品一覧表示
 */
export const trackViewItemList = (
  listName: string,
  items: ProductItem[]
): void => {
  clearEcommerce();
  pushToDataLayer({
    event: 'view_item_list',
    ecommerce: {
      item_list_name: listName,
      items: items.map((item, index) => ({
        ...item,
        item_brand: item.item_brand || BRAND_NAME,
        index: index + 1,
      })),
    },
  });
};

/**
 * 商品詳細表示
 */
export const trackViewItem = (item: ProductItem): void => {
  clearEcommerce();
  pushToDataLayer({
    event: 'view_item',
    ecommerce: {
      currency: 'JPY',
      value: item.price,
      items: [{
        ...item,
        item_brand: item.item_brand || BRAND_NAME,
        quantity: 1,
      }],
    },
  });
};

/**
 * 商品クリック
 */
export const trackSelectItem = (
  listName: string,
  item: ProductItem
): void => {
  clearEcommerce();
  pushToDataLayer({
    event: 'select_item',
    ecommerce: {
      item_list_name: listName,
      items: [{
        ...item,
        item_brand: item.item_brand || BRAND_NAME,
      }],
    },
  });
};

/**
 * カートに追加
 */
export const trackAddToCart = (
  item: ProductItem,
  quantity: number = 1
): void => {
  clearEcommerce();
  pushToDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'JPY',
      value: item.price * quantity,
      items: [{
        ...item,
        item_brand: item.item_brand || BRAND_NAME,
        quantity,
      }],
    },
  });
};

/**
 * カートから削除
 */
export const trackRemoveFromCart = (
  item: ProductItem,
  quantity: number = 1
): void => {
  clearEcommerce();
  pushToDataLayer({
    event: 'remove_from_cart',
    ecommerce: {
      currency: 'JPY',
      value: item.price * quantity,
      items: [{
        ...item,
        item_brand: item.item_brand || BRAND_NAME,
        quantity,
      }],
    },
  });
};

/**
 * カート表示
 */
export const trackViewCart = (items: ProductItem[]): void => {
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
        item_brand: item.item_brand || BRAND_NAME,
        index: index + 1,
      })),
    },
  });
};

/**
 * チェックアウト開始
 */
export const trackBeginCheckout = (items: ProductItem[]): void => {
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
        item_brand: item.item_brand || BRAND_NAME,
        index: index + 1,
      })),
    },
  });
};

/**
 * 配送情報追加
 */
export const trackAddShippingInfo = (
  items: ProductItem[],
  shippingTier: string = '通常配送'
): void => {
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
        item_brand: item.item_brand || BRAND_NAME,
        index: index + 1,
      })),
    },
  });
};

/**
 * 決済情報追加
 */
export const trackAddPaymentInfo = (
  items: ProductItem[],
  paymentType: string = 'Credit Card'
): void => {
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
        item_brand: item.item_brand || BRAND_NAME,
        index: index + 1,
      })),
    },
  });
};

/**
 * 購入完了
 */
export const trackPurchase = (
  transactionId: string,
  items: ProductItem[],
  shipping: number = 0,
  tax: number = 0
): void => {
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
        item_brand: item.item_brand || BRAND_NAME,
        index: index + 1,
      })),
    },
  });
};

// ======================================
// ユーザーエンゲージメントイベント
// ======================================

/**
 * ログイン
 */
export const trackLogin = (method: string = 'email'): void => {
  pushToDataLayer({
    event: 'login',
    method,
  });
};

/**
 * 会員登録
 */
export const trackSignUp = (method: string = 'email'): void => {
  pushToDataLayer({
    event: 'sign_up',
    method,
  });
};

/**
 * 検索
 */
export const trackSearch = (searchTerm: string): void => {
  pushToDataLayer({
    event: 'search',
    search_term: searchTerm,
  });
};

/**
 * お問い合わせフォーム送信
 */
export const trackContactSubmit = (): void => {
  pushToDataLayer({
    event: 'generate_lead',
    currency: 'JPY',
    value: 0,
  });
};

/**
 * スタイリング閲覧
 */
export const trackViewStyling = (stylingId: string, stylingName: string): void => {
  pushToDataLayer({
    event: 'view_styling',
    styling_id: stylingId,
    styling_name: stylingName,
  });
};

// ======================================
// ユーザープロパティ設定
// ======================================

/**
 * ユーザープロパティを設定
 */
export const setUserProperties = (
  userId?: string,
  userType?: 'guest' | 'member' | 'admin'
): void => {
  pushToDataLayer({
    event: 'set_user_properties',
    user_id: userId,
    user_type: userType,
  });
};




