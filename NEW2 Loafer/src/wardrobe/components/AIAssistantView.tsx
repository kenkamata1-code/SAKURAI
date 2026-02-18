import { useState, useEffect } from 'react';
import { Bot, Send, Sparkles, ShoppingBag, CloudSun, Ruler, Palette, Users, Zap } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantViewProps {
  aiMessages: Message[];
  setAiMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  aiInput: string;
  setAiInput: React.Dispatch<React.SetStateAction<string>>;
  aiLoading: boolean;
  setAiLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

// 1日の最大使用回数
const DAILY_LIMIT = 5;

// サンプル質問
const SAMPLE_QUESTIONS = [
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
}: AIAssistantViewProps) {
  const [dailyUsage, setDailyUsage] = useState(0);
  const [lastResetDate, setLastResetDate] = useState<string>('');

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
        // 日付が変わったのでリセット
        setDailyUsage(0);
        setLastResetDate(today);
        localStorage.setItem('ai_assistant_usage', JSON.stringify({ date: today, count: 0 }));
      }
    } else {
      setLastResetDate(today);
      localStorage.setItem('ai_assistant_usage', JSON.stringify({ date: today, count: 0 }));
    }
  }, []);

  const remainingCredits = DAILY_LIMIT - dailyUsage;
  const canUseAI = remainingCredits > 0;

  const handleSendMessage = async (message?: string) => {
    const inputMessage = message || aiInput.trim();
    if (!inputMessage || !canUseAI) return;

    // 使用回数を更新
    const newUsage = dailyUsage + 1;
    setDailyUsage(newUsage);
    const today = new Date().toDateString();
    localStorage.setItem('ai_assistant_usage', JSON.stringify({ date: today, count: newUsage }));

    // ユーザーメッセージを追加
    setAiMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    setAiInput('');
    setAiLoading(true);

    // AIレスポンス（将来的にGemini APIに接続）
    setTimeout(() => {
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `「${inputMessage}」についてお手伝いします。\n\n現在この機能は開発中です。近日中にGemini AIと連携し、以下の機能が利用可能になります：\n\n• 商品の自動検索と登録\n• パーソナライズされたサイズ提案\n• 天気に合わせたコーディネート提案\n• ワードローブ分析に基づく購入アドバイス\n• スタイリング投稿のレコメンド\n\n現在は「アイテム」タブから手動で商品を追加してください。`
      }]);
      setAiLoading(false);
    }, 1500);
  };

  const handleSampleClick = (question: string) => {
    if (canUseAI) {
      handleSendMessage(question);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl tracking-wider font-light mb-2 flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-blue-500" />
            AI ASSISTANT
          </h2>
          <p className="text-gray-600 text-sm">
            自然言語でワードローブに商品を登録できます
          </p>
        </div>
        
        {/* クレジット表示 */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200">
          <Zap className={`w-4 h-4 ${canUseAI ? 'text-yellow-500' : 'text-gray-400'}`} />
          <span className="text-sm">
            本日残り <span className={`font-bold ${canUseAI ? 'text-gray-900' : 'text-red-500'}`}>{remainingCredits}</span> / {DAILY_LIMIT} 回
          </span>
        </div>
      </div>

      {/* チャットエリア */}
      <div className="border border-gray-200 bg-white rounded-lg overflow-hidden mb-4">
        <div className="h-[400px] overflow-y-auto p-6">
          {aiMessages.length === 0 ? (
            <div className="h-full flex flex-col">
              {/* ウェルカムメッセージ */}
              <div className="flex items-start gap-4 mb-8">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div className="bg-gray-50 rounded-2xl rounded-tl-none p-4 max-w-[85%]">
                  <p className="text-gray-800">
                    こんにちは！ワードローブへの商品登録をお手伝いします。商品名やブランド名を教えていただければ、自動で検索して登録できます。
                  </p>
                  <p className="text-gray-600 text-sm mt-2">
                    例：「Nike Air Max 90を登録したい」
                  </p>
                </div>
              </div>

              {/* サンプル質問 */}
              <div className="mt-auto">
                <p className="text-xs text-gray-500 mb-3 tracking-wider">こんなことができます</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SAMPLE_QUESTIONS.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSampleClick(item.question)}
                      disabled={!canUseAI}
                      className={`text-left p-4 border rounded-lg transition group ${
                        canUseAI 
                          ? 'border-gray-200 hover:border-gray-400 hover:bg-gray-50' 
                          : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <item.icon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-sm text-gray-900">{item.title}</span>
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
                  <div className={`max-w-[75%] p-4 rounded-2xl whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-gray-900 text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-tl-none">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 入力エリア */}
      <div className="relative">
        <input
          type="text"
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          placeholder={canUseAI ? "メッセージを入力..." : "本日の利用上限に達しました"}
          disabled={!canUseAI}
          className="w-full px-5 py-4 pr-14 border border-gray-300 rounded-full focus:outline-none focus:border-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && canUseAI) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={aiLoading || !aiInput.trim() || !canUseAI}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
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

