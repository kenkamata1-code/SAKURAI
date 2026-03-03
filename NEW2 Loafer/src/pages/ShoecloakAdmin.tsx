import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Shoe, FootProfile, ShoeCategory, FitFeedback, FootType,
  BRANDS, CATEGORY_LABELS, CATEGORY_SIZE_ADJUSTMENT, FIT_FEEDBACK_LABELS,
} from '../shoecloak/types';
import { loadShoes, saveShoes, addShoe, deleteShoe, loadFootProfile, saveFootProfile } from '../shoecloak/store';
import { getSizeRecommendation } from '../shoecloak/sizeRecommendation';
import {
  Footprints,
  Plus,
  Trash2,
  Camera,
  Award,
  TrendingUp,
  MessageCircle,
  Send,
  Sparkles,
  Search,
  X,
  ChevronDown,
  Upload,
  RefreshCw,
  Check,
} from 'lucide-react';

// ================================================================
// 型
// ================================================================

type TabType = 'dashboard' | 'foot-measure' | 'ai-assistant';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ================================================================
// ① ダッシュボード（靴の管理）
// ================================================================

interface ShoesDashboardProps {
  shoes: Shoe[];
  onShoesChange: () => void;
  footProfile: FootProfile | null;
}

function ShoesDashboard({ shoes, onShoesChange, footProfile }: ShoesDashboardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ShoeCategory | 'all'>('all');

  const activeShoes = shoes.filter(s => s.status === 'active');
  const filtered = filterCategory === 'all'
    ? activeShoes
    : activeShoes.filter(s => s.category === filterCategory);

  // カテゴリ別集計
  const categoryCounts = activeShoes.reduce((acc: Record<string, number>, shoe) => {
    acc[shoe.category] = (acc[shoe.category] || 0) + 1;
    return acc;
  }, {});

  // ブランド別集計
  const brandCounts = activeShoes.reduce((acc: Record<string, number>, shoe) => {
    acc[shoe.brand] = (acc[shoe.brand] || 0) + 1;
    return acc;
  }, {});
  const topBrands = Object.entries(brandCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const handleDelete = (id: string) => {
    if (!window.confirm('この靴を削除しますか？')) return;
    deleteShoe(id);
    onShoesChange();
  };

  return (
    <div>
      {/* KPIカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-gray-200 p-5">
          <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-2">所有靴数</p>
          <p className="text-3xl font-light text-gray-900">{activeShoes.length}<span className="text-sm ml-1 text-gray-400">足</span></p>
        </div>
        <div className="border border-gray-200 p-5">
          <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-2">カテゴリ数</p>
          <p className="text-3xl font-light text-gray-900">{Object.keys(categoryCounts).length}<span className="text-sm ml-1 text-gray-400">種</span></p>
        </div>
        <div className="border border-gray-200 p-5">
          <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-2">ブランド数</p>
          <p className="text-3xl font-light text-gray-900">{Object.keys(brandCounts).length}<span className="text-sm ml-1 text-gray-400">社</span></p>
        </div>
        <div className="border border-gray-200 p-5">
          <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-2">足タイプ</p>
          <p className="text-lg font-light text-gray-900">
            {footProfile
              ? footProfile.foot_type === 'wide' ? '幅広'
              : footProfile.foot_type === 'narrow' ? '細め' : '標準'
              : '未診断'}
          </p>
        </div>
      </div>

      {/* お気に入りブランド */}
      {topBrands.length > 0 && (
        <div className="border border-gray-200 p-5 mb-8">
          <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-4">よく履くブランド</p>
          <div className="flex gap-4">
            {topBrands.map(([brand, count], i) => (
              <div key={brand} className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-900 text-white flex items-center justify-center text-xs">{i + 1}</div>
                <span className="text-sm text-gray-700 tracking-wide">{brand}</span>
                <span className="text-xs text-gray-400">({count}足)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* フィルター＋追加ボタン */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as ShoeCategory | 'all')}
            className="text-xs tracking-wider border border-gray-300 px-3 py-1.5 focus:outline-none focus:border-gray-900"
          >
            <option value="all">すべてのカテゴリ</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 hover:bg-gray-700 transition-colors text-xs tracking-[0.15em] uppercase"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          靴を追加
        </button>
      </div>

      {/* 靴一覧 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200">
          <Footprints className="w-12 h-12 text-gray-200 mx-auto mb-4" strokeWidth={1} />
          <p className="text-sm text-gray-400 tracking-wider mb-4">靴がまだ登録されていません</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs tracking-widest uppercase border border-gray-300 px-4 py-2 hover:border-gray-900 transition-colors"
          >
            最初の1足を追加する
          </button>
        </div>
      ) : (
        <div className="border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_80px_120px_100px_40px] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs tracking-[0.12em] uppercase text-gray-400">
            <span>ブランド / モデル</span>
            <span>カテゴリ</span>
            <span>サイズ</span>
            <span>フィット感</span>
            <span>購入日</span>
            <span></span>
          </div>
          {filtered.map((shoe, i) => (
            <div
              key={shoe.id}
              className={`grid grid-cols-[1fr_100px_80px_120px_100px_40px] gap-3 px-5 py-4 items-center ${
                i < filtered.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div>
                <p className="text-sm text-gray-900 tracking-wide">{shoe.brand}</p>
                {shoe.model && <p className="text-xs text-gray-400 tracking-wide">{shoe.model}</p>}
              </div>
              <span className="text-xs text-gray-500 tracking-wide">{CATEGORY_LABELS[shoe.category]}</span>
              <span className="text-sm text-gray-900">{shoe.size} cm</span>
              <span className={`text-xs tracking-wide px-2 py-1 inline-block ${
                shoe.fit_feedback === 'perfect' ? 'bg-green-50 text-green-700' :
                shoe.fit_feedback === 'too_small' || shoe.fit_feedback === 'too_large' ? 'bg-red-50 text-red-600' :
                'bg-gray-50 text-gray-600'
              }`}>
                {FIT_FEEDBACK_LABELS[shoe.fit_feedback]}
              </span>
              <span className="text-xs text-gray-400">{shoe.purchase_date || '—'}</span>
              <button
                onClick={() => handleDelete(shoe.id)}
                className="text-gray-300 hover:text-red-500 transition-colors flex justify-end"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 靴追加フォーム（モーダル） */}
      {showAddForm && (
        <AddShoeModal
          onClose={() => setShowAddForm(false)}
          onAdd={() => { onShoesChange(); setShowAddForm(false); }}
        />
      )}
    </div>
  );
}

// ================================================================
// 靴追加モーダル
// ================================================================

function AddShoeModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [form, setForm] = useState({
    brand: '',
    brandQuery: '',
    model: '',
    category: 'sneakers' as ShoeCategory,
    size: '',
    color: '',
    fit_feedback: 'perfect' as FitFeedback,
    purchase_date: '',
    purchase_price: '',
    notes: '',
  });
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [error, setError] = useState('');

  const filteredBrands = BRANDS.filter(b =>
    b.name.toLowerCase().includes(form.brandQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (!form.brand || !form.size) {
      setError('ブランドとサイズは必須です');
      return;
    }
    addShoe({
      brand: form.brand,
      model: form.model || undefined,
      category: form.category,
      size: parseFloat(form.size),
      color: form.color || undefined,
      fit_feedback: form.fit_feedback,
      purchase_date: form.purchase_date || undefined,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : undefined,
      notes: form.notes || undefined,
      status: 'active',
    });
    onAdd();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg p-8 my-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base tracking-[0.2em] uppercase text-gray-900">靴を追加</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-900" strokeWidth={1.5} /></button>
        </div>

        <div className="space-y-4">
          {/* ブランド（オートコンプリート） */}
          <div className="relative">
            <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-1.5">
              ブランド <span className="text-gray-900">*</span>
            </label>
            <input
              type="text"
              value={form.brandQuery}
              onChange={e => {
                setForm(prev => ({ ...prev, brandQuery: e.target.value, brand: '' }));
                setShowBrandDropdown(true);
              }}
              onFocus={() => setShowBrandDropdown(true)}
              placeholder="例: Nike"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide"
            />
            {form.brand && (
              <div className="absolute right-3 top-8 flex items-center gap-1 text-green-600 text-xs">
                <Check className="w-3.5 h-3.5" strokeWidth={2} />
                {form.brand}
              </div>
            )}
            {showBrandDropdown && filteredBrands.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                {filteredBrands.map(b => (
                  <button
                    key={b.name}
                    onClick={() => {
                      setForm(prev => ({ ...prev, brand: b.name, brandQuery: b.name }));
                      setShowBrandDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 tracking-wide flex items-center justify-between"
                  >
                    <span>{b.name}</span>
                    <span className="text-xs text-gray-400">
                      {b.width_tendency === 'wide' ? '幅広' : b.width_tendency === 'narrow' ? '細め' : '標準'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* モデル名 */}
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-1.5">モデル名（任意）</label>
            <input
              type="text"
              value={form.model}
              onChange={e => setForm(prev => ({ ...prev, model: e.target.value }))}
              placeholder="例: Air Max 90"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* カテゴリ */}
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-1.5">カテゴリ</label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value as ShoeCategory }))}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide appearance-none"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
              </div>
              {CATEGORY_SIZE_ADJUSTMENT[form.category] !== 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  ＊このカテゴリは +{CATEGORY_SIZE_ADJUSTMENT[form.category]}cm の補正が入ります
                </p>
              )}
            </div>

            {/* サイズ */}
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-1.5">
                サイズ (cm) <span className="text-gray-900">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="20"
                max="35"
                value={form.size}
                onChange={e => setForm(prev => ({ ...prev, size: e.target.value }))}
                placeholder="26.5"
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide"
              />
            </div>
          </div>

          {/* フィット感 */}
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-1.5">フィット感</label>
            <div className="grid grid-cols-5 gap-1">
              {(Object.entries(FIT_FEEDBACK_LABELS) as [FitFeedback, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setForm(prev => ({ ...prev, fit_feedback: key }))}
                  className={`py-2 text-xs tracking-wide transition-colors ${
                    form.fit_feedback === key
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 text-gray-600 hover:border-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 購入日 */}
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-1.5">購入日（任意）</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={e => setForm(prev => ({ ...prev, purchase_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide"
              />
            </div>
            {/* 購入価格 */}
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-1.5">購入価格（任意）</label>
              <input
                type="number"
                value={form.purchase_price}
                onChange={e => setForm(prev => ({ ...prev, purchase_price: e.target.value }))}
                placeholder="15000"
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide"
              />
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-1.5">メモ（任意）</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-600 tracking-wide">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 hover:border-gray-900 text-xs tracking-[0.15em] uppercase transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-gray-900 text-white py-2.5 hover:bg-gray-700 text-xs tracking-[0.15em] uppercase transition-colors"
            >
              追加する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ② 足タイプ診断
// ================================================================

interface FootMeasurementProps {
  footProfile: FootProfile | null;
  onProfileUpdate: (profile: FootProfile) => void;
}

function FootMeasurementTab({ footProfile, onProfileUpdate }: FootMeasurementProps) {
  const [step, setStep] = useState<'setup' | 'upload' | 'result'>('setup');
  const [defaultSize, setDefaultSize] = useState(footProfile?.default_size?.toString() ?? '');
  const [photos, setPhotos] = useState<{ top: File | null; side: File | null }>({ top: null, side: null });
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    foot_type: FootType;
    percentile: number;
    recommendations: string[];
  } | null>(null);

  // 診断実行
  // TODO: POST /admin/shoecloak/analyze-foot API に差し替え（Gemini Vision連携）
  const handleAnalyze = async () => {
    if (!photos.top && !photos.side) return;
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 2500));

    // モック結果（実装時はAPIレスポンスを使用）
    const analysisResult = {
      foot_type: 'wide' as FootType,
      percentile: 18,
      recommendations: ['New Balance（幅広設計）', 'Asics（日本人向け）', 'Merrell（ワイドフィット）'],
    };

    const profile: FootProfile = {
      foot_type: analysisResult.foot_type,
      default_size: parseFloat(defaultSize) || 26.0,
      updated_at: new Date().toISOString(),
    };
    saveFootProfile(profile);
    onProfileUpdate(profile);
    setResult(analysisResult);
    setAnalyzing(false);
    setStep('result');
  };

  // サイズ設定のみ保存
  const handleSaveSize = () => {
    if (!defaultSize) return;
    const profile: FootProfile = {
      foot_type: footProfile?.foot_type ?? 'standard',
      default_size: parseFloat(defaultSize),
      updated_at: new Date().toISOString(),
    };
    saveFootProfile(profile);
    onProfileUpdate(profile);
    setStep('upload');
  };

  // 診断結果表示
  if (step === 'result' && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border border-gray-200 p-8">
          <div className="text-center mb-8">
            <Award className="w-14 h-14 text-gray-900 mx-auto mb-4" strokeWidth={1} />
            <h2 className="text-xl tracking-[0.3em] uppercase font-light text-gray-900 mb-1">診断結果</h2>
            <p className="text-xs text-gray-400 tracking-wider">Foot Type Analysis</p>
          </div>

          <div className="bg-gray-900 text-white p-8 text-center mb-6">
            <p className="text-xs tracking-[0.2em] uppercase text-gray-400 mb-3">あなたの足は</p>
            <h3 className="text-3xl font-light tracking-widest mb-4">
              {result.foot_type === 'wide' ? '幅広・甲高タイプ'
               : result.foot_type === 'narrow' ? '細め・華奢タイプ'
               : '標準タイプ'}
            </h3>
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm tracking-wider">日本人上位 {result.percentile}%</span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-3">おすすめブランド</p>
            <div className="space-y-2">
              {result.recommendations.map((brand, i) => (
                <div key={i} className="flex items-center gap-3 border border-gray-100 p-3">
                  <div className="w-6 h-6 bg-gray-900 text-white flex items-center justify-center text-xs">{i + 1}</div>
                  <span className="text-sm text-gray-700 tracking-wide">{brand}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 tracking-wide leading-relaxed mb-6">
            <span className="font-medium">アドバイス：</span>
            {result.foot_type === 'wide' && 'ナイキやプーマは細めの傾向があります。普段より+0.5cm大きめをお試しください。'}
            {result.foot_type === 'narrow' && 'ニューバランスやメレルは幅広傾向。普段より−0.5cm小さめでもフィットします。'}
            {result.foot_type === 'standard' && 'ほとんどのブランドで表記通りのサイズが合いやすいタイプです。'}
          </div>

          <button
            onClick={() => { setStep('setup'); setPhotos({ top: null, side: null }); setResult(null); }}
            className="w-full border border-gray-300 text-gray-600 py-3 hover:border-gray-900 hover:text-gray-900 text-xs tracking-[0.2em] uppercase transition-colors"
          >
            再診断する
          </button>
        </div>
      </div>
    );
  }

  // STEP 1: サイズ設定
  if (step === 'setup') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border border-gray-200 p-8">
          <div className="text-center mb-8">
            <Footprints className="w-12 h-12 text-gray-700 mx-auto mb-4" strokeWidth={1} />
            <h2 className="text-lg tracking-[0.3em] uppercase font-light text-gray-900 mb-1">足タイプ診断</h2>
            <p className="text-xs text-gray-400 tracking-wider">Foot Type Analysis</p>
          </div>

          {footProfile && (
            <div className="bg-gray-50 border border-gray-200 p-4 mb-6 text-sm text-gray-600 tracking-wide">
              <p className="text-xs tracking-widest uppercase text-gray-400 mb-1">現在の登録情報</p>
              <p>通常サイズ: {footProfile.default_size}cm　足タイプ: {
                footProfile.foot_type === 'wide' ? '幅広' :
                footProfile.foot_type === 'narrow' ? '細め' : '標準'
              }</p>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-2">
              普段履いている靴のサイズ (cm) <span className="text-gray-900">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="20"
              max="35"
              value={defaultSize}
              onChange={e => setDefaultSize(e.target.value)}
              placeholder="26.5"
              className="w-full px-3 py-2.5 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide"
            />
          </div>

          <button
            onClick={handleSaveSize}
            disabled={!defaultSize}
            className="w-full bg-gray-900 text-white py-3 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs tracking-[0.2em] uppercase transition-colors"
          >
            次へ：写真撮影
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: 写真アップロード
  return (
    <div className="max-w-2xl mx-auto">
      <div className="border border-gray-200 p-8">
        <div className="text-center mb-8">
          <Camera className="w-12 h-12 text-gray-700 mx-auto mb-4" strokeWidth={1} />
          <h2 className="text-lg tracking-[0.3em] uppercase font-light text-gray-900 mb-1">写真を撮影</h2>
          <p className="text-xs text-gray-400 tracking-wider">A4用紙を足元に置いて撮影すると精度が向上します</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 p-4 mb-6">
          <ul className="text-xs text-gray-600 tracking-wide space-y-1.5">
            <li>• A4用紙を足元に置き、真上から撮影（スケール基準）</li>
            <li>• 影が入らない明るい場所で撮影してください</li>
            <li>• 上面・側面の2方向で精度が上がります</li>
          </ul>
        </div>

        <div className="space-y-4 mb-6">
          {[
            { key: 'top' as const, label: '上面撮影', desc: '足を平らな場所に置いて真上から' },
            { key: 'side' as const, label: '側面撮影', desc: '足の側面（甲の高さを確認）' },
          ].map(({ key, label, desc }) => (
            <label key={key} className="block border border-dashed border-gray-300 hover:border-gray-900 transition-colors cursor-pointer p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm tracking-wider text-gray-900 mb-1">{label}</p>
                  <p className="text-xs text-gray-400 tracking-wide">{desc}</p>
                  {photos[key] && (
                    <p className="text-xs text-green-600 mt-1.5 tracking-wide">✓ {photos[key]!.name}</p>
                  )}
                </div>
                <div className="border border-gray-300 p-2.5">
                  <Upload className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => setPhotos(prev => ({ ...prev, [key]: e.target.files?.[0] || null }))}
              />
            </label>
          ))}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={(!photos.top && !photos.side) || analyzing}
          className="w-full bg-gray-900 text-white py-3 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs tracking-[0.2em] uppercase transition-colors flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <><RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.5} />診断中...</>
          ) : (
            <><Footprints className="w-4 h-4" strokeWidth={1.5} />足タイプを診断する</>
          )}
        </button>
        <button
          onClick={() => setStep('setup')}
          className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-700 tracking-wider"
        >
          ← 戻る
        </button>
      </div>
    </div>
  );
}

// ================================================================
// ③ AIサイズアシスタント
// ================================================================

interface AISizeAssistantProps {
  shoes: Shoe[];
  footProfile: FootProfile | null;
}

function AISizeAssistant({ shoes, footProfile }: AISizeAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // サイズ相談フォーム
  const [consultBrand, setConsultBrand] = useState('');
  const [consultBrandQuery, setConsultBrandQuery] = useState('');
  const [consultCategory, setConsultCategory] = useState<ShoeCategory>('sneakers');
  const [showConsultDropdown, setShowConsultDropdown] = useState(false);
  const [consultResult, setConsultResult] = useState<ReturnType<typeof getSizeRecommendation> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConsultBrands = BRANDS.filter(b =>
    b.name.toLowerCase().includes(consultBrandQuery.toLowerCase())
  );

  // サイズ相談実行
  const handleConsult = () => {
    if (!consultBrand) return;
    const result = getSizeRecommendation({
      brandName: consultBrand,
      category: consultCategory,
      footProfile,
      pastShoes: shoes,
    });
    setConsultResult(result);
  };

  // チャット送信
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const question = input;
    setInput('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 800));

    const lower = question.toLowerCase();
    let reply = '';

    if (lower.includes('サイズ') || lower.includes('size') || lower.includes('cm')) {
      const size = footProfile?.default_size ?? 'N/A';
      reply = `あなたの通常サイズは ${size}cm です。${shoes.length}足のデータを参考に、「サイズ相談」タブで特定ブランドの推奨サイズを確認できます。`;
    } else if (lower.includes('ブランド') || lower.includes('brand')) {
      const brandCounts = shoes.reduce((acc: Record<string, number>, s) => {
        acc[s.brand] = (acc[s.brand] || 0) + 1;
        return acc;
      }, {});
      const top = Object.entries(brandCounts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([b]) => b);
      reply = top.length > 0
        ? `よく履いているブランド: ${top.join('、')}。これらのブランドのフィードバックからパーソナライズされた推奨が可能です。`
        : 'まだ靴のデータがありません。ダッシュボードから靴を登録してください。';
    } else if (lower.includes('足') || lower.includes('タイプ') || lower.includes('幅')) {
      if (footProfile) {
        const typeLabel = footProfile.foot_type === 'wide' ? '幅広・甲高' : footProfile.foot_type === 'narrow' ? '細め' : '標準';
        reply = `あなたの足タイプは「${typeLabel}」です。この特性を活かしたサイズ推奨が可能です。`;
      } else {
        reply = '足タイプがまだ未診断です。「足タイプ診断」タブで診断を行うと、より精度の高いサイズ推奨ができます。';
      }
    } else if (lower.includes('おすすめ') || lower.includes('next') || lower.includes('次')) {
      const categories = shoes.reduce((acc: Record<string, number>, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
      }, {});
      const least = Object.entries(categories).sort(([, a], [, b]) => a - b)[0];
      reply = least
        ? `${CATEGORY_LABELS[least[0] as ShoeCategory]}のバリエーションがまだ${least[1]}足と少なめです。次の購入候補に検討してみてはいかがでしょうか。`
        : 'ワードローブを充実させましょう！まずはダッシュボードで靴を登録してください。';
    } else {
      reply = 'サイズ・ブランド・足タイプ・次に買うべき靴などについてお答えできます。何でも聞いてください！';
    }

    const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply };
    setMessages(prev => [...prev, assistantMsg]);
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* ── 左: サイズ相談フォーム ── */}
      <div className="border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Search className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
          <h3 className="text-sm tracking-[0.2em] uppercase text-gray-900">サイズ相談</h3>
        </div>

        <div className="space-y-4 mb-5">
          {/* ブランド選択 */}
          <div className="relative">
            <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-1.5">ブランド</label>
            <input
              type="text"
              value={consultBrandQuery}
              onChange={e => {
                setConsultBrandQuery(e.target.value);
                setConsultBrand('');
                setShowConsultDropdown(true);
              }}
              onFocus={() => setShowConsultDropdown(true)}
              placeholder="例: Nike"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide"
            />
            {showConsultDropdown && filteredConsultBrands.length > 0 && !consultBrand && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 shadow-lg max-h-40 overflow-y-auto">
                {filteredConsultBrands.map(b => (
                  <button
                    key={b.name}
                    onClick={() => {
                      setConsultBrand(b.name);
                      setConsultBrandQuery(b.name);
                      setShowConsultDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 tracking-wide"
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-gray-400 mb-1.5">カテゴリ</label>
            <div className="relative">
              <select
                value={consultCategory}
                onChange={e => setConsultCategory(e.target.value as ShoeCategory)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide appearance-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
            </div>
          </div>

          {!footProfile && (
            <p className="text-xs text-amber-600 tracking-wide bg-amber-50 border border-amber-200 p-3">
              足タイプ未診断のため精度が下がります。先に「足タイプ診断」を行うことをお勧めします。
            </p>
          )}
        </div>

        <button
          onClick={handleConsult}
          disabled={!consultBrand}
          className="w-full bg-gray-900 text-white py-2.5 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs tracking-[0.2em] uppercase transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
          サイズを調べる
        </button>

        {/* 推奨結果 */}
        {consultResult && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <div className="bg-gray-900 text-white p-5 text-center mb-4">
              <p className="text-xs tracking-[0.2em] uppercase text-gray-400 mb-1">推奨サイズ</p>
              <p className="text-4xl font-light">{consultResult.recommendedSize}<span className="text-base ml-1">cm</span></p>
              <p className="text-xs text-gray-400 mt-2 tracking-wider">信頼度 {consultResult.confidenceScore}%</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-2">根拠</p>
              <p className="text-xs text-gray-600 tracking-wide leading-relaxed whitespace-pre-line">
                {consultResult.reasoning}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 右: チャット ── */}
      <div className="border border-gray-200 flex flex-col" style={{ height: '520px' }}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
            <h3 className="text-sm tracking-[0.2em] uppercase text-gray-900">AIアシスタント</h3>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" strokeWidth={1} />
              <p className="text-xs tracking-wide mb-4">サイズや靴選びについて何でも聞いてください</p>
              <div className="space-y-1.5 text-xs text-gray-400">
                {['"Nikeは何cmが合う？"', '"次に何を買うべき？"', '"幅広タイプに向いてるブランドは？"'].map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q.replace(/"/g, ''))}
                    className="block w-full text-left border border-gray-100 px-3 py-2 hover:border-gray-300 tracking-wide transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 text-sm tracking-wide leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-800 border border-gray-200'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-200 px-4 py-3 flex gap-1">
                {[0, 100, 200].map(delay => (
                  <div key={delay} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="メッセージを入力..."
            className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-gray-900 text-white px-4 py-2 hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// メインページ
// ================================================================

export default function ShoecloakAdmin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [footProfile, setFootProfile] = useState<FootProfile | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        navigate('/login');
        return;
      }
      setShoes(loadShoes());
      setFootProfile(loadFootProfile());
    }
  }, [user, isAdmin, authLoading, navigate]);

  const refreshShoes = () => setShoes(loadShoes());
  const handleFootProfileUpdate = (profile: FootProfile) => setFootProfile(profile);

  const tabs: { key: TabType; label: string; subLabel: string }[] = [
    { key: 'dashboard',    label: 'ダッシュボード',   subLabel: 'Shoe Dashboard'   },
    { key: 'foot-measure', label: '足タイプ診断',     subLabel: 'Foot Analysis'    },
    { key: 'ai-assistant', label: 'AIサイズ相談',     subLabel: 'Size Assistant'   },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400 font-light tracking-widest text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">

        {/* ページヘッダー */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Footprints className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            <h1 className="text-2xl tracking-[0.3em] font-light text-gray-900 uppercase">
              SHOECLOAK
            </h1>
          </div>
          <p className="text-xs tracking-[0.15em] text-gray-500">
            靴の管理・足タイプ診断・サイズ推奨 / Shoe Wardrobe & Size Intelligence
          </p>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-4 text-left transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <p className="text-xs tracking-[0.15em] uppercase">{tab.label}</p>
              <p className="text-xs tracking-wider text-gray-400 mt-0.5">{tab.subLabel}</p>
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'dashboard' && (
          <ShoesDashboard
            shoes={shoes}
            onShoesChange={refreshShoes}
            footProfile={footProfile}
          />
        )}
        {activeTab === 'foot-measure' && (
          <FootMeasurementTab
            footProfile={footProfile}
            onProfileUpdate={handleFootProfileUpdate}
          />
        )}
        {activeTab === 'ai-assistant' && (
          <AISizeAssistant
            shoes={shoes}
            footProfile={footProfile}
          />
        )}
      </div>
    </div>
  );
}

