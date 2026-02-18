import { useMemo } from 'react';
import { DollarSign, TrendingUp, Package, Calendar } from 'lucide-react';
import type { WardrobeItem } from '../types';

interface SalesDashboardProps {
  items: WardrobeItem[];
}

// 月名の定義
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

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
        month: `${year}/${month + 1}`,
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
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">総売却数</span>
          </div>
          <p className="text-3xl font-light">{stats.totalSoldCount}<span className="text-lg ml-1">点</span></p>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">総売却額</span>
          </div>
          <p className="text-3xl font-light">{formatCurrency(stats.totalSoldAmount)}</p>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">平均売却価格</span>
          </div>
          <p className="text-3xl font-light">{formatCurrency(stats.averageSoldPrice)}</p>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 ${stats.totalProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
              <Calendar className={`w-5 h-5 ${stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
            <span className="text-sm text-gray-600">総利益</span>
          </div>
          <p className={`text-3xl font-light ${stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {stats.totalProfit >= 0 ? '+' : ''}{formatCurrency(stats.totalProfit)}
          </p>
          <p className="text-sm text-gray-500 mt-1">利益率: {stats.profitMargin}%</p>
        </div>
      </div>

      {/* 月別売却額の棒グラフ */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <h3 className="text-lg font-medium mb-6">過去12カ月の売却額推移</h3>
        
        {monthlySalesData.every(d => d.amount === 0) ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>売却データがありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* グラフ */}
            <div className="flex items-end gap-2 h-64">
              {monthlySalesData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center justify-end h-48">
                    {data.amount > 0 && (
                      <span className="text-xs text-gray-600 mb-1">
                        {formatCurrency(data.amount)}
                      </span>
                    )}
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                      style={{
                        height: `${(data.amount / maxAmount) * 100}%`,
                        minHeight: data.amount > 0 ? '4px' : '0px',
                      }}
                      title={`${data.month}: ${formatCurrency(data.amount)} (${data.count}点)`}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                    {data.month.split('/')[1]}月
                  </span>
                </div>
              ))}
            </div>

            {/* 凡例 */}
            <div className="flex justify-center items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-100">
              <span>
                期間: {monthlySalesData[0]?.month} 〜 {monthlySalesData[monthlySalesData.length - 1]?.month}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 最近の売却リスト */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <h3 className="text-lg font-medium mb-4">最近の売却</h3>
        {soldItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">売却履歴がありません</p>
        ) : (
          <div className="space-y-3">
            {soldItems
              .sort((a, b) => new Date(b.sold_date || 0).getTime() - new Date(a.sold_date || 0).getTime())
              .slice(0, 5)
              .map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{formatCurrency(item.sold_price || 0)}</p>
                    <p className="text-xs text-gray-500">
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

