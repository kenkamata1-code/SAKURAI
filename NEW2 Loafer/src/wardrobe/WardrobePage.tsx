import { useEffect, useState, useCallback } from 'react';
import { Plus, Package, Image as ImageIcon, BarChart3, Bot, Footprints, Sparkles, X, Trash2, Upload, Ruler } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWardrobeStore, useStylingStore, useUIStore, useMeasurementStore } from './lib/store';
import { CATEGORIES, CATEGORY_LABELS } from './types';
import type { WardrobeItem, FootMeasurement } from './types';
import ItemCard from './components/ItemCard';
import AddItemModal from './components/AddItemModal';
import ImageUpload from './components/ImageUpload';
import { KPICard, BarChart, PieChart, TimeRangeSelector, AIInsightCard, type TimeRange } from './components/dashboard';
import { apiClient } from './lib/api-client';

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
  
  const { photos, fetchPhotos, addPhoto, deletePhoto } = useStylingStore();
  const { measurements, fetchMeasurements, addMeasurement, deleteMeasurement, setMeasurementActive } = useMeasurementStore();
  
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
  const [sellingItem, setSellingItem] = useState<WardrobeItem | null>(null);
  const [categoryRange, setCategoryRange] = useState<TimeRange>('1M');
  const [brandRange, setBrandRange] = useState<TimeRange>('1M');
  
  // スタイリング追加用
  const [stylingImage, setStylingImage] = useState<string | null>(null);
  const [stylingTitle, setStylingTitle] = useState('');
  const [stylingNotes, setStylingNotes] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [stylingLoading, setStylingLoading] = useState(false);
  
  // 足測定用
  const [footForm, setFootForm] = useState({
    foot_type: 'left' as 'left' | 'right',
    length_mm: '',
    width_mm: '',
    arch_height_mm: '',
    instep_height_mm: '',
  });
  const [footLoading, setFootLoading] = useState(false);
  
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

  const handleSell = (item: WardrobeItem) => {
    setSellingItem(item);
  };

  // スタイリング写真の追加
  const handleAddStylingPhoto = async () => {
    if (!user || !stylingImage) return;
    
    setStylingLoading(true);
    try {
      await addPhoto(user.id, {
        image_url: stylingImage,
        title: stylingTitle || undefined,
        notes: stylingNotes || undefined,
      }, selectedItemIds);
      
      // リセット
      setStylingImage(null);
      setStylingTitle('');
      setStylingNotes('');
      setSelectedItemIds([]);
      setShowStylingModal(false);
    } catch (error) {
      console.error('Error adding styling photo:', error);
      alert('スタイリング写真の追加に失敗しました');
    } finally {
      setStylingLoading(false);
    }
  };

  const handleStylingImageSelect = async (file: File) => {
    if (!user) return;
    
    setStylingLoading(true);
    try {
      const result = await apiClient.uploadImage(user.id, file, 'styling-photos');
      if (result.data) {
        setStylingImage(result.data);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('画像のアップロードに失敗しました');
    } finally {
      setStylingLoading(false);
    }
  };

  const handleDeleteStylingPhoto = async (id: string) => {
    if (!confirm('このスタイリング写真を削除しますか？')) return;
    await deletePhoto(id);
  };

  // 足測定の追加
  const handleAddFootMeasurement = async () => {
    if (!user || !footForm.length_mm || !footForm.width_mm) {
      alert('足長と足幅は必須です');
      return;
    }
    
    setFootLoading(true);
    try {
      await addMeasurement(user.id, {
        foot_type: footForm.foot_type,
        length_mm: parseFloat(footForm.length_mm),
        width_mm: parseFloat(footForm.width_mm),
        arch_height_mm: footForm.arch_height_mm ? parseFloat(footForm.arch_height_mm) : undefined,
        instep_height_mm: footForm.instep_height_mm ? parseFloat(footForm.instep_height_mm) : undefined,
        is_active: true,
      });
      
      // リセット
      setFootForm({
        foot_type: 'left',
        length_mm: '',
        width_mm: '',
        arch_height_mm: '',
        instep_height_mm: '',
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
              { key: 'items', icon: Package, label: 'アイテム' },
              { key: 'styling', icon: ImageIcon, label: 'スタイリング' },
              { key: 'dashboard', icon: BarChart3, label: 'ダッシュボード' },
              { key: 'ai-assistant', icon: Bot, label: 'AI ASSISTANT' },
              { key: 'foot-scan', icon: Footprints, label: '足の測定' },
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

        {/* アイテムビュー */}
        {viewMode === 'items' && (
          <div className="mb-16">
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
            </div>

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
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setShowStylingModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 transition"
              >
                <Plus className="w-5 h-5" />
                スタイリング写真を追加
              </button>
            </div>

            <h2 className="text-2xl tracking-wider font-light mb-6">スタイリング写真</h2>
            {photos.length === 0 ? (
              <div className="text-center py-12 border border-gray-200">
                <p className="text-gray-500">スタイリング写真が登録されていません</p>
                <p className="text-sm text-gray-400 mt-2">「スタイリング写真を追加」ボタンから登録してください</p>
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
                    <button
                      onClick={() => handleDeleteStylingPhoto(photo.id)}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
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
            
            <div className="border border-gray-200 bg-gray-50 h-96 overflow-y-auto p-4 mb-4">
              {aiMessages.length === 0 ? (
                <div className="text-center text-gray-400 mt-20">
                  <Bot className="w-12 h-12 mx-auto mb-4" />
                  <p>メッセージを入力してください</p>
                  <p className="text-sm mt-2">例: 「白いナイキのスニーカーを15000円で購入しました」</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 ${
                        msg.role === 'user' 
                          ? 'bg-gray-900 text-white' 
                          : 'bg-white border border-gray-200'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 p-3">
                        <span className="animate-pulse">考え中...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="メッセージを入力..."
                className="flex-1 px-4 py-3 border border-gray-300 focus:outline-none focus:border-gray-900"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    // AI処理（将来実装）
                    if (aiInput.trim()) {
                      setAiMessages(prev => [...prev, { role: 'user', content: aiInput }]);
                      setAiLoading(true);
                      setTimeout(() => {
                        setAiMessages(prev => [...prev, { 
                          role: 'assistant', 
                          content: 'この機能はGemini APIキーを設定すると利用可能になります。現在は手動でアイテムを追加してください。' 
                        }]);
                        setAiLoading(false);
                      }, 1000);
                      setAiInput('');
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  if (aiInput.trim()) {
                    setAiMessages(prev => [...prev, { role: 'user', content: aiInput }]);
                    setAiLoading(true);
                    setTimeout(() => {
                      setAiMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: 'この機能はGemini APIキーを設定すると利用可能になります。現在は手動でアイテムを追加してください。' 
                      }]);
                      setAiLoading(false);
                    }, 1000);
                    setAiInput('');
                  }
                }}
                disabled={aiLoading || !aiInput.trim()}
                className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 transition disabled:bg-gray-400"
              >
                送信
              </button>
            </div>
          </div>
        )}

        {/* 足の測定ビュー */}
        {viewMode === 'foot-scan' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl tracking-wider font-light mb-2">足の測定</h2>
              <p className="text-gray-600 text-sm">
                足のサイズを記録して、最適なシューズサイズを見つけましょう
              </p>
            </div>
            
            {/* 測定フォーム */}
            <div className="border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-medium mb-4">新しい測定を追加</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm mb-2">足</label>
                  <select
                    value={footForm.foot_type}
                    onChange={(e) => setFootForm({ ...footForm, foot_type: e.target.value as 'left' | 'right' })}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  >
                    <option value="left">左足</option>
                    <option value="right">右足</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">足長 (mm) *</label>
                  <input
                    type="number"
                    value={footForm.length_mm}
                    onChange={(e) => setFootForm({ ...footForm, length_mm: e.target.value })}
                    placeholder="例: 265"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">足幅 (mm) *</label>
                  <input
                    type="number"
                    value={footForm.width_mm}
                    onChange={(e) => setFootForm({ ...footForm, width_mm: e.target.value })}
                    placeholder="例: 102"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">アーチ高さ (mm)</label>
                  <input
                    type="number"
                    value={footForm.arch_height_mm}
                    onChange={(e) => setFootForm({ ...footForm, arch_height_mm: e.target.value })}
                    placeholder="例: 32"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">甲の高さ (mm)</label>
                  <input
                    type="number"
                    value={footForm.instep_height_mm}
                    onChange={(e) => setFootForm({ ...footForm, instep_height_mm: e.target.value })}
                    placeholder="例: 65"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  />
                </div>
              </div>
              <button
                onClick={handleAddFootMeasurement}
                disabled={footLoading || !footForm.length_mm || !footForm.width_mm}
                className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 transition disabled:bg-gray-400"
              >
                {footLoading ? '保存中...' : '測定を保存'}
              </button>
            </div>
            
            {/* 測定履歴 */}
            <h3 className="text-lg font-medium mb-4">測定履歴</h3>
            {measurements.length === 0 ? (
              <div className="text-center py-12 border border-gray-200">
                <Footprints className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">測定データがありません</p>
              </div>
            ) : (
              <div className="space-y-4">
                {measurements.map((m) => (
                  <div key={m.id} className={`border p-4 ${m.is_active ? 'border-gray-900 bg-gray-50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{m.foot_type === 'left' ? '左足' : '右足'}</span>
                          {m.is_active && (
                            <span className="text-xs bg-gray-900 text-white px-2 py-0.5">アクティブ</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>足長: {m.length_mm}mm / 足幅: {m.width_mm}mm</p>
                          {m.arch_height_mm && <p>アーチ: {m.arch_height_mm}mm</p>}
                          {m.instep_height_mm && <p>甲の高さ: {m.instep_height_mm}mm</p>}
                          <p className="text-xs text-gray-400">
                            {new Date(m.measurement_date || m.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!m.is_active && (
                          <button
                            onClick={() => setMeasurementActive(m.id, m.foot_type)}
                            className="text-sm px-3 py-1 border border-gray-300 hover:bg-gray-100"
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
                          className="p-1 hover:bg-red-50 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* サイズ推奨ビュー */}
        {viewMode === 'size-recommend' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl tracking-wider font-light mb-2">サイズ推奨</h2>
              <p className="text-gray-600 text-sm">
                あなたの足の測定データと購入履歴に基づいて、最適なサイズを推奨します
              </p>
            </div>
            
            {measurements.filter(m => m.is_active).length === 0 ? (
              <div className="text-center py-12 border border-gray-200">
                <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">足の測定データが必要です</p>
                <p className="text-sm text-gray-400 mt-2">
                  「足の測定」タブで測定データを登録してください
                </p>
                <button
                  onClick={() => setViewMode('foot-scan')}
                  className="mt-4 px-6 py-2 border border-gray-900 hover:bg-gray-900 hover:text-white transition"
                >
                  足の測定へ
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 p-6">
                <div className="mb-6">
                  <h3 className="font-medium mb-2">あなたの足のデータ</h3>
                  {measurements.filter(m => m.is_active).map(m => (
                    <p key={m.id} className="text-sm text-gray-600">
                      {m.foot_type === 'left' ? '左足' : '右足'}: 足長 {m.length_mm}mm / 足幅 {m.width_mm}mm
                    </p>
                  ))}
                </div>
                
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <h3 className="font-medium mb-2">推奨サイズ</h3>
                  <p className="text-2xl font-light">
                    {Math.round((measurements.find(m => m.is_active)?.length_mm || 260) / 10 + 1)}cm
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    足長に基づく一般的な推奨サイズです。ブランドによってサイズ感が異なる場合があります。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* アイテム追加モーダル */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editingItem={editingItem}
      />

      {/* スタイリング追加モーダル */}
      {showStylingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl tracking-wider font-light">スタイリング写真を追加</h2>
              <button onClick={() => setShowStylingModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 画像アップロード */}
              <div>
                <label className="flex items-center gap-2 text-sm tracking-wider mb-2">
                  <Upload className="w-4 h-4" />
                  スタイリング写真 *
                </label>
                {stylingImage ? (
                  <div className="relative w-full max-w-md mx-auto">
                    <img src={stylingImage} alt="Styling" className="w-full aspect-square object-cover border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setStylingImage(null)}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <ImageUpload onImageSelect={handleStylingImageSelect} currentImage={null} />
                )}
                {stylingLoading && <p className="text-sm text-gray-500 mt-2">アップロード中...</p>}
              </div>

              {/* タイトル */}
              <div>
                <label className="block text-sm tracking-wider mb-2">タイトル</label>
                <input
                  type="text"
                  value={stylingTitle}
                  onChange={(e) => setStylingTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900"
                  placeholder="例: 春のカジュアルコーデ"
                />
              </div>

              {/* メモ */}
              <div>
                <label className="block text-sm tracking-wider mb-2">メモ</label>
                <textarea
                  value={stylingNotes}
                  onChange={(e) => setStylingNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 min-h-[100px]"
                  placeholder="このコーディネートについてのメモ..."
                />
              </div>

              {/* 着用アイテム選択 */}
              {items.length > 0 && (
                <div>
                  <label className="block text-sm tracking-wider mb-2">着用アイテム（任意）</label>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 p-2">
                    {items.filter(i => !i.is_discarded).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedItemIds(prev => 
                            prev.includes(item.id) 
                              ? prev.filter(id => id !== item.id)
                              : [...prev, item.id]
                          );
                        }}
                        className={`p-2 text-xs text-left border transition ${
                          selectedItemIds.includes(item.id)
                            ? 'border-gray-900 bg-gray-100'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {item.image_url && (
                          <img src={item.image_url} alt="" className="w-full aspect-square object-cover mb-1" />
                        )}
                        <p className="truncate">{item.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleAddStylingPhoto}
                disabled={stylingLoading || !stylingImage}
                className="w-full px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 transition disabled:bg-gray-400"
              >
                {stylingLoading ? '保存中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
