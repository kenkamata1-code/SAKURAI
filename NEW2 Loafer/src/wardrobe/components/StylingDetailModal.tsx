import { X, Edit2, Trash2, Tag, Calendar } from 'lucide-react';
import type { StylingPhoto, WardrobeItem } from '../types';

interface StylingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: StylingPhoto | null;
  items: WardrobeItem[];
  onEdit: () => void;
  onDelete: () => void;
}

export default function StylingDetailModal({
  isOpen,
  onClose,
  photo,
  items,
  onEdit,
  onDelete,
}: StylingDetailModalProps) {
  if (!isOpen || !photo) return null;

  // 着用アイテムを取得
  const wornItems = photo.worn_items?.map(wi => {
    return items.find(item => item.id === wi.user_shoe_id) || wi.user_shoes;
  }).filter(Boolean) || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl tracking-wider font-light">
            スタイリング詳細 / Styling Detail
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 transition text-sm"
            >
              <Edit2 className="w-4 h-4" />
              編集
            </button>
            <button
              onClick={() => {
                if (confirm('このスタイリング写真を削除しますか？')) {
                  onDelete();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 transition text-sm"
            >
              <Trash2 className="w-4 h-4" />
              削除
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 ml-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* 画像 */}
          <div className="bg-gray-100">
            <img
              src={photo.image_url}
              alt={photo.title || 'Styling photo'}
              className="w-full h-full object-cover"
              style={{ maxHeight: '600px' }}
            />
          </div>

          {/* 詳細情報 */}
          <div className="p-6 space-y-6">
            {/* タイトル */}
            <div>
              <h3 className="text-2xl font-light tracking-wider">
                {photo.title || 'Untitled'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                <Calendar className="w-4 h-4" />
                {formatDate(photo.created_at)}
              </div>
            </div>

            {/* メモ */}
            {photo.notes && (
              <div>
                <p className="text-xs text-gray-500 tracking-wider mb-2">メモ / Notes</p>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {photo.notes}
                </p>
              </div>
            )}

            {/* 着用アイテム */}
            <div>
              <p className="text-xs text-gray-500 tracking-wider mb-3">
                着用アイテム / Worn Items ({wornItems.length})
              </p>
              
              {wornItems.length === 0 ? (
                <p className="text-gray-400 text-sm">アイテムが登録されていません</p>
              ) : (
                <div className="space-y-2">
                  {wornItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-gray-200">
                      {item?.image_url ? (
                        <img src={item.image_url} alt="" className="w-12 h-12 object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 flex items-center justify-center">
                          <Tag className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item?.name || 'Unknown Item'}</p>
                        <p className="text-xs text-gray-500">
                          {item?.brand && `${item.brand} • `}{item?.category || ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


