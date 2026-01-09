import { fetchAuthSession } from 'aws-amplify/auth';
import { apiConfig, cdnConfig } from './aws-config';

// 認証トークンを取得
async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString() || null;
    console.log('Auth token retrieved:', token ? 'YES (length: ' + token.length + ')' : 'NO');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// 認証付きfetch
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  console.log('authFetch URL:', url);
  console.log('authFetch headers:', JSON.stringify(headers, null, 2));
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  console.log('authFetch response status:', response.status);
  
  return response;
}

// ==================== 型定義 ====================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  display_order: number;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  stock: number;
  sku?: string;
  created_at: string;
  updated_at: string;
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
  display_order: number;
  created_at: string;
  updated_at: string;
  categories?: Category;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
}

export interface CartItem {
  id: string;
  cognito_user_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  products?: Product;
  product_variants?: ProductVariant;
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
  display_order: number;
  created_at: string;
  updated_at: string;
  styling_images?: StylingImage[];
}

export interface Order {
  id: string;
  cognito_user_id: string;
  total_amount: number;
  status: string;
  shipping_name: string;
  shipping_postal_code: string;
  shipping_address: string;
  shipping_phone: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  created_at: string;
}

export interface Profile {
  id: string;
  cognito_user_id: string;
  email: string;
  is_admin: boolean;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  postal_code?: string;
  address?: string;
  gender?: string;
  birth_date?: string;
  created_at: string;
  updated_at: string;
}

// ==================== API クライアント ====================

export const api = {
  // カテゴリ
  categories: {
    async list(): Promise<Category[]> {
      const res = await fetch(`${apiConfig.baseUrl}/categories`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
    
    async get(slug: string): Promise<Category> {
      const res = await fetch(`${apiConfig.baseUrl}/categories/${slug}`);
      if (!res.ok) throw new Error('Failed to fetch category');
      return res.json();
    },
  },

  // 商品
  products: {
    async list(params?: { category?: string; featured?: boolean }): Promise<Product[]> {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.featured) searchParams.set('featured', 'true');
      
      const url = `${apiConfig.baseUrl}/products${searchParams.toString() ? `?${searchParams}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    
    async get(slug: string): Promise<Product> {
      const res = await fetch(`${apiConfig.baseUrl}/products/${slug}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return res.json();
    },
    
    async create(product: Partial<Product>): Promise<Product> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/products`, {
        method: 'POST',
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error('Failed to create product');
      return res.json();
    },
    
    async update(id: string, product: Partial<Product>): Promise<Product> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error('Failed to update product');
      return res.json();
    },
    
    async delete(id: string): Promise<void> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/products/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product');
    },
  },

  // カート
  cart: {
    async list(): Promise<CartItem[]> {
      const res = await authFetch(`${apiConfig.baseUrl}/cart`);
      if (!res.ok) throw new Error('Failed to fetch cart');
      return res.json();
    },
    
    async add(productId: string, variantId?: string, quantity: number = 1): Promise<CartItem> {
      const res = await authFetch(`${apiConfig.baseUrl}/cart`, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, variant_id: variantId, quantity }),
      });
      if (!res.ok) throw new Error('Failed to add to cart');
      return res.json();
    },
    
    async update(id: string, quantity: number): Promise<CartItem> {
      const res = await authFetch(`${apiConfig.baseUrl}/cart/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error('Failed to update cart');
      return res.json();
    },
    
    async remove(id: string): Promise<void> {
      const res = await authFetch(`${apiConfig.baseUrl}/cart/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove from cart');
    },
    
    async clear(): Promise<void> {
      const res = await authFetch(`${apiConfig.baseUrl}/cart`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to clear cart');
    },
  },

  // 注文
  orders: {
    async list(): Promise<Order[]> {
      const res = await authFetch(`${apiConfig.baseUrl}/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    
    async get(id: string): Promise<Order> {
      const res = await authFetch(`${apiConfig.baseUrl}/orders/${id}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json();
    },
    
    async create(order: {
      shipping_name: string;
      shipping_postal_code: string;
      shipping_address: string;
      shipping_phone: string;
    }): Promise<Order> {
      const res = await authFetch(`${apiConfig.baseUrl}/orders`, {
        method: 'POST',
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error('Failed to create order');
      return res.json();
    },
  },

  // スタイリング
  styling: {
    async list(): Promise<Styling[]> {
      const res = await fetch(`${apiConfig.baseUrl}/styling`);
      if (!res.ok) throw new Error('Failed to fetch styling');
      return res.json();
    },
    
    async get(slug: string): Promise<Styling> {
      const res = await fetch(`${apiConfig.baseUrl}/styling/${slug}`);
      if (!res.ok) throw new Error('Failed to fetch styling');
      return res.json();
    },
  },

  // プロフィール
  profile: {
    async get(): Promise<Profile> {
      const res = await authFetch(`${apiConfig.baseUrl}/profile`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    
    async update(profile: Partial<Profile>): Promise<Profile> {
      const res = await authFetch(`${apiConfig.baseUrl}/profile`, {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
  },

  // 管理者用API
  admin: {
    async createUser(data: {
      email: string;
      password: string;
      full_name?: string;
      is_admin?: boolean;
    }): Promise<{ success: boolean; user: { id: string; email: string } }> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/users`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create user');
      }
      return res.json();
    },
    
    async listOrders(): Promise<Order[]> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    
    async updateOrderStatus(id: string, status: string): Promise<Order> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update order status');
      return res.json();
    },
    
    // プロフィール一覧
    async listProfiles(): Promise<Profile[]> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/profiles`);
      if (!res.ok) throw new Error('Failed to fetch profiles');
      return res.json();
    },
    
    async updateProfileAdmin(id: string, is_admin: boolean): Promise<Profile> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/profiles/${id}/admin`, {
        method: 'PUT',
        body: JSON.stringify({ is_admin }),
      });
      if (!res.ok) throw new Error('Failed to update admin status');
      return res.json();
    },
    
    // 商品管理
    async createProduct(product: Partial<Product>): Promise<Product> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/products`, {
        method: 'POST',
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error('Failed to create product');
      return res.json();
    },
    
    async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error('Failed to update product');
      return res.json();
    },
    
    async deleteProduct(id: string): Promise<void> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/products/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product');
    },
    
    // 商品バリエーション
    async listProductVariants(productId: string): Promise<ProductVariant[]> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/products/${productId}/variants`);
      if (!res.ok) throw new Error('Failed to fetch variants');
      return res.json();
    },
    
    async createProductVariant(productId: string, variant: Partial<ProductVariant>): Promise<ProductVariant> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/products/${productId}/variants`, {
        method: 'POST',
        body: JSON.stringify(variant),
      });
      if (!res.ok) throw new Error('Failed to create variant');
      return res.json();
    },
    
    async updateProductVariant(variantId: string, variant: Partial<ProductVariant>): Promise<ProductVariant> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/variants/${variantId}`, {
        method: 'PUT',
        body: JSON.stringify(variant),
      });
      if (!res.ok) throw new Error('Failed to update variant');
      return res.json();
    },
    
    async deleteProductVariant(variantId: string): Promise<void> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/variants/${variantId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete variant');
    },
    
    // 商品画像
    async listProductImages(productId: string): Promise<ProductImage[]> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/products/${productId}/images`);
      if (!res.ok) throw new Error('Failed to fetch images');
      return res.json();
    },
    
    async createProductImage(productId: string, image: { url: string; display_order: number }): Promise<ProductImage> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/products/${productId}/images`, {
        method: 'POST',
        body: JSON.stringify(image),
      });
      if (!res.ok) throw new Error('Failed to create image');
      return res.json();
    },
    
    async deleteProductImage(imageId: string): Promise<void> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/images/${imageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete image');
    },
    
    // スタイリング管理
    async createStyling(styling: Partial<Styling>): Promise<Styling> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/styling`, {
        method: 'POST',
        body: JSON.stringify(styling),
      });
      if (!res.ok) throw new Error('Failed to create styling');
      return res.json();
    },
    
    async updateStyling(id: string, styling: Partial<Styling>): Promise<Styling> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/styling/${id}`, {
        method: 'PUT',
        body: JSON.stringify(styling),
      });
      if (!res.ok) throw new Error('Failed to update styling');
      return res.json();
    },
    
    async deleteStyling(id: string): Promise<void> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/styling/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete styling');
    },
    
    // スタイリング画像
    async listStylingImages(stylingId: string): Promise<StylingImage[]> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/styling/${stylingId}/images`);
      if (!res.ok) throw new Error('Failed to fetch styling images');
      return res.json();
    },
    
    async createStylingImage(stylingId: string, image: { url: string; display_order: number }): Promise<StylingImage> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/styling/${stylingId}/images`, {
        method: 'POST',
        body: JSON.stringify(image),
      });
      if (!res.ok) throw new Error('Failed to create styling image');
      return res.json();
    },
    
    async deleteStylingImage(imageId: string): Promise<void> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/styling-images/${imageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete styling image');
    },
    
    // 分析データ
    async getAnalyticsSummary(days: number = 30): Promise<{
      total_page_views: number;
      unique_visitors: number;
      total_orders: number;
      total_revenue: number;
      total_products: number;
      total_users: number;
      cart_additions: number;
    }> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/analytics/summary?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch analytics summary');
      return res.json();
    },
    
    async getPageViews(days: number = 30): Promise<Array<{
      date: string;
      page_path: string;
      page_title?: string;
      views: number;
      unique_sessions: number;
      referrer?: string;
    }>> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/analytics/page-views?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch page views');
      return res.json();
    },

    async getReferrerStats(days: number = 30): Promise<Array<{
      referrer: string;
      views: number;
      unique_sessions: number;
    }>> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/analytics/referrers?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch referrer stats');
      return res.json();
    },

    async getProductStats(days: number = 30): Promise<Array<{
      product_id: string;
      product_name: string;
      cart_additions: number;
      unique_cart_users: number;
      purchases: number;
      unique_purchasers: number;
      revenue: number;
    }>> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/analytics/products?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch product stats');
      return res.json();
    },

    async getStylingStats(days: number = 30): Promise<Array<{
      styling_id: string;
      styling_title: string;
      image_url: string;
      views: number;
      unique_sessions: number;
      logged_in_users: number;
      anonymous_users: number;
    }>> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/analytics/styling?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch styling stats');
      return res.json();
    },

    async getRawData(days: number = 30): Promise<{
      pageViews: Array<{
        日時: string;
        ページパス: string;
        ページ名: string;
        商品スラッグ: string | null;
        商品名: string | null;
        流入元: string;
        セッションID: string;
        会員区分: string;
      }>;
      cartItems: Array<{
        日時: string;
        アクション: string;
        商品名: string;
        サイズ: string | null;
        SKU: string | null;
        数量: number;
        単価: number;
        ユーザー: string | null;
      }>;
      orders: Array<{
        日時: string;
        注文ID: string;
        ステータス: string;
        商品名: string;
        サイズ: string | null;
        数量: number;
        単価: number;
        小計: number;
        注文合計: number;
        ユーザー: string | null;
      }>;
    }> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/analytics/raw-data?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch raw data');
      return res.json();
    },
    
    // S3署名付きURL生成
    async getUploadUrl(filename: string, contentType: string, folder: string = 'products'): Promise<{
      uploadUrl: string;
      publicUrl: string;
      key: string;
    }> {
      const res = await authFetch(`${apiConfig.baseUrl}/admin/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ filename, contentType, folder }),
      });
      if (!res.ok) throw new Error('Failed to get upload URL');
      return res.json();
    },
  },
};

// S3に画像をアップロードするヘルパー関数
export async function uploadImageToS3(file: File, folder: string = 'products'): Promise<string> {
  // 署名付きURLを取得
  const { uploadUrl, publicUrl } = await api.admin.getUploadUrl(file.name, file.type, folder);
  
  // S3に直接アップロード
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
  
  if (!uploadRes.ok) {
    throw new Error('Failed to upload image to S3');
  }
  
  return publicUrl;
}

// 画像URL変換ヘルパー
export function getImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${cdnConfig.imageBaseUrl}/${path}`;
}

