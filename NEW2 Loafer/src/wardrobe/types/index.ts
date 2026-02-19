/**
 * WARDROBE モジュールの型定義
 * THE LONG GAME への統合時にも再利用可能な形で設計
 */

// ユーザー関連
export interface User {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  email: string;
  is_admin: boolean;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  postal_code?: string | null;
  address?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  display_initial?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  is_wardrobe_public?: boolean;
  is_styling_public?: boolean;
  created_at: string;
  updated_at: string;
}

// ワードローブアイテム
export interface WardrobeItem {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  product_number: string | null;       // 商品番号・品番
  size: string | null;
  size_details: SizeDetails | null;
  model_worn_size: string | null;      // モデル着用サイズ（例: "モデル身長180cm, Mサイズ着用"）
  measurements: string | null;         // 採寸情報（例: "着丈72cm, 身幅52cm, 袖丈62cm"）
  color: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  currency: string | null;
  purchase_location: string | null;
  source_url: string | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  notes: string | null;
  category: WardrobeCategory | null;
  is_from_shop: boolean;
  is_discarded: boolean;
  discarded_at: string | null;
  is_sold: boolean;
  sold_date: string | null;
  sold_price: number | null;
  sold_currency: string | null;
  sold_location: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SizeDetails {
  [key: string]: string | number | undefined;
}

export type WardrobeCategory = 
  | 'トップス'
  | 'アウター／ジャケット'
  | 'パンツ'
  | 'その他（スーツ／ワンピース等）'
  | 'バッグ'
  | 'シューズ'
  | 'アクセサリー／小物';

// スタイリング写真
export interface StylingPhoto {
  id: string;
  user_id: string;
  image_url: string;
  title: string | null;
  notes: string | null;
  user_shoe_id: string | null;
  created_at: string;
  worn_items?: WornItem[];
}

export interface WornItem {
  id: string;
  user_shoe_id: string;
  user_shoes: WardrobeItem;
}

// 足の測定
export interface FootMeasurement {
  id: string;
  user_id: string;
  foot_type: 'left' | 'right';
  length_mm: number;
  width_mm: number;
  arch_height_mm: number | null;
  instep_height_mm: number | null;
  scan_image_url: string | null;
  measurement_date: string;
  is_active: boolean;
  created_at?: string;
}

// ブランドサイズマッピング
export interface BrandSizeMapping {
  id: string;
  user_id: string;
  brand_name: string;
  size: string;
  size_system: 'JP' | 'US' | 'UK' | 'EU';
  numeric_size: number;
  fit_rating: number;
  comfort_rating: number;
  notes: string | null;
  created_at: string;
}

// サイズ推薦
export interface SizeRecommendation {
  id?: string;
  brand_name: string;
  model_name: string;
  recommended_size: string;
  confidence_score: number;
  reasoning: string;
  alternative_sizes: AlternativeSize[];
}

export interface AlternativeSize {
  size: string;
  note: string;
}

// コメント
export interface WardrobeComment {
  id: string;
  wardrobe_user_id: string;
  commenter_id: string;
  content: string;
  created_at: string;
  commenter_profile?: {
    display_initial: string | null;
  };
}

// 公開プロフィール
export interface PublicProfile {
  id: string;
  display_initial: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  gender: string | null;
  is_wardrobe_public: boolean;
  is_styling_public: boolean;
  wardrobe_count?: number;
  styling_count?: number;
  is_favorited?: boolean;
}

// フォーム関連
export interface WardrobeItemFormData {
  name: string;
  brand: string;
  product_number: string;      // 商品番号・品番
  size: string;
  model_worn_size: string;     // モデル着用サイズ
  measurements: string;        // 採寸情報
  color: string;
  category: WardrobeCategory | string;
  purchase_date: string;
  purchase_price: string;
  currency: string;
  purchase_location: string;
  source_url: string;
  notes: string;
}

export interface StylingFormData {
  title: string;
  notes: string;
  user_shoe_id: string;
}

export interface SellFormData {
  sold_date: string;
  sold_price: string;
  sold_currency: string;
  sold_location: string;
}

// API関連
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// スクレイピング結果（Gemini API用）
export interface ScrapedProductData {
  name?: string;
  brand?: string;
  size?: string;
  color?: string;
  price?: string;
  currency?: string;
  description?: string;
  image_url?: string;
  image_url_2?: string;
  image_url_3?: string;
  size_details?: SizeDetails;
}

// タグ解析結果
export interface TagExtractionResult {
  name?: string;
  brand?: string;
  size?: string;
  color?: string;
  category?: string;
  materials?: string;
  care_instructions?: string;
  size_details?: SizeDetails;
}

// カテゴリー定義
export const CATEGORIES = [
  'All',
  'トップス',
  'アウター／ジャケット',
  'パンツ',
  'その他（スーツ／ワンピース等）',
  'バッグ',
  'シューズ',
  'アクセサリー／小物'
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  'All': 'All / すべて',
  'トップス': 'Tops / トップス',
  'アウター／ジャケット': 'Outerwear / アウター／ジャケット',
  'パンツ': 'Pants / パンツ',
  'その他（スーツ／ワンピース等）': 'Other / その他（スーツ／ワンピース等）',
  'バッグ': 'Bags / バッグ',
  'シューズ': 'Shoes / シューズ',
  'アクセサリー／小物': 'Accessories / アクセサリー／小物'
};

export const POPULAR_BRANDS = [
  'Nike',
  'Adidas',
  'New Balance',
  'ASICS',
  'Puma',
  'Converse',
  'Vans',
  'Reebok',
  'Under Armour',
  'Mizuno',
  'Onitsuka Tiger',
  'Saucony',
  'Brooks',
  'Hoka One One',
] as const;

export const SIZE_SYSTEMS = ['JP', 'US', 'UK', 'EU'] as const;

export const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'CNY', 'KRW'] as const;

