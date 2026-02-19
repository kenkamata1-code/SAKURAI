import { useEffect, useState, useCallback } from 'react';
import { Plus, Package, Image as ImageIcon, BarChart3, Bot, Footprints, X, Trash2, Ruler, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWardrobeStore, useStylingStore, useUIStore, useMeasurementStore } from './lib/store';
import { CATEGORIES, CATEGORY_LABELS } from './types';
import type { WardrobeItem, StylingPhoto, FootMeasurement } from './types';
import ItemCard from './components/ItemCard';
import AddItemModal from './components/AddItemModal';
import AIAssistantView from './components/AIAssistantView';
import SalesDashboard from './components/SalesDashboard';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import StylingModal from './components/StylingModal';
import StylingDetailModal from './components/StylingDetailModal';
import { KPICard, BarChart, PieChart, TimeRangeSelector, AIInsightCard, type TimeRange } from './components/dashboard';
import { apiClient } from './lib/api-client';

export default function WardrobePage() {
  const { user } = useAuth();
  const { 
    items: rawItems, 
    loading, 
    fetchItems, 
    addItem, 
    updateItem, 
    deleteItem, 
    discardItem, 
    restoreItem,
    selectedCategory,
    setSelectedCategory,
  } = useWardrobeStore();
  const items: WardrobeItem[] = rawItems;
  
  const { photos: rawPhotos, fetchPhotos, addPhoto, deletePhoto } = useStylingStore();
  const photos: StylingPhoto[] = rawPhotos;
  const { measurements: rawMeasurements, fetchMeasurements, addMeasurement, deleteMeasurement, setMeasurementActive } = useMeasurementStore();
  const measurements: FootMeasurement[] = rawMeasurements as FootMeasurement[];
  
  const {
    viewMode,
    setViewMode,
    dashboardSubTab,
    setDashboardSubTab,
    showAddModal,
    setShowAddModal,
    showStylingModal,
    setShowStylingModal,
  } = useUIStore();

  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [categoryRange, setCategoryRange] = useState<TimeRange>('1M');

  // AIアシスタントの残りクレジット数（localStorageから取得）
  const DAILY_LIMIT = 50;
  const [aiRemainingCredits, setAiRemainingCredits] = useState<number>(DAILY_LIMIT);
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('ai_assistant_usage');
    if (stored) {
      const { date, count } = JSON.parse(stored);
      setAiRemainingCredits(date === today ? DAILY_LIMIT - count : DAILY_LIMIT);
    }
  }, []);
  const [brandRange, setBrandRange] = useState<TimeRange>('1M');
  
  // スタイリング用
  const [stylingLoading, setStylingLoading] = useState(false);
  const [editingStyling, setEditingStyling] = useState<StylingPhoto | null>(null);
  const [selectedStyling, setSelectedStyling] = useState<StylingPhoto | null>(null);
  const [showStylingDetail, setShowStylingDetail] = useState(false);
  
  // 足測定用
  const [footForm, setFootForm] = useState({
    foot_type: 'left' as 'left' | 'right',
    length_mm: '',        // ①足長
    girth_mm: '',         // ②足囲
    width_mm: '',         // ③足幅
    instep_height_mm: '', // ④甲の高さ
    heel_width_mm: '',    // ⑤かかと幅
    toe_shape: '',        // ⑥指の形
  });
  // 測定方法説明の開閉
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null);
  const [footLoading, setFootLoading] = useState(false);
  const [showFootMeasureModal, setShowFootMeasureModal] = useState(false);
  
  // AIアシスタント用
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchItems(user.id);
      fetchPhotos(user.id);
      fetchMeasurements(user.id);
    }
  }, [user, fetchItems, fetchPhotos, fetchMeasurements]);

  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter(item => item.category === selectedCategory);

  const getCategoryCount = (category: string) => {
    if (category === 'All') return items.length;
    return items.filter(item => item.category === category).length;
  };

  const handleSaveItem = useCallback(async (itemData: Partial<WardrobeItem>) => {
    if (!user) return;
    
    try {
      if (editingItem) {
        await updateItem(editingItem.id, itemData);
      } else {
        await addItem(user.id, itemData);
      }
      setEditingItem(null);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('保存に失敗しました');
    }
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

  // スタイリング写真の追加/更新
  const handleSaveStylingPhoto = async (
    data: { image_url: string; title?: string; notes?: string },
    selectedItemIds: string[]
  ) => {
    if (!user) return;
    
    setStylingLoading(true);
    try {
      if (editingStyling) {
        // 更新処理（TODO: updatePhoto関数をstoreに追加する必要あり）
        // 現在は削除して再追加で対応
        await deletePhoto(editingStyling.id);
        await addPhoto(user.id, data, selectedItemIds);
      } else {
        await addPhoto(user.id, data, selectedItemIds);
      }
      
      setEditingStyling(null);
      setShowStylingModal(false);
    } catch (error) {
      console.error('Error saving styling photo:', error);
      alert('スタイリング写真の保存に失敗しました');
    } finally {
      setStylingLoading(false);
    }
  };

  // スタイリング画像のアップロード
  const handleStylingImageUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    try {
      console.log('📤 Starting styling image upload...');
      const result = await apiClient.uploadImage(user.id, file, 'styling-photos');
      if (result.data) {
        console.log('✅ Upload success:', result.data);
        return result.data;
      } else if (result.error) {
        console.error('❌ Upload error:', result.error);
        alert('画像のアップロードに失敗しました: ' + result.error.message);
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('画像のアップロードに失敗しました');
    }
    return null;
  };

  // スタイリング写真の削除
  const handleDeleteStylingPhoto = async (id: string) => {
    await deletePhoto(id);
    setShowStylingDetail(false);
    setSelectedStyling(null);
  };

  // スタイリング詳細を開く
  const handleOpenStylingDetail = (photo: StylingPhoto) => {
    setSelectedStyling(photo);
    setShowStylingDetail(true);
  };

  // スタイリング編集を開く
  const handleEditStyling = () => {
    if (selectedStyling) {
      setEditingStyling(selectedStyling);
      setShowStylingDetail(false);
      setShowStylingModal(true);
    }
  };

  // 足測定の追加
  const handleAddFootMeasurement = async () => {
    if (!user || !footForm.length_mm) {
      alert('足長は必須です');
      return;
    }
    
    setFootLoading(true);
    try {
      await addMeasurement(user.id, {
        foot_type: footForm.foot_type,
        length_mm: parseFloat(footForm.length_mm),
        girth_mm: footForm.girth_mm ? parseFloat(footForm.girth_mm) : undefined,
        width_mm: footForm.width_mm ? parseFloat(footForm.width_mm) : 0,
        instep_height_mm: footForm.instep_height_mm ? parseFloat(footForm.instep_height_mm) : undefined,
        heel_width_mm: footForm.heel_width_mm ? parseFloat(footForm.heel_width_mm) : undefined,
        toe_shape: footForm.toe_shape || undefined,
        is_active: true,
      });
      
      // リセット
      setFootForm({
        foot_type: 'left',
        length_mm: '',
        girth_mm: '',
        width_mm: '',
        instep_height_mm: '',
        heel_width_mm: '',
        toe_shape: '',
      });
    } catch (error) {
      console.error('Error adding measurement:', error);
      alert('足測定データの追加に失敗しました');
    } finally {
      setFootLoading(false);
    }
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
              { key: 'items', icon: Package, label: 'ITEMS', labelJa: 'アイテム' },
              { key: 'styling', icon: ImageIcon, label: 'STYLING', labelJa: 'スタイリング' },
              { key: 'dashboard', icon: BarChart3, label: 'DASHBOARD', labelJa: 'ダッシュボード' },
              { key: 'ai-assistant', icon: Bot, label: 'AI ASSISTANT', labelJa: 'AIアシスタント' },
              { key: 'foot-scan', icon: Footprints, label: 'FOOT SCAN', labelJa: '足の測定' },
            ].map(({ key, icon: Icon, label, labelJa }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as typeof viewMode)}
                className={`pb-4 border-b-2 transition whitespace-nowrap ${
                  viewMode === key
                    ? 'border-gray-900 text-gray-900 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="flex flex-col items-center gap-0.5 text-xs tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                  <span className="text-[10px] opacity-60">{labelJa}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* アイテムビュー */}
        {viewMode === 'items' && (
          <div className="mb-16">
            <div className="flex items-center justify-between gap-4 mb-8">
              <button
                onClick={() => {
                  setEditingItem(null);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 transition"
              >
                <Plus className="w-5 h-5" />
                <span>ADD ITEM <span className="text-xs opacity-70">/ 追加</span></span>
              </button>
              {/* AIクレジット残数 */}
              <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
                <Zap className={`w-4 h-4 ${aiRemainingCredits > 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
                <span>AI残り <span className={`font-bold ${aiRemainingCredits > 0 ? 'text-gray-900' : 'text-red-500'}`}>{aiRemainingCredits}</span> / {DAILY_LIMIT} 回</span>
              </div>
            </div>

            <h2 className="text-2xl tracking-wider font-light mb-6">MY ITEMS <span className="text-lg text-gray-400">/ マイアイテム</span></h2>
            
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
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* スタイリングビュー */}
        {viewMode === 'styling' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl tracking-wider font-light">スタイリング / Styling</h2>
                <p className="text-sm text-gray-500 mt-1">{photos.length} photos</p>
              </div>
              <button
                onClick={() => {
                  setEditingStyling(null);
                  setShowStylingModal(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 transition"
              >
                <Plus className="w-5 h-5" />
                <span>ADD PHOTO <span className="text-xs opacity-70">/ 写真追加</span></span>
              </button>
            </div>

            {photos.length === 0 ? (
              <div className="text-center py-16 border border-gray-200">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">スタイリング写真が登録されていません</p>
                <p className="text-sm text-gray-400 mt-2">「スタイリング写真を追加」ボタンから登録してください</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative bg-gray-100 overflow-hidden border border-gray-200 cursor-pointer hover:border-gray-400 transition"
                    onClick={() => handleOpenStylingDetail(photo)}
                  >
                    <div className="aspect-[3/4]">
                      <img
                        src={photo.image_url}
                        alt={photo.title || 'Styling photo'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-white text-sm font-medium truncate">
                        {photo.title || 'Untitled'}
                      </p>
                      <p className="text-white/70 text-xs">
                        {photo.worn_items?.length || 0} items
                      </p>
                    </div>
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
                      {tab === 'expense' && <span>EXPENSES <span className="text-xs opacity-60">/ 出費管理</span></span>}
                      {tab === 'sell' && <span>SALES <span className="text-xs opacity-60">/ 売却管理</span></span>}
                      {tab === 'portfolio' && <span>PORTFOLIO <span className="text-xs opacity-60">/ ポートフォリオ</span></span>}
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
              <SalesDashboard items={items} />
            )}

            {dashboardSubTab === 'portfolio' && (
              <PortfolioAnalysis items={items} />
            )}
          </div>
        )}

        {/* AI Assistantビュー */}
        {viewMode === 'ai-assistant' && (
          <AIAssistantView 
            aiMessages={aiMessages}
            setAiMessages={setAiMessages}
            aiInput={aiInput}
            setAiInput={setAiInput}
            aiLoading={aiLoading}
            setAiLoading={setAiLoading}
            onBack={() => setViewMode('items')}
          />
        )}

        {/* 足の測定ビュー */}
        {viewMode === 'foot-scan' && (
          <div className="max-w-5xl mx-auto">
            {/* ヘッダー */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl tracking-wider font-light mb-2">足の測定 / Foot Measurements</h2>
                <p className="text-gray-600 text-sm">
                  足の形を測定して、最適なシューズサイズを見つけましょう
                </p>
              </div>
              <button
                onClick={() => setShowFootMeasureModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white hover:bg-gray-800 transition"
              >
                <Ruler className="w-5 h-5" />
                測定を追加
              </button>
            </div>

            {/* 測定方法ガイド */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm">!</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">測定方法</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span>壁に踵をつけて立ち、つま先までの長さを測定（足長）</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span>足の一番幅が広い部分を測定（足幅）</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span>より正確な測定には、iOS端末のLiDAR機能を使用したスキャンアプリの利用を推奨</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 左足・右足のデータ表示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* 左足 */}
              <div>
                <h3 className="text-lg font-medium mb-4 pb-2 border-b border-gray-200">左足 / Left Foot</h3>
                {(() => {
                  const leftMeasurements = measurements.filter(m => m.foot_type === 'left');
                  const activeLeft = leftMeasurements.find(m => m.is_active) || leftMeasurements[0];
                  if (!activeLeft) {
                    return <p className="text-gray-500 py-4">測定データがありません</p>;
                  }
                  return (
                    <div className="space-y-2 divide-y divide-gray-100">
                      {[
                        { l: '① 足長 FOOT LENGTH', v: activeLeft.length_mm, unit: 'mm', always: true },
                        { l: '② 足囲 GIRTH', v: activeLeft.girth_mm, unit: 'mm', always: false },
                        { l: '③ 足幅 WIDTH', v: activeLeft.width_mm, unit: 'mm', always: false },
                        { l: '④ 甲の高さ INSTEP', v: activeLeft.instep_height_mm, unit: 'mm', always: false },
                        { l: '⑤ かかと幅 HEEL WIDTH', v: activeLeft.heel_width_mm, unit: 'mm', always: false },
                        { l: '⑥ 指の形 TOE SHAPE', v: activeLeft.toe_shape, unit: '', always: false },
                      ].filter(r => r.always || r.v).map(r => (
                        <div key={r.l} className="flex justify-between items-center py-2">
                          <span className="text-gray-500 text-sm">{r.l}</span>
                          <span className="font-medium text-sm">{r.v}{r.unit && r.v ? ` ${r.unit}` : ''}</span>
                        </div>
                      ))}
                      <p className="text-xs text-gray-400 pt-2">
                        測定日: {new Date(activeLeft.measurement_date || activeLeft.created_at || '').toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* 右足 */}
              <div>
                <h3 className="text-lg font-medium mb-4 pb-2 border-b border-gray-200">右足 / Right Foot</h3>
                {(() => {
                  const rightMeasurements = measurements.filter(m => m.foot_type === 'right');
                  const activeRight = rightMeasurements.find(m => m.is_active) || rightMeasurements[0];
                  if (!activeRight) {
                    return <p className="text-gray-500 py-4">測定データがありません</p>;
                  }
                  return (
                    <div className="space-y-2 divide-y divide-gray-100">
                      {[
                        { l: '① 足長 FOOT LENGTH', v: activeRight.length_mm, unit: 'mm', always: true },
                        { l: '② 足囲 GIRTH', v: activeRight.girth_mm, unit: 'mm', always: false },
                        { l: '③ 足幅 WIDTH', v: activeRight.width_mm, unit: 'mm', always: false },
                        { l: '④ 甲の高さ INSTEP', v: activeRight.instep_height_mm, unit: 'mm', always: false },
                        { l: '⑤ かかと幅 HEEL WIDTH', v: activeRight.heel_width_mm, unit: 'mm', always: false },
                        { l: '⑥ 指の形 TOE SHAPE', v: activeRight.toe_shape, unit: '', always: false },
                      ].filter(r => r.always || r.v).map(r => (
                        <div key={r.l} className="flex justify-between items-center py-2">
                          <span className="text-gray-500 text-sm">{r.l}</span>
                          <span className="font-medium text-sm">{r.v}{r.unit && r.v ? ` ${r.unit}` : ''}</span>
                        </div>
                      ))}
                      <p className="text-xs text-gray-400 pt-2">
                        測定日: {new Date(activeRight.measurement_date || activeRight.created_at || '').toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 測定履歴 */}
            {measurements.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">測定履歴</h3>
                <div className="space-y-3">
                  {measurements.map((m) => (
                    <div key={m.id} className={`border p-4 rounded-lg ${m.is_active ? 'border-gray-900 bg-gray-50' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{m.foot_type === 'left' ? '左足' : '右足'}</span>
                            {m.is_active && (
                              <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded">アクティブ</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-0.5">
                            <span>①足長: {m.length_mm}mm</span>
                            {m.girth_mm ? <span> / ②足囲: {m.girth_mm}mm</span> : null}
                            {m.width_mm ? <span> / ③足幅: {m.width_mm}mm</span> : null}
                            {m.instep_height_mm ? <span> / ④甲: {m.instep_height_mm}mm</span> : null}
                            {m.heel_width_mm ? <span> / ⑤かかと: {m.heel_width_mm}mm</span> : null}
                            {m.toe_shape ? <span> / ⑥{m.toe_shape === 'egyptian' ? 'エジプト型' : m.toe_shape === 'greek' ? 'ギリシャ型' : 'スクエア型'}</span> : null}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(m.measurement_date || m.created_at || '').toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!m.is_active && (
                            <button
                              onClick={() => setMeasurementActive(m.id, m.foot_type)}
                              className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                            >
                              アクティブに設定
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('この測定データを削除しますか？')) {
                                deleteMeasurement(m.id);
                              }
                            }}
                            className="p-2 hover:bg-red-50 text-red-500 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 測定追加モーダル */}
            {showFootMeasureModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white max-w-2xl w-full rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div>
                      <h3 className="text-xl font-medium tracking-wider">ADD MEASUREMENT <span className="text-sm font-normal text-gray-500">/ 足の測定を追加</span></h3>
                      <p className="text-xs text-gray-500 mt-1">裸足・立位・夕方に測定 / 左右測定し大きい方を基準に</p>
                    </div>
                    <button onClick={() => setShowFootMeasureModal(false)} className="text-gray-500 hover:text-gray-700">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-5 overflow-y-auto">
                    {/* 足を選択 */}
                    <div>
                      <label className="block text-sm font-medium tracking-wider mb-2">FOOT / 測定する足</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ v: 'left', l: '左足 / LEFT' }, { v: 'right', l: '右足 / RIGHT' }].map(({ v, l }) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setFootForm({ ...footForm, foot_type: v as 'left' | 'right' })}
                            className={`py-3 border rounded-lg transition text-sm ${
                              footForm.foot_type === v ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ① 足長 */}
                    {[
                      {
                        num: 1, key: 'length_mm', label: '足長', en: 'FOOT LENGTH', unit: 'mm', required: true, placeholder: '265',
                        purpose: '靴の基本サイズ（cm）を決める数値',
                        how: 'かかとを壁に付けて紙の上に立ち、一番長い指の先端に印をつける。壁側の端から印までの距離を定規で測る。'
                      },
                      {
                        num: 2, key: 'girth_mm', label: '足囲', en: 'GIRTH', unit: 'mm', required: false, placeholder: '230',
                        purpose: 'E・2E・3Eのワイズ（横方向の太さ）を決める数値',
                        how: '親指の付け根と小指の付け根の骨を触って確認し、そのラインを通るようにメジャーで足を一周させる。強く締めず軽く触れる程度で。'
                      },
                      {
                        num: 3, key: 'width_mm', label: '足幅', en: 'FOOT WIDTH', unit: 'mm', required: false, placeholder: '102',
                        purpose: '横幅の実寸を確認する数値（同ワイズでも圧迫が変わる）',
                        how: '紙に足型をなぞり、足囲を測った位置の内側と外側の最大幅を直線で測る。'
                      },
                      {
                        num: 4, key: 'instep_height_mm', label: '甲の高さ（インステップ）', en: 'INSTEP', unit: 'mm', required: false, placeholder: '65',
                        purpose: '足の厚み・ボリューム確認。ここが合わないとサイズを上げても圧迫が解消しないことがある',
                        how: '足の甲で一番高い位置を触って確認し、その部分をメジャーで一周測る。'
                      },
                      {
                        num: 5, key: 'heel_width_mm', label: 'かかと幅', en: 'HEEL WIDTH', unit: 'mm', required: false, placeholder: '68',
                        purpose: '靴の脱げやすさ・ホールド感に関係。細いと既製靴でかかとが浮きやすくなる',
                        how: 'かかとの最も膨らんだ左右の位置を確認し、足型をもとに横幅を定規で測る。'
                      },
                    ].map(({ num, key, label, en, unit, required, placeholder, purpose, how }) => (
                      <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-start gap-3 p-4">
                          <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {num}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium tracking-wider">{en}</span>
                              <span className="text-xs text-gray-500">/ {label}{required && <span className="text-red-500 ml-1">*</span>}</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">{purpose}</p>
                            <input
                              type="number"
                              value={footForm[key as keyof typeof footForm]}
                              onChange={(e) => setFootForm({ ...footForm, [key]: e.target.value })}
                              placeholder={placeholder}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 text-sm"
                            />
                            {unit && <p className="text-xs text-gray-400 mt-1">単位: {unit}</p>}
                          </div>
                          {/* 計測方法の展開/閉じる */}
                          <button
                            type="button"
                            onClick={() => setExpandedGuide(expandedGuide === num ? null : num)}
                            className="text-xs text-blue-600 hover:underline flex-shrink-0 mt-1"
                          >
                            {expandedGuide === num ? '閉じる' : '計測方法'}
                          </button>
                        </div>
                        {expandedGuide === num && (
                          <div className="px-4 pb-4 pt-0 bg-blue-50 border-t border-blue-100">
                            <p className="text-xs text-blue-800 leading-relaxed">{how}</p>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* ⑥ 指の形（トゥ形状） */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-start gap-3 p-4">
                        <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          6
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium tracking-wider">TOE SHAPE</span>
                            <span className="text-xs text-gray-500">/ 指の形（トゥ形状）</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">靴の木型との相性を判断するための形状</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { v: 'egyptian', l: 'エジプト型', desc: '親指が最長' },
                              { v: 'greek', l: 'ギリシャ型', desc: '人差し指が最長' },
                              { v: 'square', l: 'スクエア型', desc: '指先が横並び' },
                            ].map(({ v, l, desc }) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setFootForm({ ...footForm, toe_shape: footForm.toe_shape === v ? '' : v })}
                                className={`py-2.5 px-2 border rounded-lg text-center transition ${
                                  footForm.toe_shape === v ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <p className="text-xs font-medium">{l}</p>
                                <p className={`text-[10px] ${footForm.toe_shape === v ? 'text-gray-300' : 'text-gray-400'}`}>{desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedGuide(expandedGuide === 6 ? null : 6)}
                          className="text-xs text-blue-600 hover:underline flex-shrink-0 mt-1"
                        >
                          {expandedGuide === 6 ? '閉じる' : '計測方法'}
                        </button>
                      </div>
                      {expandedGuide === 6 && (
                        <div className="px-4 pb-4 pt-0 bg-blue-50 border-t border-blue-100">
                          <p className="text-xs text-blue-800 leading-relaxed">
                            足型を紙にしっかりなぞり、指の並びを確認する。親指が最も長い → エジプト型、人差し指が長い → ギリシャ型、指先が横並び → スクエア型。
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
                    <button
                      onClick={() => setShowFootMeasureModal(false)}
                      className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => {
                        handleAddFootMeasurement();
                        setShowFootMeasureModal(false);
                      }}
                      disabled={footLoading || !footForm.length_mm}
                      className="flex-1 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400"
                    >
                      {footLoading ? 'SAVING...' : 'SAVE'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* アイテム追加モーダル */}
      <AddItemModal
        key={editingItem?.id || 'new'}
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editingItem={editingItem}
      />

      {/* スタイリング追加/編集モーダル */}
      <StylingModal
        isOpen={showStylingModal}
        onClose={() => {
          setShowStylingModal(false);
          setEditingStyling(null);
        }}
        onSave={handleSaveStylingPhoto}
        items={items}
        editingPhoto={editingStyling}
        onImageSelect={handleStylingImageUpload}
        loading={stylingLoading}
      />

      {/* スタイリング詳細モーダル */}
      <StylingDetailModal
        isOpen={showStylingDetail}
        onClose={() => {
          setShowStylingDetail(false);
          setSelectedStyling(null);
        }}
        photo={selectedStyling}
        items={items}
        onEdit={handleEditStyling}
        onDelete={() => selectedStyling && handleDeleteStylingPhoto(selectedStyling.id)}
      />
    </div>
  );
}
