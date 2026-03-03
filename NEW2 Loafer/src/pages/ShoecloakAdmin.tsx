import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Shoe, FootProfile, ShoeCategory, FitFeedback, FootType,
  BRANDS, CATEGORY_LABELS, CATEGORY_SIZE_ADJUSTMENT, FIT_FEEDBACK_LABELS,
} from '../shoecloak/types';
import {
  addShoe, deleteShoe, updateShoe, loadFootProfile, saveFootProfile, loadShoes,
} from '../shoecloak/store';
import { getSizeRecommendation } from '../shoecloak/sizeRecommendation';
import {
  Footprints, Plus, Trash2, Camera, Award, TrendingUp,
  MessageCircle, Send, Sparkles, Search, X, ChevronDown,
  Upload, RefreshCw, Check, ShoppingBag, BarChart2,
  Box, Users, Edit2, DollarSign, Ruler,
} from 'lucide-react';

// ================================================================
// 定数・型
// ================================================================

type TabType = 'home' | 'shoecloak' | 'foot-measure' | 'ai-assistant' | 'community';
type ShoeGroup = 'all' | 'formal' | 'casual' | 'sports' | 'other';
type AiSubTab = 'size-advice' | 'wardrobe-analysis' | 'community-explore';

interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; }
interface BulkEntry  { brand: string; model: string; size: string; fit_feedback: FitFeedback; photo: File | null; }

const SHOE_GROUP_MAP: Record<ShoeCategory, ShoeGroup> = {
  dress_shoes:      'formal',
  loafers:          'formal',
  sneakers:         'casual',
  casual_shoes:     'casual',
  sandals:          'casual',
  running_shoes:    'sports',
  basketball_shoes: 'sports',
  hiking_boots:     'sports',
  work_boots:       'other',
  boots:            'other',
};

const GROUP_LABELS: Record<ShoeGroup, { ja: string; en: string }> = {
  all:    { ja: 'すべて',     en: 'ALL'    },
  formal: { ja: 'フォーマル', en: 'FORMAL' },
  casual: { ja: 'カジュアル', en: 'CASUAL' },
  sports: { ja: 'スポーツ',   en: 'SPORTS' },
  other:  { ja: 'その他',     en: 'OTHER'  },
};

const FIT_EN: Record<FitFeedback, string> = {
  too_small:      'Too Small',
  slightly_small: 'Slightly Small',
  perfect:        'Perfect',
  slightly_large: 'Slightly Large',
  too_large:      'Too Large',
};

// ================================================================
// 簡易診断モーダル（Boltデザイン準拠）
// ================================================================
interface QuickShoeEntry { brand: string; size: string; fit_feedback: FitFeedback; }
const EMPTY_ENTRY = (): QuickShoeEntry => ({ brand: '', size: '', fit_feedback: 'perfect' });

function QuickDiagModal({ shoes, footProfile, onClose }: { shoes: Shoe[]; footProfile: FootProfile | null; onClose: () => void }) {
  const [entries, setEntries]     = useState<QuickShoeEntry[]>([EMPTY_ENTRY()]);
  const [targetUrl, setTargetUrl] = useState('');
  const [result, setResult]       = useState<{ recommendedSize: number; targetBrand: string; confidenceScore: number; reasoning: string } | null>(null);
  const [loading, setLoading]     = useState(false);

  const addEntry = () => { if (entries.length < 5) setEntries(p => [...p, EMPTY_ENTRY()]); };
  const updateEntry = (i: number, patch: Partial<QuickShoeEntry>) => {
    setEntries(p => p.map((e, idx) => idx === i ? { ...e, ...patch } : e));
    setResult(null);
  };
  const detectBrand = (url: string) => BRANDS.find(b => url.toLowerCase().includes(b.name.toLowerCase()))?.name ?? '';

  const handleCheck = async () => {
    const valid = entries.filter(e => e.brand && e.size);
    if (valid.length === 0) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const urlBrand    = targetUrl ? detectBrand(targetUrl) : '';
    const targetBrand = urlBrand || valid[0].brand;
    const perfect     = valid.filter(e => e.fit_feedback === 'perfect');
    const base        = perfect.length > 0 ? perfect.reduce((s, e) => s + parseFloat(e.size), 0) / perfect.length : parseFloat(valid[0].size);
    const tempShoes: Shoe[] = valid.map((e, i) => ({ id: `q${i}`, brand: e.brand, category: 'sneakers' as ShoeCategory, size: parseFloat(e.size), fit_feedback: e.fit_feedback, status: 'active' as const, created_at: '' }));
    const r = getSizeRecommendation({ brandName: targetBrand, category: 'sneakers', footProfile: { foot_type: footProfile?.foot_type ?? 'standard', default_size: base, updated_at: '' }, pastShoes: [...shoes, ...tempShoes] });
    setResult({ ...r, targetBrand });
    setLoading(false);
  };

  const fitOptions: { value: FitFeedback; label: string }[] = [
    { value: 'too_small', label: 'かなり小さい / Too Small' }, { value: 'slightly_small', label: 'やや小さい / Slightly Small' },
    { value: 'perfect', label: 'ぴったり / Perfect' }, { value: 'slightly_large', label: 'やや大きい / Slightly Large' }, { value: 'too_large', label: 'かなり大きい / Too Large' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl shadow-2xl rounded-2xl my-8 overflow-hidden">
        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 px-8 pt-10 pb-8 text-center">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white"><X className="w-6 h-6" strokeWidth={1.5} /></button>
          <h2 className="text-3xl font-bold text-white mb-1">簡易サイズチェック</h2>
          <p className="text-lg font-semibold text-white/90 mb-3">Quick Size Check</p>
          <p className="text-sm text-white/70">持っている靴の情報を入力して、最適なサイズを見つけましょう<br /><span className="text-white/50">Enter your shoe info to find your perfect size</span></p>
        </div>
        <div className="px-8 py-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">持っている靴 / Your Shoes <span className="text-blue-600">({entries.length}/5)</span></h3>
              {entries.length < 5 && (
                <button onClick={addEntry} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
                  <Plus className="w-4 h-4" strokeWidth={2} />追加 / Add
                </button>
              )}
            </div>
            <div className="space-y-3">
              {entries.map((entry, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between mb-4">
                    <p className="text-sm font-semibold text-gray-700">靴 {i + 1} / Shoe {i + 1}</p>
                    {entries.length > 1 && <button onClick={() => setEntries(p => p.filter((_, idx) => idx !== i))}><X className="w-4 h-4 text-gray-300 hover:text-red-400" strokeWidth={1.5} /></button>}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select value={entry.brand} onChange={e => updateEntry(i, { brand: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select brand...</option>
                          {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">サイズ / Size (cm)</label>
                      <input type="number" step="0.5" min="20" max="35" value={entry.size} onChange={e => updateEntry(i, { size: e.target.value })} placeholder="26.5"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">フィット感 / Fit</label>
                      <div className="relative">
                        <select value={entry.fit_feedback} onChange={e => updateEntry(i, { fit_feedback: e.target.value as FitFeedback })}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {fitOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">欲しい靴のURL / Target Shoe URL <span className="text-xs text-gray-400 font-normal">（任意）</span></label>
            <input type="url" value={targetUrl} onChange={e => { setTargetUrl(e.target.value); setResult(null); }} placeholder="https://..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {targetUrl && detectBrand(targetUrl) && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />{detectBrand(targetUrl)} を検出</p>}
          </div>
          <button onClick={handleCheck} disabled={entries.every(e => !e.brand || !e.size) || loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 disabled:opacity-40 font-semibold text-sm flex items-center justify-center gap-2">
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" strokeWidth={2} />診断中...</> : <><Search className="w-4 h-4" strokeWidth={2} />サイズを診断 / Check Size</>}
          </button>
          {result && (
            <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider text-center mb-1">{result.targetBrand} の推奨サイズ</p>
              <p className="text-5xl font-bold text-blue-700 text-center mb-1">{result.recommendedSize}<span className="text-xl font-normal text-blue-400 ml-1">cm</span></p>
              <p className="text-xs text-blue-400 text-center mb-4">信頼度 {result.confidenceScore}%</p>
              <div className="bg-white rounded-lg p-4 text-xs text-gray-600 leading-relaxed whitespace-pre-line">{result.reasoning}</div>
            </div>
          )}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
            <h4 className="text-lg font-bold mb-0.5">さらに精度を上げませんか？</h4>
            <p className="text-sm font-semibold text-white/80 mb-3">Want More Accurate Results?</p>
            <p className="text-sm text-white/80 leading-relaxed mb-4">足タイプ診断をすると、より詳細な足の情報を登録でき、精度の高いサイズ診断が可能になります。</p>
            <ul className="space-y-2 text-sm">
              {['足の詳細な計測データを保存', 'ブランド別のサイズ傾向を分析', '靴コレクションの管理', 'AI powered サイズレコメンド'].map(item => (
                <li key={item} className="flex items-center gap-2 text-white/90"><Check className="w-4 h-4 text-white/70" strokeWidth={2.5} />{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 靴追加モーダル（単体）
// ================================================================
function AddShoeModal({ onClose, onAdd, editShoe }: { onClose: () => void; onAdd: () => void; editShoe?: Shoe }) {
  const [form, setForm] = useState({
    brand: editShoe?.brand ?? '', brandQuery: editShoe?.brand ?? '',
    model: editShoe?.model ?? '', category: (editShoe?.category ?? 'sneakers') as ShoeCategory,
    size: editShoe?.size?.toString() ?? '', fit_feedback: (editShoe?.fit_feedback ?? 'perfect') as FitFeedback,
    purchase_date: editShoe?.purchase_date ?? '', notes: editShoe?.notes ?? '',
  });
  const [showDrop, setShowDrop] = useState(false);
  const [error, setError]       = useState('');

  const filteredBrands = BRANDS.filter(b => b.name.toLowerCase().includes(form.brandQuery.toLowerCase()));

  const handleSubmit = () => {
    if (!form.brand || !form.size) { setError('ブランドとサイズは必須です'); return; }
    const data = { brand: form.brand, model: form.model || undefined, category: form.category, size: parseFloat(form.size), fit_feedback: form.fit_feedback, purchase_date: form.purchase_date || undefined, notes: form.notes || undefined, status: 'active' as const };
    if (editShoe) { updateShoe(editShoe.id, data); } else { addShoe(data); }
    onAdd();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-8 my-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-900">{editShoe ? '靴を編集' : '靴を追加'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-900" strokeWidth={1.5} /></button>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">ブランド <span className="text-gray-900">*</span></label>
            <input type="text" value={form.brandQuery} onChange={e => { setForm(p => ({ ...p, brandQuery: e.target.value, brand: '' })); setShowDrop(true); }} onFocus={() => setShowDrop(true)} placeholder="例: Nike"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
            {form.brand && <span className="absolute right-3 top-8 text-xs text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />{form.brand}</span>}
            {showDrop && filteredBrands.length > 0 && !form.brand && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto mt-1">
                {filteredBrands.map(b => (
                  <button key={b.name} onClick={() => { setForm(p => ({ ...p, brand: b.name, brandQuery: b.name })); setShowDrop(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex justify-between">
                    <span>{b.name}</span>
                    <span className="text-xs text-gray-400">{b.width_tendency === 'wide' ? '幅広' : b.width_tendency === 'narrow' ? '細め' : '標準'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">モデル名（任意）</label>
            <input type="text" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="例: Air Max 90"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">カテゴリ</label>
              <div className="relative">
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as ShoeCategory }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900">
                  {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">サイズ (cm) <span className="text-gray-900">*</span></label>
              <input type="number" step="0.5" min="20" max="35" value={form.size} onChange={e => setForm(p => ({ ...p, size: e.target.value }))} placeholder="26.5"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">フィット感</label>
            <div className="grid grid-cols-5 gap-1">
              {(Object.entries(FIT_FEEDBACK_LABELS) as [FitFeedback, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setForm(p => ({ ...p, fit_feedback: key }))}
                  className={`py-2 text-xs rounded-lg transition-colors ${form.fit_feedback === key ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">購入日（任意）</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">メモ（任意）</label>
              <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="着心地など"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg hover:border-gray-900 text-sm font-medium transition-colors">キャンセル</button>
            <button onClick={handleSubmit} className="flex-1 bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors">{editShoe ? '保存する' : '追加する'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 一括登録モーダル（Bolt BulkAddForm デザイン）
// ================================================================
const EMPTY_BULK = (): BulkEntry => ({ brand: '', model: '', size: '', fit_feedback: 'perfect', photo: null });

function BulkAddModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [entries, setEntries] = useState<BulkEntry[]>([EMPTY_BULK(), EMPTY_BULK()]);
  const [error, setError]     = useState('');

  const addEntry = () => setEntries(p => [...p, EMPTY_BULK()]);
  const removeEntry = (i: number) => { if (entries.length > 1) setEntries(p => p.filter((_, idx) => idx !== i)); };
  const updateEntry = (i: number, patch: Partial<BulkEntry>) => setEntries(p => p.map((e, idx) => idx === i ? { ...e, ...patch } : e));

  const handleSubmit = () => {
    const valid = entries.filter(e => e.brand && e.size);
    if (valid.length === 0) { setError('1足以上入力してください'); return; }
    valid.forEach(e => addShoe({ brand: e.brand, model: e.model || undefined, category: 'sneakers', size: parseFloat(e.size), fit_feedback: e.fit_feedback, status: 'active' }));
    onAdd();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl my-8">
        {/* タイトルバー */}
        <div className="flex items-start justify-between p-8 pb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">複数の靴を一括登録</h2>
            <p className="text-sm text-gray-400 mt-1">まとめて登録して効率アップ</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={addEntry} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors">
              <Plus className="w-4 h-4" strokeWidth={2} />靴を追加
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-900" strokeWidth={1.5} /></button>
          </div>
        </div>

        <div className="px-8 pb-8 space-y-4">
          {entries.map((entry, i) => (
            <div key={i} className="border border-gray-200 p-6 relative">
              <button onClick={() => removeEntry(i)} className="absolute top-4 right-4 text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <div className="inline-block bg-gray-900 text-white text-xs font-bold px-3 py-1 mb-5">靴 #{i + 1}</div>

              {/* 写真アップロード */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">写真 <span className="text-red-500">*</span></label>
                <label className="inline-block cursor-pointer">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 hover:border-gray-900 transition-colors flex flex-col items-center justify-center gap-2">
                    {entry.photo ? (
                      <img src={URL.createObjectURL(entry.photo)} className="w-full h-full object-cover" alt="preview" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
                        <span className="text-xs text-gray-400">写真を追加</span>
                      </>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => updateEntry(i, { photo: e.target.files?.[0] ?? null })} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={entry.brand} onChange={e => updateEntry(i, { brand: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm appearance-none bg-white">
                      <option value="">Select brand...</option>
                      {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                  </div>
                </div>
                {/* 商品名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">商品名（任意）</label>
                  <input type="text" value={entry.model} onChange={e => updateEntry(i, { model: e.target.value })} placeholder="例: Air Max 90"
                    className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* サイズ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">サイズ <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input type="number" step="0.5" min="20" max="35" value={entry.size} onChange={e => updateEntry(i, { size: e.target.value })} placeholder="26.5"
                      className="flex-1 px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
                    <div className="relative">
                      <select className="px-3 py-3 border border-gray-200 text-sm appearance-none bg-white pr-7 focus:outline-none focus:ring-2 focus:ring-gray-900">
                        <option>cm</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-3.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
                {/* フィット感 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">フィット感 <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={entry.fit_feedback} onChange={e => updateEntry(i, { fit_feedback: e.target.value as FitFeedback })}
                      className="w-full px-4 py-3 border border-gray-200 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                      <option value="too_small">かなり小さい</option>
                      <option value="slightly_small">やや小さい</option>
                      <option value="perfect">ぴったり</option>
                      <option value="slightly_large">やや大きい</option>
                      <option value="too_large">かなり大きい</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-3 hover:border-gray-900 text-sm font-medium transition-colors">キャンセル</button>
            <button onClick={handleSubmit} className="flex-1 bg-gray-900 text-white py-3 hover:bg-gray-700 text-sm font-medium transition-colors">一括登録する</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ① ホーム
// ================================================================
function HomeView({ shoes, footProfile, onTabChange }: { shoes: Shoe[]; footProfile: FootProfile | null; onTabChange: (t: TabType) => void }) {
  const [showQuickDiag, setShowQuickDiag] = useState(false);
  return (
    <div>
      <div className="text-center py-16 border-b border-gray-100 mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">あなたの靴、すべて記録。<br />完璧なサイズを見つける。</h1>
        <p className="text-gray-400 text-base mb-10 max-w-xl mx-auto leading-relaxed">SHOECLOAKは、持っているすべての靴を管理し、AI分析で最適なサイズを提案するサービスです。もう二度とサイズ選びで失敗しません。</p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => onTabChange('shoecloak')} className="bg-gray-900 text-white px-8 py-3.5 hover:bg-gray-700 transition-colors font-medium text-sm">靴を追加する</button>
          <button onClick={() => setShowQuickDiag(true)} className="border border-gray-300 text-gray-700 px-8 py-3.5 hover:border-gray-900 transition-colors font-medium text-sm">簡易サイズチェック</button>
        </div>
      </div>
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">主な機能</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <ShoppingBag className="w-8 h-8 text-gray-500" strokeWidth={1} />, title: '靴のワードローブ管理', desc: '持っている靴をすべて登録。ブランド、モデル、サイズ、フィット感を記録して、あなただけのデータベースを作成。', action: () => onTabChange('shoecloak') },
            { icon: <Sparkles className="w-8 h-8 text-gray-500" strokeWidth={1} />, title: 'AIサイズ推奨', desc: '過去のデータから学習し、新しい靴を買う時に最適なサイズを提案。ブランドごとのサイズの違いも考慮。', action: () => onTabChange('ai-assistant') },
            { icon: <BarChart2 className="w-8 h-8 text-gray-500" strokeWidth={1} />, title: '足タイプ分析', desc: '写真1枚で足タイプを自動判定。幅広・細め・甲高など、あなたの足の特徴に合ったブランドを提案。', action: () => onTabChange('foot-measure') },
          ].map(f => (
            <button key={f.title} onClick={f.action} className="border border-gray-200 p-8 hover:border-gray-900 hover:shadow-sm transition-all text-left group">
              <div className="w-16 h-16 border border-gray-200 flex items-center justify-center mx-auto mb-5 group-hover:border-gray-400 transition-colors">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-3">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">ワードローブのイメージ</h2>
        <p className="text-sm text-gray-400 mb-6">実際のユーザーのシュークローク例（サンプル）</p>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-blue-500" strokeWidth={1.5} /></div>
          <div><p className="font-semibold text-gray-900">サンプルユーザー</p><p className="text-xs text-gray-400">登録靴数: 4足 ｜ 通常サイズ: 27.5cm</p></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[
            { brand: 'Nike', model: 'Air Max 90', cat: 'スニーカー', size: 27.5, fitLabel: 'ぴったり', fitColor: 'text-green-500' },
            { brand: 'Adidas', model: 'Ultraboost 22', cat: 'ランニング', size: 28.0, fitLabel: 'ゆったり', fitColor: 'text-blue-400' },
            { brand: 'New Balance', model: '992', cat: 'スニーカー', size: 27.5, fitLabel: 'ぴったり', fitColor: 'text-green-500' },
            { brand: 'Converse', model: 'Chuck Taylor All Star', cat: 'カジュアル', size: 27.0, fitLabel: 'きつめ', fitColor: 'text-orange-500' },
          ].map(s => (
            <div key={s.brand} className="border border-gray-200 rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div><p className="font-bold text-gray-900">{s.brand}</p><p className="text-sm text-gray-400">{s.model}</p></div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{s.cat}</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">サイズ</span><span className="font-semibold text-gray-900">{s.size}cm</span></div>
                <div className="flex justify-between"><span className="text-gray-400">フィット感</span><span className={`font-semibold ${s.fitColor}`}>{s.fitLabel}</span></div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-lg">💡</span>
          <p className="text-sm text-blue-700 leading-relaxed"><span className="font-semibold">登録すると...</span> あなたも同じように靴を管理できます。ブランドごとのサイズの違いや、フィット感の傾向が一目でわかります。</p>
        </div>
      </div>
      {showQuickDiag && <QuickDiagModal shoes={shoes} footProfile={footProfile} onClose={() => setShowQuickDiag(false)} />}
    </div>
  );
}

// ================================================================
// ② Shoe Cloak ダッシュボード（Bolt Dashboard デザイン）
// ================================================================
function ShoeCloakView({ shoes, onRefresh, footProfile, onTabChange }: { shoes: Shoe[]; onRefresh: () => void; footProfile: FootProfile | null; onTabChange: (t: TabType) => void }) {
  const [filterGroup, setFilterGroup] = useState<ShoeGroup>('all');
  const [showAdd, setShowAdd]         = useState(false);
  const [showBulk, setShowBulk]       = useState(false);
  const [editShoe, setEditShoe]       = useState<Shoe | undefined>(undefined);

  const activeShoes = shoes.filter(s => s.status === 'active');
  const filtered = filterGroup === 'all'
    ? activeShoes
    : activeShoes.filter(s => SHOE_GROUP_MAP[s.category] === filterGroup);

  const handleSell = (id: string) => { updateShoe(id, { status: 'sold' }); onRefresh(); };
  const handleDelete = (id: string) => { if (!window.confirm('削除しますか？')) return; deleteShoe(id); onRefresh(); };

  return (
    <div>
      {/* ── アクションバー ── */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => onTabChange('foot-measure')}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 hover:border-gray-900 transition-colors text-sm">
          <Ruler className="w-4 h-4" strokeWidth={1.5} />足のサイズを測定する
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 hover:bg-gray-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" strokeWidth={2} />靴を追加
          </button>
          <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-5 py-2.5 hover:border-gray-900 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" strokeWidth={2} />まとめて追加
          </button>
        </div>
      </div>

      {/* ── タイトル ── */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 tracking-wide">SHOE CLOAK</h2>
        <p className="text-sm text-gray-400 mt-1">
          {activeShoes.length}足のコレクション / {activeShoes.length} pairs in collection
          {footProfile ? `　｜　通常サイズ: ${footProfile.default_size}cm` : ''}
        </p>
      </div>

      {/* ── カテゴリフィルター ── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {(Object.entries(GROUP_LABELS) as [ShoeGroup, { ja: string; en: string }][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterGroup(key)}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              filterGroup === key ? 'bg-gray-900 text-white' : 'border border-gray-300 text-gray-700 hover:border-gray-900'
            }`}
          >
            {label.ja} / {label.en}
          </button>
        ))}
      </div>

      {/* ── 靴カードグリッド ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200">
          <Box className="w-14 h-14 text-gray-200 mx-auto mb-4" strokeWidth={1} />
          <p className="text-gray-400 mb-2">このカテゴリに靴がありません</p>
          {filterGroup !== 'all' && <button onClick={() => setFilterGroup('all')} className="text-sm text-gray-500 underline">すべて表示</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(shoe => {
            const group = SHOE_GROUP_MAP[shoe.category];
            const groupLabel = GROUP_LABELS[group];
            const sizeDisplay = shoe.size % 1 === 0 ? `${shoe.size}cm` : `${shoe.size}cm`;
            return (
              <div key={shoe.id} className="border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden">
                {/* 靴画像プレースホルダー */}
                <div className="bg-gray-50 h-52 flex items-center justify-center border-b border-gray-100">
                  <Box className="w-14 h-14 text-gray-300" strokeWidth={1} />
                </div>
                {/* 靴情報 */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900 text-lg leading-tight">{shoe.brand}</p>
                      {shoe.model && <p className="text-sm text-gray-400">{shoe.model}</p>}
                    </div>
                    <p className="font-bold text-gray-900 text-lg">{sizeDisplay}</p>
                  </div>
                  <div className="space-y-1 text-sm text-gray-500 mb-4">
                    <div className="flex justify-between">
                      <span className="uppercase tracking-wider text-xs font-medium text-gray-400">CATEGORY:</span>
                      <span>{groupLabel.ja} / {groupLabel.en.charAt(0) + groupLabel.en.slice(1).toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="uppercase tracking-wider text-xs font-medium text-gray-400">FIT:</span>
                      <span>{FIT_EN[shoe.fit_feedback]}</span>
                    </div>
                    {shoe.purchase_date && (
                      <div className="flex justify-between">
                        <span className="uppercase tracking-wider text-xs font-medium text-gray-400">DATE:</span>
                        <span>{shoe.purchase_date}</span>
                      </div>
                    )}
                  </div>
                  {/* アクションボタン */}
                  <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
                    <button onClick={() => setEditShoe(shoe)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 py-2 text-sm text-gray-700 hover:border-gray-900 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />EDIT
                    </button>
                    <button onClick={() => handleSell(shoe.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 py-2 text-sm text-gray-700 hover:border-gray-900 transition-colors">
                      <DollarSign className="w-3.5 h-3.5" strokeWidth={1.5} />SELL
                    </button>
                    <button onClick={() => handleDelete(shoe.id)} className="border border-gray-200 p-2 text-gray-400 hover:border-red-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddShoeModal onClose={() => setShowAdd(false)} onAdd={() => { onRefresh(); setShowAdd(false); }} />}
      {editShoe && <AddShoeModal onClose={() => setEditShoe(undefined)} onAdd={() => { onRefresh(); setEditShoe(undefined); }} editShoe={editShoe} />}
      {showBulk && <BulkAddModal onClose={() => setShowBulk(false)} onAdd={() => { onRefresh(); setShowBulk(false); }} />}
    </div>
  );
}

// ================================================================
// ③ 足タイプ診断
// ================================================================
function FootMeasurementTab({ footProfile, onProfileUpdate }: { footProfile: FootProfile | null; onProfileUpdate: (p: FootProfile) => void }) {
  const [step, setStep]         = useState<'setup' | 'upload' | 'result'>('setup');
  const [defaultSize, setDefaultSize] = useState(footProfile?.default_size?.toString() ?? '');
  const [photos, setPhotos]     = useState<{ top: File | null; side: File | null }>({ top: null, side: null });
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]     = useState<{ foot_type: FootType; percentile: number; recommendations: string[] } | null>(null);

  const handleAnalyze = async () => {
    if (!photos.top && !photos.side) return;
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 2500));
    const r = { foot_type: 'wide' as FootType, percentile: 18, recommendations: ['New Balance（幅広設計）', 'Asics（日本人向け）', 'Merrell（ワイドフィット）'] };
    const profile: FootProfile = { foot_type: r.foot_type, default_size: parseFloat(defaultSize) || 26.0, updated_at: new Date().toISOString() };
    saveFootProfile(profile); onProfileUpdate(profile); setResult(r); setAnalyzing(false); setStep('result');
  };
  const handleSaveSize = () => {
    if (!defaultSize) return;
    const profile: FootProfile = { foot_type: footProfile?.foot_type ?? 'standard', default_size: parseFloat(defaultSize), updated_at: new Date().toISOString() };
    saveFootProfile(profile); onProfileUpdate(profile); setStep('upload');
  };

  if (step === 'result' && result) return (
    <div className="max-w-2xl mx-auto">
      <div className="border border-gray-200 rounded-xl p-8">
        <div className="text-center mb-8"><Award className="w-14 h-14 text-gray-900 mx-auto mb-4" strokeWidth={1} /><h2 className="text-xl font-semibold text-gray-900 mb-1">診断結果</h2></div>
        <div className="bg-gray-900 text-white p-8 text-center rounded-xl mb-6">
          <p className="text-xs text-gray-400 mb-3">あなたの足は</p>
          <h3 className="text-3xl font-bold mb-4">{result.foot_type === 'wide' ? '幅広・甲高タイプ' : result.foot_type === 'narrow' ? '細め・華奢タイプ' : '標準タイプ'}</h3>
          <div className="flex items-center justify-center gap-2 text-gray-300"><TrendingUp className="w-4 h-4" strokeWidth={1.5} /><span className="text-sm">日本人上位 {result.percentile}%</span></div>
        </div>
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-400 mb-3">おすすめブランド</p>
          <div className="space-y-2">{result.recommendations.map((b, i) => (<div key={i} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3"><div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div><span className="text-sm text-gray-700">{b}</span></div>))}</div>
        </div>
        <button onClick={() => { setStep('setup'); setPhotos({ top: null, side: null }); setResult(null); }} className="w-full border border-gray-200 rounded-lg text-gray-600 py-3 hover:border-gray-900 text-sm font-medium transition-colors">再診断する</button>
      </div>
    </div>
  );

  if (step === 'setup') return (
    <div className="max-w-2xl mx-auto">
      <div className="border border-gray-200 rounded-xl p-8">
        <div className="text-center mb-8"><Footprints className="w-12 h-12 text-gray-700 mx-auto mb-4" strokeWidth={1} /><h2 className="text-lg font-semibold text-gray-900 mb-1">足タイプ診断</h2></div>
        {footProfile && <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-600"><p className="text-xs font-medium text-gray-400 mb-1">現在の登録情報</p><p>通常サイズ: {footProfile.default_size}cm　足タイプ: {footProfile.foot_type === 'wide' ? '幅広' : footProfile.foot_type === 'narrow' ? '細め' : '標準'}</p></div>}
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">普段履いている靴のサイズ (cm) <span className="text-gray-900">*</span></label>
          <input type="number" step="0.5" min="20" max="35" value={defaultSize} onChange={e => setDefaultSize(e.target.value)} placeholder="26.5" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
        </div>
        <button onClick={handleSaveSize} disabled={!defaultSize} className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-700 disabled:opacity-40 text-sm font-medium transition-colors">次へ：写真撮影</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="border border-gray-200 rounded-xl p-8">
        <div className="text-center mb-8"><Camera className="w-12 h-12 text-gray-700 mx-auto mb-4" strokeWidth={1} /><h2 className="text-lg font-semibold text-gray-900 mb-1">写真を撮影</h2><p className="text-xs text-gray-400">A4用紙を足元に置いて撮影すると精度が向上します</p></div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6"><ul className="text-xs text-blue-700 space-y-1.5"><li>• A4用紙を足元に置き、真上から撮影（スケール基準）</li><li>• 影が入らない明るい場所で撮影してください</li><li>• 上面・側面の2方向で精度が上がります</li></ul></div>
        <div className="space-y-3 mb-6">
          {[{ key: 'top' as const, label: '上面撮影', desc: '足を平らな場所に置いて真上から' }, { key: 'side' as const, label: '側面撮影', desc: '足の側面（甲の高さを確認）' }].map(({ key, label, desc }) => (
            <label key={key} className="block border-2 border-dashed border-gray-200 hover:border-gray-900 rounded-xl cursor-pointer p-5 transition-colors">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-gray-900 mb-0.5">{label}</p><p className="text-xs text-gray-400">{desc}</p>{photos[key] && <p className="text-xs text-green-600 mt-1">✓ {photos[key]!.name}</p>}</div>
                <div className="w-10 h-10 border border-gray-200 rounded-lg flex items-center justify-center"><Upload className="w-5 h-5 text-gray-400" strokeWidth={1.5} /></div>
              </div>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setPhotos(p => ({ ...p, [key]: e.target.files?.[0] || null }))} />
            </label>
          ))}
        </div>
        <button onClick={handleAnalyze} disabled={(!photos.top && !photos.side) || analyzing}
          className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-700 disabled:opacity-40 text-sm font-medium flex items-center justify-center gap-2 mb-2">
          {analyzing ? <><RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.5} />診断中...</> : <><Footprints className="w-4 h-4" strokeWidth={1.5} />足タイプを診断する</>}
        </button>
        <button onClick={() => setStep('setup')} className="w-full py-2 text-xs text-gray-400 hover:text-gray-700">← 戻る</button>
      </div>
    </div>
  );
}

// ================================================================
// ④ AIアシスタント（Bolt AI Assistant デザイン）
// ================================================================
function AISizeAssistant({ shoes, footProfile }: { shoes: Shoe[]; footProfile: FootProfile | null }) {
  const [aiTab, setAiTab]     = useState<AiSubTab>('size-advice');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [consultBrand, setConsultBrand]     = useState('');
  const [consultBrandQuery, setConsultBrandQuery] = useState('');
  const [consultCategory, setConsultCategory] = useState<ShoeCategory>('sneakers');
  const [showDrop, setShowDrop] = useState(false);
  const [consultResult, setConsultResult] = useState<ReturnType<typeof getSizeRecommendation> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const filteredBrands = BRANDS.filter(b => b.name.toLowerCase().includes(consultBrandQuery.toLowerCase()));

  const handleConsult = () => {
    if (!consultBrand) return;
    setConsultResult(getSizeRecommendation({ brandName: consultBrand, category: consultCategory, footProfile, pastShoes: shoes }));
  };

  const handleSend = async (msg?: string) => {
    const text = msg ?? input;
    if (!text.trim() || loading) return;
    setMessages(p => [...p, { id: Date.now().toString(), role: 'user', content: text }]);
    if (!msg) setInput('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const lower = text.toLowerCase();
    let reply = '';
    if (lower.includes('サイズ') || lower.includes('cm')) reply = `通常サイズは ${footProfile?.default_size ?? 'N/A'}cm です。左の「サイズ相談」で特定ブランドの推奨サイズを確認できます。`;
    else if (lower.includes('ブランド')) {
      const bc = shoes.reduce((a: Record<string, number>, s) => { a[s.brand] = (a[s.brand] || 0) + 1; return a; }, {});
      const top = Object.entries(bc).sort(([, a], [, b]) => b - a).slice(0, 3).map(([b]) => b);
      reply = top.length > 0 ? `よく履くブランド: ${top.join('、')}。` : 'まだ靴データがありません。「Shoe Cloak」タブで追加してください。';
    } else if (lower.includes('足') || lower.includes('タイプ')) {
      reply = footProfile ? `足タイプは「${footProfile.foot_type === 'wide' ? '幅広・甲高' : footProfile.foot_type === 'narrow' ? '細め' : '標準'}」です。` : '足タイプ未診断です。「足タイプ診断」タブで診断してください。';
    } else if (lower.includes('url') || lower.startsWith('http')) {
      const detected = BRANDS.find(b => lower.includes(b.name.toLowerCase()));
      reply = detected ? `URLから ${detected.name} を検出しました。サイズ相談フォームで推奨サイズを確認できます。` : '商品URLからブランドを特定できませんでした。サイズ相談フォームで直接ブランドを選択してください。';
    } else reply = 'サイズ・ブランド・足タイプ、または商品URLについてお答えできます！';
    setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply }]);
    setLoading(false);
  };

  // ワードローブ分析
  const activeShoes = shoes.filter(s => s.status === 'active');
  const brandCounts = activeShoes.reduce((a: Record<string, { count: number; sizes: number[] }>, s) => {
    if (!a[s.brand]) a[s.brand] = { count: 0, sizes: [] };
    a[s.brand].count++; a[s.brand].sizes.push(s.size); return a;
  }, {});
  const categoryCounts = activeShoes.reduce((a: Record<string, number>, s) => { a[s.category] = (a[s.category] || 0) + 1; return a; }, {});
  const fitCounts = activeShoes.reduce((a: Record<string, number>, s) => { a[s.fit_feedback] = (a[s.fit_feedback] || 0) + 1; return a; }, {});

  const aiSubTabs = [
    { key: 'size-advice' as AiSubTab, icon: <MessageCircle className="w-4 h-4" strokeWidth={1.5} />, label: 'AIサイズ推奨' },
    { key: 'wardrobe-analysis' as AiSubTab, icon: <BarChart2 className="w-4 h-4" strokeWidth={1.5} />, label: 'ワードローブ分析' },
    { key: 'community-explore' as AiSubTab, icon: <Users className="w-4 h-4" strokeWidth={1.5} />, label: 'コミュニティ探索' },
  ];

  return (
    <div className="border border-gray-200">
      {/* ヘッダー */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
          <div>
            <h3 className="font-bold text-gray-900 text-lg">AIアシスタント / AI ASSISTANT</h3>
            <p className="text-xs text-gray-400">AIサイズ推奨 - サイズやブランドについて質問してください</p>
          </div>
        </div>
        {/* サブタブ */}
        <div className="flex gap-2">
          {aiSubTabs.map(tab => (
            <button key={tab.key} onClick={() => setAiTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border ${aiTab === tab.key ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-900'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── AIサイズ推奨 ── */}
      {aiTab === 'size-advice' && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* サイズ相談 */}
          <div className="p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Search className="w-4 h-4" strokeWidth={1.5} />サイズ相談</h4>
            <div className="space-y-4 mb-4">
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">ブランド</label>
                <input type="text" value={consultBrandQuery} onChange={e => { setConsultBrandQuery(e.target.value); setConsultBrand(''); setShowDrop(true); }} onFocus={() => setShowDrop(true)} placeholder="例: Nike"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
                {showDrop && filteredBrands.length > 0 && !consultBrand && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {filteredBrands.map(b => <button key={b.name} onClick={() => { setConsultBrand(b.name); setConsultBrandQuery(b.name); setShowDrop(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{b.name}</button>)}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">カテゴリ</label>
                <div className="relative">
                  <select value={consultCategory} onChange={e => setConsultCategory(e.target.value as ShoeCategory)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900">
                    {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                </div>
              </div>
            </div>
            <button onClick={handleConsult} disabled={!consultBrand} className="w-full bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 text-sm font-medium flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />サイズを調べる
            </button>
            {consultResult && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="bg-gray-900 text-white rounded-xl p-4 text-center mb-3">
                  <p className="text-xs text-gray-400 mb-1">推奨サイズ</p>
                  <p className="text-3xl font-bold">{consultResult.recommendedSize}<span className="text-sm font-normal ml-1">cm</span></p>
                  <p className="text-xs text-gray-400 mt-1">信頼度 {consultResult.confidenceScore}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 leading-relaxed whitespace-pre-line">{consultResult.reasoning}</div>
              </div>
            )}
          </div>
          {/* チャット */}
          <div className="flex flex-col" style={{ height: '520px' }}>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-8">
                  <p className="text-sm mb-2">会話を始めて、パーソナライズされたアドバイスを受け取りましょう</p>
                  <p className="text-xs mb-5 text-gray-400">試しに聞いてみてください：</p>
                  <div className="space-y-2">
                    {['"Nikeは何cmがおすすめ？"', '"この商品URLのサイズは？"', '"どのブランドが自分に合ってる？"', '"次に何を買うべき？"'].map(q => (
                      <button key={q} onClick={() => handleSend(q.replace(/"/g, ''))} className="block w-full text-center text-xs text-gray-500 hover:text-gray-900 transition-colors">{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 text-sm rounded-xl leading-relaxed ${msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800 border border-gray-100'}`}>{msg.content}</div>
                </div>
              ))}
              {loading && <div className="flex justify-start"><div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex gap-1">{[0,100,200].map(d => <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div></div>}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="メッセージを入力、または商品URLを貼り付け..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
              <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors">
                <Send className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ワードローブ分析 ── */}
      {aiTab === 'wardrobe-analysis' && (
        <div className="p-6">
          <h4 className="font-semibold text-gray-900 mb-6 flex items-center gap-2"><BarChart2 className="w-4 h-4" strokeWidth={1.5} />ワードローブ分析</h4>
          {activeShoes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 text-gray-200" strokeWidth={1} />
              <p>靴を登録するとワードローブの分析が表示されます</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* ブランド別 */}
              <div className="border border-gray-200 p-5">
                <h5 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-4">ブランド別</h5>
                <div className="space-y-3">
                  {Object.entries(brandCounts).sort(([,a],[,b]) => b.count - a.count).slice(0, 5).map(([brand, data]) => (
                    <div key={brand}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{brand}</span>
                        <span className="text-gray-400">{data.count}足 / 平均{(data.sizes.reduce((a,b)=>a+b,0)/data.sizes.length).toFixed(1)}cm</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full">
                        <div className="bg-gray-900 h-1.5 rounded-full" style={{ width: `${(data.count / activeShoes.length) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* カテゴリ別 */}
              <div className="border border-gray-200 p-5">
                <h5 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-4">カテゴリ別</h5>
                <div className="space-y-3">
                  {Object.entries(categoryCounts).sort(([,a],[,b]) => b-a).map(([cat, count]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{CATEGORY_LABELS[cat as ShoeCategory]}</span>
                        <span className="text-gray-400">{count}足</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full">
                        <div className="bg-gray-500 h-1.5 rounded-full" style={{ width: `${(count / activeShoes.length) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* フィット感傾向 */}
              <div className="border border-gray-200 p-5">
                <h5 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-4">フィット感傾向</h5>
                <div className="space-y-3">
                  {Object.entries(fitCounts).sort(([,a],[,b]) => b-a).map(([fit, count]) => (
                    <div key={fit}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{FIT_FEEDBACK_LABELS[fit as FitFeedback]}</span>
                        <span className="text-gray-400">{count}足</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full">
                        <div className={`h-1.5 rounded-full ${fit === 'perfect' ? 'bg-green-500' : fit.includes('small') ? 'bg-orange-400' : fit.includes('large') ? 'bg-blue-400' : 'bg-red-400'}`} style={{ width: `${(count / activeShoes.length) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {fitCounts['perfect'] > 0 && (
                  <div className="mt-5 bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-700">
                    ぴったりの割合: <span className="font-bold">{Math.round((fitCounts['perfect'] / activeShoes.length) * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── コミュニティ探索 ── */}
      {aiTab === 'community-explore' && (
        <div className="p-6 text-center py-20">
          <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" strokeWidth={1} />
          <p className="text-gray-400 text-sm">まだ公開されているワードローブがありません</p>
        </div>
      )}
    </div>
  );
}

// ================================================================
// ⑤ コミュニティ
// ================================================================
function CommunityView() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
        <h2 className="text-xl font-bold text-gray-900">みんなのワードローブ</h2>
      </div>
      <div className="border border-gray-200 py-24 text-center">
        <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" strokeWidth={1} />
        <p className="text-gray-400 text-sm">まだ公開されているワードローブがありません</p>
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
  const [activeTab, setActiveTab]   = useState<TabType>('home');
  const [shoes, setShoes]           = useState<Shoe[]>([]);
  const [footProfile, setFootProfile] = useState<FootProfile | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) { navigate('/login'); return; }
      setShoes(loadShoes());
      setFootProfile(loadFootProfile());
    }
  }, [user, isAdmin, authLoading, navigate]);

  const refreshShoes = () => setShoes(loadShoes());

  const tabs = [
    { key: 'home'         as TabType, label: 'ホーム',      subLabel: 'Home'          },
    { key: 'shoecloak'    as TabType, label: 'Shoe Cloak',  subLabel: 'My Wardrobe'   },
    { key: 'foot-measure' as TabType, label: '足タイプ診断', subLabel: 'Foot Analysis' },
    { key: 'ai-assistant' as TabType, label: 'AI Assistant',subLabel: 'Size & Analysis'},
    { key: 'community'    as TabType, label: 'Community',   subLabel: 'みんなのワードローブ'},
  ];

  if (authLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="text-gray-400 font-light tracking-widest text-sm">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-white pt-28 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* ページヘッダー */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            <h1 className="text-xl font-bold tracking-widest text-gray-900 uppercase">SHOE CLOAK</h1>
          </div>
          <span className="text-xs text-gray-400">— Shoe Wardrobe & Size Intelligence</span>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200 mb-10 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-6 py-4 transition-colors border-b-2 -mb-px ${activeTab === tab.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
              <p className="text-sm font-medium whitespace-nowrap">{tab.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{tab.subLabel}</p>
            </button>
          ))}
        </div>

        {activeTab === 'home'         && <HomeView shoes={shoes} footProfile={footProfile} onTabChange={setActiveTab} />}
        {activeTab === 'shoecloak'    && <ShoeCloakView shoes={shoes} onRefresh={refreshShoes} footProfile={footProfile} onTabChange={setActiveTab} />}
        {activeTab === 'foot-measure' && <FootMeasurementTab footProfile={footProfile} onProfileUpdate={p => setFootProfile(p)} />}
        {activeTab === 'ai-assistant' && <AISizeAssistant shoes={shoes} footProfile={footProfile} />}
        {activeTab === 'community'    && <CommunityView />}
      </div>
    </div>
  );
}
