import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Shoe, FootProfile, ShoeCategory, FitFeedback,
  UserProfile, ArchHeight, PreferredFit,
  DEFAULT_USER_PROFILE, ARCH_HEIGHT_LABELS, PREFERRED_FIT_LABELS,
  BRANDS, CATEGORY_LABELS, CATEGORY_SIZE_ADJUSTMENT, FIT_FEEDBACK_LABELS,
} from '../shoecloak/types';
import {
  addShoe, deleteShoe, updateShoe,
  loadFootProfile, saveFootProfile,
  loadShoes, loadUserProfile, saveUserProfile,
} from '../shoecloak/store';
import { getSizeRecommendation } from '../shoecloak/sizeRecommendation';
import {
  Plus, Trash2,
  MessageCircle, Send, Sparkles, Search, X, ChevronDown,
  Upload, RefreshCw, Check, ShoppingBag, BarChart2,
  Box, Users, Edit2, DollarSign, Ruler, User, Globe, Save,
} from 'lucide-react';

// ================================================================
// 定数・型
// ================================================================

type TabType = 'home' | 'shoecloak' | 'ai-assistant' | 'community' | 'profile';
type ShoeGroup = 'all' | 'formal' | 'casual' | 'sports' | 'other';

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
  const navigate = useNavigate();
  return (
    <div>
      <div className="text-center py-16 border-b border-gray-100 mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">あなたの靴、すべて記録。<br />完璧なサイズを見つける。</h1>
        <p className="text-gray-400 text-base mb-10 max-w-xl mx-auto leading-relaxed">SHOECLOAKは、持っているすべての靴を管理し、AI分析で最適なサイズを提案するサービスです。もう二度とサイズ選びで失敗しません。</p>

        {/* ① 無料でサイズ測定をするボタン（大） */}
        <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
          <button
            onClick={() => setShowQuickDiag(true)}
            className="w-full bg-gray-900 text-white py-5 px-8 hover:bg-gray-700 transition-colors font-semibold text-base tracking-wide"
          >
            無料でサイズ測定をする
          </button>

          {/* ② ログインボタン + 協力依頼テキスト */}
          <div className="w-full text-center">
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              現在、AIサイズ診断の精度向上に向けてデータを収集しております。<br />
              皆様のご協力を心よりお願い申し上げます。
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full border border-gray-300 text-gray-700 py-3.5 px-8 hover:border-gray-900 transition-colors font-medium text-sm"
            >
              ログインする
            </button>
          </div>
        </div>
      </div>
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">主な機能</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <ShoppingBag className="w-8 h-8 text-gray-500" strokeWidth={1} />, title: '靴のワードローブ管理', desc: '持っている靴をすべて登録。ブランド、モデル、サイズ、フィット感を記録して、あなただけのデータベースを作成。', action: () => onTabChange('shoecloak') },
            { icon: <Sparkles className="w-8 h-8 text-gray-500" strokeWidth={1} />, title: 'AIサイズ推奨', desc: '過去のデータから学習し、新しい靴を買う時に最適なサイズを提案。ブランドごとのサイズの違いも考慮。', action: () => onTabChange('ai-assistant') },
            { icon: <BarChart2 className="w-8 h-8 text-gray-500" strokeWidth={1} />, title: 'ワードローブ分析', desc: '登録した靴からブランド別・カテゴリ別のフィット傾向を分析。あなたの足に最適なブランドを見つけましょう。', action: () => onTabChange('ai-assistant') },
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
  const [showBulk, setShowBulk]       = useState(false);
  const [editShoe, setEditShoe]       = useState<Shoe | undefined>(undefined);

  const activeShoes = shoes.filter(s => s.status === 'active');
  const filtered = filterGroup === 'all'
    ? activeShoes
    : activeShoes.filter(s => SHOE_GROUP_MAP[s.category] === filterGroup);

  const handleSell = (id: string) => { updateShoe(id, { status: 'sold' }); onRefresh(); };
  const handleDelete = (id: string) => { if (!window.confirm('削除しますか？')) return; deleteShoe(id); onRefresh(); };

  const footTypeLabel = footProfile
    ? footProfile.foot_type === 'wide'   ? '幅広・甲高タイプ'
    : footProfile.foot_type === 'narrow' ? '細め・スリムタイプ'
    :                                       '標準タイプ'
    : null;

  return (
    <div>
      {/* ── 足のサイズ測定バナー（目立つ） ── */}
      <div className="flex items-stretch gap-0 border-2 border-gray-900 mb-8 overflow-hidden">
        <button
          onClick={() => onTabChange('profile')}
          className="flex items-center gap-3 bg-gray-900 text-white px-7 py-5 hover:bg-gray-700 transition-colors font-semibold text-sm flex-shrink-0"
        >
          <Ruler className="w-5 h-5" strokeWidth={1.5} />
          <span>足のサイズを<br />測定・登録する</span>
        </button>
        <div className="flex-1 px-6 py-4 flex flex-col justify-center">
          {footTypeLabel ? (
            <>
              <p className="text-xs text-gray-400 mb-0.5">あなたの特徴は...</p>
              <p className="font-bold text-gray-900 text-lg leading-tight">{footTypeLabel}</p>
              <p className="text-xs text-gray-500 mt-1">
                通常サイズ: {footProfile?.default_size}cm
                {footProfile?.foot_width_cm ? `　幅: ${footProfile.foot_width_cm}cm` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-700 text-sm">足の基礎情報を登録するとサイズ診断の精度が上がります</p>
              <p className="text-xs text-gray-400 mt-1">左右の足サイズ・足幅・アーチの高さなどを記録</p>
            </>
          )}
        </div>
      </div>

      {/* ── タイトル + 靴を追加ボタン ── */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-wide">SHOE CLOAK</h2>
          <p className="text-sm text-gray-400 mt-1">
            {activeShoes.length}足のコレクション / {activeShoes.length} pairs in collection
          </p>
        </div>
        {/* まとめて登録 = 靴を追加 */}
        <div className="text-right">
          <button
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 hover:bg-gray-700 transition-colors font-semibold text-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />靴を追加する
          </button>
          <p className="text-xs text-gray-400 mt-1.5">複数の靴をまとめて一括登録できます</p>
        </div>
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

      {editShoe && <AddShoeModal onClose={() => setEditShoe(undefined)} onAdd={() => { onRefresh(); setEditShoe(undefined); }} editShoe={editShoe} />}
      {showBulk && <BulkAddModal onClose={() => setShowBulk(false)} onAdd={() => { onRefresh(); setShowBulk(false); }} />}
    </div>
  );
}


// ================================================================
// ④ AIアシスタント（サブタブなし・チャット上部・スクロール修正）
// ================================================================
function AISizeAssistant({ shoes, footProfile }: { shoes: Shoe[]; footProfile: FootProfile | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [consultBrand, setConsultBrand]         = useState('');
  const [consultBrandQuery, setConsultBrandQuery] = useState('');
  const [consultCategory, setConsultCategory]   = useState<ShoeCategory>('sneakers');
  const [showDrop, setShowDrop]                 = useState(false);
  const [consultResult, setConsultResult]       = useState<ReturnType<typeof getSizeRecommendation> | null>(null);
  const [consultUrl, setConsultUrl]             = useState('');
  const [urlDetectedBrand, setUrlDetectedBrand] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // スクロール修正: メッセージが追加された時だけスクロール（block: nearest でページ全体スクロールを防止）
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages]);

  const handleUrlChange = (url: string) => {
    setConsultUrl(url);
    setConsultResult(null);
    const detected = BRANDS.find(b => url.toLowerCase().includes(b.name.toLowerCase()));
    if (detected) {
      setUrlDetectedBrand(detected.name);
      setConsultBrand(detected.name);
      setConsultBrandQuery(detected.name);
      setShowDrop(false);
    } else {
      setUrlDetectedBrand('');
    }
  };

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
    if (lower.includes('サイズ') || lower.includes('cm')) {
      reply = `通常サイズは ${footProfile?.default_size ?? 'N/A'}cm です。下の「サイズ相談」で特定ブランドの推奨サイズを確認できます。`;
    } else if (lower.includes('ブランド')) {
      const bc = shoes.reduce((a: Record<string, number>, s) => { a[s.brand] = (a[s.brand] || 0) + 1; return a; }, {});
      const top = Object.entries(bc).sort(([, a], [, b]) => b - a).slice(0, 3).map(([b]) => b);
      reply = top.length > 0 ? `よく履くブランド: ${top.join('、')}。` : 'まだ靴データがありません。「Shoe Cloak」タブで追加してください。';
    } else if (lower.includes('足') || lower.includes('タイプ')) {
      reply = footProfile
        ? `足タイプは「${footProfile.foot_type === 'wide' ? '幅広・甲高' : footProfile.foot_type === 'narrow' ? '細め' : '標準'}」です。`
        : '足タイプ未登録です。「基礎情報」タブで足の情報を入力してください。';
    } else if (lower.includes('url') || lower.startsWith('http')) {
      const detected = BRANDS.find(b => lower.includes(b.name.toLowerCase()));
      reply = detected
        ? `URLから ${detected.name} を検出しました。下のサイズ相談フォームで推奨サイズを確認できます。`
        : '商品URLからブランドを特定できませんでした。サイズ相談フォームで直接ブランドを選択してください。';
    } else {
      reply = 'サイズ・ブランド・足タイプ、または商品URLについてお答えできます！';
    }
    setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply }]);
    setLoading(false);
  };

  // ワードローブ分析データ
  const activeShoes = shoes.filter(s => s.status === 'active');
  const brandCounts = activeShoes.reduce((a: Record<string, { count: number; sizes: number[] }>, s) => {
    if (!a[s.brand]) a[s.brand] = { count: 0, sizes: [] };
    a[s.brand].count++; a[s.brand].sizes.push(s.size); return a;
  }, {});
  const categoryCounts = activeShoes.reduce((a: Record<string, number>, s) => { a[s.category] = (a[s.category] || 0) + 1; return a; }, {});
  const fitCounts      = activeShoes.reduce((a: Record<string, number>, s) => { a[s.fit_feedback] = (a[s.fit_feedback] || 0) + 1; return a; }, {});

  return (
    <div className="space-y-6">
      {/* ── ① フリーワード相談（上部・コンパクト） ── */}
      <div className="border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
          <div>
            <h3 className="font-bold text-gray-900">AIチャット相談 / Free Word Consultation</h3>
            <p className="text-xs text-gray-400">サイズ・ブランド・URLを自由に質問できます</p>
          </div>
        </div>
        {/* チャット表示エリア（縦幅を抑制） */}
        <div className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: '260px', minHeight: '120px' }}>
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {['"Nikeは何cmがおすすめ？"', '"この商品URLのサイズは？"', '"どのブランドが自分に合ってる？"', '"次に何を買うべき？"'].map(q => (
                <button key={q} onClick={() => handleSend(q.replace(/"/g, ''))}
                  className="text-xs border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 px-3 py-1.5 rounded-full transition-colors">{q}</button>
              ))}
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 text-sm rounded-xl leading-relaxed ${msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800 border border-gray-100'}`}>{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 flex gap-1">
                {[0,100,200].map(d => <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* 入力欄 */}
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="メッセージを入力、または商品URLを貼り付け..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
          <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors">
            <Send className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── ② サイズ相談フォーム ── */}
      <div className="border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
          <h3 className="font-bold text-gray-900">サイズ相談 / Size Consultation</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左: 入力フォーム */}
          <div className="space-y-4">
            {/* URL入力 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                欲しい靴のURL
                <span className="ml-1.5 text-gray-400 font-normal">（貼り付けるとブランド自動検出）</span>
              </label>
              <input type="url" value={consultUrl} onChange={e => handleUrlChange(e.target.value)} placeholder="https://www.nike.com/..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
              {consultUrl && urlDetectedBrand && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />{urlDetectedBrand} を検出しました</p>
              )}
              {consultUrl && !urlDetectedBrand && (
                <p className="text-xs text-gray-400 mt-1">自動検出できませんでした。下で直接選択してください。</p>
              )}
            </div>
            {/* ブランド */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">ブランド</label>
              <input type="text" value={consultBrandQuery}
                onChange={e => { setConsultBrandQuery(e.target.value); setConsultBrand(''); setUrlDetectedBrand(''); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)} placeholder="例: Nike"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
              {showDrop && filteredBrands.length > 0 && !consultBrand && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {filteredBrands.map(b => (
                    <button key={b.name} onClick={() => { setConsultBrand(b.name); setConsultBrandQuery(b.name); setShowDrop(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{b.name}</button>
                  ))}
                </div>
              )}
            </div>
            {/* カテゴリ */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">カテゴリ</label>
              <div className="relative">
                <select value={consultCategory} onChange={e => setConsultCategory(e.target.value as ShoeCategory)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900">
                  {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
              </div>
            </div>
            <button onClick={handleConsult} disabled={!consultBrand}
              className="w-full bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-40 text-sm font-medium flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />サイズを調べる
            </button>
          </div>
          {/* 右: 結果 */}
          <div className="flex flex-col justify-center">
            {consultResult ? (
              <div>
                <div className="bg-gray-900 text-white rounded-xl p-5 text-center mb-3">
                  <p className="text-xs text-gray-400 mb-1">推奨サイズ</p>
                  <p className="text-4xl font-bold">{consultResult.recommendedSize}<span className="text-base font-normal ml-1">cm</span></p>
                  <p className="text-xs text-gray-400 mt-1">信頼度 {consultResult.confidenceScore}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 leading-relaxed whitespace-pre-line">{consultResult.reasoning}</div>
              </div>
            ) : (
              <div className="text-center text-gray-300 py-8">
                <Sparkles className="w-12 h-12 mx-auto mb-3" strokeWidth={1} />
                <p className="text-sm text-gray-400">URLまたはブランドを入力して<br />サイズを調べましょう</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ③ ワードローブ分析 ── */}
      <div className="border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
          <h3 className="font-bold text-gray-900">ワードローブ分析 / Wardrobe Analysis</h3>
        </div>
        {activeShoes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-200" strokeWidth={1} />
            <p className="text-sm">靴を登録するとここに分析が表示されます</p>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* ブランド別 */}
            <div>
              <h5 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">ブランド別</h5>
              <div className="space-y-2.5">
                {Object.entries(brandCounts).sort(([,a],[,b]) => b.count - a.count).slice(0, 5).map(([brand, data]) => (
                  <div key={brand}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-900">{brand}</span>
                      <span className="text-gray-400">{data.count}足 / {(data.sizes.reduce((a,b)=>a+b,0)/data.sizes.length).toFixed(1)}cm</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full">
                      <div className="bg-gray-900 h-1.5 rounded-full" style={{ width: `${(data.count / activeShoes.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* カテゴリ別 */}
            <div>
              <h5 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">カテゴリ別</h5>
              <div className="space-y-2.5">
                {Object.entries(categoryCounts).sort(([,a],[,b]) => b-a).map(([cat, count]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
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
            <div>
              <h5 className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-3">フィット感傾向</h5>
              <div className="space-y-2.5">
                {Object.entries(fitCounts).sort(([,a],[,b]) => b-a).map(([fit, count]) => (
                  <div key={fit}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-900">{FIT_FEEDBACK_LABELS[fit as FitFeedback]}</span>
                      <span className="text-gray-400">{count}足</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full">
                      <div className={`h-1.5 rounded-full ${fit === 'perfect' ? 'bg-green-500' : fit.includes('small') ? 'bg-orange-400' : 'bg-blue-400'}`}
                        style={{ width: `${(count / activeShoes.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// ⑤ 基礎情報（プロフィール）
// ================================================================
function ProfileView({ onFootProfileUpdate }: { onFootProfileUpdate: (p: FootProfile) => void }) {
  const [profile, setProfile]   = useState<UserProfile>(loadUserProfile());
  const [saved, setSaved]       = useState(false);
  const [diagnosed, setDiagnosed] = useState(false);
  const [diagResult, setDiagResult] = useState<{ foot_type: string; label: string; detail: string } | null>(null);

  const set = <K extends keyof UserProfile>(key: K, val: UserProfile[K]) => {
    setProfile(p => ({ ...p, [key]: val }));
    setSaved(false);
    setDiagnosed(false);
  };

  const handleSave = () => {
    saveUserProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // 足の特徴を診断
  const handleDiagnosis = () => {
    const ll = profile.left_foot_length;
    const rl = profile.right_foot_length;
    const lw = profile.left_foot_width;
    const rw = profile.right_foot_width;

    const avgLen   = ll && rl ? (ll + rl) / 2 : (ll ?? rl ?? null);
    const avgWidth = lw && rw ? (lw + rw) / 2 : (lw ?? rw ?? null);

    if (!avgLen) { alert('足の長さを入力してください'); return; }

    // 足タイプ判定（幅/長さ比率）
    let foot_type: 'wide' | 'standard' | 'narrow' = 'standard';
    let label = '標準タイプ';
    let detail = '一般的な足型です。多くのブランドの標準幅（D〜2E）が合いやすい傾向があります。';

    if (avgWidth) {
      const ratio = avgWidth / avgLen;
      if (ratio > 0.405) {
        foot_type = 'wide';
        label     = '幅広・甲高タイプ';
        detail    = '足幅が広く甲が高い傾向があります。New Balance・Merrell・Dr. Martens などワイド設計のブランドが合いやすいです。';
      } else if (ratio < 0.375) {
        foot_type = 'narrow';
        label     = '細め・スリムタイプ';
        detail    = '足幅が細くスリムな形状です。On Running・Converse などナロー設計のブランドが合いやすい傾向があります。';
      }
    }

    // 推奨サイズ計算（実測長 + 1.5cmの捨て寸）
    const recSize = Math.round((avgLen + 1.5) * 2) / 2;

    // FootProfileを更新
    const footP: FootProfile = {
      foot_type,
      foot_length_cm: avgLen,
      foot_width_cm:  avgWidth ?? undefined,
      default_size:   recSize,
      updated_at:     new Date().toISOString(),
    };
    saveFootProfile(footP);
    onFootProfileUpdate(footP);

    setDiagResult({ foot_type, label, detail });
    setDiagnosed(true);
  };

  const numInput = (
    label: string,
    key: keyof UserProfile,
    placeholder: string,
    unit = 'cm'
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number" step="0.5" min="0"
          value={(profile[key] as number | null) ?? ''}
          onChange={e => set(key, e.target.value === '' ? null : parseFloat(e.target.value) as UserProfile[typeof key])}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm pr-10"
        />
        <span className="absolute right-3 top-3 text-xs text-gray-400">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-8">

      {/* ── 公開設定 ── */}
      <div className="border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
          <h3 className="font-bold text-gray-900 text-base">公開設定 / Privacy Settings</h3>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">表示名 / Display Name</label>
            <input
              type="text"
              value={profile.display_name}
              onChange={e => set('display_name', e.target.value)}
              placeholder="表示名を入力 / Enter display name"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">公開プロフィールで表示される名前です / Name shown on public profile</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.is_public}
              onChange={e => set('is_public', e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-gray-900"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">プロフィールを公開する / Make profile public</p>
              <p className="text-xs text-gray-400 mt-0.5">あなたのワードローブが他のユーザーに表示されます / Your wardrobe will be visible to other users</p>
            </div>
          </label>
        </div>
      </div>

      {/* ── プロフィール基礎情報 ── */}
      <div className="border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
          <h3 className="font-bold text-gray-900 text-base">プロフィール / Profile</h3>
        </div>

        <div className="space-y-5">
          {/* 年齢・身長・体重 */}
          <div className="grid grid-cols-3 gap-4">
            {numInput('年齢 / Age', 'age', '38', '歳')}
            {numInput('身長 / Height', 'height_cm', '170')}
            {numInput('体重 / Weight', 'weight_kg', '70', 'kg')}
          </div>

          {/* 左右の足の長さ */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">足の長さ / Foot Length (cm)</p>
            <div className="grid grid-cols-2 gap-4">
              {numInput('左足 / Left', 'left_foot_length', '25.5')}
              {numInput('右足 / Right', 'right_foot_length', '25.5')}
            </div>
          </div>

          {/* 左右の足の幅 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">足の幅 / Foot Width (cm)</p>
            <div className="grid grid-cols-2 gap-4">
              {numInput('左足 / Left', 'left_foot_width', '10.0')}
              {numInput('右足 / Right', 'right_foot_width', '10.0')}
            </div>
          </div>

          {/* アーチの高さ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">アーチの高さ / Arch Height</label>
            <div className="relative">
              <select
                value={profile.arch_height ?? ''}
                onChange={e => set('arch_height', (e.target.value || null) as ArchHeight | null)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">選択してください / Select</option>
                {(Object.entries(ARCH_HEIGHT_LABELS) as [ArchHeight, string][]).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
            </div>
          </div>

          {/* 好みのフィット感 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">好みのフィット感 / Preferred Fit</label>
            <div className="relative">
              <select
                value={profile.preferred_fit ?? ''}
                onChange={e => set('preferred_fit', (e.target.value || null) as PreferredFit | null)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">選択してください / Select</option>
                {(Object.entries(PREFERRED_FIT_LABELS) as [PreferredFit, string][]).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* 診断ボタン */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <button
            onClick={handleDiagnosis}
            className="w-full flex items-center justify-center gap-2 border-2 border-gray-900 text-gray-900 py-3 hover:bg-gray-900 hover:text-white transition-colors font-semibold text-sm"
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            足の特徴を診断する / Analyze Foot Type
          </button>
        </div>

        {/* 診断結果 */}
        {diagnosed && diagResult && (
          <div className="mt-4 bg-gray-900 text-white rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">あなたの足の特徴</p>
            <p className="text-xl font-bold mb-2">{diagResult.label}</p>
            <p className="text-sm text-gray-300 leading-relaxed">{diagResult.detail}</p>
            <p className="text-xs text-gray-400 mt-3">※ 推奨サイズと足タイプを「Shoe Cloak」に反映しました</p>
          </div>
        )}
      </div>

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 hover:bg-gray-700 transition-colors font-semibold text-sm"
      >
        {saved ? <><Check className="w-4 h-4" strokeWidth={2.5} />保存しました！</> : <><Save className="w-4 h-4" strokeWidth={1.5} />基礎情報を保存する</>}
      </button>
    </div>
  );
}

// ================================================================
// ⑥ コミュニティ
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
  const [activeTab, setActiveTab]     = useState<TabType>('home');
  const [shoes, setShoes]             = useState<Shoe[]>([]);
  const [footProfile, setFootProfile] = useState<FootProfile | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) { navigate('/login'); return; }
      setShoes(loadShoes());
      setFootProfile(loadFootProfile());
    }
  }, [user, isAdmin, authLoading, navigate]);

  const refreshShoes = () => setShoes(loadShoes());

  // タブ切り替え時にページトップへスクロール
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const tabs = [
    { key: 'home'         as TabType, label: 'ホーム',      subLabel: 'Home'          },
    { key: 'shoecloak'    as TabType, label: 'Shoe Cloak',  subLabel: 'My Wardrobe'   },
    { key: 'ai-assistant' as TabType, label: 'AI Assistant',subLabel: 'Size & Analysis'},
    { key: 'community'    as TabType, label: 'Community',   subLabel: 'みんなのワードローブ'},
    { key: 'profile'      as TabType, label: '基礎情報',     subLabel: 'My Profile'    },
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
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`flex-shrink-0 px-6 py-4 transition-colors border-b-2 -mb-px ${activeTab === tab.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
              <p className="text-sm font-medium whitespace-nowrap">{tab.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{tab.subLabel}</p>
            </button>
          ))}
        </div>

        {activeTab === 'home'         && <HomeView shoes={shoes} footProfile={footProfile} onTabChange={handleTabChange} />}
        {activeTab === 'shoecloak'    && <ShoeCloakView shoes={shoes} onRefresh={refreshShoes} footProfile={footProfile} onTabChange={handleTabChange} />}
        {activeTab === 'ai-assistant' && <AISizeAssistant shoes={shoes} footProfile={footProfile} />}
        {activeTab === 'community'    && <CommunityView />}
        {activeTab === 'profile'      && <ProfileView onFootProfileUpdate={p => { setFootProfile(p); }} />}
      </div>
    </div>
  );
}
