import { useEffect, useState } from 'react';
import { api } from '../lib/api-client';
import { BarChart3, Eye, UserCheck, ShoppingCart, Package, Users } from 'lucide-react';

interface AnalyticsSummary {
  total_page_views: number;
  unique_visitors: number;
  total_orders: number;
  total_revenue: number;
  total_products: number;
  total_users: number;
}

interface PageViewData {
  date: string;
  page_path: string;
  views: number;
  unique_sessions: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [pageViews, setPageViews] = useState<PageViewData[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const [summaryData, pageViewsData] = await Promise.all([
        api.admin.getAnalyticsSummary(),
        api.admin.getPageViews(days),
      ]);
      
      setSummary(summaryData);
      setPageViews(pageViewsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  // ページ別の集計
  const pagePathStats = pageViews.reduce((acc, pv) => {
    if (!acc[pv.page_path]) {
      acc[pv.page_path] = { views: 0, unique_sessions: 0 };
    }
    acc[pv.page_path].views += parseInt(String(pv.views));
    acc[pv.page_path].unique_sessions += parseInt(String(pv.unique_sessions));
    return acc;
  }, {} as Record<string, { views: number; unique_sessions: number }>);

  const sortedPages = Object.entries(pagePathStats)
    .map(([path, stats]) => ({ path, ...stats }))
    .sort((a, b) => b.views - a.views);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">アナリティクス</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">期間:</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value={7}>過去7日間</option>
              <option value={30}>過去30日間</option>
              <option value={90}>過去90日間</option>
            </select>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">ページビュー</p>
                <p className="text-2xl font-bold">{summary?.total_page_views || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">ユニーク訪問者</p>
                <p className="text-2xl font-bold">{summary?.unique_visitors || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">注文数</p>
                <p className="text-2xl font-bold">{summary?.total_orders || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">売上</p>
                <p className="text-2xl font-bold">¥{(summary?.total_revenue || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-indigo-500" />
              <div>
                <p className="text-sm text-gray-500">商品数</p>
                <p className="text-2xl font-bold">{summary?.total_products || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-teal-500" />
              <div>
                <p className="text-sm text-gray-500">ユーザー数</p>
                <p className="text-2xl font-bold">{summary?.total_users || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ページ別統計 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">ページ別アクセス数</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ページパス</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">PV数</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">ユニークセッション</th>
                </tr>
              </thead>
              <tbody>
                {sortedPages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  sortedPages.map((page, index) => (
                    <tr key={page.path} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm">{page.path}</td>
                      <td className="px-4 py-3 text-sm text-right">{page.views.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">{page.unique_sessions.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
