import { Sparkles } from 'lucide-react';

interface AIInsightCardProps {
  titleJa: string;
  titleEn: string;
}

export default function AIInsightCard({ titleJa, titleEn }: AIInsightCardProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <div>
          <div className="text-sm tracking-wider">{titleJa}</div>
          <div className="text-xs text-gray-400 tracking-wider">{titleEn}</div>
        </div>
      </div>
      
      <div className="space-y-3 text-sm text-gray-700">
        <p>
          📊 ワードローブのデータを基にAIが分析を行います。
          アイテムを追加すると、より詳細な分析が可能になります。
        </p>
        <p className="text-xs text-gray-500">
          ※ Gemini APIキーを設定すると、より高度な分析機能が利用可能になります。
        </p>
      </div>
    </div>
  );
}

