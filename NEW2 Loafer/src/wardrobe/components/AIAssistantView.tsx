import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, ShoppingBag, CloudSun, Ruler, Palette, Users, Zap, Camera, Image as ImageIcon, X, Check, Loader2, ArrowLeft, Paperclip } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useWardrobeStore } from '../lib/store';
import { useAuth } from '../../contexts/AuthContext';
import type { WardrobeItem } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  productData?: Partial<WardrobeItem>;
  productList?: Partial<WardrobeItem>[]; // 複数商品（購入履歴など）
}

interface AIAssistantViewProps {
  aiMessages: Message[];
  setAiMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  aiInput: string;
  setAiInput: React.Dispatch<React.SetStateAction<string>>;
  aiLoading: boolean;
  setAiLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onBack?: () => void;
}

// 1日の最大使用回数
const DAILY_LIMIT = 50;

// サンプル質問
const SAMPLE_QUESTIONS = [
  {
    icon: Camera,
    title: '画像から商品登録',
    question: '画像をアップロード',
    description: '商品画像をアップすると、AIが自動で商品情報を認識して登録',
    isImageUpload: true,
  },
  {
    icon: ShoppingBag,
    title: '商品登録のアシスト',
    question: 'Nike Air Max 90を登録したい',
    description: '商品名やブランド名を伝えると、自動で検索して登録をお手伝いします',
  },
  {
    icon: Ruler,
    title: 'サイズリコメンド',
    question: 'ADIDASのスタンスミスを買いたいが、自分に合うサイズをリコメンドして',
    description: '足のサイズや過去の購入履歴から最適なサイズを提案',
  },
  {
    icon: CloudSun,
    title: '天気に合わせたコーデ',
    question: '今日の天気に合わせたコーディネートをリコメンドして',
    description: '天気と気温を考慮した最適な組み合わせを提案',
  },
  {
    icon: Palette,
    title: '購入アドバイス',
    question: '新しい洋服を買いたいが、自分のポートフォリオを鑑みて、どのような商品を買うべきかアドバイスして',
    description: '所有アイテムの傾向を分析し、足りないアイテムを提案',
  },
  {
    icon: Users,
    title: 'スタイリング参考',
    question: '自分が参考にすべきスタイリング投稿を教えて',
    description: 'あなたの好みや所有アイテムに合うスタイリングを紹介',
  },
];

export default function AIAssistantView({
  aiMessages,
  setAiMessages,
  aiInput,
  setAiInput,
  aiLoading,
  setAiLoading,
  onBack,
}: AIAssistantViewProps) {
  const { user } = useAuth();
  const { addItem } = useWardrobeStore();
  const [dailyUsage, setDailyUsage] = useState(0);
  const [lastResetDate, setLastResetDate] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Partial<WardrobeItem> | null>(null);
  // 複数商品（購入履歴など）選択状態
  const [selectedProductIndices, setSelectedProductIndices] = useState<Set<number>>(new Set());
  const [registeringBulk, setRegisteringBulk] = useState(false);
  const [pastedFile, setPastedFile] = useState<File | null>(null);
  const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 日付が変わったらリセット
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('ai_assistant_usage');
    if (stored) {
      const { date, count } = JSON.parse(stored);
      if (date === today) {
        setDailyUsage(count);
        setLastResetDate(date);
      } else {
        setDailyUsage(0);
        setLastResetDate(today);
        localStorage.setItem('ai_assistant_usage', JSON.stringify({ date: today, count: 0 }));
      }
    } else {
      setLastResetDate(today);
      localStorage.setItem('ai_assistant_usage', JSON.stringify({ date: today, count: 0 }));
    }
  }, []);

  // チャットを最新メッセージにスクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const remainingCredits = DAILY_LIMIT - dailyUsage;
  const canUseAI = remainingCredits > 0;

  // 使用回数を更新
  const incrementUsage = () => {
    const newUsage = dailyUsage + 1;
    setDailyUsage(newUsage);
    const today = new Date().toDateString();
    localStorage.setItem('ai_assistant_usage', JSON.stringify({ date: today, count: newUsage }));
  };

  // 画像をBase64に変換
  const imageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:image/jpeg;base64, のプレフィックスを除去
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 画像アップロードと分析
  const handleImageUpload = async (file: File) => {
    if (!canUseAI || !user) return;

    // プレビュー表示
    const previewUrl = URL.createObjectURL(file);
    setUploadedImage(previewUrl);

    // ユーザーメッセージを追加
    setAiMessages(prev => [...prev, { 
      role: 'user', 
      content: '📷 商品画像をアップロードしました',
      imageUrl: previewUrl 
    }]);

    incrementUsage();
    setAnalyzing(true);
    setAiLoading(true);

    try {
      // 画像をBase64に変換
      const base64 = await imageToBase64(file);

      // Gemini Vision APIで分析
      const result = await apiClient.analyzeProductImage(base64);

      if (result.error) {
        throw result.error;
      }

      const productData = result.data;

      if (productData) {
        // ======== 購入履歴スクリーンショット（複数商品）の場合 ========
        if (productData.type === 'order_history' && Array.isArray(productData.items) && productData.items.length > 0) {
          const items: Partial<WardrobeItem>[] = productData.items.map((item: Record<string, unknown>) => ({
            name: (item.name as string) || '不明な商品',
            brand: (item.brand as string) || null,
            color: (item.color as string) || null,
            size: (item.size as string) || null,
            category: (item.category as string) || null,
            purchase_price: item.purchase_price ? Number(item.purchase_price) : null,
            currency: (item.currency as string) || 'JPY',
            purchase_date: (item.purchase_date as string) || null,
            notes: (item.notes as string) || null,
          }));

          // 全アイテムを選択状態にして初期化
          setSelectedProductIndices(new Set(items.map((_, i) => i)));

          const summary = items.map((p, i) =>
            `${i + 1}. **${p.name}**${p.brand ? ` (${p.brand})` : ''}${p.size ? ` / ${p.size}` : ''}${p.purchase_price ? ` — ¥${Number(p.purchase_price).toLocaleString()}` : ''}`
          ).join('\n');

          setAiMessages(prev => [...prev, {
            role: 'assistant',
            content: `購入履歴から **${items.length}件** の商品を検出しました。\n登録したい商品を選択してください。\n\n${summary}`,
            productList: items,
          }]);

        // ======== 単一商品の場合 ========
        } else {
          // S3に画像をアップロード
          let imageUrl = previewUrl;
          try {
            const uploadResult = await apiClient.uploadImage(user.id, file, 'wardrobe-items');
            if (uploadResult.data) imageUrl = uploadResult.data;
          } catch (e) {
            console.error('Image upload failed:', e);
          }

          const product: Partial<WardrobeItem> = {
            name: productData.name || '不明な商品',
            brand: productData.brand || null,
            color: productData.color || null,
            size: productData.size || null,
            category: productData.category || null,
            purchase_price: productData.purchase_price ? Number(productData.purchase_price) : productData.price ? parseInt(productData.price) : null,
            currency: productData.currency || 'JPY',
            notes: productData.notes || productData.description || null,
            image_url: imageUrl,
          };

          setPendingProduct(product);

          setAiMessages(prev => [...prev, {
            role: 'assistant',
            content: `商品を認識しました！\n\n📦 **${product.name}**\n${product.brand ? `🏷️ ブランド: ${product.brand}\n` : ''}${product.color ? `🎨 カラー: ${product.color}\n` : ''}${product.category ? `📁 カテゴリー: ${product.category}\n` : ''}${product.purchase_price ? `💰 価格: ¥${Number(product.purchase_price).toLocaleString()}\n` : ''}\n\nこの商品をワードローブに登録しますか？`,
            productData: product,
          }]);
        }
      } else {
        setAiMessages(prev => [...prev, {
          role: 'assistant',
          content: '申し訳ありません。画像から商品情報を認識できませんでした。\n\n別の角度から撮影した画像や、商品タグが見える画像をお試しください。',
        }]);
      }
    } catch (error) {
      console.error('Image analysis failed:', error);
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: '画像の分析中にエラーが発生しました。しばらくしてからもう一度お試しください。',
      }]);
    } finally {
      setAnalyzing(false);
      setAiLoading(false);
      setUploadedImage(null);
    }
  };

  // 商品をワードローブに登録
  const handleRegisterProduct = async () => {
    if (!pendingProduct || !user) return;

    setAiLoading(true);
    try {
      await addItem(user.id, pendingProduct);
      
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **${pendingProduct.name}** をワードローブに登録しました！\n\n「アイテム」タブから確認・編集できます。`,
      }]);
      
      setPendingProduct(null);
    } catch (error) {
      console.error('Failed to register product:', error);
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: '登録中にエラーが発生しました。もう一度お試しください。',
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  // 複数商品の一括登録
  const handleRegisterBulk = async (productList: Partial<WardrobeItem>[]) => {
    if (!user) return;
    const targets = productList.filter((_, i) => selectedProductIndices.has(i));
    if (targets.length === 0) return;

    setRegisteringBulk(true);
    setAiLoading(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const product of targets) {
      try {
        await addItem(user.id, product);
        successCount++;
      } catch (e) {
        errors.push(product.name || '不明');
      }
    }

    const msg = errors.length === 0
      ? `✅ **${successCount}件** をワードローブに登録しました！\n「ITEMS」タブから確認・編集できます。`
      : `${successCount}件を登録しました。\n⚠️ 失敗: ${errors.join(', ')}`;

    setAiMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    setSelectedProductIndices(new Set());
    setRegisteringBulk(false);
    setAiLoading(false);
  };

  // 登録をキャンセル
  const handleCancelRegister = () => {
    setPendingProduct(null);
    setAiMessages(prev => [...prev, {
      role: 'assistant',
      content: '登録をキャンセルしました。他の商品を登録する場合は、画像をアップロードするか、商品名を教えてください。',
    }]);
  };

  // テキストメッセージを送信（Gemini 2.5 Flash）
  const handleSendMessage = async (message?: string) => {
    const inputMessage = message || aiInput.trim();
    // 添付画像がある場合は画像分析フローへ
    if (pastedFile && canUseAI) {
      const file = pastedFile;
      clearPastedImage();
      setAiInput('');
      await handleImageUpload(file);
      return;
    }
    if (!inputMessage || !canUseAI) return;

    incrementUsage();

    // 送信前の履歴（システム応答除くユーザー・アシスタントのやりとり）
    const history = aiMessages.map(m => ({ role: m.role, content: m.content }));

    setAiMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    setAiInput('');
    setAiLoading(true);

    try {
      const result = await apiClient.aiChat(inputMessage, history);
      if (result.data?.reply) {
        setAiMessages(prev => [...prev, {
          role: 'assistant',
          content: result.data!.reply,
        }]);
      } else {
        throw new Error(result.error?.message || 'AIからの応答がありませんでした');
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'すみません、エラーが発生しました。しばらくしてからもう一度お試しください。',
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  // 添付・ペースト画像のクリア
  const clearPastedImage = () => {
    if (pastedImagePreview) URL.revokeObjectURL(pastedImagePreview);
    setPastedFile(null);
    setPastedImagePreview(null);
  };

  // クリップボードからのペーストを処理
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          clearPastedImage();
          setPastedFile(file);
          setPastedImagePreview(URL.createObjectURL(file));
        }
        break;
      }
    }
  };

  const handleSampleClick = (question: string, isImageUpload?: boolean) => {
    if (!canUseAI) return;
    
    if (isImageUpload) {
      fileInputRef.current?.click();
    } else {
      handleSendMessage(question);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* ヘッダーバー：戻るボタン + タイトル + リフレッシュ + クレジット */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* 戻るボタン */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK
            </button>
          )}
          <h2 className="text-xl tracking-wider font-light flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            AI ASSISTANT
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* チャットリフレッシュボタン */}
          <button
            onClick={() => {
              if (aiMessages.length === 0 || confirm('チャット履歴をリセットしますか？')) {
                setAiMessages([]);
              }
            }}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition disabled:opacity-40"
            title="チャットをリセット"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            RESET
          </button>

          {/* クレジット表示 */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg">
            <Zap className={`w-4 h-4 ${canUseAI ? 'text-yellow-500' : 'text-gray-400'}`} />
            <span className="text-sm">
              残り <span className={`font-bold ${canUseAI ? 'text-gray-900' : 'text-red-500'}`}>{remainingCredits}</span> / {DAILY_LIMIT}
            </span>
          </div>
        </div>
      </div>

      {/* チャットエリア */}
      <div className="border border-gray-200 bg-white rounded-lg overflow-hidden mb-4">
        <div className="h-[450px] overflow-y-auto p-6">
          {aiMessages.length === 0 ? (
            <div className="h-full flex flex-col">
              {/* ウェルカムメッセージ */}
              <div className="flex items-start gap-4 mb-8">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div className="bg-gray-50 rounded-2xl rounded-tl-none p-4 max-w-[85%]">
                  <p className="text-gray-800">
                    こんにちは！ワードローブへの商品登録をお手伝いします。
                  </p>
                  <p className="text-gray-600 text-sm mt-2">
                    📸 <strong>商品画像をアップロード</strong>すると、AIが自動で認識して登録できます。
                  </p>
                </div>
              </div>

              {/* サンプル質問 */}
              <div className="mt-auto">
                <p className="text-xs text-gray-500 mb-3 tracking-wider">こんなことができます</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SAMPLE_QUESTIONS.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSampleClick(item.question, item.isImageUpload)}
                      disabled={!canUseAI}
                      className={`text-left p-4 border rounded-lg transition group ${
                        canUseAI 
                          ? item.isImageUpload
                            ? 'border-blue-300 bg-blue-50 hover:border-blue-500 hover:bg-blue-100' 
                            : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50' 
                          : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <item.icon className={`w-4 h-4 ${item.isImageUpload ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className={`font-medium text-sm ${item.isImageUpload ? 'text-blue-900' : 'text-gray-900'}`}>
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${
                    msg.role === 'user' 
                      ? 'bg-gray-900 text-white rounded-2xl rounded-br-none p-4' 
                      : 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none p-4'
                  }`}>
                    {msg.imageUrl && (
                      <img 
                        src={msg.imageUrl} 
                        alt="アップロード画像" 
                        className="w-full max-w-[200px] rounded-lg mb-2"
                      />
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content.split('\n').map((line, li) => {
                        // **太字** をレンダリング
                        const parts = line.split(/(\*\*[^*]+\*\*)/g);
                        const rendered = parts.map((part, pi) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={pi}>{part.slice(2, -2)}</strong>
                            : part
                        );
                        // 箇条書き行
                        if (line.startsWith('- ') || line.startsWith('• ')) {
                          return <div key={li} className="flex gap-1"><span className="mt-0.5">•</span><span>{rendered.slice(1)}</span></div>;
                        }
                        return <div key={li}>{rendered}</div>;
                      })}
                    </div>
                    
                    {/* 単一商品の登録確認ボタン */}
                    {msg.productData && pendingProduct && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={handleRegisterProduct}
                          disabled={aiLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          REGISTER
                        </button>
                        <button
                          onClick={handleCancelRegister}
                          disabled={aiLoading}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          CANCEL
                        </button>
                      </div>
                    )}

                    {/* 複数商品（購入履歴）の選択・一括登録UI */}
                    {msg.productList && msg.productList.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {/* 全選択/全解除 */}
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedProductIndices.size === msg.productList!.length) {
                                setSelectedProductIndices(new Set());
                              } else {
                                setSelectedProductIndices(new Set(msg.productList!.map((_, idx) => idx)));
                              }
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {selectedProductIndices.size === msg.productList.length ? '全て解除' : '全て選択'}
                          </button>
                          <span className="text-xs text-gray-500">{selectedProductIndices.size}/{msg.productList.length} 件選択中</span>
                        </div>

                        {/* 商品チェックリスト */}
                        {msg.productList.map((product, idx) => (
                          <label
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                              selectedProductIndices.has(idx) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedProductIndices.has(idx)}
                              onChange={(e) => {
                                const next = new Set(selectedProductIndices);
                                if (e.target.checked) next.add(idx); else next.delete(idx);
                                setSelectedProductIndices(next);
                              }}
                              className="mt-0.5 accent-blue-600"
                            />
                            <div className="flex-1 min-w-0 text-sm">
                              <p className="font-medium truncate">{product.name}</p>
                              <p className="text-gray-500 text-xs">
                                {[product.brand, product.size, product.purchase_price ? `¥${Number(product.purchase_price).toLocaleString()}` : null, product.purchase_date].filter(Boolean).join(' / ')}
                              </p>
                            </div>
                          </label>
                        ))}

                        {/* 一括登録ボタン */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleRegisterBulk(msg.productList!)}
                            disabled={aiLoading || registeringBulk || selectedProductIndices.size === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                          >
                            <Check className="w-4 h-4" />
                            {registeringBulk ? '登録中...' : `選択した ${selectedProductIndices.size} 件を登録`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* ローディング */}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-tl-none">
                    {analyzing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>画像を分析中...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* 入力エリア */}
      <div className="flex gap-2 items-end">
        {/* カメラ（画像分析）ボタン */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = '';
          }}
        />
        {/* 添付ファイル選択 */}
        <input
          ref={attachInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              clearPastedImage();
              setPastedFile(file);
              setPastedImagePreview(URL.createObjectURL(file));
            }
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!canUseAI || aiLoading}
          className="flex items-center justify-center w-12 h-12 border border-gray-300 rounded-full hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title="カメラ / 商品画像を分析"
        >
          <Camera className="w-5 h-5 text-gray-600" />
        </button>

        {/* テキスト入力ラッパー */}
        <div className="flex-1 relative">
          {/* 添付画像プレビュー */}
          {pastedImagePreview && (
            <div className="mb-2 relative inline-block">
              <img
                src={pastedImagePreview}
                alt="添付画像"
                className="h-20 w-20 object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={clearPastedImage}
                className="absolute -top-2 -right-2 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => attachInputRef.current?.click()}
              disabled={!canUseAI || aiLoading}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition disabled:opacity-40"
              title="画像を添付（またはCtrl+Vでペースト）"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          <textarea
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder={canUseAI ? "メッセージを入力（画像はCtrl+Vでペースト可）" : "本日の利用上限に達しました"}
            disabled={!canUseAI || aiLoading}
            rows={1}
            className="w-full pl-10 pr-14 py-4 border border-gray-300 rounded-2xl focus:outline-none focus:border-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none overflow-hidden leading-relaxed"
            style={{ minHeight: '52px', maxHeight: '160px' }}
            onPaste={handlePaste}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 160) + 'px';
            }}
            onKeyDown={(e) => {
              // IME変換中（日本語の確定エンターなど）は送信しない
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && canUseAI && !aiLoading) {
                e.preventDefault();
                handleSendMessage();
              }
              // Shift+Enter → 改行 / IME確定中 → 改行
            }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={aiLoading || (!aiInput.trim() && !pastedFile) || !canUseAI}
            className="absolute right-2 bottom-2 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
          </div>
        </div>
      </div>

      {/* 使用上限の注意 */}
      {!canUseAI && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            本日のAIアシスタント利用上限（{DAILY_LIMIT}回）に達しました。明日になるとリセットされます。
          </p>
        </div>
      )}
    </div>
  );
}
