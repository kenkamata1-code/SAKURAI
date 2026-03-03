import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Shoe, FootProfile, FootMeasurement, ShoeCategory, FitFeedback,
  ToeShape, SizeUnit, TOE_SHAPE_LABELS, SIZE_UNIT_LABELS,
  convertSizeFromCm, convertSizeToCm,
  UserProfile, ArchHeight, PreferredFit,
  ARCH_HEIGHT_LABELS, PREFERRED_FIT_LABELS,
  BRANDS, CATEGORY_LABELS, FIT_FEEDBACK_LABELS,
} from '../shoecloak/types';
import {
  addShoe, deleteShoe, updateShoe,
  loadFootProfile, saveFootProfile,
  loadShoes, loadUserProfile, saveUserProfile,
  loadMeasurements, saveMeasurement, deleteMeasurement,
  loadCustomBrands, addCustomBrand,
} from '../shoecloak/store';
import { getSizeRecommendation } from '../shoecloak/sizeRecommendation';
import {
  Plus, Trash2,
  MessageCircle, Send, Sparkles, Search, X, ChevronDown,
  Upload, RefreshCw, Check, ShoppingBag,
  Box, Users, Edit2, DollarSign, Ruler, User, Globe, Save,
  Smartphone, AlertCircle, Info, ChevronRight,
} from 'lucide-react';

// ファイルをbase64に変換するユーティリティ
function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// デバイス判定
const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(UA);
const IS_IOS    = /iPhone|iPad|iPod/i.test(UA);
const IS_ANDROID = IS_MOBILE && !IS_IOS; // Androidデバイス判定

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
// 靴追加・編集モーダル（大文字変換・カスタムブランド・サイズ単位・画像3枚）
// ================================================================
function AddShoeModal({ onClose, onAdd, editShoe }: { onClose: () => void; onAdd: () => void; editShoe?: Shoe }) {
  const stdBrandNames   = BRANDS.map(b => b.name.toUpperCase());
  const [customBrands, setCustomBrands] = useState<string[]>(loadCustomBrands());
  const allBrands       = [...stdBrandNames, ...customBrands].sort();

  const [form, setForm] = useState({
    brand:         editShoe?.brand ?? '',
    brandQuery:    editShoe?.brand ?? '',
    model:         editShoe?.model ?? '',
    category:      (editShoe?.category ?? 'sneakers') as ShoeCategory,
    sizeInput:     editShoe?.size?.toString() ?? '',
    sizeUnit:      'cm' as SizeUnit,
    fit_feedback:  (editShoe?.fit_feedback ?? 'perfect') as FitFeedback,
    purchase_date: editShoe?.purchase_date ?? '',
    notes:         editShoe?.notes ?? '',
  });
  const [photos, setPhotos] = useState<string[]>(editShoe?.photos ?? []);
  const [showDrop, setShowDrop] = useState(false);
  const [error, setError]       = useState('');
  const [canAddCustom, setCanAddCustom] = useState(false);

  const filteredBrands = allBrands.filter(b => b.toLowerCase().includes(form.brandQuery.toLowerCase()));

  const handleBrandQuery = (q: string) => {
    const upper = q.toUpperCase();
    setForm(p => ({ ...p, brandQuery: upper, brand: '' }));
    setShowDrop(true);
    setCanAddCustom(upper.length > 1 && !allBrands.includes(upper));
  };

  const handleAddCustomBrand = () => {
    const upper = form.brandQuery.toUpperCase();
    addCustomBrand(upper);
    const updated = loadCustomBrands();
    setCustomBrands(updated);
    setForm(p => ({ ...p, brand: upper, brandQuery: upper }));
    setShowDrop(false);
    setCanAddCustom(false);
  };

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 3) return;
    const b64 = await fileToBase64(file);
    setPhotos(p => [...p, b64]);
  };

  const handleSubmit = () => {
    if (!form.brand || !form.sizeInput) { setError('ブランドとサイズは必須です'); return; }
    const sizeCm = convertSizeToCm(parseFloat(form.sizeInput), form.sizeUnit);
    const data = {
      brand:         form.brand.toUpperCase(),
      model:         form.model ? form.model.toUpperCase() : undefined,
      category:      form.category,
      size:          sizeCm,
      fit_feedback:  form.fit_feedback,
      purchase_date: form.purchase_date || undefined,
      notes:         form.notes || undefined,
      photos:        photos.length > 0 ? photos : undefined,
      status:        'active' as const,
    };
    if (editShoe) { updateShoe(editShoe.id, data); } else { addShoe(data); }
    onAdd();
  };

  // サイズ入力の表示値（単位切り替え時に再計算）
  const handleUnitChange = (newUnit: SizeUnit) => {
    const currentCm = convertSizeToCm(parseFloat(form.sizeInput) || 0, form.sizeUnit);
    const converted = currentCm > 0 ? convertSizeFromCm(currentCm, newUnit).toString() : '';
    setForm(p => ({ ...p, sizeUnit: newUnit, sizeInput: converted }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-8 my-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-900 tracking-widest uppercase">
            {editShoe ? 'EDIT SHOE' : 'ADD SHOE'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-900" strokeWidth={1.5} /></button>
        </div>
        <div className="space-y-4">

          {/* ブランド */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Brand / メーカー <span className="text-gray-900">*</span></label>
            <input type="text" value={form.brandQuery}
              onChange={e => handleBrandQuery(e.target.value)}
              onFocus={() => setShowDrop(true)}
              placeholder="NIKE"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm uppercase tracking-wider font-medium"
            />
            {form.brand && <span className="absolute right-3 top-8 text-xs text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />{form.brand}</span>}
            {showDrop && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto mt-1">
                {filteredBrands.map(b => {
                  const std = BRANDS.find(s => s.name.toUpperCase() === b);
                  return (
                    <button key={b} onClick={() => { setForm(p => ({ ...p, brand: b, brandQuery: b })); setShowDrop(false); setCanAddCustom(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex justify-between items-center">
                      <span className="font-medium tracking-wider">{b}</span>
                      {std && <span className="text-xs text-gray-400">{std.width_tendency === 'wide' ? '幅広' : std.width_tendency === 'narrow' ? '細め' : '標準'}</span>}
                      {!std && <span className="text-xs text-blue-500">カスタム</span>}
                    </button>
                  );
                })}
                {/* カスタムブランド追加 */}
                {canAddCustom && (
                  <button onClick={handleAddCustomBrand}
                    className="w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100">
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                    「{form.brandQuery}」を新規メーカーとして登録する
                  </button>
                )}
              </div>
            )}
          </div>

          {/* モデル名 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Model Name / 商品名（任意）</label>
            <input type="text" value={form.model}
              onChange={e => setForm(p => ({ ...p, model: e.target.value.toUpperCase() }))}
              placeholder="AIR MAX 90"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm uppercase tracking-wider"
            />
          </div>

          {/* カテゴリ + サイズ（単位切り替え付き） */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Category</label>
              <div className="relative">
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as ShoeCategory }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900">
                  {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Size <span className="text-gray-900">*</span></label>
                {/* 単位切り替え */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  {(Object.keys(SIZE_UNIT_LABELS) as SizeUnit[]).map(u => (
                    <button key={u} onClick={() => handleUnitChange(u)}
                      className={`px-2 py-0.5 text-xs font-medium transition-colors ${form.sizeUnit === u ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      {SIZE_UNIT_LABELS[u]}
                    </button>
                  ))}
                </div>
              </div>
              <input type="number" step="0.5" min="1" max="50"
                value={form.sizeInput}
                onChange={e => setForm(p => ({ ...p, sizeInput: e.target.value }))}
                placeholder={form.sizeUnit === 'cm' ? '26.5' : form.sizeUnit === 'us' ? '8.5' : '8.0'}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
              />
              {form.sizeInput && form.sizeUnit !== 'cm' && (
                <p className="text-xs text-gray-400 mt-0.5">
                  ≈ {convertSizeToCm(parseFloat(form.sizeInput), form.sizeUnit)}cm
                </p>
              )}
            </div>
          </div>

          {/* フィット感 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Fit Feedback</label>
            <div className="grid grid-cols-5 gap-1">
              {(Object.entries(FIT_FEEDBACK_LABELS) as [FitFeedback, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setForm(p => ({ ...p, fit_feedback: key }))}
                  className={`py-2 text-xs rounded-lg transition-colors ${form.fit_feedback === key ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 写真（最大3枚） */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Photos / 写真（最大3枚）</label>
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="relative w-24 h-24 border-2 border-dashed border-gray-200 rounded-lg overflow-hidden">
                  {photos[i] ? (
                    <>
                      <img src={photos[i]} className="w-full h-full object-cover" alt={`photo${i+1}`} />
                      <button onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        <X className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <Upload className="w-5 h-5 text-gray-300 mb-1" strokeWidth={1.5} />
                      <span className="text-xs text-gray-300">{i + 1}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 購入日・メモ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Purchase Date</label>
              <input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">Notes / メモ</label>
              <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="着心地など"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-lg hover:border-gray-900 text-sm font-medium transition-colors uppercase tracking-wider">キャンセル</button>
            <button onClick={handleSubmit} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-colors uppercase tracking-wider ${editShoe ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{editShoe ? '保存する' : '追加する'}</button>
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
    // ブランド・モデルは大文字で保存（表記揺れ防止）
    valid.forEach(e => addShoe({
      brand: e.brand.toUpperCase(),
      model: e.model ? e.model.toUpperCase() : undefined,
      category: 'sneakers',
      size: parseFloat(e.size),
      fit_feedback: e.fit_feedback,
      status: 'active',
    }));
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Brand / メーカー <span className="text-red-500">*</span></label>
                  <input
                    list={`bulk-brands-${i}`}
                    value={entry.brand}
                    onChange={e => updateEntry(i, { brand: e.target.value.toUpperCase() })}
                    placeholder="NIKE"
                    className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm uppercase font-medium tracking-wider"
                  />
                  <datalist id={`bulk-brands-${i}`}>
                    {[...BRANDS.map(b => b.name.toUpperCase()), ...loadCustomBrands()].map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                {/* 商品名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 uppercase tracking-wider">Model Name / 商品名（任意）</label>
                  <input type="text" value={entry.model}
                    onChange={e => updateEntry(i, { model: e.target.value.toUpperCase() })}
                    placeholder="AIR MAX 90"
                    className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm uppercase tracking-wider"
                  />
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
            <button onClick={handleSubmit} className="flex-1 bg-indigo-600 text-white py-3 hover:bg-indigo-700 text-sm font-bold transition-colors rounded-lg">一括登録する</button>
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
        <p className="text-gray-500 text-base mb-10 max-w-xl mx-auto leading-relaxed">SHOECLOAKは、持っているすべての靴を管理し、AI分析で最適なサイズを提案するサービスです。もう二度とサイズ選びで失敗しません。</p>

        {/* ① 無料でサイズ測定をするボタン（大・アクセントカラー） */}
        <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
          <button
            onClick={() => setShowQuickDiag(true)}
            className="w-full bg-emerald-600 text-white py-5 px-8 hover:bg-emerald-700 transition-colors font-bold text-base tracking-wide shadow-lg shadow-emerald-200 rounded-lg"
          >
            ✦ 無料でサイズ測定をする
          </button>

          {/* ② ログインボタン + 協力依頼テキスト */}
          <div className="w-full">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-3 text-center">
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                🙏 現在、AIサイズ診断の精度向上に向けてデータを収集しております。<br />
                皆様のご協力を心よりお願い申し上げます。
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full border-2 border-indigo-300 text-indigo-700 py-3.5 px-8 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors font-semibold text-sm rounded-lg"
            >
              ログインする
            </button>
          </div>
        </div>
      </div>
      {/* 機能紹介（2つのみ） */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">主な機能</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {[
            {
              icon:   <ShoppingBag className="w-8 h-8 text-indigo-500" strokeWidth={1} />,
              title:  'Shoe Cloak 管理',
              desc:   '持っている靴をすべて登録。ブランド、モデル、サイズ、フィット感を記録して、あなただけのデータベースを作成。',
              action: () => onTabChange('shoecloak'),
              color:  'hover:border-indigo-400 hover:bg-indigo-50',
              iconBg: 'bg-indigo-50 border-indigo-100',
            },
            {
              icon:   <Sparkles className="w-8 h-8 text-emerald-500" strokeWidth={1} />,
              title:  'AIサイズ推奨',
              desc:   '過去のデータから学習し、新しい靴を買う時に最適なサイズを提案。ブランドごとのサイズの違いも考慮。',
              action: () => onTabChange('ai-assistant'),
              color:  'hover:border-emerald-400 hover:bg-emerald-50',
              iconBg: 'bg-emerald-50 border-emerald-100',
            },
          ].map(f => (
            <button key={f.title} onClick={f.action}
              className={`border border-gray-200 p-8 ${f.color} transition-all text-left group`}>
              <div className={`w-16 h-16 border flex items-center justify-center mx-auto mb-5 ${f.iconBg}`}>{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-3">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 参考 Shoe Cloak サンプル */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Shoe Cloak のイメージ</h2>
        <p className="text-sm text-gray-400 mb-6">実際のユーザーのシュークローク例（サンプル）</p>

        {/* サンプルユーザー① */}
        <div className="mb-8 border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-indigo-900 text-white px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold">R.T</div>
            <div>
              <p className="font-semibold">Runner_T さんのShoe Cloak</p>
              <p className="text-xs text-indigo-300">登録靴数: 6足 ｜ 通常サイズ: 27.5cm ｜ 足幅: やや広め</p>
            </div>
            <span className="ml-auto bg-indigo-700 text-xs px-3 py-1 rounded-full">公開中</span>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { brand: 'NIKE',         model: 'AIR MAX 90',           size: '27.5cm', fit: 'ぴったり',   fitColor: 'bg-green-100 text-green-700',  cat: 'スニーカー'   },
              { brand: 'ADIDAS',       model: 'ULTRABOOST 22',        size: '28.0cm', fit: 'やや大きめ', fitColor: 'bg-blue-100 text-blue-700',    cat: 'ランニング'   },
              { brand: 'NEW BALANCE',  model: '992',                  size: '27.5cm', fit: 'ぴったり',   fitColor: 'bg-green-100 text-green-700',  cat: 'スニーカー'   },
              { brand: 'ON',           model: 'CLOUD X 3',            size: '27.0cm', fit: 'ぴったり',   fitColor: 'bg-green-100 text-green-700',  cat: 'ランニング'   },
              { brand: 'SAUCONY',      model: 'KINVARA 14',           size: '27.5cm', fit: 'きつめ',     fitColor: 'bg-orange-100 text-orange-700',cat: 'ランニング'   },
              { brand: 'HOKA',         model: 'CLIFTON 9',            size: '28.0cm', fit: 'ぴったり',   fitColor: 'bg-green-100 text-green-700',  cat: 'ランニング'   },
            ].map(s => (
              <div key={s.brand + s.model} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-bold text-gray-900 text-xs tracking-wider">{s.brand}</p>
                <p className="text-xs text-gray-500 mb-2">{s.model}</p>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm">{s.size}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.fitColor}`}>{s.fit}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-indigo-50 px-5 py-3 text-xs text-indigo-700 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            AI診断: NIKEは28.0cm、SAUCONYは28.0cm(ハーフサイズUP)推奨
          </div>
        </div>

        {/* サンプルユーザー② */}
        <div className="mb-8 border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-800 text-white px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">K.M</div>
            <div>
              <p className="font-semibold">ドレスシューズ愛好家 K.M さんのShoe Cloak</p>
              <p className="text-xs text-gray-400">登録靴数: 5足 ｜ 通常サイズ: 26.0cm ｜ 足幅: 標準〜細め</p>
            </div>
            <span className="ml-auto bg-gray-600 text-xs px-3 py-1 rounded-full">公開中</span>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { brand: 'CHURCH\'S',    model: 'CONSUL',               size: '7.5 UK', fit: 'ぴったり',   fitColor: 'bg-green-100 text-green-700',  cat: 'ドレス'     },
              { brand: 'JOHN LOBB',    model: 'CITY II',              size: '7 UK',   fit: 'きつめ',     fitColor: 'bg-orange-100 text-orange-700',cat: 'ドレス'     },
              { brand: 'EDWARD GREEN', model: 'CHELSEA',              size: '7.5 UK', fit: 'ぴったり',   fitColor: 'bg-green-100 text-green-700',  cat: 'ドレス'     },
              { brand: 'TRICKER\'S',   model: 'BOURTON',              size: '7 UK',   fit: 'やや大きめ', fitColor: 'bg-blue-100 text-blue-700',    cat: 'カントリー' },
              { brand: 'ALDEN',        model: 'INDY BOOT 403',        size: '7 US',   fit: 'ぴったり',   fitColor: 'bg-green-100 text-green-700',  cat: 'ブーツ'     },
            ].map(s => (
              <div key={s.brand + s.model} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-bold text-gray-900 text-xs tracking-wider">{s.brand}</p>
                <p className="text-xs text-gray-500 mb-2">{s.model}</p>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm">{s.size}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.fitColor}`}>{s.fit}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gray-100 px-5 py-3 text-xs text-gray-600 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            AI診断: JOHN LOBBは7.5 UK推奨（ラスト101は細め設定のためハーフサイズUP）
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-100 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-lg">💡</span>
          <p className="text-sm text-indigo-800 leading-relaxed">
            <span className="font-semibold">あなたも始めてみましょう。</span>
            Shoe Cloakに靴を登録すると、ブランドごとのサイズ傾向・フィット感の傾向が可視化されます。上のようなAI診断が受けられるようになります。
          </p>
        </div>
      </div>
      {showQuickDiag && <QuickDiagModal shoes={shoes} footProfile={footProfile} onClose={() => setShowQuickDiag(false)} />}
    </div>
  );
}

// ================================================================
// ② Shoe Cloak ダッシュボード（Bolt Dashboard デザイン）
// ================================================================
// ================================================================
// 足のサイズ測定モーダル（QRコード / カメラ / 手動入力）
// ================================================================
type ToeShapeKey = ToeShape;

interface MeasurementFormState {
  foot_side: 'left' | 'right';
  length_mm: string;
  girth_mm: string;
  width_mm: string;
  instep_mm: string;
  heel_width_mm: string;
  toe_shape: ToeShapeKey | '';
  [key: string]: string | ToeShapeKey;
}
const EMPTY_MEAS_FORM = (): MeasurementFormState => ({
  foot_side: 'left', length_mm: '', girth_mm: '', width_mm: '', instep_mm: '', heel_width_mm: '', toe_shape: '',
});

function FootMeasurementModal({ onClose }: { onClose: () => void }) {
  const [measurements, setMeasurements] = useState<FootMeasurement[]>(loadMeasurements());
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState<MeasurementFormState>(EMPTY_MEAS_FORM());
  const [formError, setFormError]       = useState('');

  const left  = measurements.find(m => m.foot_side === 'left');
  const right = measurements.find(m => m.foot_side === 'right');

  const handleSave = () => {
    if (!form.length_mm) { setFormError('足長は必須です'); return; }
    saveMeasurement({
      foot_side:     form.foot_side,
      length_mm:     form.length_mm     ? parseFloat(form.length_mm)     : null,
      girth_mm:      form.girth_mm      ? parseFloat(form.girth_mm)      : null,
      width_mm:      form.width_mm      ? parseFloat(form.width_mm)      : null,
      instep_mm:     form.instep_mm     ? parseFloat(form.instep_mm)     : null,
      heel_width_mm: form.heel_width_mm ? parseFloat(form.heel_width_mm) : null,
      toe_shape:     form.toe_shape     ? form.toe_shape as ToeShape     : null,
    });
    setMeasurements(loadMeasurements());
    setShowForm(false);
    setForm(EMPTY_MEAS_FORM());
  };

  const handleDelete = (side: 'left' | 'right') => {
    if (!window.confirm(`${side === 'left' ? '左' : '右'}足の測定データを削除しますか？`)) return;
    deleteMeasurement(side);
    setMeasurements(loadMeasurements());
  };

  const mmToApproxCm = (mm: number | null) => mm ? (mm / 10).toFixed(1) : '—';

  const MeasCard = ({ m, side }: { m: FootMeasurement | undefined; side: 'left' | 'right' }) => (
    <div className="flex-1 border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">
          {side === 'left' ? '左足 / Left Foot' : '右足 / Right Foot'}
        </h3>
        {m ? (
          <div className="flex gap-2">
            <button onClick={() => { setForm({ foot_side: side, length_mm: m.length_mm?.toString() ?? '', girth_mm: m.girth_mm?.toString() ?? '', width_mm: m.width_mm?.toString() ?? '', instep_mm: m.instep_mm?.toString() ?? '', heel_width_mm: m.heel_width_mm?.toString() ?? '', toe_shape: m.toe_shape ?? '' }); setShowForm(true); }}
              className="text-xs border border-gray-200 px-3 py-1 hover:border-gray-900 transition-colors">編集</button>
            <button onClick={() => handleDelete(side)} className="text-xs text-red-400 hover:text-red-600">削除</button>
          </div>
        ) : (
          <button onClick={() => { setForm({ ...EMPTY_MEAS_FORM(), foot_side: side }); setShowForm(true); }}
            className="text-xs border border-gray-900 bg-gray-900 text-white px-3 py-1 hover:bg-gray-700 transition-colors">追加</button>
        )}
      </div>
      {m ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">足長</span><span className="font-medium">{m.length_mm}mm <span className="text-gray-400 text-xs">({mmToApproxCm(m.length_mm)}cm)</span></span></div>
          {m.girth_mm      && <div className="flex justify-between"><span className="text-gray-500">足囲</span><span className="font-medium">{m.girth_mm}mm</span></div>}
          {m.width_mm      && <div className="flex justify-between"><span className="text-gray-500">足幅</span><span className="font-medium">{m.width_mm}mm</span></div>}
          {m.instep_mm     && <div className="flex justify-between"><span className="text-gray-500">甲の高さ</span><span className="font-medium">{m.instep_mm}mm</span></div>}
          {m.heel_width_mm && <div className="flex justify-between"><span className="text-gray-500">かかと幅</span><span className="font-medium">{m.heel_width_mm}mm</span></div>}
          {m.toe_shape     && <div className="flex justify-between"><span className="text-gray-500">指の形</span><span className="font-medium">{TOE_SHAPE_LABELS[m.toe_shape].ja}</span></div>}
          <p className="text-xs text-gray-400 pt-2">測定日: {new Date(m.measured_at).toLocaleDateString('ja-JP')}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-400">測定データがありません</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl my-8 rounded-xl shadow-2xl overflow-hidden">

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-wide">足の測定 / Foot Measurements</h2>
            <p className="text-sm text-gray-400 mt-0.5">足の形を測定して、最適なシューズサイズを見つけましょう</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setForm(EMPTY_MEAS_FORM()); setShowForm(true); }}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors rounded-lg">
              <Ruler className="w-4 h-4" strokeWidth={1.5} />測定を追加
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-900" strokeWidth={1.5} /></button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* 測定ヒント */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-semibold">測定のポイント</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>裸足・立位・夕方に測定する（朝より夕方の足がわずかに大きい）</li>
                <li>左右を測定し、大きい方を基準にする</li>
                <li>壁に踵をつけて立ち、つま先までの長さを測定</li>
              </ul>
            </div>
          </div>

          {/* 左右足データ */}
          <div className="flex flex-col md:flex-row gap-4">
            <MeasCard m={left}  side="left"  />
            <MeasCard m={right} side="right" />
          </div>

          {/* LiDAR / QR / カメラ セクション */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-900 text-white px-6 py-4">
              <h3 className="font-bold tracking-wide">より正確に測定する / Precision Measurement</h3>
              <p className="text-sm text-gray-300 mt-1">iOSのLiDARセンサーで自動測定</p>
            </div>
            <div className="p-6">
              {!IS_MOBILE ? (
                /* PC: QRコード */
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://apps.apple.com/jp/app"
                    alt="QR Code"
                    className="w-40 h-40 border border-gray-200 rounded-lg"
                  />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                      <Smartphone className="w-5 h-5" strokeWidth={1.5} />
                      iPhoneでLiDAR測定アプリをダウンロード
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      左のQRコードをiPhoneのカメラで読み込むとApp Storeが開きます。<br />
                      <strong>iPhone 12 Pro以降</strong>（または iPad Pro）のLiDARスキャナーを使って、
                      足の形を3D計測することで正確な足長・足幅・甲の高さを自動取得できます。
                    </p>
                    <p className="text-xs text-gray-400">
                      ※ LiDARセンサー非搭載のiPhoneでは、カメラを使った近似計測を行います
                    </p>
                  </div>
                </div>
              ) : IS_IOS && !IS_ANDROID ? (
                /* iOS: カメラボタン */
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-gray-700 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="font-semibold text-gray-900">iPhoneでLiDAR測定</p>
                      <p className="text-sm text-gray-600 mt-1">
                        このボタンからカメラを起動して足を撮影してください。<br />
                        <strong>iPhone 12 Pro以降</strong>はLiDARセンサーで自動的に3D計測します。
                      </p>
                    </div>
                  </div>
                  <label className="block">
                    <div className="w-full bg-gray-900 text-white text-center py-3 rounded-lg font-medium text-sm hover:bg-gray-700 transition-colors cursor-pointer flex items-center justify-center gap-2">
                      <Smartphone className="w-4 h-4" strokeWidth={1.5} />カメラを起動して測定する
                    </div>
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={() => { alert('撮影後、測定値を手動で入力してください。（AI自動解析は近日実装予定）'); setShowForm(true); }} />
                  </label>
                </div>
              ) : (
                /* Android */
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="font-semibold text-gray-900">Androidをお使いの方</p>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      現在、LiDARによる自動測定はiOS専用です。<br />
                      メジャーを使って<strong>下記の測定方法</strong>を参考に測定値を手動でご入力ください。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 詳細な測定方法 */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">測定方法の詳細 / How to Measure</h3>
            <div className="space-y-4">
              {[
                {
                  n: 1, en: 'FOOT LENGTH', ja: '足長', unit: 'mm',
                  desc: '壁に踵をぴったり付けて立ち、最も長い指（親指または人差し指）の先端から踵の後端までを直線で測ります。靴のサイズはこの値を基準にします。',
                  tip: '朝より夕方の方がわずかに大きくなります。夕方に測るのが理想です。',
                },
                {
                  n: 2, en: 'GIRTH', ja: '足囲（ガース）', unit: 'mm',
                  desc: '親指の付け根の骨（拇趾球）から小指の付け根の骨（小趾球）を通るようにメジャーで1周巻いて測定します。JIS規格のワイズ（E/2E/3E）はこの値で決まります。',
                  tip: 'E≈220mm、2E≈230mm、3E≈240mm（26cmの場合の目安）',
                },
                {
                  n: 3, en: 'FOOT WIDTH', ja: '足幅', unit: 'mm',
                  desc: '拇趾球（親指付け根の骨）から小趾球（小指付け根の骨）の横幅を直線で測ります。足囲が同じでも足幅が広い人は幅広の靴が必要になることがあります。',
                  tip: '足幅と足囲は異なります。足囲は周囲長、足幅は横の直線距離です。',
                },
                {
                  n: 4, en: 'INSTEP', ja: '甲の高さ（インステップ）', unit: 'mm',
                  desc: '足首の前側（甲の最も高い部分）から床までの高さを測ります。甲が高い方は甲低の靴（ローファーなど）では圧迫感が出やすく、同じサイズでも合わないことがあります。',
                  tip: 'サイズを上げても甲の圧迫が解消しない場合、靴の木型の問題の可能性があります。',
                },
                {
                  n: 5, en: 'HEEL WIDTH', ja: 'かかと幅', unit: 'mm',
                  desc: '踵の最も幅広い部分の横幅を測ります。かかとが細い方は、既製靴でかかとが浮きやすく「パカパカする」と感じることがあります。',
                  tip: 'かかとが浮く場合はインソールやかかとパッドで調整できることがあります。',
                },
              ].map(item => (
                <div key={item.n} className="border border-gray-100 rounded-lg p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{item.n}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900">{item.en} <span className="text-gray-400 font-normal">/ {item.ja}</span></p>
                        <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded">単位: {item.unit}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                      <div className="mt-2 flex items-start gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                        <p className="text-xs text-blue-600">{item.tip}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* TOE SHAPE */}
              <div className="border border-gray-100 rounded-lg p-5">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">6</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">TOE SHAPE <span className="text-gray-400 font-normal">/ 指の形（トゥ形状）</span></p>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">親指〜小指の長さの関係を確認します。靴の木型の形状との相性を判断するために重要です。</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.entries(TOE_SHAPE_LABELS) as [ToeShape, typeof TOE_SHAPE_LABELS[ToeShape]][]).map(([k, v]) => (
                        <div key={k} className="border border-gray-200 rounded-lg p-3 text-center">
                          <p className="font-medium text-sm text-gray-900">{v.ja}</p>
                          <p className="text-xs text-gray-400">{v.desc}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <p className="text-xs text-blue-600">エジプト型はポインテッドトゥ、ギリシャ型はアーモンドトゥ、スクエア型はスクエアトゥが相性良いとされます。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 測定入力フォーム（サブモーダル） */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl my-4">
            {/* ヘッダー */}
            <div className="px-8 py-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 uppercase tracking-widest">ADD MEASUREMENT / 足の測定を追加</h3>
                  <p className="text-sm text-gray-400 mt-0.5">裸足・立位・夕方に測定 / 左右測定し大きい方を基準に</p>
                </div>
                <button onClick={() => { setShowForm(false); setFormError(''); }}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-900" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="px-8 py-6 space-y-5">
              {/* 足選択 */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">FOOT / 測定する足</label>
                <div className="grid grid-cols-2 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                  {(['left', 'right'] as const).map(side => (
                    <button key={side} onClick={() => setForm(p => ({ ...p, foot_side: side }))}
                      className={`py-3.5 text-sm font-semibold transition-colors ${form.foot_side === side ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      {side === 'left' ? '左足 / LEFT' : '右足 / RIGHT'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 各測定値 */}
              {[
                { key: 'length_mm',     n: 1, en: 'FOOT LENGTH',   ja: '足長',          req: true,  ph: '265', desc: '靴の基本サイズ（cm）を決める数値' },
                { key: 'girth_mm',      n: 2, en: 'GIRTH',         ja: '足囲',          req: false, ph: '230', desc: 'E・2E・3Eのワイズ（横方向の太さ）を決める数値' },
                { key: 'width_mm',      n: 3, en: 'FOOT WIDTH',    ja: '足幅',          req: false, ph: '102', desc: '横幅の実寸を確認する数値（同ワイズでも圧迫が変わる）' },
                { key: 'instep_mm',     n: 4, en: 'INSTEP',        ja: '甲の高さ',      req: false, ph: '65',  desc: '足の厚み・ボリューム確認。ここが合わないとサイズを上げても圧迫が解消しないことがある' },
                { key: 'heel_width_mm', n: 5, en: 'HEEL WIDTH',    ja: 'かかと幅',      req: false, ph: '68',  desc: '靴の脱げやすさ・ホールド感に関係。細いと既製靴でかかとが浮きやすくなる' },
              ].map(f => (
                <div key={f.key} className="border border-gray-100 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold">{f.n}</span>
                        <span className="font-semibold text-gray-900 text-sm">{f.en} <span className="text-gray-400 font-normal">/ {f.ja}{f.req && <span className="text-red-500 ml-1">*</span>}</span></span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input type="number" min="0" value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.ph}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm" />
                    <span className="text-sm text-gray-400 w-10">mm</span>
                  </div>
                </div>
              ))}

              {/* TOE SHAPE */}
              <div className="border border-gray-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
                  <span className="font-semibold text-gray-900 text-sm">TOE SHAPE <span className="text-gray-400 font-normal">/ 指の形（トゥ形状）</span></span>
                </div>
                <p className="text-xs text-gray-500 mb-3">靴の木型との相性を判断するための形状</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(TOE_SHAPE_LABELS) as [ToeShape, typeof TOE_SHAPE_LABELS[ToeShape]][]).map(([k, v]) => (
                    <button key={k} onClick={() => setForm(p => ({ ...p, toe_shape: p.toe_shape === k ? '' : k }))}
                      className={`border rounded-lg py-3 text-center transition-colors ${form.toe_shape === k ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:border-gray-400'}`}>
                      <p className="font-medium text-sm">{v.ja}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {formError && <p className="text-xs text-red-500">{formError}</p>}
            </div>
            <div className="grid grid-cols-2 border-t border-gray-100">
              <button onClick={() => { setShowForm(false); setFormError(''); }}
                className="py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors uppercase tracking-widest border-r border-gray-100">CANCEL</button>
              <button onClick={handleSave}
                className={`py-4 text-sm font-medium uppercase tracking-widest transition-colors ${form.length_mm ? 'bg-gray-900 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-400'}`}>SAVE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// ② Shoe Cloak ダッシュボード
// ================================================================
function ShoeCloakView({ shoes, onRefresh, footProfile: _footProfile, onTabChange: _onTabChange }: { shoes: Shoe[]; onRefresh: () => void; footProfile: FootProfile | null; onTabChange: (t: TabType) => void }) {
  const [filterGroup, setFilterGroup]         = useState<ShoeGroup>('all');
  const [showBulk, setShowBulk]               = useState(false);
  const [editShoe, setEditShoe]               = useState<Shoe | undefined>(undefined);
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [sizeUnit, setSizeUnit]               = useState<SizeUnit>('cm');

  const activeShoes = shoes.filter(s => s.status === 'active');
  const filtered = filterGroup === 'all'
    ? activeShoes
    : activeShoes.filter(s => SHOE_GROUP_MAP[s.category] === filterGroup);

  const handleSell   = (id: string) => { updateShoe(id, { status: 'sold' }); onRefresh(); };
  const handleDelete = (id: string) => { if (!window.confirm('削除しますか？')) return; deleteShoe(id); onRefresh(); };

  const displaySize = (cmSize: number): string => {
    const converted = convertSizeFromCm(cmSize, sizeUnit);
    return `${converted} ${SIZE_UNIT_LABELS[sizeUnit]}`;
  };

  return (
    <div>
      {/* ── 足のサイズ測定バナー（アクセントカラー） ── */}
      <div className="flex items-stretch gap-0 border-2 border-emerald-500 mb-8 overflow-hidden rounded-xl shadow-sm shadow-emerald-100">
        <button
          onClick={() => setShowMeasurement(true)}
          className="flex items-center gap-3 bg-emerald-600 text-white px-7 py-5 hover:bg-emerald-700 transition-colors font-bold text-sm flex-shrink-0"
        >
          <Ruler className="w-5 h-5" strokeWidth={1.5} />
          <span>足のサイズを<br />測定する</span>
        </button>
        <div className="flex-1 px-6 py-4 flex flex-col justify-center bg-emerald-50">
          <p className="font-semibold text-emerald-900 text-sm">足の実測データを登録するとサイズ診断の精度が上がります</p>
          <p className="text-xs text-emerald-700 mt-1">左右の足長・足囲・足幅・甲の高さ・かかと幅を記録</p>
        </div>
      </div>

      {/* ── タイトル + サイズ単位 + 靴を追加ボタン ── */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-wide">SHOE CLOAK</h2>
          <p className="text-sm text-gray-400 mt-1">
            {activeShoes.length}足のコレクション / {activeShoes.length} pairs in collection
          </p>
          {/* サイズ単位切り替え */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-500">表示サイズ:</span>
            <div className="flex border border-gray-200 rounded overflow-hidden">
              {(Object.keys(SIZE_UNIT_LABELS) as SizeUnit[]).map(u => (
                <button key={u} onClick={() => setSizeUnit(u)}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${sizeUnit === u ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {SIZE_UNIT_LABELS[u]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <button
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 hover:bg-indigo-700 transition-colors font-bold text-sm rounded-lg shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />靴を追加する
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
            return (
              <div key={shoe.id} className="border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden">
                {/* 靴画像（登録済みなら表示、なければプレースホルダー） */}
                <div className="bg-gray-50 h-52 flex items-center justify-center border-b border-gray-100 overflow-hidden relative">
                  {shoe.photos && shoe.photos.length > 0 ? (
                    <>
                      <img src={shoe.photos[0]} className="w-full h-full object-cover" alt={shoe.model ?? shoe.brand} />
                      {shoe.photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          {shoe.photos.slice(1).map((p, i) => (
                            <img key={i} src={p} className="w-10 h-10 object-cover border-2 border-white rounded shadow-sm" alt="" />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Box className="w-14 h-14 text-gray-300" strokeWidth={1} />
                  )}
                </div>
                {/* 靴情報 */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900 text-lg leading-tight">{shoe.brand}</p>
                      {shoe.model && <p className="text-sm text-gray-400">{shoe.model}</p>}
                    </div>
                    <p className="font-bold text-gray-900 text-lg">{displaySize(shoe.size)}</p>
                  </div>
                  <div className="space-y-1 text-sm text-gray-500 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="uppercase tracking-wider text-xs font-medium text-gray-400">CATEGORY:</span>
                      <span className="text-xs">{groupLabel.ja} / {groupLabel.en.charAt(0) + groupLabel.en.slice(1).toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="uppercase tracking-wider text-xs font-medium text-gray-400">FIT:</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        shoe.fit_feedback === 'perfect'        ? 'bg-emerald-100 text-emerald-700' :
                        shoe.fit_feedback === 'slightly_small' ? 'bg-orange-100 text-orange-700'  :
                        shoe.fit_feedback === 'too_small'      ? 'bg-red-100 text-red-700'         :
                        shoe.fit_feedback === 'slightly_large' ? 'bg-blue-100 text-blue-700'       :
                                                                  'bg-indigo-100 text-indigo-700'
                      }`}>{FIT_EN[shoe.fit_feedback]}</span>
                    </div>
                    {shoe.purchase_date && (
                      <div className="flex justify-between">
                        <span className="uppercase tracking-wider text-xs font-medium text-gray-400">DATE:</span>
                        <span className="text-xs">{shoe.purchase_date}</span>
                      </div>
                    )}
                  </div>
                  {/* アクションボタン */}
                  <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
                    <button onClick={() => setEditShoe(shoe)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-indigo-200 bg-indigo-50 py-2 text-sm text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors rounded-md font-medium">
                      <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />EDIT
                    </button>
                    <button onClick={() => handleSell(shoe.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-amber-200 bg-amber-50 py-2 text-sm text-amber-700 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-colors rounded-md font-medium">
                      <DollarSign className="w-3.5 h-3.5" strokeWidth={1.5} />SELL
                    </button>
                    <button onClick={() => handleDelete(shoe.id)}
                      className="border border-red-100 bg-red-50 p-2 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors rounded-md">
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editShoe         && <AddShoeModal onClose={() => setEditShoe(undefined)} onAdd={() => { onRefresh(); setEditShoe(undefined); }} editShoe={editShoe} />}
      {showBulk         && <BulkAddModal onClose={() => setShowBulk(false)} onAdd={() => { onRefresh(); setShowBulk(false); }} />}
      {showMeasurement  && <FootMeasurementModal onClose={() => setShowMeasurement(false)} />}
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

  return (
    <div className="space-y-6">

      {/* ── メインエリア: 左=サイズ相談 / 右=AIチャット ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-gray-200 overflow-hidden">

        {/* ══ 左: サイズ相談 ══ */}
        <div className="border-r border-gray-200">
          {/* ヘッダー */}
          <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">サイズ相談 / Size Consultation</h3>
              <p className="text-xs text-emerald-700">URLやブランドで推奨サイズを即検索</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* URL入力 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                欲しい靴のURL
                <span className="ml-1.5 text-gray-400 font-normal normal-case">（貼り付けるとブランド自動検出）</span>
              </label>
              <input type="url" value={consultUrl} onChange={e => handleUrlChange(e.target.value)}
                placeholder="https://www.nike.com/..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
              {consultUrl && urlDetectedBrand && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />{urlDetectedBrand} を自動検出しました
                </p>
              )}
              {consultUrl && !urlDetectedBrand && (
                <p className="text-xs text-gray-400 mt-1">自動検出できません。下で直接選択してください。</p>
              )}
            </div>

            {/* ブランド */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">ブランド</label>
              <input type="text" value={consultBrandQuery}
                onChange={e => { setConsultBrandQuery(e.target.value); setConsultBrand(''); setUrlDetectedBrand(''); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
                placeholder="例: NIKE"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm uppercase font-medium" />
              {showDrop && filteredBrands.length > 0 && !consultBrand && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {filteredBrands.map(b => (
                    <button key={b.name} onClick={() => { setConsultBrand(b.name); setConsultBrandQuery(b.name); setShowDrop(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 font-medium tracking-wide">{b.name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* カテゴリ */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">カテゴリ</label>
              <div className="relative">
                <select value={consultCategory} onChange={e => setConsultCategory(e.target.value as ShoeCategory)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {Object.entries(CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.5} />
              </div>
            </div>

            {/* 診断ボタン */}
            <button onClick={handleConsult} disabled={!consultBrand}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-40 text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
              <Sparkles className="w-4 h-4" strokeWidth={2} />サイズを調べる
            </button>

            {/* 結果表示 */}
            {consultResult ? (
              <div className="mt-2">
                <div className="bg-emerald-600 text-white rounded-xl p-5 text-center mb-3 shadow">
                  <p className="text-xs text-emerald-200 mb-1 font-medium">推奨サイズ / Recommended Size</p>
                  <p className="text-4xl font-bold">{consultResult.recommendedSize}<span className="text-base font-normal ml-1">cm</span></p>
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${consultResult.confidenceScore}%`, maxWidth: '120px' }} />
                    <span className="text-xs text-emerald-200">信頼度 {consultResult.confidenceScore}%</span>
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-800 leading-relaxed whitespace-pre-line">{consultResult.reasoning}</div>
              </div>
            ) : (
              <div className="text-center text-gray-300 py-6 bg-gray-50 rounded-xl">
                <Sparkles className="w-10 h-10 mx-auto mb-2 text-emerald-200" strokeWidth={1} />
                <p className="text-sm text-gray-400">URLまたはブランドを入力して<br />サイズを調べましょう</p>
              </div>
            )}
          </div>
        </div>

        {/* ══ 右: AIチャット ══ */}
        <div className="flex flex-col">
          {/* ヘッダー */}
          <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">AIチャット / Free Consultation</h3>
              <p className="text-xs text-indigo-700">サイズ・ブランド・URLを自由に質問</p>
            </div>
          </div>

          {/* チャット表示 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-white" style={{ maxHeight: '420px', minHeight: '200px' }}>
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium mb-3">💬 サンプル質問</p>
                {[
                  'NIKEは何cmがおすすめ？',
                  'この商品URLのサイズは？',
                  'どのブランドが自分に合ってる？',
                  'Shoe Cloakの使い方を教えて',
                  'ドレスシューズのサイズ選びのコツは？',
                ].map(q => (
                  <button key={q} onClick={() => handleSend(q)}
                    className="block w-full text-left text-xs border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 px-3 py-2 rounded-lg transition-colors">
                    → {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 text-sm rounded-xl leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-50 text-gray-800 border border-gray-100'
                }`}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 flex gap-1">
                  {[0,100,200].map(d => <div key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 入力欄 */}
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2 bg-white">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="メッセージ入力 または 商品URLを貼り付け..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
              <Send className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
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
              <p className="text-xs text-gray-400 mt-0.5">あなたのShoe Cloakが他のユーザーに表示されます / Your Shoe Cloak will be visible to other users</p>
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
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 hover:bg-emerald-700 transition-colors font-bold text-sm rounded-xl shadow-sm shadow-emerald-200"
          >
            <Sparkles className="w-4 h-4" strokeWidth={2} />
            足の特徴を診断する / Analyze Foot Type
          </button>
        </div>

        {/* 診断結果 */}
        {diagnosed && diagResult && (
          <div className="mt-4 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-xl p-5">
            <p className="text-xs text-emerald-200 mb-1 font-medium uppercase tracking-wider">診断結果</p>
            <p className="text-xl font-bold mb-2">{diagResult.label}</p>
            <p className="text-sm text-emerald-100 leading-relaxed">{diagResult.detail}</p>
            <p className="text-xs text-emerald-300 mt-3 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />推奨サイズと足タイプを「Shoe Cloak」に反映しました
            </p>
          </div>
        )}
      </div>

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 py-4 font-bold text-sm rounded-xl transition-colors ${
          saved
            ? 'bg-emerald-500 text-white'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
        }`}
      >
        {saved
          ? <><Check className="w-4 h-4" strokeWidth={2.5} />保存しました！</>
          : <><Save className="w-4 h-4" strokeWidth={1.5} />基礎情報を保存する</>
        }
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
        <h2 className="text-xl font-bold text-gray-900">みんなのShoe Cloak</h2>
      </div>
      <div className="border border-gray-200 py-24 text-center">
        <Users className="w-14 h-14 text-gray-200 mx-auto mb-4" strokeWidth={1} />
        <p className="text-gray-400 text-sm">まだ公開されているShoe Cloakがありません</p>
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

  const tabs: { key: TabType; label: string; subLabel: string; color: string; activeBorder: string; activeText: string }[] = [
    { key: 'home',         label: 'ホーム',      subLabel: 'Home',              color: 'hover:text-gray-700',    activeBorder: 'border-gray-900',    activeText: 'text-gray-900'    },
    { key: 'shoecloak',    label: 'Shoe Cloak',  subLabel: 'My Collection',     color: 'hover:text-indigo-500',  activeBorder: 'border-indigo-600',  activeText: 'text-indigo-700'  },
    { key: 'ai-assistant', label: 'AI Assistant',subLabel: 'Size Consultation', color: 'hover:text-emerald-500', activeBorder: 'border-emerald-600', activeText: 'text-emerald-700' },
    { key: 'community',    label: 'Community',   subLabel: "みんなのShoe Cloak", color: 'hover:text-amber-500',   activeBorder: 'border-amber-500',   activeText: 'text-amber-700'   },
    { key: 'profile',      label: '基礎情報',     subLabel: 'My Profile',        color: 'hover:text-gray-700',    activeBorder: 'border-gray-600',    activeText: 'text-gray-900'    },
  ];

  if (authLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="text-gray-400 font-light tracking-widest text-sm">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-white pt-28 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* ページヘッダー */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 flex items-center justify-center rounded-lg">
              <Box className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-xl font-bold tracking-widest text-gray-900 uppercase">SHOE CLOAK</h1>
          </div>
          <span className="text-xs text-gray-400 hidden md:inline">— Shoe Collection & AI Size Intelligence</span>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200 mb-10 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
              className={`flex-shrink-0 px-6 py-4 transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? `${tab.activeBorder} ${tab.activeText}`
                  : `border-transparent text-gray-400 ${tab.color}`
              }`}>
              <p className="text-sm font-semibold whitespace-nowrap">{tab.label}</p>
              <p className="text-xs mt-0.5 whitespace-nowrap opacity-60">{tab.subLabel}</p>
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
