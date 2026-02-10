/**
 * Google Tag Manager / GA4 型定義
 */

declare global {
  interface Window {
    dataLayer: DataLayerEvent[];
    gtag?: (...args: unknown[]) => void;
  }
}

export interface DataLayerEvent {
  event?: string;
  ecommerce?: EcommerceData | null;
  [key: string]: unknown;
}

export interface EcommerceData {
  currency?: string;
  value?: number;
  items?: EcommerceItem[];
  transaction_id?: string;
  shipping?: number;
  tax?: number;
  item_list_name?: string;
  shipping_tier?: string;
  payment_type?: string;
}

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity?: number;
  index?: number;
}

export interface ProductItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity?: number;
  index?: number;
}




