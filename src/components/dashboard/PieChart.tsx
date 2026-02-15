interface DataPoint {
  label: string;
  value: number;
}

interface PieChartProps {
  titleJa: string;
  titleEn: string;
  data: DataPoint[];
}

const COLORS = [
  '#1f2937', '#374151', '#4b5563', '#6b7280', 
  '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'
];

export default function PieChart({ titleJa, titleEn, data }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="text-sm tracking-wider mb-1">{titleJa}</div>
      <div className="text-xs text-gray-400 tracking-wider mb-6">{titleEn}</div>
      
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={index} className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 text-sm truncate">{item.label}</div>
              <div className="text-sm text-gray-500">{percentage.toFixed(1)}%</div>
              <div className="w-20 text-sm text-right">
                ¥{item.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
      
      {data.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between">
          <span className="text-sm font-medium">合計</span>
          <span className="text-sm font-medium">¥{total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

