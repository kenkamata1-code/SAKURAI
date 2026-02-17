interface DataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  titleJa: string;
  titleEn: string;
  data: DataPoint[];
}

export default function BarChart({ titleJa, titleEn, data }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="text-sm tracking-wider mb-1">{titleJa}</div>
      <div className="text-xs text-gray-400 tracking-wider mb-6">{titleEn}</div>
      
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-12 text-xs text-gray-500 text-right">{item.label}</div>
            <div className="flex-1 h-6 bg-gray-100 relative">
              <div 
                className="absolute inset-y-0 left-0 bg-gray-800"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <div className="w-24 text-xs text-right">
              ¥{item.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

