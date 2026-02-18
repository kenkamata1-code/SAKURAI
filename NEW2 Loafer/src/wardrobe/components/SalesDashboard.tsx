import { useMemo } from 'react';
import { Package } from 'lucide-react';
import type { WardrobeItem } from '../types';

interface SalesDashboardProps {
  items: WardrobeItem[];
}

export default function SalesDashboard({ items }: SalesDashboardProps) {
  // 売却済みアイテムのみをフィルタリング
  const soldItems = useMemo(() => {
    return items.filter(item => item.is_sold && !item.is_discarded);
  }, [items]);

  // KPI計算
  const stats = useMemo(() => {
    const totalSoldCount = soldItems.length;
    const totalSoldAmount = soldItems.reduce((sum, item) => sum + (item.sold_price || 0), 0);
    const averageSoldPrice = totalSoldCount > 0 ? Math.round(totalSoldAmount / totalSoldCount) : 0;
    
    // 原価合計（購入価格）
    const totalCost = soldItems.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
    const totalProfit = totalSoldAmount - totalCost;
    const profitMargin = totalCost > 0 ? Math.round((totalProfit / totalCost) * 100) : 0;

    return {
      totalSoldCount,
      totalSoldAmount,
      averageSoldPrice,
      totalProfit,
      profitMargin,
    };
  }, [soldItems]);

  // 過去12カ月の月別売却額データ
  const monthlySalesData = useMemo(() => {
    const now = new Date();
    const months: { month: string; amount: number; count: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const monthItems = soldItems.filter(item => {
        if (!item.sold_date) return false;
        const soldDate = new Date(item.sold_date);
        return soldDate.getFullYear() === year && soldDate.getMonth() === month;
      });

      const amount = monthItems.reduce((sum, item) => sum + (item.sold_price || 0), 0);

      months.push({
        month: `${month + 1}月`,
        amount,
        count: monthItems.length,
      });
    }

    return months;
  }, [soldItems]);

  // 棒グラフの最大値
  const maxAmount = Math.max(...monthlySalesData.map(d => d.amount), 1);

  // 通貨フォーマット
  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-8">
      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-6">
          <div className="text-xs text-gray-500 tracking-wider mb-1">総売却数</div>
          <div className="text-xs text-gray-400 tracking-wider mb-4">Total Sold</div>
          <div className="text-3xl font-light tracking-wider">{stats.totalSoldCount}点</div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <div className="text-xs text-gray-500 tracking-wider mb-1">総売却額</div>
          <div className="text-xs text-gray-400 tracking-wider mb-4">Total Revenue</div>
          <div className="text-3xl font-light tracking-wider">{formatCurrency(stats.totalSoldAmount)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <div className="text-xs text-gray-500 tracking-wider mb-1">平均売却価格</div>
          <div className="text-xs text-gray-400 tracking-wider mb-4">Average Price</div>
          <div className="text-3xl font-light tracking-wider">{formatCurrency(stats.averageSoldPrice)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <div className="text-xs text-gray-500 tracking-wider mb-1">総利益</div>
          <div className="text-xs text-gray-400 tracking-wider mb-4">Total Profit</div>
          <div className={`text-3xl font-light tracking-wider ${stats.totalProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {stats.totalProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalProfit)}
          </div>
          <div className="text-xs text-gray-500 mt-2">利益率: {stats.profitMargin}%</div>
        </div>
      </div>

      {/* 月別売却額の棒グラフ */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="text-xs text-gray-500 tracking-wider mb-1">過去12カ月の売却額</div>
        <div className="text-xs text-gray-400 tracking-wider mb-6">Monthly Sales</div>
        
        {monthlySalesData.every(d => d.amount === 0) ? (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4" />
            <p>売却データがありません</p>
          </div>
        ) : (
          <div className="flex items-end gap-1 h-48">
            {monthlySalesData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end h-40">
                  {data.amount > 0 && (
                    <span className="text-xs text-gray-500 mb-1 whitespace-nowrap">
                      {formatCurrency(data.amount)}
                    </span>
                  )}
                  <div
                    className="w-full bg-gray-900 transition-all duration-300"
                    style={{
                      height: `${(data.amount / maxAmount) * 100}%`,
                      minHeight: data.amount > 0 ? '4px' : '0px',
                    }}
                    title={`${data.month}: ${formatCurrency(data.amount)} (${data.count}点)`}
                  />
                </div>
                <span className="text-xs text-gray-400 mt-2">{data.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 最近の売却リスト */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="text-xs text-gray-500 tracking-wider mb-1">最近の売却</div>
        <div className="text-xs text-gray-400 tracking-wider mb-6">Recent Sales</div>
        
        {soldItems.length === 0 ? (
          <p className="text-gray-400 text-center py-8">売却履歴がありません</p>
        ) : (
          <div className="space-y-3">
            {soldItems
              .sort((a, b) => new Date(b.sold_date || 0).getTime() - new Date(a.sold_date || 0).getTime())
              .slice(0, 5)
              .map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 border border-gray-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-12 h-12 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(item.sold_price || 0)}</p>
                    <p className="text-xs text-gray-400">
                      {item.sold_date ? new Date(item.sold_date).toLocaleDateString('ja-JP') : '-'}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
