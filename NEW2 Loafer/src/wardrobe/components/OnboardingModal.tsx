import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

// 体型タイプ
const BODY_TYPES = [
  { value: 'straight', label: 'STRAIGHT', labelJa: 'ストレート', desc: '骨格がしっかりし、メリハリのある体型' },
  { value: 'wave',     label: 'WAVE',     labelJa: 'ウェーブ',   desc: '柔らかい曲線を持つ、華奢な体型' },
  { value: 'natural',  label: 'NATURAL',  labelJa: 'ナチュラル', desc: '骨感があり、フレーム感のある体型' },
] as const;

// 体型特徴
const BODY_FEATURES = [
  { value: 'broad_shoulders',   label: '肩幅広め' },
  { value: 'strong_lower_body', label: '下半身がっしり' },
  { value: 'slim',              label: '細身' },
  { value: 'belly',             label: 'お腹周り' },
  { value: 'lordosis',          label: '反り腰' },
  { value: 'kyphosis',          label: '猫背' },
] as const;

// 身長の選択肢
const HEIGHT_OPTIONS = Array.from({ length: 51 }, (_, i) => 140 + i); // 140〜190
// 体重の選択肢
const WEIGHT_OPTIONS = Array.from({ length: 71 }, (_, i) => 40 + i);  // 40〜110
// 年齢の選択肢
const AGE_OPTIONS = Array.from({ length: 63 }, (_, i) => 18 + i);     // 18〜80

interface OnboardingForm {
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  body_type: 'straight' | 'wave' | 'natural' | null;
  body_features: string[];
  body_features_note: string;
}

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 3;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<OnboardingForm>({
    height_cm: null,
    weight_kg: null,
    age: null,
    body_type: null,
    body_features: [],
    body_features_note: '',
  });

  const toggleFeature = (value: string) => {
    setForm(prev => ({
      ...prev,
      body_features: prev.body_features.includes(value)
        ? prev.body_features.filter(f => f !== value)
        : [...prev.body_features, value],
    }));
  };

  const canNext = () => {
    if (step === 1) return form.height_cm !== null && form.weight_kg !== null && form.age !== null;
    if (step === 2) return form.body_type !== null;
    return true;
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await apiClient.profile.update({
        height_cm: form.height_cm ?? undefined,
        weight_kg: form.weight_kg ?? undefined,
        age: form.age ?? undefined,
        body_type: form.body_type ?? undefined,
        body_features: (form.body_features as unknown) as string[] ?? undefined,
        body_features_note: form.body_features_note || undefined,
        onboarding_completed: true,
      });
      onComplete();
    } catch (err) {
      console.error('プロフィール保存エラー:', err);
      // エラーでも先へ進めるようにする
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    // フルスクリーンオーバーレイ（他画面へのアクセスをブロック）
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="flex-shrink-0 bg-gray-900 text-white px-6 py-6">
          <div className="max-w-lg mx-auto">
            <p className="text-[10px] tracking-[0.4em] text-gray-400 mb-2">WELCOME</p>
            <h1 className="text-xl font-light tracking-widest">プロフィール設定</h1>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="flex-shrink-0 flex h-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 transition-colors duration-500 ${
                i < step ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* ステップインジケーター */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100">
          <div className="max-w-lg mx-auto flex items-center gap-2 text-xs text-gray-400 tracking-wider">
            <span className={step >= 1 ? 'text-gray-900 font-medium' : ''}>①基本情報</span>
            <ChevronRight className="w-3 h-3" />
            <span className={step >= 2 ? 'text-gray-900 font-medium' : ''}>②体型タイプ</span>
            <ChevronRight className="w-3 h-3" />
            <span className={step >= 3 ? 'text-gray-900 font-medium' : ''}>③体型特徴</span>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 px-6 py-10">
          <div className="max-w-lg mx-auto">

            {/* ─── STEP 1: 基本情報 ─── */}
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-light tracking-wider mb-2">基本情報を入力</h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    AIによるサイズ・スタイルのレコメンドに使用します。すべて選択式です。
                  </p>
                </div>

                {/* 身長 */}
                <div>
                  <label className="text-sm tracking-wider block mb-3">
                    身長 <span className="text-gray-400 text-xs font-normal">HEIGHT</span>
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                    {HEIGHT_OPTIONS.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, height_cm: h }))}
                        className={`py-2 text-sm border-2 transition ${
                          form.height_cm === h
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                  {form.height_cm && (
                    <p className="text-xs text-gray-500 mt-2">選択中: {form.height_cm} cm</p>
                  )}
                </div>

                {/* 体重 */}
                <div>
                  <label className="text-sm tracking-wider block mb-3">
                    体重 <span className="text-gray-400 text-xs font-normal">WEIGHT</span>
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                    {WEIGHT_OPTIONS.map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, weight_kg: w }))}
                        className={`py-2 text-sm border-2 transition ${
                          form.weight_kg === w
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  {form.weight_kg && (
                    <p className="text-xs text-gray-500 mt-2">選択中: {form.weight_kg} kg</p>
                  )}
                </div>

                {/* 年齢 */}
                <div>
                  <label className="text-sm tracking-wider block mb-3">
                    年齢 <span className="text-gray-400 text-xs font-normal">AGE</span>
                  </label>
                  <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 max-h-36 overflow-y-auto">
                    {AGE_OPTIONS.map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, age: a }))}
                        className={`py-2 text-sm border-2 transition ${
                          form.age === a
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  {form.age && (
                    <p className="text-xs text-gray-500 mt-2">選択中: {form.age} 歳</p>
                  )}
                </div>
              </div>
            )}

            {/* ─── STEP 2: 体型タイプ ─── */}
            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-light tracking-wider mb-2">体型タイプを選択</h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    骨格診断のタイプを選択してください。スタイリングのレコメンドに活用します。
                  </p>
                </div>

                <div className="space-y-4">
                  {BODY_TYPES.map(({ value, label, labelJa, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, body_type: value }))}
                      className={`w-full p-5 border-2 text-left flex items-start gap-4 transition ${
                        form.body_type === value
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className={`mt-1 w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 ${
                        form.body_type === value ? 'border-white bg-white' : 'border-gray-400'
                      }`}>
                        {form.body_type === value && (
                          <Check className="w-3 h-3 text-gray-900" strokeWidth={3} />
                        )}
                      </div>
                      <div>
                        <p className="text-xs tracking-widest font-medium mb-1">
                          {label} <span className="opacity-70 font-normal ml-2">{labelJa}</span>
                        </p>
                        <p className={`text-xs leading-relaxed ${form.body_type === value ? 'text-gray-300' : 'text-gray-500'}`}>
                          {desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-400">
                  ※ 骨格診断のタイプが不明な場合は、最も近いと思うものを選択してください。後から変更できます。
                </p>
              </div>
            )}

            {/* ─── STEP 3: 体型特徴 ─── */}
            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-light tracking-wider mb-2">体型の特徴（任意）</h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    複数選択可能です。該当するものを選んでください。スキップもできます。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {BODY_FEATURES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleFeature(value)}
                      className={`py-4 px-4 border-2 flex items-center gap-3 transition text-sm ${
                        form.body_features.includes(value)
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className={`w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 ${
                        form.body_features.includes(value) ? 'border-white bg-white' : 'border-gray-400'
                      }`}>
                        {form.body_features.includes(value) && (
                          <Check className="w-2.5 h-2.5 text-gray-900" strokeWidth={3} />
                        )}
                      </div>
                      {label}
                    </button>
                  ))}
                </div>

                {/* その他自由入力 */}
                <div>
                  <label className="text-xs tracking-wider text-gray-500 block mb-2">
                    その他・自由入力（任意）
                  </label>
                  <textarea
                    value={form.body_features_note}
                    onChange={e => setForm(prev => ({ ...prev, body_features_note: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 text-sm min-h-[80px] resize-none"
                    placeholder="例: 足が細長い、甲が高い、など"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッターナビゲーション */}
        <div className="flex-shrink-0 border-t border-gray-100 px-6 py-5 bg-white">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 px-4 py-3 border border-gray-300 text-sm tracking-wider hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                戻る
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white text-sm tracking-widest hover:bg-gray-800 transition disabled:bg-gray-300"
              >
                次へ
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white text-sm tracking-widest hover:bg-gray-800 transition disabled:bg-gray-400"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    プロフィールを保存して開始
                  </>
                )}
              </button>
            )}
          </div>

          {/* スキップ（ステップ3のみ） */}
          {step === TOTAL_STEPS && (
            <div className="max-w-lg mx-auto mt-3 text-center">
              <button
                type="button"
                onClick={handleComplete}
                className="text-xs text-gray-400 hover:text-gray-600 transition underline"
              >
                スキップして開始
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

