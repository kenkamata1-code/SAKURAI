// AWS移行完了: Supabaseは使用しません
// このファイルは型定義のみを提供します

// Supabaseが設定されているかどうかのフラグ（常にfalse）
export const isSupabaseConfigured = false;

// ダミーのsupabaseオブジェクト（後方互換性のため）
export const supabase = null;

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  category_id: string;
  category?: 'shoes' | 'accessory';
  stock: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
  categories?: Category;
  product_images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  display_order: number;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  products?: Product;
}

export interface StylingImage {
  id: string;
  styling_id: string;
  url: string;
  display_order: number;
  created_at: string;
}

export interface Styling {
  id: string;
  title: string;
  description: string;
  image_url: string;
  color: string;
  size: string;
  height: string;
  slug: string;
  created_at: string;
  updated_at: string;
  styling_images?: StylingImage[];
}
