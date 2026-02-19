import { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Upload, Tag, Calendar, DollarSign, Ruler, MapPin, FileText, Sparkles, Image as ImageIcon, Check } from 'lucide-react';
import ImageUpload from './ImageUpload';
import { CATEGORIES, CATEGORY_LABELS, CURRENCIES } from '../types';
import type { WardrobeItem, WardrobeItemFormData, SizeDetails } from '../types';
import { removeBgFromImage, blobToFile } from '../utils/backgroundRemoval';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../../contexts/AuthContext';

// スクレイピングで取得するカラー・サイズ情報の型
interface ScrapedColor {
  name: string;
  code?: string;
  image_url?: string;
}

interface ScrapedProductData {
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  price?: string;
  currency?: string;
  available_colors?: ScrapedColor[];
  available_sizes?: string[];
  default_image_url?: string;
  image_urls?: string[]; // 複数画像URL（最大3枚）
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<WardrobeItem>) => Promise<void>;
  editingItem?: WardrobeItem | null;
}

// 今日の日付をYYYY-MM-DD形式で取得
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// 日付をYYYY-MM-DD形式に正規化（ISO形式などにも対応）
const normalizeDate = (date: string | null | undefined): string => {
  if (!date) return getTodayDate();
  // すでにYYYY-MM-DD形式なら変換不要
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  // ISO形式（2026-02-19T00:00:00.000Z）などを変換
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return getTodayDate();
  }
};

export default function AddItemModal({ isOpen, onClose, onSave, editingItem }: AddItemModalProps) {
  const { user } = useAuth();
  const [addMethod, setAddMethod] = useState<'url' | 'manual' | 'tag'>('manual');
  const [loading, setLoading] = useState(false);
  const [removingBackground, setRemovingBackground] = useState(false);
  
  // URL取得後のカラー・サイズ選択ステップ
  const [urlStep, setUrlStep] = useState<'input' | 'select' | 'form'>('input');
  const [scrapedData, setScrapedData] = useState<ScrapedProductData | null>(null);
  const [selectedColor, setSelectedColor] = useState<ScrapedColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  
  const [formData, setFormData] = useState<WardrobeItemFormData>({
    name: editingItem?.name || '',
    brand: editingItem?.brand || '',
    product_number: editingItem?.product_number || '',
    size: editingItem?.size || '',
    model_worn_size: editingItem?.model_worn_size || '',
    measurements: editingItem?.measurements || '',
    color: editingItem?.color || '',
    category: editingItem?.category || 'シューズ',
    purchase_date: normalizeDate(editingItem?.purchase_date),
    purchase_price: editingItem?.purchase_price?.toString() || '',
    currency: editingItem?.currency || 'JPY',
    purchase_location: editingItem?.purchase_location || '',
    source_url: editingItem?.source_url || '',
    notes: editingItem?.notes || '',
  });
  
  const [imageUrl, setImageUrl] = useState<string | null>(editingItem?.image_url || null);
  const [imageUrl2, setImageUrl2] = useState<string | null>(editingItem?.image_url_2 || null);
  const [imageUrl3, setImageUrl3] = useState<string | null>(editingItem?.image_url_3 || null);
  const [sizeDetails, setSizeDetails] = useState<SizeDetails | null>(editingItem?.size_details || null);
  const [pendingImage, setPendingImage] = useState<{ file: File; slot: number } | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // editingItem または isOpen が変わったときにフォームを初期化
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: editingItem?.name || '',
        brand: editingItem?.brand || '',
        product_number: editingItem?.product_number || '',
        size: editingItem?.size || '',
        model_worn_size: editingItem?.model_worn_size || '',
        measurements: editingItem?.measurements || '',
        color: editingItem?.color || '',
        category: editingItem?.category || 'シューズ',
        purchase_date: normalizeDate(editingItem?.purchase_date),
        purchase_price: editingItem?.purchase_price?.toString() || '',
        currency: editingItem?.currency || 'JPY',
        purchase_location: editingItem?.purchase_location || '',
        source_url: editingItem?.source_url || '',
        notes: editingItem?.notes || '',
      });
      setImageUrl(editingItem?.image_url || null);
      setImageUrl2(editingItem?.image_url_2 || null);
      setImageUrl3(editingItem?.image_url_3 || null);
      setSizeDetails(editingItem?.size_details || null);
      setAddMethod('manual');
      setUrlStep('input');
      setScrapedData(null);
    }
  }, [isOpen, editingItem]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSave({
        name: formData.name,
        brand: formData.brand || null,
        product_number: formData.product_number || null,
        size: formData.size || null,
        size_details: sizeDetails,
        model_worn_size: formData.model_worn_size || null,
        measurements: formData.measurements || null,
        color: formData.color || null,
        category: formData.category as WardrobeItem['category'],
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price ? parseInt(formData.purchase_price) : null,
        currency: formData.currency || 'JPY',
        purchase_location: formData.purchase_location || null,
        source_url: formData.source_url || null,
        image_url: imageUrl,
        image_url_2: imageUrl2,
        image_url_3: imageUrl3,
        notes: formData.notes || null,
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFromUrl = async () => {
    if (!formData.source_url) return;
    setLoading(true);
    setScrapeError(null);
    
    try {
      const result = await apiClient.scrapeProductUrl(formData.source_url);
      if (result.data?.data) {
        const data = result.data.data as ScrapedProductData;
        setScrapedData(data);
        
        // カラーまたはサイズの選択肢がある場合は選択ステップへ
        const hasColors = data.available_colors && data.available_colors.length > 0;
        const hasSizes = data.available_sizes && data.available_sizes.length > 0;
        
        if (hasColors || hasSizes) {
          if (hasColors && data.available_colors) {
            setSelectedColor(data.available_colors[0]);
          }
          if (hasSizes && data.available_sizes) {
            setSelectedSize(data.available_sizes[0]);
          }
          setUrlStep('select');
        } else {
          applyScrapedData(data, null, '');
          setUrlStep('form');
        }
      } else {
        setScrapeError('URLから商品情報を取得できませんでした。商品の個別ページのURLを入力してください。');
      }
    } catch (error: unknown) {
      console.error('Error fetching product:', error);
      const msg = error instanceof Error ? error.message : '';
      // ログイン必須ページ・スクレイピング不可サイトの場合
      if (msg.includes('ログインが必要') || msg.includes('member') || msg.includes('orderhistory')) {
        setScrapeError('このページはログインが必要なため取得できません。\n商品の個別ページのURLをご利用ください。\n例: https://zozo.jp/shop/〇〇/goods/12345678/');
      } else if (msg.includes('空レスポンス') || msg.includes('個別ページ')) {
        setScrapeError('このサイトからは商品情報を取得できませんでした。\n商品の個別ページのURLを入力してください。');
      } else {
        setScrapeError('URLから商品情報を取得できませんでした。\nURLを確認してもう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  // スクレイピングデータをフォームに適用
  const applyScrapedData = (data: ScrapedProductData, color: ScrapedColor | null, size: string) => {
    // カテゴリーを正規化（APIから返されたカテゴリーが有効かチェック）
    const validCategories = ['トップス', 'アウター／ジャケット', 'パンツ', 'その他（スーツ／ワンピース等）', 'バッグ', 'シューズ', 'アクセサリー／小物'];
    const normalizedCategory = data.category && validCategories.includes(data.category) 
      ? data.category 
      : formData.category;
    
    setFormData({
      ...formData,
      name: data.name || formData.name,
      brand: data.brand || formData.brand,
      size: size || formData.size,
      color: color?.name || formData.color,
      category: normalizedCategory,
      purchase_price: data.price || formData.purchase_price,
      currency: data.currency || formData.currency,
      notes: data.description || formData.notes,
    });
    
    // 画像URLを設定（最大3枚）
    if (data.image_urls && data.image_urls.length > 0) {
      // カラー選択がある場合はそのカラーの画像を優先
      if (color?.image_url) {
        setImageUrl(color.image_url);
        // 残りの画像をimage_urlsから設定
        const remainingImages = data.image_urls.filter(url => url !== color.image_url);
        if (remainingImages[0]) setImageUrl2(remainingImages[0]);
        if (remainingImages[1]) setImageUrl3(remainingImages[1]);
      } else {
        // image_urls配列から3枚設定
        if (data.image_urls[0]) setImageUrl(data.image_urls[0]);
        if (data.image_urls[1]) setImageUrl2(data.image_urls[1]);
        if (data.image_urls[2]) setImageUrl3(data.image_urls[2]);
      }
    } else if (color?.image_url) {
      setImageUrl(color.image_url);
    } else if (data.default_image_url) {
      setImageUrl(data.default_image_url);
    }
  };

  // カラー・サイズ選択を確定してフォームへ
  const handleConfirmSelection = () => {
    if (scrapedData) {
      applyScrapedData(scrapedData, selectedColor, selectedSize);
      setUrlStep('form');
    }
  };

  const handleTagImageUpload = async (file: File) => {
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await apiClient.extractTagInfo(base64);
        if (result.data) {
          setFormData({
            ...formData,
            name: result.data.name || formData.name,
            brand: result.data.brand || formData.brand,
            size: result.data.size || formData.size,
            color: result.data.color || formData.color,
            category: result.data.category || formData.category,
            notes: result.data.materials 
              ? `素材: ${result.data.materials}\n${result.data.care_instructions || ''}\n${formData.notes}`
              : formData.notes,
          });
          if (result.data.size_details) setSizeDetails(result.data.size_details);
          alert('タグ情報を読み取りました。内容を確認して保存してください。');
        }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error extracting tag info:', error);
      alert('タグ情報の読み取りに失敗しました');
      setLoading(false);
    }
  };

  const handleImageSelect = (file: File, slot: number) => {
    const objectUrl = URL.createObjectURL(file);
    if (slot === 1) setImageUrl(objectUrl);
    else if (slot === 2) setImageUrl2(objectUrl);
    else if (slot === 3) setImageUrl3(objectUrl);
    setPendingImage({ file, slot });
  };

  const handleConfirmImage = async () => {
    if (!pendingImage) return;
    
    try {
      const result = await apiClient.uploadImage(user?.id || 'anonymous', pendingImage.file, 'wardrobe-images');
      if (result.data) {
        if (pendingImage.slot === 1) setImageUrl(result.data);
        else if (pendingImage.slot === 2) setImageUrl2(result.data);
        else if (pendingImage.slot === 3) setImageUrl3(result.data);
      }
      setPendingImage(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('画像のアップロードに失敗しました');
    }
  };

  const handleRemoveBackground = async () => {
    if (!pendingImage) return;
    
    setRemovingBackground(true);
    try {
      const blob = await removeBgFromImage(pendingImage.file);
      const newFile = blobToFile(blob, `bg-removed-${pendingImage.file.name}`);
      const result = await apiClient.uploadImage(user?.id || 'anonymous', newFile, 'wardrobe-images');
      if (result.data) {
        if (pendingImage.slot === 1) setImageUrl(result.data);
        else if (pendingImage.slot === 2) setImageUrl2(result.data);
        else if (pendingImage.slot === 3) setImageUrl3(result.data);
      }
      setPendingImage(null);
    } catch (error) {
      console.error('Error removing background:', error);
      alert('背景削除に失敗しました');
      await handleConfirmImage();
    } finally {
      setRemovingBackground(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl tracking-wider font-light">
            {editingItem ? 'EDIT ITEM' : 'ADD ITEM'}
            <span className="text-sm text-gray-400 font-normal ml-2">{editingItem ? '/ 編集' : '/ 追加'}</span>
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {!editingItem && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => setAddMethod('manual')}
                className={`px-4 py-3 border transition ${
                  addMethod === 'manual' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                MANUAL <span className="text-xs opacity-70">/ 手動</span>
              </button>
              <button
                onClick={() => setAddMethod('url')}
                className={`px-4 py-3 border transition ${
                  addMethod === 'url' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                FROM URL <span className="text-xs opacity-70">/ URL</span>
              </button>
              <button
                onClick={() => setAddMethod('tag')}
                className={`px-4 py-3 border transition ${
                  addMethod === 'tag' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                FROM TAG <span className="text-xs opacity-70">/ タグ</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {addMethod === 'url' && !editingItem && urlStep === 'input' && (
              <div>
                <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                  <LinkIcon className="w-4 h-4" />
                  商品URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.source_url}
                    onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                    placeholder="https://example.com/product/..."
                  />
                  <button
                    type="button"
                    onClick={handleFetchFromUrl}
                    disabled={loading || !formData.source_url}
                    className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 transition disabled:bg-gray-400"
                  >
                    {loading ? '取得中...' : '取得'}
                  </button>
                </div>
                {/* スクレイピングエラー表示 */}
                {scrapeError && (
                  <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-700 font-medium mb-1">⚠️ 商品情報を取得できませんでした</p>
                    {scrapeError.split('\n').map((line, i) => (
                      <p key={i} className="text-sm text-red-600">{line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* カラー・サイズ選択ステップ */}
            {addMethod === 'url' && !editingItem && urlStep === 'select' && scrapedData && (
              <div className="space-y-6">
                {/* 商品プレビュー */}
                <div className="p-4 bg-gray-50 border border-gray-200">
                  <h3 className="font-medium mb-2">{scrapedData.name}</h3>
                  {scrapedData.brand && <p className="text-sm text-gray-600">{scrapedData.brand}</p>}
                  {scrapedData.price && <p className="text-sm text-gray-900 font-medium mt-1">{scrapedData.currency} {scrapedData.price}</p>}
                </div>

                {/* カラー選択 */}
                {scrapedData.available_colors && scrapedData.available_colors.length > 0 && (
                  <div>
                    <label className="text-sm tracking-wider mb-3 block font-medium">
                      カラーを選択 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {scrapedData.available_colors.map((color, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`relative p-3 border-2 transition ${
                            selectedColor?.name === color.name
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {color.image_url && (
                            <div className="w-full aspect-square mb-2 bg-white">
                              <img
                                src={color.image_url}
                                alt={color.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            {color.code && (
                              <span
                                className="w-4 h-4 rounded-full border border-gray-300"
                                style={{ backgroundColor: color.code }}
                              />
                            )}
                            <span className="text-sm">{color.name}</span>
                          </div>
                          {selectedColor?.name === color.name && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* サイズ選択 */}
                {scrapedData.available_sizes && scrapedData.available_sizes.length > 0 && (
                  <div>
                    <label className="text-sm tracking-wider mb-3 block font-medium">
                      サイズを選択 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {scrapedData.available_sizes.map((size, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`px-4 py-2 border-2 transition ${
                            selectedSize === size
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 選択プレビュー */}
                {selectedColor?.image_url && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">選択した商品:</p>
                    <div className="w-48 aspect-square border border-gray-200 bg-white">
                      <img
                        src={selectedColor.image_url}
                        alt={selectedColor.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* 確定ボタン */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUrlStep('input');
                      setScrapedData(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 hover:bg-gray-50 transition"
                  >
                    BACK
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSelection}
                    className="flex-1 px-4 py-3 bg-gray-900 text-white hover:bg-gray-800 transition"
                  >
                    CONFIRM & ADD
                  </button>
                </div>
              </div>
            )}

            {addMethod === 'tag' && !editingItem && (
              <div className="border-2 border-dashed border-gray-300 p-6">
                <label className="flex flex-col items-center gap-3 cursor-pointer">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                  <span className="text-sm text-gray-600">UPLOAD TAG IMAGE <span className="text-xs text-gray-400">/ タグ画像をアップロード</span></span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleTagImageUpload(file);
                    }}
                    className="hidden"
                  />
                  <button type="button" className="px-6 py-2 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition">
                    SELECT IMAGE
                  </button>
                </label>
                {loading && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">画像を解析中...</p>
                  </div>
                )}
              </div>
            )}

            {/* カラー・サイズ選択中はフォームを非表示 */}
            {!(addMethod === 'url' && urlStep === 'select') && (
              <>
            {/* 画像アップロード */}
            <div>
              <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                <Upload className="w-4 h-4" />
                IMAGES <span className="text-gray-400 font-normal text-xs">/ 商品画像（最大3枚）</span>
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { url: imageUrl, setUrl: setImageUrl, slot: 1, label: 'メイン' },
                  { url: imageUrl2, setUrl: setImageUrl2, slot: 2, label: '画像2' },
                  { url: imageUrl3, setUrl: setImageUrl3, slot: 3, label: '画像3' },
                ].map(({ url, setUrl, slot, label }) => (
                  <div key={slot}>
                    <p className="text-xs text-gray-500 mb-2">{label}</p>
                    {url ? (
                      <div className="relative w-full aspect-square border border-gray-200">
                        <img src={url} alt={`商品画像${slot}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setUrl(null)}
                          className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-lg hover:bg-gray-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <ImageUpload onImageSelect={(file) => handleImageSelect(file, slot)} currentImage={null} />
                    )}
                  </div>
                ))}
              </div>

              {pendingImage && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm mb-3 text-gray-700">画像を選択しました。背景を削除しますか？</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleConfirmImage}
                      disabled={loading || removingBackground}
                      className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-100 transition"
                    >
                      UPLOAD AS IS
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveBackground}
                      disabled={loading || removingBackground}
                      className="flex-1 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {removingBackground ? 'PROCESSING...' : 'REMOVE BG'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* フォームフィールド */}
            <div>
              <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                <Tag className="w-4 h-4" />
                NAME <span className="text-gray-400 font-normal">/ 商品名</span> <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                placeholder="例: Air Jordan 1 High"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm tracking-wider mb-2 block">BRAND <span className="text-gray-400 font-normal text-xs">/ ブランド</span></label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="例: Nike"
                />
              </div>
              <div>
                <label className="text-sm tracking-wider mb-2 block">PRODUCT NO. <span className="text-gray-400 font-normal text-xs">/ 商品番号</span></label>
                <input
                  type="text"
                  value={formData.product_number}
                  onChange={(e) => setFormData({ ...formData, product_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="例: DZ5485-010"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                  <Ruler className="w-4 h-4" />
                  SIZE <span className="text-gray-400 font-normal text-xs">/ サイズ</span>
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="例: 27.5cm"
                />
              </div>
              <div>
                <label className="text-sm tracking-wider mb-2 block">MODEL SIZE <span className="text-gray-400 font-normal text-xs">/ モデル着用サイズ</span></label>
                <input
                  type="text"
                  value={formData.model_worn_size}
                  onChange={(e) => setFormData({ ...formData, model_worn_size: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="例: 身長180cm, Mサイズ着用"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                <Ruler className="w-4 h-4" />
                  MEASUREMENTS <span className="text-gray-400 font-normal text-xs">/ 採寸情報</span>
                </label>
              <textarea
                value={formData.measurements}
                onChange={(e) => setFormData({ ...formData, measurements: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 min-h-[80px]"
                placeholder="例: 着丈72cm, 身幅52cm, 袖丈62cm, 肩幅46cm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm tracking-wider mb-2 block">COLOR <span className="text-gray-400 font-normal text-xs">/ カラー</span></label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="例: Black/White"
                />
              </div>
              <div>
                <label className="text-sm tracking-wider mb-2 block">CATEGORY <span className="text-gray-400 font-normal text-xs">/ カテゴリー</span></label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                >
                  {CATEGORIES.slice(1).map(category => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                  <Calendar className="w-4 h-4" />
                  PURCHASE DATE <span className="text-gray-400 font-normal text-xs">/ 購入日</span>
                </label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                  <DollarSign className="w-4 h-4" />
                  CURRENCY <span className="text-gray-400 font-normal text-xs">/ 通貨</span>
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                <DollarSign className="w-4 h-4" />
                  PRICE <span className="text-gray-400 font-normal text-xs">/ 購入価格</span>
              </label>
              <input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                placeholder="15000"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                <MapPin className="w-4 h-4" />
                  STORE <span className="text-gray-400 font-normal text-xs">/ 購入場所</span>
              </label>
              <input
                type="text"
                value={formData.purchase_location}
                onChange={(e) => setFormData({ ...formData, purchase_location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                placeholder="例: Nike Store Tokyo"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                <FileText className="w-4 h-4" />
                  NOTES <span className="text-gray-400 font-normal text-xs">/ 商品の詳細</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 min-h-[100px]"
                placeholder="このアイテムについての詳細情報..."
              />
            </div>

            <button
              type="submit"
              disabled={loading || !formData.name}
              className="w-full px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 transition disabled:bg-gray-400"
            >
              {loading ? 'SAVING...' : editingItem ? 'UPDATE' : 'ADD'}
            </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

