import { useState, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import type { WardrobeItem } from '../types';
import { CATEGORY_LABELS } from '../types';

interface PortfolioAnalysisProps {
  items: WardrobeItem[];
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL';

// グレースケールカラーパレット
const COLORS = [
  '#111827', '#374151', '#4B5563', '#6B7280', '#9CA3AF',
  '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB', '#FFFFFF',
];

export default function PortfolioAnalysis({ items }: PortfolioAnalysisProps) {
  const [salesTimeRange, setSalesTimeRange] = useState<TimeRange>('1Y');

  // アクティブなアイテム（廃棄・売却済みを除外）
  const activeItems = useMemo(() => {
    return items.filter(item => !item.is_discarded && !item.is_sold);
  }, [items]);

  // 売却済みアイテム
  const soldItems = useMemo(() => {
    return items.filter(item => item.is_sold && !item.is_discarded);
  }, [items]);

  // 通貨フォーマット
  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  // ==================== 構成比分析 ====================
  
  // カテゴリー別集計
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeItems.forEach(item => {
      const cat = item.category || 'その他';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: CATEGORY_LABELS[name]?.split('/')[0] || name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activeItems]);

  // ブランド別集計
  const brandData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeItems.forEach(item => {
      const brand = item.brand || 'Unknown';
      counts[brand] = (counts[brand] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [activeItems]);

  // カラー別集計
  const colorData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeItems.forEach(item => {
      const color = item.color || 'Unknown';
      counts[color] = (counts[color] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [activeItems]);

  // ==================== 分布分析 ====================

  // 金額帯別アイテム数
  const priceRangeData = useMemo(() => {
    const ranges = [
      { label: '〜¥10K', min: 0, max: 10000 },
      { label: '¥10K〜30K', min: 10001, max: 30000 },
      { label: '¥30K〜50K', min: 30001, max: 50000 },
      { label: '¥50K〜100K', min: 50001, max: 100000 },
      { label: '¥100K〜', min: 100001, max: Infinity },
    ];

    return ranges.map(range => ({
      label: range.label,
      count: activeItems.filter(item => {
        const price = item.purchase_price || 0;
        return price >= range.min && price <= range.max;
      }).length,
    }));
  }, [activeItems]);

  // カテゴリー別平均購入金額
  const categoryAvgPrice = useMemo(() => {
    const categoryStats: Record<string, { total: number; count: number }> = {};
    activeItems.forEach(item => {
      if (item.purchase_price) {
        const cat = item.category || 'その他';
        if (!categoryStats[cat]) {
          categoryStats[cat] = { total: 0, count: 0 };
        }
        categoryStats[cat].total += item.purchase_price;
        categoryStats[cat].count += 1;
      }
    });

    return Object.entries(categoryStats)
      .map(([name, stats]) => ({
        name: CATEGORY_LABELS[name]?.split('/')[0] || name,
        avgPrice: Math.round(stats.total / stats.count),
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice);
  }, [activeItems]);

  // ==================== 売却傾向分析 ====================

  // 期間フィルター
  const getFilteredSoldItems = (range: TimeRange) => {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case '1M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6M':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1Y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case '3Y':
        startDate = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
        break;
      default:
        return soldItems;
    }

    return soldItems.filter(item => {
      if (!item.sold_date) return false;
      return new Date(item.sold_date) >= startDate;
    });
  };

  // 年別売却額
  const yearlySalesData = useMemo(() => {
    const yearStats: Record<number, number> = {};
    soldItems.forEach(item => {
      if (item.sold_date && item.sold_price) {
        const year = new Date(item.sold_date).getFullYear();
        yearStats[year] = (yearStats[year] || 0) + item.sold_price;
      }
    });

    const years = Object.keys(yearStats).map(Number).sort();
    return years.map(year => ({
      year: year.toString(),
      amount: yearStats[year],
    }));
  }, [soldItems]);

  // 期間内のカテゴリー別売却額
  const filteredCategorySales = useMemo(() => {
    const filtered = getFilteredSoldItems(salesTimeRange);
    const stats: Record<string, number> = {};
    
    filtered.forEach(item => {
      if (item.sold_price) {
        const cat = item.category || 'その他';
        stats[cat] = (stats[cat] || 0) + item.sold_price;
      }
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name: CATEGORY_LABELS[name]?.split('/')[0] || name, value }))
      .sort((a, b) => b.value - a.value);
  }, [soldItems, salesTimeRange]);

  // ==================== 着用率分析 ====================

  const wearAnalysis = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    
    const matureItems = activeItems.filter(item => {
      if (!item.purchase_date) return true;
      return new Date(item.purchase_date) < sixMonthsAgo;
    });

    const unwornItems = matureItems.filter(item => {
      const notes = (item.notes || '').toLowerCase();
      return notes.includes('未着用') || notes.includes('タグ付き') || notes.includes('新品');
    });

    const total = matureItems.length;
    const unwornCount = unwornItems.length;
    const wornCount = total - unwornCount;
    const unwornRate = total > 0 ? Math.round((unwornCount / total) * 100) : 0;

    return { total, wornCount, unwornCount, unwornRate };
  }, [activeItems]);

  // ==================== 円グラフコンポーネント ====================
  const PieChart = ({ data, title, titleEn }: { data: { name: string; value: number }[]; title: string; titleEn: string }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let currentAngle = 0;

    if (total === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">データがありません</p>
        </div>
      );
    }

    return (
      <div>
        <div className="text-xs text-gray-500 tracking-wider mb-1">{title}</div>
        <div className="text-xs text-gray-400 tracking-wider mb-4">{titleEn}</div>
        <div className="flex items-center gap-6">
          <svg viewBox="0 0 100 100" className="w-28 h-28">
            {data.map((segment, index) => {
              const percentage = (segment.value / total) * 100;
              const angle = (percentage / 100) * 360;
              const startAngle = currentAngle;
              currentAngle += angle;

              const x1 = 50 + 40 * Math.cos((Math.PI * (startAngle - 90)) / 180);
              const y1 = 50 + 40 * Math.sin((Math.PI * (startAngle - 90)) / 180);
              const x2 = 50 + 40 * Math.cos((Math.PI * (startAngle + angle - 90)) / 180);
              const y2 = 50 + 40 * Math.sin((Math.PI * (startAngle + angle - 90)) / 180);
              const largeArc = angle > 180 ? 1 : 0;

              return (
                <path
                  key={index}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={COLORS[index % COLORS.length]}
                />
              );
            })}
          </svg>

          <div className="flex-1 space-y-1">
            {data.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-600 truncate max-w-[100px]">{item.name}</span>
                </div>
                <span className="text-gray-400">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==================== 棒グラフコンポーネント ====================
  const BarChart = ({ 
    data, 
    title,
    titleEn,
    valueFormatter = (v: number) => v.toString(),
  }: { 
    data: { label: string; value: number }[];
    title: string;
    titleEn: string;
    valueFormatter?: (v: number) => string;
  }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    if (data.length === 0 || data.every(d => d.value === 0)) {
      return (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">データがありません</p>
        </div>
      );
    }

    return (
      <div>
        <div className="text-xs text-gray-500 tracking-wider mb-1">{title}</div>
        <div className="text-xs text-gray-400 tracking-wider mb-4">{titleEn}</div>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 truncate max-w-[150px]">{item.label}</span>
                <span className="text-gray-400">{valueFormatter(item.value)}</span>
              </div>
              <div className="h-2 bg-gray-100">
                <div
                  className="h-full bg-gray-900 transition-all duration-300"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==================== レンダリング ====================
  return (
    <div className="space-y-8">
      {/* 1. 構成比分析 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 p-6">
          <PieChart data={categoryData} title="カテゴリー別" titleEn="By Category" />
        </div>
        <div className="bg-white border border-gray-200 p-6">
          <PieChart data={brandData} title="ブランド別" titleEn="By Brand" />
        </div>
        <div className="bg-white border border-gray-200 p-6">
          <PieChart data={colorData} title="カラー別" titleEn="By Color" />
        </div>
      </div>

      {/* 2. 分布分析 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 p-6">
          <BarChart
            data={priceRangeData.map(d => ({ label: d.label, value: d.count }))}
            title="金額帯別アイテム数"
            titleEn="Items by Price Range"
            valueFormatter={(v) => `${v}点`}
          />
        </div>
        <div className="bg-white border border-gray-200 p-6">
          <BarChart
            data={categoryAvgPrice.map(d => ({ label: d.name, value: d.avgPrice }))}
            title="カテゴリー別平均購入金額"
            titleEn="Avg. Price by Category"
            valueFormatter={(v) => formatCurrency(v)}
          />
        </div>
      </div>

      {/* 3. 売却傾向分析 */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="text-xs text-gray-500 tracking-wider mb-1">売却傾向分析</div>
        <div className="text-xs text-gray-400 tracking-wider mb-4">Sales Trend</div>
        
        {/* 期間選択 */}
        <div className="flex gap-2 mb-6">
          {(['1M', '3M', '6M', '1Y', '3Y', 'ALL'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setSalesTimeRange(range)}
              className={`px-3 py-1 text-xs transition ${
                salesTimeRange === range
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PieChart
            data={filteredCategorySales}
            title={`カテゴリー別売却額`}
            titleEn="Sales by Category"
          />
          <div>
            <div className="text-xs text-gray-500 tracking-wider mb-1">年別売却額</div>
            <div className="text-xs text-gray-400 tracking-wider mb-4">Yearly Sales</div>
            {yearlySalesData.length === 0 ? (
              <p className="text-gray-400 text-sm">データがありません</p>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {yearlySalesData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <span className="text-xs text-gray-400 mb-1">{formatCurrency(d.amount)}</span>
                    <div
                      className="w-full bg-gray-900"
                      style={{
                        height: `${(d.amount / Math.max(...yearlySalesData.map(y => y.amount), 1)) * 100}%`,
                        minHeight: d.amount > 0 ? '4px' : '0px',
                      }}
                    />
                    <span className="text-xs text-gray-400 mt-2">{d.year}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. 着用率分析 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 p-6">
          <div className="text-xs text-gray-500 tracking-wider mb-1">未着用アイテム数</div>
          <div className="text-xs text-gray-400 tracking-wider mb-4">Unworn Items</div>
          <div className="text-3xl font-light tracking-wider">{wearAnalysis.unwornCount}点</div>
          <div className="text-xs text-gray-400 mt-2">対象 {wearAnalysis.total}点中</div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <div className="text-xs text-gray-500 tracking-wider mb-1">未着用率</div>
          <div className="text-xs text-gray-400 tracking-wider mb-4">Unworn Rate</div>
          <div className={`text-3xl font-light tracking-wider ${wearAnalysis.unwornRate > 30 ? 'text-gray-900' : 'text-gray-900'}`}>
            {wearAnalysis.unwornRate}%
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <div className="text-xs text-gray-500 tracking-wider mb-1">着用 vs 未着用</div>
          <div className="text-xs text-gray-400 tracking-wider mb-4">Worn vs Unworn</div>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-20 h-20">
              <circle cx="50" cy="50" r="35" fill="none" stroke="#E5E7EB" strokeWidth="12" />
              {wearAnalysis.total > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#111827"
                  strokeWidth="12"
                  strokeDasharray={`${(wearAnalysis.wornCount / wearAnalysis.total) * 220} 220`}
                  strokeDashoffset="55"
                  strokeLinecap="round"
                />
              )}
            </svg>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-900" />
                <span className="text-gray-600">着用済み: {wearAnalysis.wornCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-200" />
                <span className="text-gray-600">未着用: {wearAnalysis.unwornCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AIインサイト */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <Sparkles className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs text-gray-500 tracking-wider mb-1">AI分析</div>
            <div className="text-xs text-gray-400 tracking-wider mb-3">AI Insights</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {wearAnalysis.unwornRate > 30 ? (
                <>
                  未着用率が{wearAnalysis.unwornRate}%と高めです。購入前に既存アイテムとのコーディネートを検討することで、
                  ワードローブの活用率を向上させることができます。
                </>
              ) : wearAnalysis.total === 0 ? (
                <>
                  まだ十分なデータがありません。アイテムを登録し、購入日やメモを追加することで、より詳細な分析が可能になります。
                </>
              ) : (
                <>
                  着用率は{100 - wearAnalysis.unwornRate}%と良好です。ワードローブを効率的に活用されています。
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
