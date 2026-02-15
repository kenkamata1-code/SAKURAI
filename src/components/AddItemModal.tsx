import { useState } from 'react';
import { X, Link as LinkIcon, Upload, Tag, Calendar, DollarSign, Ruler, MapPin, FileText, Sparkles, Image as ImageIcon } from 'lucide-react';
import ImageUpload from './ImageUpload';
import { CATEGORIES, CATEGORY_LABELS, CURRENCIES } from '../types';
import type { WardrobeItem, WardrobeItemFormData, SizeDetails } from '../types';
import { removeBgFromImage, blobToFile } from '../utils/backgroundRemoval';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<WardrobeItem>) => Promise<void>;
  editingItem?: WardrobeItem | null;
}

export default function AddItemModal({ isOpen, onClose, onSave, editingItem }: AddItemModalProps) {
  const { user } = useAuth();
  const [addMethod, setAddMethod] = useState<'url' | 'manual' | 'tag'>('manual');
  const [loading, setLoading] = useState(false);
  const [removingBackground, setRemovingBackground] = useState(false);
  
  const [formData, setFormData] = useState<WardrobeItemFormData>({
    name: editingItem?.name || '',
    brand: editingItem?.brand || '',
    size: editingItem?.size || '',
    color: editingItem?.color || '',
    category: editingItem?.category || 'シューズ',
    purchase_date: editingItem?.purchase_date || '',
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSave({
        name: formData.name,
        brand: formData.brand || null,
        size: formData.size || null,
        size_details: sizeDetails,
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
    
    try {
      const result = await apiClient.scrapeProductUrl(formData.source_url);
      if (result.data) {
        setFormData({
          ...formData,
          name: result.data.name || formData.name,
          brand: result.data.brand || formData.brand,
          size: result.data.size || formData.size,
          color: result.data.color || formData.color,
          purchase_price: result.data.price || formData.purchase_price,
          currency: result.data.currency || formData.currency,
          notes: result.data.description || formData.notes,
        });
        if (result.data.image_url) setImageUrl(result.data.image_url);
        if (result.data.image_url_2) setImageUrl2(result.data.image_url_2);
        if (result.data.image_url_3) setImageUrl3(result.data.image_url_3);
        if (result.data.size_details) setSizeDetails(result.data.size_details);
        alert('商品情報を取得しました。内容を確認して保存してください。');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('URLから商品情報を取得できませんでした');
    } finally {
      setLoading(false);
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
            {editingItem ? 'アイテムを編集' : 'アイテムを追加'}
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
                手動で追加
              </button>
              <button
                onClick={() => setAddMethod('url')}
                className={`px-4 py-3 border transition ${
                  addMethod === 'url' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                URLから追加
              </button>
              <button
                onClick={() => setAddMethod('tag')}
                className={`px-4 py-3 border transition ${
                  addMethod === 'tag' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                タグから追加
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {addMethod === 'url' && !editingItem && (
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
                    取得
                  </button>
                </div>
              </div>
            )}

            {addMethod === 'tag' && !editingItem && (
              <div className="border-2 border-dashed border-gray-300 p-6">
                <label className="flex flex-col items-center gap-3 cursor-pointer">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                  <span className="text-sm text-gray-600">タグ画像をアップロード</span>
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
                    画像を選択
                  </button>
                </label>
                {loading && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">画像を解析中...</p>
                  </div>
                )}
              </div>
            )}

            {/* 画像アップロード */}
            <div>
              <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                <Upload className="w-4 h-4" />
                商品画像（最大3枚）
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
                      そのままアップロード
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveBackground}
                      disabled={loading || removingBackground}
                      className="flex-1 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {removingBackground ? '処理中...' : '背景を削除'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* フォームフィールド */}
            <div>
              <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                <Tag className="w-4 h-4" />
                商品名 <span className="text-red-500">*</span>
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
                <label className="text-sm tracking-wider mb-2 block">ブランド</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="例: Nike"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                  <Ruler className="w-4 h-4" />
                  サイズ
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="例: 27.5cm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm tracking-wider mb-2 block">カラー</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="例: Black/White"
                />
              </div>
              <div>
                <label className="text-sm tracking-wider mb-2 block">カテゴリー</label>
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
                  購入日
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
                  通貨
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
                購入価格
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
                購入場所
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
                商品の詳細
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
              {loading ? '保存中...' : editingItem ? '更新' : '追加'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

