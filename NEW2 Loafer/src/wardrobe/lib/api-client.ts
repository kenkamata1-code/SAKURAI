/**
 * APIクライアント - WARDROBE モジュール (AWS版)
 * 
 * AWS Lambda API Gateway に接続してデータを永続化します
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import type {
  WardrobeItem,
  StylingPhoto,
  FootMeasurement,
  BrandSizeMapping,
  SizeRecommendation,
  ScrapedProductData,
  TagExtractionResult,
  ApiResponse,
} from '../types';

// API設定 (aws-configから取得)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.thelonggame.jp/v1';
const CLOUDFRONT_DOMAIN = import.meta.env.VITE_CLOUDFRONT_DOMAIN || 'd8l6v2r98r1en.cloudfront.net';

// 認証トークンを取得
async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
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
  
  return fetch(url, { ...options, headers });
}

/**
 * AWS API クライアント実装
 */
class AWSApiClient {
  // ==================== Wardrobe Items ====================
  async getWardrobeItems(userId: string): Promise<ApiResponse<WardrobeItem[]>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/items`);
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to fetch items') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async createWardrobeItem(userId: string, item: Partial<WardrobeItem>): Promise<ApiResponse<WardrobeItem>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/items`, {
        method: 'POST',
        body: JSON.stringify(item),
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to create item') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async updateWardrobeItem(id: string, updates: Partial<WardrobeItem>): Promise<ApiResponse<WardrobeItem>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to update item') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async deleteWardrobeItem(id: string): Promise<ApiResponse<null>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/items/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to delete item') };
      }
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // ==================== Styling Photos ====================
  async getStylingPhotos(userId: string): Promise<ApiResponse<StylingPhoto[]>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/styling-photos`);
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to fetch photos') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async createStylingPhoto(userId: string, photo: Partial<StylingPhoto>, wornItemIds: string[]): Promise<ApiResponse<StylingPhoto>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/styling-photos`, {
        method: 'POST',
        body: JSON.stringify({ ...photo, worn_item_ids: wornItemIds }),
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to create photo') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async deleteStylingPhoto(id: string): Promise<ApiResponse<null>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/styling-photos/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to delete photo') };
      }
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // ==================== Foot Measurements ====================
  async getFootMeasurements(userId: string): Promise<ApiResponse<FootMeasurement[]>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/foot-measurements`);
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to fetch measurements') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async createFootMeasurement(userId: string, measurement: Partial<FootMeasurement>): Promise<ApiResponse<FootMeasurement>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/foot-measurements`, {
        method: 'POST',
        body: JSON.stringify(measurement),
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to create measurement') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async updateFootMeasurementActive(id: string, isActive: boolean): Promise<ApiResponse<FootMeasurement>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/foot-measurements/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive }),
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to update measurement') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async deleteFootMeasurement(id: string): Promise<ApiResponse<null>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/foot-measurements/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to delete measurement') };
      }
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // ==================== Brand Size Mappings ====================
  async getBrandSizeMappings(userId: string): Promise<ApiResponse<BrandSizeMapping[]>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/brand-size-mappings`);
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to fetch mappings') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async createBrandSizeMapping(userId: string, mapping: Partial<BrandSizeMapping>): Promise<ApiResponse<BrandSizeMapping>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/brand-size-mappings`, {
        method: 'POST',
        body: JSON.stringify(mapping),
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to create mapping') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async updateBrandSizeMapping(id: string, updates: Partial<BrandSizeMapping>): Promise<ApiResponse<BrandSizeMapping>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/brand-size-mappings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to update mapping') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async deleteBrandSizeMapping(id: string): Promise<ApiResponse<null>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/brand-size-mappings/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to delete mapping') };
      }
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // ==================== Size Recommendations (モック - 将来Gemini API) ====================
  async getSizeRecommendation(
    productName: string,
    measurements: FootMeasurement[],
    mappings: BrandSizeMapping[]
  ): Promise<ApiResponse<SizeRecommendation>> {
    // モック実装 - 実際はGemini APIを呼び出す
    const activeMeasurement = measurements.find(m => m.is_active);
    const footLength = activeMeasurement ? activeMeasurement.length_mm / 10 : 26;
    const recommendedSizeNum = Math.round(footLength + 1);
    
    const recommendation: SizeRecommendation = {
      brand_name: productName.split(' ')[0] || 'Unknown',
      model_name: productName,
      recommended_size: `${recommendedSizeNum}cm`,
      confidence_score: mappings.length > 0 ? 85 : 70,
      reasoning: `足長 ${footLength.toFixed(1)}cm を基に、${recommendedSizeNum}cm をお勧めします。`,
      alternative_sizes: [
        { size: `${recommendedSizeNum - 0.5}cm`, note: '細身の足の場合' },
        { size: `${recommendedSizeNum + 0.5}cm`, note: '幅広の足の場合' },
      ],
    };

    return { data: recommendation, error: null };
  }

  // ==================== External API (Scraping, AI) - モック ====================
  async scrapeProductUrl(url: string): Promise<ApiResponse<ScrapedProductData>> {
    console.log('Scraping URL:', url);
    const mockData: ScrapedProductData = {
      name: 'Sample Product',
      brand: 'Sample Brand',
      price: '15000',
      currency: 'JPY',
      description: 'URLから取得した商品情報（モック）',
    };
    return { data: mockData, error: null };
  }

  async extractTagInfo(imageBase64: string): Promise<ApiResponse<TagExtractionResult>> {
    console.log('Extracting tag info from image');
    const mockResult: TagExtractionResult = {
      brand: 'Detected Brand',
      size: 'M',
      category: 'トップス',
      materials: '綿 100%',
    };
    return { data: mockResult, error: null };
  }

  // ==================== File Upload (S3) ====================
  async uploadImage(userId: string, file: File, bucket: string): Promise<ApiResponse<string>> {
    try {
      // 署名付きURLを取得
      const urlRes = await authFetch(`${API_BASE_URL}/wardrobe/upload-url`, {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!urlRes.ok) {
        const error = await urlRes.json();
        return { data: null, error: new Error(error.error || 'Failed to get upload URL') };
      }

      const { uploadUrl, publicUrl } = await urlRes.json();

      // S3に直接アップロード
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadRes.ok) {
        return { data: null, error: new Error('Failed to upload image to S3') };
      }

      return { data: publicUrl, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

// デフォルトのAPIクライアントインスタンス
export const apiClient = new AWSApiClient();
