import { useEffect, useState, useCallback } from 'react';
import { Plus, Package, Image as ImageIcon, BarChart3, Bot, Footprints, BookOpen, Sparkles, Download, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWardrobeStore, useStylingStore, useUIStore } from './lib/store';
import { CATEGORIES, CATEGORY_LABELS } from './types';
import type { WardrobeItem } from './types';
import ItemCard from './components/ItemCard';
import AddItemModal from './components/AddItemModal';
import { KPICard, BarChart, PieChart, TimeRangeSelector, AIInsightCard, type TimeRange } from './components/dashboard';
import { exportToExcel } from './utils/excel';

export default function WardrobePage() {
  const { user } = useAuth();
  const { 
    items, 
    loading, 
    fetchItems, 
    addItem, 
    updateItem, 
    deleteItem, 
    discardItem, 
    restoreItem,
    sellItem,
    selectedCategory,
    setSelectedCategory,
  } = useWardrobeStore();
  
  const { photos, fetchPhotos } = useStylingStore();
  
  const {
    viewMode,
    setViewMode,
    dashboardSubTab,
    setDashboardSubTab,
    showAddModal,
    setShowAddModal,
  } = useUIStore();

  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [sellingItem, setSellingItem] = useState<WardrobeItem | null>(null);
  const [categoryRange, setCategoryRange] = useState<TimeRange>('1M');
  const [brandRange, setBrandRange] = useState<TimeRange>('1M');

  useEffect(() => {
    if (user) {
      fetchItems(user.id);
      fetchPhotos(user.id);
    }
  }, [user, fetchItems, fetchPhotos]);

  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter(item => item.category === selectedCategory);

  const getCategoryCount = (category: string) => {
    if (category === 'All') return items.length;
    return items.filter(item => item.category === category).length;
  };

  const handleSaveItem = useCallback(async (itemData: Partial<WardrobeItem>) => {
    if (!user) return;
    
    if (editingItem) {
      await updateItem(editingItem.id, itemData);
    } else {
      await addItem(user.id, itemData);
    }
    setEditingItem(null);
    setShowAddModal(false);
  }, [user, editingItem, updateItem, addItem, setShowAddModal]);

  const handleEdit = (item: WardrobeItem) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このアイテムを削除しますか？')) return;
    await deleteItem(id);
  };

  const handleDiscard = async (id: string) => {
    if (!confirm('このアイテムを廃棄しますか？')) return;
    await discardItem(id);
  };

  const handleRestore = async (id: string) => {
    await restoreItem(id);
  };

  const handleSell = (item: WardrobeItem) => {
    setSellingItem(item);
  };

  const handleExport = () => {
    exportToExcel(filteredItems, selectedCategory);
  };

  // ダッシュボード用データ計算
  const getDateRangeData = (range: TimeRange) => {
    const now = new Date();
    const rangeMonths = range === 'ALL' ? 999 : 
                       range.endsWith('M') ? parseInt(range) :
                       range.endsWith('Y') ? parseInt(range) * 12 : 12;
    const startDate = new Date(now.getFullYear(), now.getMonth() - rangeMonths, 1);
    return items.filter(item => {
      const purchaseDate = new Date(item.purchase_date || '');
      return purchaseDate >= startDate && (item.purchase_price || 0) > 0;
    });
  };

  const getCurrentMonthSpending = () => {
    const now = new Date();
    return items
      .filter(item => {
        if (!item.purchase_date) return false;
        const date = new Date(item.purchase_date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, item) => sum + (item.purchase_price || 0), 0);
  };

  const getMonthlyTrend = () => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
      const spending = items
        .filter(item => {
          if (!item.purchase_date) return false;
          const purchaseDate = new Date(item.purchase_date);
          return purchaseDate.getMonth() === date.getMonth() && purchaseDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, item) => sum + (item.purchase_price || 0), 0);
      months.push({ label: monthStr, value: spending });
    }
    return months;
  };

  const getCategoryBreakdown = (range: TimeRange) => {
    const rangeData = getDateRangeData(range);
    const categoryMap = new Map<string, number>();
    rangeData.forEach(item => {
      const category = item.category || 'Other';
      categoryMap.set(category, (categoryMap.get(category) || 0) + (item.purchase_price || 0));
    });
    return Array.from(categoryMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };

  const getBrandBreakdown = (range: TimeRange) => {
    const rangeData = getDateRangeData(range);
    const brandMap = new Map<string, number>();
    rangeData.forEach(item => {
      const brand = item.brand || 'Unknown';
      brandMap.set(brand, (brandMap.get(brand) || 0) + (item.purchase_price || 0));
    });
    return Array.from(brandMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-8 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-8 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl tracking-wider font-light mb-4">WARDROBE</h1>
          <p className="text-gray-600 tracking-wide">ワードローブ管理 / Wardrobe Management</p>
        </div>

        {/* タブナビゲーション */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { key: 'items', icon: Package, label: 'アイテム' },
              { key: 'styling', icon: ImageIcon, label: 'スタイリング' },
              { key: 'dashboard', icon: BarChart3, label: 'ダッシュボード' },
              { key: 'ai-assistant', icon: Bot, label: 'AI ASSISTANT' },
              { key: 'foot-scan', icon: Footprints, label: '足の測定' },
              { key: 'size-mapping', icon: BookOpen, label: 'ブランド別サイズ' },
              { key: 'size-recommend', icon: Sparkles, label: 'サイズ推奨' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as typeof viewMode)}
                className={`pb-4 border-b-2 transition whitespace-nowrap ${
                  viewMode === key
                    ? 'border-gray-900 text-gray-900 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2 text-sm tracking-wider">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* アクションボタン */}
        {viewMode === 'items' && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => {
                setEditingItem(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 transition"
            >
              <Plus className="w-5 h-5" />
              アイテムを追加
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition"
              disabled={filteredItems.length === 0}
            >
              <Download className="w-5 h-5" />
              エクスポート
            </button>
          </div>
        )}

        {/* アイテムビュー */}
        {viewMode === 'items' && (
          <div className="mb-16">
            <h2 className="text-2xl tracking-wider font-light mb-6">マイアイテム</h2>
            
            {/* カテゴリータブ */}
            <div className="mb-6 border-b border-gray-200 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-3 text-sm whitespace-nowrap transition ${
                      selectedCategory === category
                        ? 'border-b-2 border-gray-900 text-gray-900 font-medium'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {CATEGORY_LABELS[category]} ({getCategoryCount(category)})
                  </button>
                ))}
              </div>
            </div>

            {/* アイテムグリッド */}
            {items.length === 0 ? (
              <div className="text-center py-12 border border-gray-200">
                <p className="text-gray-500">アイテムが登録されていません</p>
                <p className="text-sm text-gray-400 mt-2">「アイテムを追加」ボタンから登録してください</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 border border-gray-200">
                <p className="text-gray-500">このカテゴリーにアイテムがありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDiscard={handleDiscard}
                    onRestore={handleRestore}
                    onSell={handleSell}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* スタイリングビュー */}
        {viewMode === 'styling' && (
          <div>
            <h2 className="text-2xl tracking-wider font-light mb-6">スタイリング写真</h2>
            {photos.length === 0 ? (
              <div className="text-center py-12 border border-gray-200">
                <p className="text-gray-500">スタイリング写真が登録されていません</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative bg-gray-100 overflow-hidden border border-gray-200">
                    <div className="aspect-square">
                      <img
                        src={photo.image_url}
                        alt={photo.title || 'Styling photo'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {photo.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 text-white p-2 text-xs">
                        {photo.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ダッシュボードビュー */}
        {viewMode === 'dashboard' && (
          <div className="space-y-8">
            <div className="mb-8 border-b border-gray-200">
              <div className="flex gap-6">
                {['expense', 'sell', 'portfolio'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDashboardSubTab(tab as typeof dashboardSubTab)}
                    className={`pb-4 border-b-2 transition ${
                      dashboardSubTab === tab
                        ? 'border-gray-900 text-gray-900 font-medium'
                        : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-sm tracking-wider">
                      {tab === 'expense' && '出費管理'}
                      {tab === 'sell' && '売却管理'}
                      {tab === 'portfolio' && 'ポートフォリオ'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {dashboardSubTab === 'expense' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    titleJa="今月の出費額"
                    titleEn="Monthly Spending"
                    value={`¥${getCurrentMonthSpending().toLocaleString()}`}
                  />
                  <KPICard
                    titleJa="アイテム数"
                    titleEn="Total Items"
                    value={items.filter(i => !i.is_discarded).length.toString()}
                  />
                  <KPICard
                    titleJa="今年の出費額"
                    titleEn="Yearly Spending"
                    value={`¥${items
                      .filter(i => {
                        const d = new Date(i.purchase_date || '');
                        return d.getFullYear() === new Date().getFullYear();
                      })
                      .reduce((sum, i) => sum + (i.purchase_price || 0), 0)
                      .toLocaleString()}`}
                  />
                  <KPICard
                    titleJa="平均単価"
                    titleEn="Average Price"
                    value={`¥${Math.round(
                      items.filter(i => i.purchase_price).reduce((sum, i) => sum + (i.purchase_price || 0), 0) /
                      (items.filter(i => i.purchase_price).length || 1)
                    ).toLocaleString()}`}
                  />
                </div>

                <AIInsightCard titleJa="AI分析" titleEn="AI Insights" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BarChart
                    titleJa="過去12カ月の出費額"
                    titleEn="Monthly Spending"
                    data={getMonthlyTrend()}
                  />
                  <div className="space-y-4">
                    <TimeRangeSelector selected={categoryRange} onChange={setCategoryRange} />
                    <PieChart
                      titleJa="カテゴリー別出費額"
                      titleEn="By Category"
                      data={getCategoryBreakdown(categoryRange)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <TimeRangeSelector selected={brandRange} onChange={setBrandRange} />
                  <PieChart
                    titleJa="ブランド別出費額"
                    titleEn="By Brand"
                    data={getBrandBreakdown(brandRange)}
                  />
                </div>
              </>
            )}

            {dashboardSubTab === 'sell' && (
              <div className="text-center py-12 border border-gray-200">
                <p className="text-gray-500">売却管理機能は開発中です</p>
              </div>
            )}

            {dashboardSubTab === 'portfolio' && (
              <div className="text-center py-12 border border-gray-200">
                <p className="text-gray-500">ポートフォリオ管理機能は開発中です</p>
              </div>
            )}
          </div>
        )}

        {/* AI Assistantビュー */}
        {viewMode === 'ai-assistant' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl tracking-wider font-light mb-2">AI ASSISTANT</h2>
              <p className="text-gray-600 text-sm">
                自然言語でワードローブに商品を登録できます
              </p>
            </div>
            <div className="border border-gray-200 p-6 text-center">
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">AI Assistant機能は準備中です</p>
              <p className="text-sm text-gray-400 mt-2">
                Gemini APIキーを設定すると利用可能になります
              </p>
            </div>
          </div>
        )}

        {/* 足の測定ビュー */}
        {viewMode === 'foot-scan' && (
          <div className="text-center py-12 border border-gray-200">
            <Footprints className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">足の測定機能は準備中です</p>
          </div>
        )}

        {/* ブランド別サイズビュー */}
        {viewMode === 'size-mapping' && (
          <div className="text-center py-12 border border-gray-200">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">ブランド別サイズ機能は準備中です</p>
          </div>
        )}

        {/* サイズ推奨ビュー */}
        {viewMode === 'size-recommend' && (
          <div className="text-center py-12 border border-gray-200">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">サイズ推奨機能は準備中です</p>
            <p className="text-sm text-gray-400 mt-2">
              Gemini APIキーを設定すると利用可能になります
            </p>
          </div>
        )}
      </div>

      {/* モーダル */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editingItem={editingItem}
      />
    </div>
  );
}

