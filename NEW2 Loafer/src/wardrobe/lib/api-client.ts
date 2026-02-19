/**
 * APIクライアント - WARDROBE モジュール (AWS版)
 * 
 * AWS Lambda API Gateway に接続してデータを永続化します
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import heic2any from 'heic2any';
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

// HEIC/HEIFをJPEGに変換
async function convertHeicToJpeg(file: File): Promise<File> {
  if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    console.log('🔄 Converting HEIC to JPEG...');
    try {
      const blob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      });
      const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
      const newFileName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
      console.log('✅ HEIC conversion complete:', newFileName);
      return new File([jpegBlob], newFileName, { type: 'image/jpeg' });
    } catch (error) {
      console.error('❌ HEIC conversion failed:', error);
      throw new Error('HEIC画像の変換に失敗しました');
    }
  }
  return file;
}

// API設定 (aws-configから取得)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://3eal2nthgc.execute-api.ap-northeast-1.amazonaws.com/v1';
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

  // ==================== External API (Scraping, AI) - Gemini API ====================
  async scrapeProductUrl(url: string): Promise<ApiResponse<ScrapedProductData>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/scrape-url`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to scrape URL') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async extractTagInfo(imageBase64: string): Promise<ApiResponse<TagExtractionResult>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/extract-tag`, {
        method: 'POST',
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'Failed to extract tag info') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // 商品画像を分析してワードローブ登録用データを取得
  async analyzeProductImage(imageBase64: string): Promise<ApiResponse<ScrapedProductData>> {
    try {
      console.log('🔍 Analyzing product image...');
      const res = await authFetch(`${API_BASE_URL}/wardrobe/analyze-image`, {
        method: 'POST',
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) {
        const error = await res.json();
        console.error('❌ Image analysis failed:', error);
        return { data: null, error: new Error(error.error || 'Failed to analyze image') };
      }
      const data = await res.json();
      console.log('✅ Image analysis complete:', data);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Image analysis error:', error);
      return { data: null, error: error as Error };
    }
  }

  // ==================== AIアシスタント チャット ====================
  async aiChat(message: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<ApiResponse<{ reply: string }>> {
    try {
      const res = await authFetch(`${API_BASE_URL}/wardrobe/ai-chat`, {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      });
      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || 'AIチャットに失敗しました') };
      }
      const data = await res.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // ==================== File Upload (S3) ====================
  async uploadImage(userId: string, file: File, bucket: string): Promise<ApiResponse<string>> {
    try {
      console.log('📤 Starting image upload...', { userId, fileName: file.name, type: file.type });
      
      // HEIC/HEIFの場合はJPEGに変換
      const processedFile = await convertHeicToJpeg(file);
      
      // 署名付きURLを取得
      const urlRes = await authFetch(`${API_BASE_URL}/wardrobe/upload-url`, {
        method: 'POST',
        body: JSON.stringify({
          filename: processedFile.name,
          contentType: processedFile.type,
        }),
      });

      console.log('📋 Upload URL response status:', urlRes.status);

      if (!urlRes.ok) {
        const error = await urlRes.json();
        console.error('❌ Failed to get upload URL:', error);
        return { data: null, error: new Error(error.error || 'Failed to get upload URL') };
      }

      const { uploadUrl, publicUrl } = await urlRes.json();
      console.log('✅ Got upload URL:', { publicUrl });

      // S3に直接アップロード
      console.log('📤 Uploading to S3...');
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: processedFile,
        headers: {
          'Content-Type': processedFile.type,
        },
      });

      console.log('📦 S3 upload response status:', uploadRes.status);

      if (!uploadRes.ok) {
        console.error('❌ S3 upload failed:', uploadRes.status, uploadRes.statusText);
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
