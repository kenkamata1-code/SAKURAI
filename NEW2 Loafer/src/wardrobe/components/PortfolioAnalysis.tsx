import { useState, useMemo } from 'react';
import { PieChart as PieChartIcon, BarChart3, TrendingUp, Eye, Sparkles } from 'lucide-react';
import type { WardrobeItem } from '../types';
import { CATEGORY_LABELS } from '../types';

interface PortfolioAnalysisProps {
  items: WardrobeItem[];
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL';

// カラーパレット
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
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
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
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
      .map(([name, value]) => ({ name: CATEGORY_LABELS[name] || name, value }))
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
      .slice(0, 8); // 上位8ブランド
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
      .slice(0, 8);
  }, [activeItems]);

  // ==================== 分布分析 ====================

  // 金額帯別アイテム数
  const priceRangeData = useMemo(() => {
    const ranges = [
      { label: '〜¥10,000', min: 0, max: 10000 },
      { label: '¥10,001〜¥30,000', min: 10001, max: 30000 },
      { label: '¥30,001〜¥50,000', min: 30001, max: 50000 },
      { label: '¥50,001〜¥100,000', min: 50001, max: 100000 },
      { label: '¥100,001〜', min: 100001, max: Infinity },
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
        name: CATEGORY_LABELS[name] || name,
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
      .map(([name, value]) => ({ name: CATEGORY_LABELS[name] || name, value }))
      .sort((a, b) => b.value - a.value);
  }, [soldItems, salesTimeRange]);

  // 期間内のブランド別売却額
  const filteredBrandSales = useMemo(() => {
    const filtered = getFilteredSoldItems(salesTimeRange);
    const stats: Record<string, number> = {};
    
    filtered.forEach(item => {
      if (item.sold_price) {
        const brand = item.brand || 'Unknown';
        stats[brand] = (stats[brand] || 0) + item.sold_price;
      }
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [soldItems, salesTimeRange]);

  // ==================== 着用率分析 ====================

  // 着用済みアイテム（スタイリング写真に含まれているかどうかで判定）
  // ここでは purchase_date から6ヶ月以上経過しているものを「着用機会があった」と仮定
  const wearAnalysis = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    
    // 購入から6ヶ月以上経過したアイテム
    const matureItems = activeItems.filter(item => {
      if (!item.purchase_date) return true; // 購入日不明は対象に含める
      return new Date(item.purchase_date) < sixMonthsAgo;
    });

    // notes に「未着用」「タグ付き」などが含まれるものを未着用とみなす（簡易判定）
    const unwornItems = matureItems.filter(item => {
      const notes = (item.notes || '').toLowerCase();
      return notes.includes('未着用') || notes.includes('タグ付き') || notes.includes('新品');
    });

    const total = matureItems.length;
    const unwornCount = unwornItems.length;
    const wornCount = total - unwornCount;
    const unwornRate = total > 0 ? Math.round((unwornCount / total) * 100) : 0;

    return {
      total,
      wornCount,
      unwornCount,
      unwornRate,
    };
  }, [activeItems]);

  // ==================== 円グラフコンポーネント ====================
  const PieChart = ({ data, title }: { data: { name: string; value: number }[]; title: string }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let currentAngle = 0;

    if (total === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <PieChartIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">データがありません</p>
        </div>
      );
    }

    return (
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
        <div className="flex items-center gap-6">
          {/* SVG円グラフ */}
          <svg viewBox="0 0 100 100" className="w-32 h-32">
            {data.map((segment, index) => {
              const percentage = (segment.value / total) * 100;
              const angle = (percentage / 100) * 360;
              const startAngle = currentAngle;
              currentAngle += angle;

              // SVGアークパスを計算
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
                  className="hover:opacity-80 transition-opacity"
                />
              );
            })}
          </svg>

          {/* 凡例 */}
          <div className="flex-1 space-y-1">
            {data.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-700 truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="text-gray-500">{item.value}</span>
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
    valueFormatter = (v: number) => v.toString(),
    horizontal = false 
  }: { 
    data: { label: string; value: number }[];
    title: string;
    valueFormatter?: (v: number) => string;
    horizontal?: boolean;
  }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    if (data.length === 0 || data.every(d => d.value === 0)) {
      return (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">データがありません</p>
        </div>
      );
    }

    if (horizontal) {
      return (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
          <div className="space-y-3">
            {data.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 truncate max-w-[200px]">{item.label}</span>
                  <span className="text-gray-500">{valueFormatter(item.value)}</span>
                </div>
                <div className="h-4 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
        <div className="flex items-end gap-2 h-40">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">{valueFormatter(item.value)}</span>
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  minHeight: item.value > 0 ? '4px' : '0px',
                  backgroundColor: COLORS[index % COLORS.length],
                }}
              />
              <span className="text-xs text-gray-500 mt-2 text-center">{item.label}</span>
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
      <section>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-blue-600" />
          構成比分析
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <PieChart data={categoryData} title="カテゴリー別" />
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <PieChart data={brandData} title="ブランド別" />
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <PieChart data={colorData} title="カラー別" />
          </div>
        </div>
      </section>

      {/* 2. 分布分析 */}
      <section>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-600" />
          分布分析
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <BarChart
              data={priceRangeData.map(d => ({ label: d.label, value: d.count }))}
              title="金額帯別アイテム数"
              valueFormatter={(v) => `${v}点`}
            />
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <BarChart
              data={categoryAvgPrice.map(d => ({ label: d.name.split('/')[0], value: d.avgPrice }))}
              title="カテゴリー別平均購入金額"
              valueFormatter={(v) => formatCurrency(v)}
              horizontal
            />
          </div>
        </div>
      </section>

      {/* 3. 売却傾向分析 */}
      <section>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          売却傾向分析
        </h3>
        
        {/* 年別売却額 */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
          <BarChart
            data={yearlySalesData.map(d => ({ label: d.year, value: d.amount }))}
            title="年別売却額"
            valueFormatter={(v) => formatCurrency(v)}
          />
        </div>

        {/* 期間選択 */}
        <div className="flex gap-2 mb-4">
          {(['1M', '3M', '6M', '1Y', '3Y', 'ALL'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setSalesTimeRange(range)}
              className={`px-3 py-1 text-sm border rounded transition ${
                salesTimeRange === range
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <PieChart
              data={filteredCategorySales}
              title={`カテゴリー別売却額（${salesTimeRange}）`}
            />
          </div>
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <PieChart
              data={filteredBrandSales}
              title={`ブランド別売却額（${salesTimeRange}）`}
            />
          </div>
        </div>
      </section>

      {/* 4. 着用率分析 */}
      <section>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-orange-600" />
          着用率分析
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* KPIカード */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">未着用アイテム数</div>
            <p className="text-3xl font-light">{wearAnalysis.unwornCount}<span className="text-lg ml-1">点</span></p>
            <p className="text-sm text-gray-500 mt-2">
              対象アイテム {wearAnalysis.total}点中
            </p>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">未着用率</div>
            <p className={`text-3xl font-light ${wearAnalysis.unwornRate > 30 ? 'text-orange-500' : 'text-green-600'}`}>
              {wearAnalysis.unwornRate}<span className="text-lg ml-1">%</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {wearAnalysis.unwornRate > 30 ? '未着用アイテムが多いです' : '良好な着用率です'}
            </p>
          </div>

          {/* ドーナツチャート */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg">
            <div className="text-sm text-gray-600 mb-4">着用済み vs 未着用</div>
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 100 100" className="w-24 h-24">
                {/* 背景円 */}
                <circle cx="50" cy="50" r="35" fill="none" stroke="#E5E7EB" strokeWidth="15" />
                {/* 着用済み */}
                {wearAnalysis.total > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="35"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="15"
                    strokeDasharray={`${(wearAnalysis.wornCount / wearAnalysis.total) * 220} 220`}
                    strokeDashoffset="55"
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                  <span>着用済み: {wearAnalysis.wornCount}点</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-gray-200 rounded-sm" />
                  <span>未着用: {wearAnalysis.unwornCount}点</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AIインサイト */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 p-6 rounded-lg mt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">AI分析インサイト</h4>
              <p className="text-gray-700 text-sm leading-relaxed">
                {wearAnalysis.unwornRate > 30 ? (
                  <>
                    未着用率が{wearAnalysis.unwornRate}%と高めです。購入前に既存アイテムとのコーディネートを検討することで、
                    ワードローブの活用率を向上させることができます。
                    {wearAnalysis.unwornCount > 5 && '売却やリサイクルも検討してみてはいかがでしょうか。'}
                  </>
                ) : wearAnalysis.total === 0 ? (
                  <>
                    まだ十分なデータがありません。アイテムを登録し、購入日やメモを追加することで、より詳細な分析が可能になります。
                  </>
                ) : (
                  <>
                    着用率は{100 - wearAnalysis.unwornRate}%と良好です。
                    ワードローブを効率的に活用されています。
                    {activeItems.length > 50 && 'コレクションが充実していますね！'}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

