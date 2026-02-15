/**
 * APIクライアント - WARDROBE モジュール
 * 
 * THE LONG GAMEへ統合時の接続ポイント:
 * - このファイル内のAPIクライアント実装を差し替えることで、
 *   バックエンドとの接続を切り替えられます
 * - 現在はローカルストレージを使用したモック実装です
 * - 本番では Supabase / REST API などに置き換えてください
 */

import type {
  WardrobeItem,
  StylingPhoto,
  FootMeasurement,
  BrandSizeMapping,
  SizeRecommendation,
  PublicProfile,
  WardrobeComment,
  ScrapedProductData,
  TagExtractionResult,
  ApiResponse,
} from '../types';

// ストレージキー
const STORAGE_KEYS = {
  WARDROBE_ITEMS: 'wardrobe_items',
  STYLING_PHOTOS: 'wardrobe_styling_photos',
  FOOT_MEASUREMENTS: 'wardrobe_foot_measurements',
  BRAND_SIZE_MAPPINGS: 'wardrobe_brand_size_mappings',
  SIZE_RECOMMENDATIONS: 'wardrobe_size_recommendations',
  PUBLIC_PROFILES: 'wardrobe_public_profiles',
  COMMENTS: 'wardrobe_comments',
  FAVORITES: 'wardrobe_favorites',
};

// ユーティリティ関数
const generateId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// LocalStorage ヘルパー
function getFromStorage<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * APIクライアントインターフェース
 * THE LONG GAMEへの統合時はこのインターフェースを実装したクラスを提供してください
 */
export interface IWardrobeApiClient {
  // Wardrobe Items
  getWardrobeItems(userId: string): Promise<ApiResponse<WardrobeItem[]>>;
  createWardrobeItem(userId: string, item: Partial<WardrobeItem>): Promise<ApiResponse<WardrobeItem>>;
  updateWardrobeItem(id: string, updates: Partial<WardrobeItem>): Promise<ApiResponse<WardrobeItem>>;
  deleteWardrobeItem(id: string): Promise<ApiResponse<null>>;

  // Styling Photos
  getStylingPhotos(userId: string): Promise<ApiResponse<StylingPhoto[]>>;
  createStylingPhoto(userId: string, photo: Partial<StylingPhoto>, wornItemIds: string[]): Promise<ApiResponse<StylingPhoto>>;
  deleteStylingPhoto(id: string): Promise<ApiResponse<null>>;

  // Foot Measurements
  getFootMeasurements(userId: string): Promise<ApiResponse<FootMeasurement[]>>;
  createFootMeasurement(userId: string, measurement: Partial<FootMeasurement>): Promise<ApiResponse<FootMeasurement>>;
  updateFootMeasurementActive(id: string, isActive: boolean): Promise<ApiResponse<FootMeasurement>>;
  deleteFootMeasurement(id: string): Promise<ApiResponse<null>>;

  // Brand Size Mappings
  getBrandSizeMappings(userId: string): Promise<ApiResponse<BrandSizeMapping[]>>;
  createBrandSizeMapping(userId: string, mapping: Partial<BrandSizeMapping>): Promise<ApiResponse<BrandSizeMapping>>;
  updateBrandSizeMapping(id: string, updates: Partial<BrandSizeMapping>): Promise<ApiResponse<BrandSizeMapping>>;
  deleteBrandSizeMapping(id: string): Promise<ApiResponse<null>>;

  // Size Recommendations
  getSizeRecommendation(productName: string, measurements: FootMeasurement[], mappings: BrandSizeMapping[]): Promise<ApiResponse<SizeRecommendation>>;

  // Public Profiles
  getPublicProfiles(): Promise<ApiResponse<PublicProfile[]>>;
  getPublicProfile(userId: string): Promise<ApiResponse<PublicProfile>>;
  getPublicWardrobeItems(userId: string): Promise<ApiResponse<WardrobeItem[]>>;
  getPublicStylingPhotos(userId: string): Promise<ApiResponse<StylingPhoto[]>>;

  // Comments
  getComments(wardrobeUserId: string): Promise<ApiResponse<WardrobeComment[]>>;
  createComment(wardrobeUserId: string, commenterId: string, content: string): Promise<ApiResponse<WardrobeComment>>;
  deleteComment(id: string): Promise<ApiResponse<null>>;

  // Favorites
  toggleFavorite(userId: string, favoritedUserId: string): Promise<ApiResponse<boolean>>;
  isFavorited(userId: string, favoritedUserId: string): Promise<ApiResponse<boolean>>;

  // External API (Scraping, AI)
  scrapeProductUrl(url: string): Promise<ApiResponse<ScrapedProductData>>;
  extractTagInfo(imageBase64: string): Promise<ApiResponse<TagExtractionResult>>;

  // File Upload
  uploadImage(userId: string, file: File, bucket: string): Promise<ApiResponse<string>>;
}

/**
 * モック実装 - ローカルストレージ使用
 */
export class MockApiClient implements IWardrobeApiClient {
  // Wardrobe Items
  async getWardrobeItems(userId: string): Promise<ApiResponse<WardrobeItem[]>> {
    const items = getFromStorage<WardrobeItem>(STORAGE_KEYS.WARDROBE_ITEMS)
      .filter(item => item.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { data: items, error: null };
  }

  async createWardrobeItem(userId: string, item: Partial<WardrobeItem>): Promise<ApiResponse<WardrobeItem>> {
    const newItem: WardrobeItem = {
      id: generateId(),
      user_id: userId,
      name: item.name || '',
      brand: item.brand || null,
      size: item.size || null,
      size_details: item.size_details || null,
      color: item.color || null,
      purchase_date: item.purchase_date || null,
      purchase_price: item.purchase_price || null,
      currency: item.currency || 'JPY',
      purchase_location: item.purchase_location || null,
      source_url: item.source_url || null,
      image_url: item.image_url || null,
      image_url_2: item.image_url_2 || null,
      image_url_3: item.image_url_3 || null,
      notes: item.notes || null,
      category: item.category || 'シューズ',
      is_from_shop: item.is_from_shop || false,
      is_discarded: false,
      discarded_at: null,
      is_sold: false,
      sold_date: null,
      sold_price: null,
      sold_currency: null,
      sold_location: null,
      created_at: now(),
    };

    const items = getFromStorage<WardrobeItem>(STORAGE_KEYS.WARDROBE_ITEMS);
    items.push(newItem);
    saveToStorage(STORAGE_KEYS.WARDROBE_ITEMS, items);

    return { data: newItem, error: null };
  }

  async updateWardrobeItem(id: string, updates: Partial<WardrobeItem>): Promise<ApiResponse<WardrobeItem>> {
    const items = getFromStorage<WardrobeItem>(STORAGE_KEYS.WARDROBE_ITEMS);
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return { data: null, error: new Error('Item not found') };
    }

    items[index] = { ...items[index], ...updates, updated_at: now() };
    saveToStorage(STORAGE_KEYS.WARDROBE_ITEMS, items);

    return { data: items[index], error: null };
  }

  async deleteWardrobeItem(id: string): Promise<ApiResponse<null>> {
    const items = getFromStorage<WardrobeItem>(STORAGE_KEYS.WARDROBE_ITEMS);
    const filtered = items.filter(item => item.id !== id);
    saveToStorage(STORAGE_KEYS.WARDROBE_ITEMS, filtered);
    return { data: null, error: null };
  }

  // Styling Photos
  async getStylingPhotos(userId: string): Promise<ApiResponse<StylingPhoto[]>> {
    const photos = getFromStorage<StylingPhoto>(STORAGE_KEYS.STYLING_PHOTOS)
      .filter(photo => photo.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { data: photos, error: null };
  }

  async createStylingPhoto(userId: string, photo: Partial<StylingPhoto>, wornItemIds: string[]): Promise<ApiResponse<StylingPhoto>> {
    const items = getFromStorage<WardrobeItem>(STORAGE_KEYS.WARDROBE_ITEMS);
    const wornItems = wornItemIds.map(id => {
      const item = items.find(i => i.id === id);
      return item ? { id: generateId(), user_shoe_id: id, user_shoes: item } : null;
    }).filter(Boolean) as StylingPhoto['worn_items'];

    const newPhoto: StylingPhoto = {
      id: generateId(),
      user_id: userId,
      image_url: photo.image_url || '',
      title: photo.title || null,
      notes: photo.notes || null,
      user_shoe_id: photo.user_shoe_id || null,
      created_at: now(),
      worn_items: wornItems,
    };

    const photos = getFromStorage<StylingPhoto>(STORAGE_KEYS.STYLING_PHOTOS);
    photos.push(newPhoto);
    saveToStorage(STORAGE_KEYS.STYLING_PHOTOS, photos);

    return { data: newPhoto, error: null };
  }

  async deleteStylingPhoto(id: string): Promise<ApiResponse<null>> {
    const photos = getFromStorage<StylingPhoto>(STORAGE_KEYS.STYLING_PHOTOS);
    const filtered = photos.filter(photo => photo.id !== id);
    saveToStorage(STORAGE_KEYS.STYLING_PHOTOS, filtered);
    return { data: null, error: null };
  }

  // Foot Measurements
  async getFootMeasurements(userId: string): Promise<ApiResponse<FootMeasurement[]>> {
    const measurements = getFromStorage<FootMeasurement>(STORAGE_KEYS.FOOT_MEASUREMENTS)
      .filter(m => m.user_id === userId)
      .sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime());
    return { data: measurements, error: null };
  }

  async createFootMeasurement(userId: string, measurement: Partial<FootMeasurement>): Promise<ApiResponse<FootMeasurement>> {
    const newMeasurement: FootMeasurement = {
      id: generateId(),
      user_id: userId,
      foot_type: measurement.foot_type || 'left',
      length_mm: measurement.length_mm || 0,
      width_mm: measurement.width_mm || 0,
      arch_height_mm: measurement.arch_height_mm || null,
      instep_height_mm: measurement.instep_height_mm || null,
      scan_image_url: measurement.scan_image_url || null,
      measurement_date: now(),
      is_active: true,
    };

    const measurements = getFromStorage<FootMeasurement>(STORAGE_KEYS.FOOT_MEASUREMENTS);
    measurements.push(newMeasurement);
    saveToStorage(STORAGE_KEYS.FOOT_MEASUREMENTS, measurements);

    return { data: newMeasurement, error: null };
  }

  async updateFootMeasurementActive(id: string, isActive: boolean): Promise<ApiResponse<FootMeasurement>> {
    const measurements = getFromStorage<FootMeasurement>(STORAGE_KEYS.FOOT_MEASUREMENTS);
    const index = measurements.findIndex(m => m.id === id);
    
    if (index === -1) {
      return { data: null, error: new Error('Measurement not found') };
    }

    measurements[index].is_active = isActive;
    saveToStorage(STORAGE_KEYS.FOOT_MEASUREMENTS, measurements);

    return { data: measurements[index], error: null };
  }

  async deleteFootMeasurement(id: string): Promise<ApiResponse<null>> {
    const measurements = getFromStorage<FootMeasurement>(STORAGE_KEYS.FOOT_MEASUREMENTS);
    const filtered = measurements.filter(m => m.id !== id);
    saveToStorage(STORAGE_KEYS.FOOT_MEASUREMENTS, filtered);
    return { data: null, error: null };
  }

  // Brand Size Mappings
  async getBrandSizeMappings(userId: string): Promise<ApiResponse<BrandSizeMapping[]>> {
    const mappings = getFromStorage<BrandSizeMapping>(STORAGE_KEYS.BRAND_SIZE_MAPPINGS)
      .filter(m => m.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { data: mappings, error: null };
  }

  async createBrandSizeMapping(userId: string, mapping: Partial<BrandSizeMapping>): Promise<ApiResponse<BrandSizeMapping>> {
    const newMapping: BrandSizeMapping = {
      id: generateId(),
      user_id: userId,
      brand_name: mapping.brand_name || '',
      size: mapping.size || '',
      size_system: mapping.size_system || 'JP',
      numeric_size: mapping.numeric_size || 0,
      fit_rating: mapping.fit_rating || 3,
      comfort_rating: mapping.comfort_rating || 3,
      notes: mapping.notes || null,
      created_at: now(),
    };

    const mappings = getFromStorage<BrandSizeMapping>(STORAGE_KEYS.BRAND_SIZE_MAPPINGS);
    mappings.push(newMapping);
    saveToStorage(STORAGE_KEYS.BRAND_SIZE_MAPPINGS, mappings);

    return { data: newMapping, error: null };
  }

  async updateBrandSizeMapping(id: string, updates: Partial<BrandSizeMapping>): Promise<ApiResponse<BrandSizeMapping>> {
    const mappings = getFromStorage<BrandSizeMapping>(STORAGE_KEYS.BRAND_SIZE_MAPPINGS);
    const index = mappings.findIndex(m => m.id === id);
    
    if (index === -1) {
      return { data: null, error: new Error('Mapping not found') };
    }

    mappings[index] = { ...mappings[index], ...updates };
    saveToStorage(STORAGE_KEYS.BRAND_SIZE_MAPPINGS, mappings);

    return { data: mappings[index], error: null };
  }

  async deleteBrandSizeMapping(id: string): Promise<ApiResponse<null>> {
    const mappings = getFromStorage<BrandSizeMapping>(STORAGE_KEYS.BRAND_SIZE_MAPPINGS);
    const filtered = mappings.filter(m => m.id !== id);
    saveToStorage(STORAGE_KEYS.BRAND_SIZE_MAPPINGS, filtered);
    return { data: null, error: null };
  }

  // Size Recommendations (モック)
  async getSizeRecommendation(
    productName: string,
    measurements: FootMeasurement[],
    mappings: BrandSizeMapping[]
  ): Promise<ApiResponse<SizeRecommendation>> {
    // モック実装 - 実際はGemini APIを呼び出す
    const activeMeasurement = measurements.find(m => m.is_active);
    const footLength = activeMeasurement ? activeMeasurement.length_mm / 10 : 26;
    
    // 簡易的なサイズ推奨ロジック
    const recommendedSizeNum = Math.round(footLength + 1);
    
    const recommendation: SizeRecommendation = {
      brand_name: productName.split(' ')[0] || 'Unknown',
      model_name: productName,
      recommended_size: `${recommendedSizeNum}cm`,
      confidence_score: mappings.length > 0 ? 85 : 70,
      reasoning: `足長 ${footLength.toFixed(1)}cm を基に、${recommendedSizeNum}cm をお勧めします。${
        mappings.length > 0 
          ? `過去の ${mappings.length} 件のサイズ登録データも参考にしています。` 
          : '他のブランドのサイズ情報を登録すると、より正確な推奨が可能になります。'
      }`,
      alternative_sizes: [
        { size: `${recommendedSizeNum - 0.5}cm`, note: '細身の足の場合' },
        { size: `${recommendedSizeNum + 0.5}cm`, note: '幅広の足の場合' },
      ],
    };

    return { data: recommendation, error: null };
  }

  // Public Profiles (モック)
  async getPublicProfiles(): Promise<ApiResponse<PublicProfile[]>> {
    // デモ用のモックデータ
    const mockProfiles: PublicProfile[] = [
      {
        id: 'demo-user-1',
        display_initial: 'K.T.',
        height_cm: 175,
        weight_kg: 68,
        gender: 'male',
        is_wardrobe_public: true,
        is_styling_public: true,
        wardrobe_count: 15,
        styling_count: 8,
        is_favorited: false,
      },
      {
        id: 'demo-user-2',
        display_initial: 'M.S.',
        height_cm: 162,
        weight_kg: 52,
        gender: 'female',
        is_wardrobe_public: true,
        is_styling_public: false,
        wardrobe_count: 23,
        styling_count: 0,
        is_favorited: false,
      },
    ];
    return { data: mockProfiles, error: null };
  }

  async getPublicProfile(userId: string): Promise<ApiResponse<PublicProfile>> {
    const result = await this.getPublicProfiles();
    const profile = result.data?.find(p => p.id === userId) || null;
    return { data: profile, error: profile ? null : new Error('Profile not found') };
  }

  async getPublicWardrobeItems(userId: string): Promise<ApiResponse<WardrobeItem[]>> {
    return this.getWardrobeItems(userId);
  }

  async getPublicStylingPhotos(userId: string): Promise<ApiResponse<StylingPhoto[]>> {
    return this.getStylingPhotos(userId);
  }

  // Comments
  async getComments(wardrobeUserId: string): Promise<ApiResponse<WardrobeComment[]>> {
    const comments = getFromStorage<WardrobeComment>(STORAGE_KEYS.COMMENTS)
      .filter(c => c.wardrobe_user_id === wardrobeUserId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { data: comments, error: null };
  }

  async createComment(wardrobeUserId: string, commenterId: string, content: string): Promise<ApiResponse<WardrobeComment>> {
    const newComment: WardrobeComment = {
      id: generateId(),
      wardrobe_user_id: wardrobeUserId,
      commenter_id: commenterId,
      content,
      created_at: now(),
      commenter_profile: { display_initial: 'You' },
    };

    const comments = getFromStorage<WardrobeComment>(STORAGE_KEYS.COMMENTS);
    comments.push(newComment);
    saveToStorage(STORAGE_KEYS.COMMENTS, comments);

    return { data: newComment, error: null };
  }

  async deleteComment(id: string): Promise<ApiResponse<null>> {
    const comments = getFromStorage<WardrobeComment>(STORAGE_KEYS.COMMENTS);
    const filtered = comments.filter(c => c.id !== id);
    saveToStorage(STORAGE_KEYS.COMMENTS, filtered);
    return { data: null, error: null };
  }

  // Favorites
  async toggleFavorite(userId: string, favoritedUserId: string): Promise<ApiResponse<boolean>> {
    const key = `${STORAGE_KEYS.FAVORITES}_${userId}`;
    const favorites = getFromStorage<string>(key);
    
    if (favorites.includes(favoritedUserId)) {
      saveToStorage(key, favorites.filter(id => id !== favoritedUserId));
      return { data: false, error: null };
    } else {
      favorites.push(favoritedUserId);
      saveToStorage(key, favorites);
      return { data: true, error: null };
    }
  }

  async isFavorited(userId: string, favoritedUserId: string): Promise<ApiResponse<boolean>> {
    const key = `${STORAGE_KEYS.FAVORITES}_${userId}`;
    const favorites = getFromStorage<string>(key);
    return { data: favorites.includes(favoritedUserId), error: null };
  }

  // Scraping (モック - 将来Gemini API用)
  async scrapeProductUrl(url: string): Promise<ApiResponse<ScrapedProductData>> {
    // モック実装 - 実際はGemini APIでスクレイピング
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

  // Tag Extraction (モック - 将来Gemini API用)
  async extractTagInfo(imageBase64: string): Promise<ApiResponse<TagExtractionResult>> {
    // モック実装 - 実際はGemini Vision APIでタグ解析
    console.log('Extracting tag info from image');
    
    const mockResult: TagExtractionResult = {
      brand: 'Detected Brand',
      size: 'M',
      category: 'トップス',
      materials: '綿 100%',
    };

    return { data: mockResult, error: null };
  }

  // File Upload (モック - Data URL使用)
  async uploadImage(userId: string, file: File, bucket: string): Promise<ApiResponse<string>> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve({ data: dataUrl, error: null });
      };
      reader.onerror = () => {
        resolve({ data: null, error: new Error('Failed to read file') });
      };
      reader.readAsDataURL(file);
    });
  }
}

// デフォルトのAPIクライアントインスタンス
export const apiClient = new MockApiClient();

