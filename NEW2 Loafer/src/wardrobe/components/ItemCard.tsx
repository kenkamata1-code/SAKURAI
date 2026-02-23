import { useState } from 'react';
import { Edit, Trash2, Archive, ArchiveRestore, DollarSign, Image as ImageIcon } from 'lucide-react';
import type { WardrobeItem } from '../types';

interface ItemCardProps {
  item: WardrobeItem;
  onEdit: (item: WardrobeItem) => void;
  onDelete: (id: string) => void;
  onDiscard: (id: string) => void;
  onRestore: (id: string) => void;
  onSell?: (item: WardrobeItem) => void;
}

export default function ItemCard({ 
  item, 
  onEdit, 
  onDelete, 
  onDiscard, 
  onRestore, 
  onSell 
}: ItemCardProps) {
  const images = [item.image_url, item.image_url_2, item.image_url_3].filter(Boolean) as string[];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const isInactive = item.is_discarded || item.is_sold;

  return (
    <div className={`border border-gray-200 overflow-hidden group ${isInactive ? 'opacity-50' : ''}`}>
      {images.length > 0 ? (
        <div className="aspect-square bg-gray-100 relative">
          <img
            src={images[currentImageIndex]}
            alt={`${item.name} - ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />
          {images.length > 1 && (
            <>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={`w-2 h-2 rounded-full transition ${
                      idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
              {currentImageIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(currentImageIndex - 1);
                  }}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {currentImageIndex < images.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(currentImageIndex + 1);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="aspect-square bg-gray-100 flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-gray-400" />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-medium tracking-wide mb-1">{item.name}</h3>
            {item.brand && (
              <p className="text-sm text-gray-600">{item.brand}</p>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end">
            {/* 着用シーンバッジ */}
            {item.wear_scene && (
              <span className={`text-[10px] px-2 py-0.5 border tracking-wider ${
                item.wear_scene === 'casual'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : item.wear_scene === 'formal'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}>
                {item.wear_scene === 'casual' ? 'CASUAL' : item.wear_scene === 'formal' ? 'FORMAL' : 'BOTH'}
              </span>
            )}
            {item.is_from_shop && (
              <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 tracking-wider">
                PURCHASED
              </span>
            )}
            {item.is_sold && (
              <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 border border-green-200 tracking-wider">
                SOLD
              </span>
            )}
          </div>
        </div>
        
        <div className="space-y-1 text-sm text-gray-600 mb-4">
          {item.size && <p><span className="text-xs tracking-wider text-gray-400">SIZE</span> {item.size}</p>}
          {item.color && <p><span className="text-xs tracking-wider text-gray-400">COLOR</span> {item.color}</p>}
          {item.purchase_date && (
            <p><span className="text-xs tracking-wider text-gray-400">DATE</span> {new Date(item.purchase_date).toLocaleDateString('ja-JP')}</p>
          )}
        </div>
        
        {item.is_discarded && item.discarded_at && (
          <div className="mb-3 px-3 py-2 bg-gray-100 text-xs text-gray-600">
            <p><span className="text-xs tracking-wider text-gray-500">DISCARDED</span> {new Date(item.discarded_at).toLocaleDateString('ja-JP')}</p>
          </div>
        )}
        
        {item.is_sold && item.sold_date && (
          <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 text-xs text-gray-700">
            <p className="font-medium mb-1 tracking-wider">SOLD INFO <span className="font-normal text-gray-500 text-xs">/ 売却情報</span></p>
            <p><span className="text-xs text-gray-500">DATE</span> {new Date(item.sold_date).toLocaleDateString('ja-JP')}</p>
            {item.sold_price && (
              <p><span className="text-xs text-gray-500">PRICE</span> {item.sold_currency === 'JPY' ? '¥' : item.sold_currency}{item.sold_price.toLocaleString()}</p>
            )}
            {item.sold_location && <p><span className="text-xs text-gray-500">SOLD AT</span> {item.sold_location}</p>}
            {item.purchase_price && item.sold_price && (
              <p className={`font-medium ${item.sold_price > item.purchase_price ? 'text-green-600' : 'text-red-600'}`}>
                <span className="text-xs">P&L</span> {item.sold_currency === 'JPY' ? '¥' : item.sold_currency}
                {(item.sold_price - item.purchase_price).toLocaleString()}
              </p>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          {!item.is_discarded && !item.is_sold ? (
            <>
              <button
                onClick={() => onEdit(item)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                EDIT
              </button>
              <button
                onClick={() => onSell?.(item)}
                className="px-4 py-2 text-sm border border-green-600 text-green-600 hover:bg-green-50 transition flex items-center gap-2"
                title="売却"
              >
                <DollarSign className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDiscard(item.id)}
                className="px-4 py-2 text-sm border border-gray-400 text-gray-600 hover:bg-gray-50 transition flex items-center gap-2"
                title="廃棄（保持）"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm('このアイテムを完全に削除しますか？この操作は取り消せません。')) {
                    onDelete(item.id);
                  }
                }}
                className="px-4 py-2 text-sm border border-red-300 text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                title="完全に削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(item)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                EDIT
              </button>
              {item.is_discarded && (
                <button
                  onClick={() => onRestore(item.id)}
                  className="px-4 py-2 text-sm border border-green-600 text-green-600 hover:bg-green-50 transition flex items-center gap-2"
                  title="復元"
                >
                  <ArchiveRestore className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm('このアイテムを完全に削除しますか？この操作は取り消せません。')) {
                    onDelete(item.id);
                  }
                }}
                className="px-4 py-2 text-sm border border-red-300 text-red-600 hover:bg-red-50 transition"
                title="完全に削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

