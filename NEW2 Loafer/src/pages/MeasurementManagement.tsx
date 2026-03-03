import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Ruler,
  Plus,
  Camera,
  CheckCircle,
  Clock,
  XCircle,
  PlayCircle,
  ChevronRight,
  User,
  Award,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  Upload,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// ==================== 型定義 ====================

type SessionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type FootType = 'narrow' | 'standard' | 'wide';

interface MeasurementSession {
  id: string;
  user_email: string;
  user_name: string;
  status: SessionStatus;
  created_at: string;
  completed_at: string | null;
  result?: MeasurementResult;
}

interface MeasurementResult {
  foot_type: FootType;
  foot_length_cm: number | null;
  foot_width_cm: number | null;
  percentile: number;
  recommended_brands: string[];
  advice: string;
  photo_top_url: string | null;
  photo_side_url: string | null;
  gemini_comment: string | null;
  confidence: number;
}

// ==================== モックデータ（バックエンドAPI実装後に差し替え） ====================
// TODO: /admin/measurement/sessions API が実装されたら下記に差し替え
// const sessionsData = await api.admin.listMeasurementSessions();

const MOCK_SESSIONS: MeasurementSession[] = [
  {
    id: 'sess-001',
    user_email: 'customer1@example.com',
    user_name: '田中 太郎',
    status: 'completed',
    created_at: '2026-03-01T10:00:00Z',
    completed_at: '2026-03-01T10:15:00Z',
    result: {
      foot_type: 'wide',
      foot_length_cm: 26.5,
      foot_width_cm: 10.2,
      percentile: 18,
      recommended_brands: ['New Balance（幅広設計）', 'Asics（日本人向け）', 'Merrell（ワイドフィット）'],
      advice: 'ナイキやプーマは細めの傾向があります。普段より+0.5cm大きめをお試しください。',
      photo_top_url: null,
      photo_side_url: null,
      gemini_comment: null,
      confidence: 75,
    },
  },
  {
    id: 'sess-002',
    user_email: 'customer2@example.com',
    user_name: '鈴木 花子',
    status: 'pending',
    created_at: '2026-03-02T14:30:00Z',
    completed_at: null,
  },
  {
    id: 'sess-003',
    user_email: 'customer3@example.com',
    user_name: '佐藤 一郎',
    status: 'in_progress',
    created_at: '2026-03-03T09:00:00Z',
    completed_at: null,
  },
];

// ==================== サブコンポーネント ====================

function StatusBadge({ status }: { status: SessionStatus }) {
  const config: Record<SessionStatus, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: '待機中',
      className: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      icon: <Clock className="w-3 h-3" />,
    },
    in_progress: {
      label: '測定中',
      className: 'bg-blue-50 text-blue-700 border border-blue-200',
      icon: <PlayCircle className="w-3 h-3" />,
    },
    completed: {
      label: '完了',
      className: 'bg-green-50 text-green-700 border border-green-200',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    cancelled: {
      label: 'キャンセル',
      className: 'bg-red-50 text-red-700 border border-red-200',
      icon: <XCircle className="w-3 h-3" />,
    },
  };

  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs tracking-wider ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function FootTypeLabel({ type }: { type: FootType }) {
  const labels: Record<FootType, string> = {
    narrow: '細め・華奢タイプ',
    standard: '標準タイプ',
    wide: '幅広・甲高タイプ',
  };
  return <span>{labels[type]}</span>;
}

// ==================== セッション詳細ビュー ====================

interface SessionDetailProps {
  session: MeasurementSession;
  onBack: () => void;
  onUpdate: (updated: MeasurementSession) => void;
}

function SessionDetail({ session, onBack, onUpdate }: SessionDetailProps) {
  const [photos, setPhotos] = useState<{ top: File | null; side: File | null }>({ top: null, side: null });
  const [analyzing, setAnalyzing] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [localSession, setLocalSession] = useState<MeasurementSession>(session);

  // 足タイプ診断を実行
  // TODO: POST /admin/measurement/{id}/analyze APIに差し替え
  const handleAnalyze = async () => {
    if (!photos.top && !photos.side) return;
    setAnalyzing(true);

    await new Promise(resolve => setTimeout(resolve, 2000)); // API呼び出しに差し替え予定

    const mockResult: MeasurementResult = {
      foot_type: 'wide',
      foot_length_cm: 26.5,
      foot_width_cm: 10.2,
      percentile: 18,
      recommended_brands: ['New Balance（幅広設計）', 'Asics（日本人向け）', 'Merrell（ワイドフィット）'],
      advice: 'ナイキやプーマは細めの傾向があります。普段より+0.5cm大きめをお試しください。',
      photo_top_url: photos.top ? URL.createObjectURL(photos.top) : null,
      photo_side_url: photos.side ? URL.createObjectURL(photos.side) : null,
      gemini_comment: null,
      confidence: 75,
    };

    const updated: MeasurementSession = {
      ...localSession,
      status: 'completed',
      completed_at: new Date().toISOString(),
      result: mockResult,
    };

    setLocalSession(updated);
    onUpdate(updated);
    setAnalyzing(false);
  };

  // Gemini AIコメント生成
  // TODO: POST /admin/measurement/{id}/gemini-analyze APIに差し替え
  const handleGeminiAnalyze = async () => {
    if (!localSession.result) return;
    setGeminiLoading(true);

    await new Promise(resolve => setTimeout(resolve, 3000)); // Gemini API呼び出しに差し替え予定

    const geminiComment =
      `【Gemini AI 分析結果】\n` +
      `${localSession.user_name}様の足は幅広・甲高タイプです。\n\n` +
      `▼ おすすめサイズ: 26.5cm（普段より+0.5cm）\n\n` +
      `▼ 注意点:\n` +
      `• Nike、Pumaは幅が狭いため不向きです\n` +
      `• ハイカットスニーカーは甲の高さに注意してください\n` +
      `• ランニングシューズはNew Balance 1080シリーズが特に適しています\n\n` +
      `▼ 購入アドバイス:\n` +
      `試着の際は必ず実寸でご確認いただき、つま先に1cm程度の余裕があることを確認してください。`;

    const updated: MeasurementSession = {
      ...localSession,
      result: {
        ...localSession.result!,
        gemini_comment: geminiComment,
      },
    };

    setLocalSession(updated);
    onUpdate(updated);
    setGeminiLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          セッション一覧
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm tracking-wider text-gray-900">{localSession.user_name}</span>
      </div>

      {/* セッション情報 */}
      <div className="border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-gray-300 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-light tracking-wider text-gray-900">{localSession.user_name}</p>
              <p className="text-xs text-gray-500 tracking-wider">{localSession.user_email}</p>
            </div>
          </div>
          <StatusBadge status={localSession.status} />
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 tracking-wider border-t border-gray-100 pt-4">
          <div>
            <span className="uppercase text-gray-400">セッションID</span>
            <p className="text-gray-700 mt-1 font-mono">{localSession.id}</p>
          </div>
          <div>
            <span className="uppercase text-gray-400">作成日時</span>
            <p className="text-gray-700 mt-1">
              {new Date(localSession.created_at).toLocaleString('ja-JP')}
            </p>
          </div>
          {localSession.completed_at && (
            <div>
              <span className="uppercase text-gray-400">完了日時</span>
              <p className="text-gray-700 mt-1">
                {new Date(localSession.completed_at).toLocaleString('ja-JP')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 測定フロー（未完了の場合のみ表示） */}
      {localSession.status !== 'completed' && (
        <div className="border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            <h2 className="text-sm tracking-[0.2em] uppercase text-gray-900">足写真アップロード</h2>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 mb-6 text-xs text-gray-600 tracking-wide leading-relaxed">
            <p className="font-medium mb-1 tracking-wider">撮影ガイド</p>
            <ul className="space-y-1">
              <li>• A4用紙を足元に置き、真上から撮影してください（スケール基準）</li>
              <li>• 明るい場所で影が入らないよう撮影してください</li>
              <li>• 上面・側面の2方向を撮影すると精度が向上します</li>
            </ul>
          </div>

          <div className="space-y-4 mb-6">
            {/* 上面写真 */}
            <label className="block border border-dashed border-gray-300 hover:border-gray-900 transition-colors cursor-pointer p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm tracking-wider text-gray-900 mb-1">上面撮影</p>
                  <p className="text-xs text-gray-500 tracking-wide">足を平らな場所に置いて、真上から撮影</p>
                  {photos.top && (
                    <p className="text-xs text-green-600 mt-2 tracking-wide">✓ {photos.top.name}</p>
                  )}
                </div>
                <div className="border border-gray-300 p-3">
                  <Upload className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => setPhotos(prev => ({ ...prev, top: e.target.files?.[0] || null }))}
              />
            </label>

            {/* 側面写真 */}
            <label className="block border border-dashed border-gray-300 hover:border-gray-900 transition-colors cursor-pointer p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm tracking-wider text-gray-900 mb-1">側面撮影</p>
                  <p className="text-xs text-gray-500 tracking-wide">足の側面を撮影して、甲の高さを確認</p>
                  {photos.side && (
                    <p className="text-xs text-green-600 mt-2 tracking-wide">✓ {photos.side.name}</p>
                  )}
                </div>
                <div className="border border-gray-300 p-3">
                  <Upload className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => setPhotos(prev => ({ ...prev, side: e.target.files?.[0] || null }))}
              />
            </label>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={(!photos.top && !photos.side) || analyzing}
            className="w-full bg-gray-900 text-white py-3 px-4 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                診断中...
              </>
            ) : (
              <>
                <Ruler className="w-4 h-4" strokeWidth={1.5} />
                足タイプを診断する
              </>
            )}
          </button>
        </div>
      )}

      {/* 測定結果 */}
      {localSession.result && (
        <div className="border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
            <h2 className="text-sm tracking-[0.2em] uppercase text-gray-900">測定結果</h2>
          </div>

          <div className="bg-gray-900 text-white p-6 mb-6">
            <p className="text-xs tracking-[0.2em] uppercase text-gray-400 mb-2">足タイプ</p>
            <h3 className="text-2xl font-light tracking-widest mb-3">
              <FootTypeLabel type={localSession.result.foot_type} />
            </h3>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              <span className="text-sm text-gray-300 tracking-wider">
                日本人上位 {localSession.result.percentile}%
              </span>
              <span className="ml-4 text-xs text-gray-400 tracking-wider">
                信頼度 {localSession.result.confidence}%
              </span>
            </div>
          </div>

          {/* 実測値 */}
          {(localSession.result.foot_length_cm || localSession.result.foot_width_cm) && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {localSession.result.foot_length_cm && (
                <div className="border border-gray-200 p-4 text-center">
                  <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-1">足長</p>
                  <p className="text-2xl font-light text-gray-900">{localSession.result.foot_length_cm}<span className="text-sm ml-1">cm</span></p>
                </div>
              )}
              {localSession.result.foot_width_cm && (
                <div className="border border-gray-200 p-4 text-center">
                  <p className="text-xs tracking-[0.15em] uppercase text-gray-400 mb-1">足幅</p>
                  <p className="text-2xl font-light text-gray-900">{localSession.result.foot_width_cm}<span className="text-sm ml-1">cm</span></p>
                </div>
              )}
            </div>
          )}

          {/* おすすめブランド */}
          <div className="mb-6">
            <p className="text-xs tracking-[0.15em] uppercase text-gray-500 mb-3">おすすめブランド</p>
            <div className="space-y-2">
              {localSession.result.recommended_brands.map((brand, i) => (
                <div key={i} className="flex items-center gap-3 border border-gray-100 p-3">
                  <div className="w-6 h-6 bg-gray-900 text-white flex items-center justify-center text-xs font-light">
                    {i + 1}
                  </div>
                  <span className="text-sm text-gray-700 tracking-wide">{brand}</span>
                </div>
              ))}
            </div>
          </div>

          {/* アドバイス */}
          <div className="bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 tracking-wide leading-relaxed">
            <span className="font-medium tracking-wider">アドバイス：</span>
            {localSession.result.advice}
          </div>
        </div>
      )}

      {/* Gemini AI 解析 */}
      {localSession.result && (
        <div className="border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
              <h2 className="text-sm tracking-[0.2em] uppercase text-gray-900">Gemini AI 解析</h2>
            </div>
            {!localSession.result.gemini_comment && (
              <span className="text-xs text-gray-400 tracking-wider border border-gray-200 px-2 py-1">未生成</span>
            )}
          </div>

          {localSession.result.gemini_comment ? (
            <div className="bg-gray-50 border border-gray-200 p-5 text-sm text-gray-700 tracking-wide leading-loose whitespace-pre-line">
              {localSession.result.gemini_comment}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-gray-200">
              <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" strokeWidth={1} />
              <p className="text-sm text-gray-500 tracking-wide mb-6">
                AIによる詳細な分析コメントを生成します
              </p>
              <button
                onClick={handleGeminiAnalyze}
                disabled={geminiLoading}
                className="bg-gray-900 text-white px-8 py-2.5 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs tracking-[0.2em] uppercase flex items-center gap-2 mx-auto"
              >
                {geminiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                    Gemini 解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                    Gemini AI で解析する
                  </>
                )}
              </button>
            </div>
          )}

          {/* API未実装の注意書き */}
          <div className="flex items-start gap-2 mt-4 p-3 bg-yellow-50 border border-yellow-200 text-xs text-yellow-700 tracking-wide">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>
              現在はモック実装です。Gemini APIキーを設定し、
              Lambda関数 <code className="font-mono bg-yellow-100 px-1">POST /admin/measurement/&#123;id&#125;/gemini-analyze</code> を実装してください。
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== セッション作成モーダル ====================

interface CreateSessionModalProps {
  onClose: () => void;
  onCreate: (session: MeasurementSession) => void;
}

function CreateSessionModal({ onClose, onCreate }: CreateSessionModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // TODO: POST /admin/measurement/sessions APIに差し替え
  const handleCreate = async () => {
    if (!email.trim() || !name.trim()) {
      setError('メールアドレスと名前を入力してください');
      return;
    }
    setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    const newSession: MeasurementSession = {
      id: `sess-${Date.now()}`,
      user_email: email.trim(),
      user_name: name.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    onCreate(newSession);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8">
        <h2 className="text-lg font-light tracking-[0.2em] uppercase text-gray-900 mb-6">
          新規測定セッション
        </h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-gray-500 mb-2">
              お客様の名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：田中 太郎"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide"
            />
          </div>
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-gray-500 mb-2">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="例：customer@example.com"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-900 text-sm tracking-wide"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 tracking-wide">{error}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 py-2.5 hover:border-gray-900 hover:text-gray-900 transition-colors text-xs tracking-[0.15em] uppercase"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 bg-gray-900 text-white py-2.5 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs tracking-[0.15em] uppercase"
          >
            {loading ? '作成中...' : 'セッションを作成'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== メインページ ====================

export default function MeasurementManagement() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<MeasurementSession[]>(MOCK_SESSIONS);
  const [selectedSession, setSelectedSession] = useState<MeasurementSession | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SessionStatus | 'all'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        navigate('/login');
        return;
      }
      // TODO: API からセッション一覧を取得
      // fetchSessions();
      setLoading(false);
    }
  }, [user, isAdmin, authLoading, navigate]);

  // TODO: API実装後に差し替え
  // const fetchSessions = async () => {
  //   const data = await api.admin.listMeasurementSessions();
  //   setSessions(data);
  // };

  const handleCreateSession = (newSession: MeasurementSession) => {
    setSessions(prev => [newSession, ...prev]);
    setShowCreateModal(false);
    setSelectedSession(newSession);
  };

  const handleUpdateSession = (updated: MeasurementSession) => {
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
    setSelectedSession(updated);
  };

  const filteredSessions = sessions.filter(s =>
    filterStatus === 'all' ? true : s.status === filterStatus
  );

  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === 'completed').length,
    pending: sessions.filter(s => s.status === 'pending').length,
    in_progress: sessions.filter(s => s.status === 'in_progress').length,
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400 font-light tracking-widest text-sm">Loading...</div>
      </div>
    );
  }

  // セッション詳細ビュー
  if (selectedSession) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-20 px-6">
        <div className="max-w-[900px] mx-auto">
          <SessionDetail
            session={selectedSession}
            onBack={() => setSelectedSession(null)}
            onUpdate={handleUpdateSession}
          />
        </div>
      </div>
    );
  }

  // セッション一覧ビュー
  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">

        {/* ページヘッダー */}
        <div className="flex items-start justify-between mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Ruler className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
              <h1 className="text-2xl tracking-[0.3em] font-light text-gray-900 uppercase">
                Measurement Management
              </h1>
            </div>
            <p className="text-xs tracking-[0.15em] text-gray-500">
              足計測管理 / 測定フローの起動・ユーザー紐付け・結果確認
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 hover:bg-gray-700 transition-colors text-xs tracking-[0.15em] uppercase"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            新規セッション
          </button>
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: '総セッション', value: stats.total, icon: Ruler },
            { label: '完了', value: stats.completed, icon: CheckCircle },
            { label: '待機中', value: stats.pending, icon: Clock },
            { label: '測定中', value: stats.in_progress, icon: PlayCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs tracking-[0.15em] uppercase text-gray-400">{label}</span>
                <Icon className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-3xl font-light text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* モック注意書き */}
        <div className="flex items-start gap-2 mb-8 p-4 bg-yellow-50 border border-yellow-200 text-xs text-yellow-700 tracking-wide">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>
            現在はモックデータを表示しています。バックエンドAPI（
            <code className="font-mono bg-yellow-100 px-1">GET /admin/measurement/sessions</code>
            ）を実装後、本番データに自動切り替わります。
          </span>
        </div>

        {/* フィルタータブ */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2.5 text-xs tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px ${
                filterStatus === status
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {status === 'all' ? 'すべて' :
               status === 'pending' ? '待機中' :
               status === 'in_progress' ? '測定中' :
               status === 'completed' ? '完了' : 'キャンセル'}
            </button>
          ))}
        </div>

        {/* セッションテーブル */}
        {filteredSessions.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-200">
            <Ruler className="w-12 h-12 text-gray-200 mx-auto mb-4" strokeWidth={1} />
            <p className="text-sm text-gray-400 tracking-wider">セッションがありません</p>
          </div>
        ) : (
          <div className="border border-gray-200 overflow-hidden">
            {/* テーブルヘッダー */}
            <div className="grid grid-cols-[1fr_1fr_140px_140px_40px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs tracking-[0.15em] uppercase text-gray-400">
              <span>お客様</span>
              <span>メールアドレス</span>
              <span>ステータス</span>
              <span>作成日時</span>
              <span></span>
            </div>

            {filteredSessions.map((session, index) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`w-full grid grid-cols-[1fr_1fr_140px_140px_40px] gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors ${
                  index < filteredSessions.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm text-gray-900 tracking-wide">{session.user_name}</span>
                </div>
                <span className="text-sm text-gray-500 tracking-wide self-center">{session.user_email}</span>
                <div className="self-center">
                  <StatusBadge status={session.status} />
                </div>
                <span className="text-xs text-gray-400 tracking-wide self-center">
                  {new Date(session.created_at).toLocaleDateString('ja-JP')}
                </span>
                <div className="self-center flex justify-end">
                  <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSession}
        />
      )}
    </div>
  );
}

