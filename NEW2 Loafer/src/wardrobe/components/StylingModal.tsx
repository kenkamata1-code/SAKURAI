import { useState, useEffect } from 'react';
import { X, Upload, Tag } from 'lucide-react';
import ImageUpload from './ImageUpload';
import type { StylingPhoto, WardrobeItem } from '../types';

interface StylingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    image_url: string;
    title?: string;
    notes?: string;
  }, selectedItemIds: string[]) => Promise<void>;
  items: WardrobeItem[];
  editingPhoto?: StylingPhoto | null;
  onImageSelect: (file: File) => Promise<string | null>;
  loading: boolean;
}

export default function StylingModal({
  isOpen,
  onClose,
  onSave,
  items,
  editingPhoto,
  onImageSelect,
  loading,
}: StylingModalProps) {
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // 編集モード時にデータをセット
  useEffect(() => {
    if (editingPhoto) {
      setImage(editingPhoto.image_url);
      setTitle(editingPhoto.title || '');
      setNotes(editingPhoto.notes || '');
      setSelectedItemIds(editingPhoto.worn_items?.map(wi => wi.user_shoe_id) || []);
    } else {
      resetForm();
    }
  }, [editingPhoto, isOpen]);

  const resetForm = () => {
    setImage(null);
    setTitle('');
    setNotes('');
    setSelectedItemIds([]);
  };

  const handleImageSelect = async (file: File) => {
    setUploading(true);
    try {
      // ローカルプレビュー
      const previewUrl = URL.createObjectURL(file);
      setImage(previewUrl);

      // S3にアップロード
      const uploadedUrl = await onImageSelect(file);
      if (uploadedUrl) {
        setImage(uploadedUrl);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!image) return;

    await onSave({
      image_url: image,
      title: title || undefined,
      notes: notes || undefined,
    }, selectedItemIds);

    resetForm();
    onClose();
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // アクティブなアイテムのみ
  const activeItems = items.filter(i => !i.is_discarded && !i.is_sold);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl tracking-wider font-light">
            {editingPhoto ? 'スタイリング写真を編集' : 'スタイリング写真を追加'} / {editingPhoto ? 'Edit Styling Photo' : 'Add Styling Photo'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 画像アップロード */}
          <div>
            {image ? (
              <div className="relative w-full max-w-md mx-auto">
                <img src={image} alt="Styling" className="w-full aspect-[3/4] object-cover border border-gray-200" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 p-8">
                <ImageUpload onImageSelect={handleImageSelect} currentImage={null} />
                <p className="text-center text-gray-400 text-sm mt-2">Click or drag & drop to upload</p>
              </div>
            )}
            {uploading && <p className="text-sm text-gray-500 mt-2 text-center">アップロード中...</p>}
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm tracking-wider mb-2">タイトル / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900"
              placeholder="例: カジュアルコーデ"
            />
          </div>

          {/* 着用アイテム選択 */}
          {activeItems.length > 0 && (
            <div>
              <label className="block text-sm tracking-wider mb-1">着用アイテム（複数選択可） / Worn Items (Multiple Selection)</label>
              <p className="text-xs text-gray-500 mb-3">この写真で着用しているアイテムを選択してください / Select items worn in this photo</p>
              <div className="border border-gray-200 max-h-64 overflow-y-auto">
                {activeItems.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-4 p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition ${
                      selectedItemIds.includes(item.id) ? 'bg-gray-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="w-5 h-5 border-gray-300 rounded"
                    />
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-14 h-14 object-cover" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 flex items-center justify-center">
                        <Tag className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.brand && `${item.brand} • `}{item.category || 'シューズ'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* メモ */}
          <div>
            <label className="block text-sm tracking-wider mb-2">メモ / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900 min-h-[120px] resize-y"
              placeholder="コーディネートの詳細など... / Details about the styling..."
            />
          </div>
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={loading || uploading || !image}
            className="w-full px-6 py-4 bg-gray-900 text-white hover:bg-gray-800 transition disabled:bg-gray-400 text-sm tracking-wider"
          >
            {loading ? '保存中...' : editingPhoto ? '更新 / Update' : '追加 / Add'}
          </button>
        </div>
      </div>
    </div>
  );
}


