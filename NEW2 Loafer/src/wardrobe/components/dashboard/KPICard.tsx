interface KPICardProps {
  titleJa: string;
  titleEn: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export default function KPICard({ titleJa, titleEn, value, change, changeType }: KPICardProps) {
  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="text-xs text-gray-500 tracking-wider mb-1">{titleJa}</div>
      <div className="text-xs text-gray-400 tracking-wider mb-4">{titleEn}</div>
      <div className="text-3xl font-light tracking-wider">{value}</div>
      {change && (
        <div className={`text-sm mt-2 ${
          changeType === 'positive' ? 'text-green-600' :
          changeType === 'negative' ? 'text-red-600' :
          'text-gray-600'
        }`}>
          {changeType === 'positive' && '↓'} 
          {changeType === 'negative' && '↑'} 
          {change} vs 前月
        </div>
      )}
    </div>
  );
}

