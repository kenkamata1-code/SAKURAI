import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, Eye, UserCheck, ShoppingCart, Package, Image as ImageIcon, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface OverallStats {
  totalPageViews: number;
  uniqueVisitors: number;
  totalCartAdditions: number;
  totalPurchases: number;
}

interface PageStat {
  page_title: string;
  page_path: string;
  view_count: number;
  unique_visitors: number;
  member_visitors: number;
  guest_visitors: number;
}

interface ProductStat {
  product_id: string;
  product_name: string;
  cart_additions_total: number;
  cart_additions_unique: number;
  purchases_total: number;
  purchases_unique: number;
  revenue: number;
}

interface StylingStat {
  styling_id: string;
  styling_title: string;
  view_count: number;
  unique_visitors: number;
  member_visitors: number;
  guest_visitors: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalPageViews: 0,
    uniqueVisitors: 0,
    totalCartAdditions: 0,
    totalPurchases: 0,
  });
  const [pageStats, setPageStats] = useState<PageStat[]>([]);
  const [productStats, setProductStats] = useState<ProductStat[]>([]);
  const [stylingStats, setStylingStats] = useState<StylingStat[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  function getStartDate() {
    const now = new Date();
    const startDate = new Date();

    if (timeRange === 'day') {
      startDate.setDate(now.getDate() - 1);
    } else if (timeRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    return startDate.toISOString();
  }

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const startDate = getStartDate();

      const adminUsersRes = await supabase
        .from('profiles')
        .select('id')
        .eq('is_admin', true);

      const adminUserIds = new Set((adminUsersRes.data || []).map(p => p.id));

      const [pageViewsRes, productViewsRes, stylingViewsRes, cartAdditionsRes, purchasesRes] = await Promise.all([
        supabase.from('page_views').select('*').gte('created_at', startDate),
        supabase.from('product_views').select('*, products(name)').gte('created_at', startDate),
        supabase.from('styling_views').select('*, styling(title)').gte('created_at', startDate),
        supabase.from('cart_additions').select('*, products(name)').gte('created_at', startDate),
        supabase.from('product_purchases').select('*, products(name)').gte('created_at', startDate),
      ]);

      const pageViewsData = (pageViewsRes.data || []).filter(v => !v.user_id || !adminUserIds.has(v.user_id));
      const productViewsData = (productViewsRes.data || []).filter(v => !v.user_id || !adminUserIds.has(v.user_id));
      const stylingViewsData = (stylingViewsRes.data || []).filter(v => !v.user_id || !adminUserIds.has(v.user_id));
      const cartAdditionsData = (cartAdditionsRes.data || []).filter(v => !v.user_id || !adminUserIds.has(v.user_id));
      const purchasesData = (purchasesRes.data || []).filter(v => !v.user_id || !adminUserIds.has(v.user_id));

      const totalPageViews = pageViewsData.length;
      const uniqueVisitors = new Set([
        ...pageViewsData.map(v => v.session_id),
        ...productViewsData.map(v => v.session_id),
        ...stylingViewsData.map(v => v.session_id),
      ]).size;
      const totalCartAdditions = cartAdditionsData.reduce((sum, item) => sum + item.quantity, 0);
      const totalPurchases = purchasesData.reduce((sum, item) => sum + item.quantity, 0);

      setOverallStats({
        totalPageViews,
        uniqueVisitors,
        totalCartAdditions,
        totalPurchases,
      });

      const pageViewMap = pageViewsData.reduce((acc, view) => {
        const key = `${view.page_path}|${view.page_title}`;
        if (!acc[key]) {
          acc[key] = { memberSessions: new Set(), guestSessions: new Set(), count: 0 };
        }
        if (view.user_id) {
          acc[key].memberSessions.add(view.session_id);
        } else {
          acc[key].guestSessions.add(view.session_id);
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, { memberSessions: Set<string>, guestSessions: Set<string>, count: number }>);

      const productViewMap = productViewsData.reduce((acc, view) => {
        const key = `${view.product_id}`;
        if (!acc[key]) {
          acc[key] = { memberSessions: new Set(), guestSessions: new Set(), count: 0 };
        }
        if (view.user_id) {
          acc[key].memberSessions.add(view.session_id);
        } else {
          acc[key].guestSessions.add(view.session_id);
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, { memberSessions: Set<string>, guestSessions: Set<string>, count: number }>);

      const pageStatsArray = Object.entries(pageViewMap)
        .map(([key, data]) => {
          const [page_path, page_title] = key.split('|');
          return {
            page_path,
            page_title,
            view_count: data.count,
            unique_visitors: data.memberSessions.size + data.guestSessions.size,
            member_visitors: data.memberSessions.size,
            guest_visitors: data.guestSessions.size
          };
        })
        .sort((a, b) => b.view_count - a.view_count);

      const processedProducts = new Set<string>();
      Object.entries(productViewMap).forEach(([product_id, data]) => {
        if (!processedProducts.has(product_id)) {
          processedProducts.add(product_id);
          const product = productViewsData.find(v => v.product_id === product_id);
          const productKey = `/shop/${product?.products?.name || product_id}`;
          const productName = product?.products?.name || 'Unknown Product';
          const combinedKey = `${productKey}|${productName}`;

          if (!pageViewMap[combinedKey]) {
            pageStatsArray.push({
              page_path: productKey,
              page_title: productName,
              view_count: data.count,
              unique_visitors: data.memberSessions.size + data.guestSessions.size,
              member_visitors: data.memberSessions.size,
              guest_visitors: data.guestSessions.size
            });
          }
        }
      });

      pageStatsArray.sort((a, b) => b.view_count - a.view_count);

      setPageStats(pageStatsArray);

      const productStatsMap = new Map<string, ProductStat & {
        cart_users: Set<string>,
        purchase_users: Set<string>
      }>();

      cartAdditionsData.forEach(addition => {
        if (!productStatsMap.has(addition.product_id)) {
          productStatsMap.set(addition.product_id, {
            product_id: addition.product_id,
            product_name: addition.products?.name || 'Unknown',
            cart_additions_total: 0,
            cart_additions_unique: 0,
            purchases_total: 0,
            purchases_unique: 0,
            revenue: 0,
            cart_users: new Set(),
            purchase_users: new Set(),
          });
        }
        const stat = productStatsMap.get(addition.product_id)!;
        stat.cart_additions_total += addition.quantity;
        if (addition.user_id) {
          stat.cart_users.add(addition.user_id);
        } else if (addition.session_id) {
          stat.cart_users.add(addition.session_id);
        }
      });

      purchasesData.forEach(purchase => {
        if (!productStatsMap.has(purchase.product_id)) {
          productStatsMap.set(purchase.product_id, {
            product_id: purchase.product_id,
            product_name: purchase.products?.name || 'Unknown',
            cart_additions_total: 0,
            cart_additions_unique: 0,
            purchases_total: 0,
            purchases_unique: 0,
            revenue: 0,
            cart_users: new Set(),
            purchase_users: new Set(),
          });
        }
        const stat = productStatsMap.get(purchase.product_id)!;
        stat.purchases_total += purchase.quantity;
        stat.revenue += purchase.price * purchase.quantity;
        if (purchase.user_id) {
          stat.purchase_users.add(purchase.user_id);
        }
      });

      const productStatsArray = Array.from(productStatsMap.values()).map(stat => ({
        product_id: stat.product_id,
        product_name: stat.product_name,
        cart_additions_total: stat.cart_additions_total,
        cart_additions_unique: stat.cart_users.size,
        purchases_total: stat.purchases_total,
        purchases_unique: stat.purchase_users.size,
        revenue: stat.revenue,
      })).sort((a, b) => b.cart_additions_total - a.cart_additions_total);

      setProductStats(productStatsArray);

      const stylingStatsMap = new Map<string, StylingStat & { memberSessions: Set<string>, guestSessions: Set<string> }>();

      stylingViewsData.forEach(view => {
        if (!stylingStatsMap.has(view.styling_id)) {
          stylingStatsMap.set(view.styling_id, {
            styling_id: view.styling_id,
            styling_title: view.styling?.title || 'Unknown',
            view_count: 0,
            member_visitors: 0,
            guest_visitors: 0,
            memberSessions: new Set(),
            guestSessions: new Set(),
          });
        }
        const stat = stylingStatsMap.get(view.styling_id)!;
        stat.view_count++;
        if (view.user_id) {
          stat.memberSessions.add(view.session_id);
        } else {
          stat.guestSessions.add(view.session_id);
        }
      });

      const stylingStatsArray = Array.from(stylingStatsMap.values())
        .map(stat => ({
          styling_id: stat.styling_id,
          styling_title: stat.styling_title,
          view_count: stat.view_count,
          unique_visitors: stat.memberSessions.size + stat.guestSessions.size,
          member_visitors: stat.memberSessions.size,
          guest_visitors: stat.guestSessions.size,
        }))
        .sort((a, b) => b.view_count - a.view_count);

      setStylingStats(stylingStatsArray);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  async function exportToExcel() {
    try {
      const startDate = getStartDate();

      const adminUsersRes = await supabase
        .from('profiles')
        .select('id')
        .eq('is_admin', true);

      const adminUserIds = new Set((adminUsersRes.data || []).map(p => p.id));

      const [pageViewsRes, productViewsRes, stylingViewsRes, cartAdditionsRes, purchasesRes] = await Promise.all([
        supabase.from('page_views').select('*').gte('created_at', startDate).order('created_at', { ascending: true }),
        supabase.from('product_views').select('*, products(name)').gte('created_at', startDate).order('created_at', { ascending: true }),
        supabase.from('styling_views').select('*, styling(title)').gte('created_at', startDate).order('created_at', { ascending: true }),
        supabase.from('cart_additions').select('*, products(name)').gte('created_at', startDate).order('created_at', { ascending: true }),
        supabase.from('product_purchases').select('*, products(name)').gte('created_at', startDate).order('created_at', { ascending: true }),
      ]);

      const pageViewsData = (pageViewsRes.data || []).filter(v => !v.user_id || !adminUserIds.has(v.user_id));
      const productViewsData = (productViewsRes.data || []).filter(v => !v.user_id || !adminUserIds.has(v.user_id));
      const stylingViewsData = (stylingViewsRes.data || []).filter(v => !v.user_id || !adminUserIds.has(v.user_id));
      const cartAdditionsData = (cartAdditionsRes.data || []).filter(v => !v.user_id || !adminUserIds.has(v.user_id));
      const purchasesData = (purchasesRes.data || []).filter(v => !v.user_id || !adminUserIds.has(v.user_id));

      const workbook = XLSX.utils.book_new();

      const allData: any[] = [];

      pageViewsData.forEach(row => {
        allData.push({
          '日時': new Date(row.created_at).toLocaleString('ja-JP'),
          'データ種別': 'ページビュー',
          'ページパス': row.page_path,
          'ページ名': row.page_title,
          '商品名': '',
          'スタイリング名': '',
          '数量': '',
          '価格': '',
          '合計': '',
          'ユーザーID': row.user_id || '未ログイン',
          'セッションID': row.session_id,
        });
      });

      productViewsData.forEach(row => {
        allData.push({
          '日時': new Date(row.created_at).toLocaleString('ja-JP'),
          'データ種別': '商品閲覧',
          'ページパス': '',
          'ページ名': '',
          '商品名': row.products?.name || 'Unknown',
          'スタイリング名': '',
          '数量': '',
          '価格': '',
          '合計': '',
          'ユーザーID': row.user_id || '未ログイン',
          'セッションID': row.session_id,
        });
      });

      stylingViewsData.forEach(row => {
        allData.push({
          '日時': new Date(row.created_at).toLocaleString('ja-JP'),
          'データ種別': 'スタイリング閲覧',
          'ページパス': '',
          'ページ名': '',
          '商品名': '',
          'スタイリング名': row.styling?.title || 'Unknown',
          '数量': '',
          '価格': '',
          '合計': '',
          'ユーザーID': row.user_id || '未ログイン',
          'セッションID': row.session_id,
        });
      });

      cartAdditionsData.forEach(row => {
        allData.push({
          '日時': new Date(row.created_at).toLocaleString('ja-JP'),
          'データ種別': 'カート追加',
          'ページパス': '',
          'ページ名': '',
          '商品名': row.products?.name || 'Unknown',
          'スタイリング名': '',
          '数量': row.quantity,
          '価格': '',
          '合計': '',
          'ユーザーID': row.user_id || '未ログイン',
          'セッションID': row.session_id,
        });
      });

      purchasesData.forEach(row => {
        allData.push({
          '日時': new Date(row.created_at).toLocaleString('ja-JP'),
          'データ種別': '購入',
          'ページパス': '',
          'ページ名': '',
          '商品名': row.products?.name || 'Unknown',
          'スタイリング名': '',
          '数量': row.quantity,
          '価格': row.price,
          '合計': row.price * row.quantity,
          'ユーザーID': row.user_id || '未ログイン',
          'セッションID': row.session_id || '',
        });
      });

      allData.sort((a, b) => {
        const dateA = new Date(a['日時']);
        const dateB = new Date(b['日時']);
        return dateA.getTime() - dateB.getTime();
      });

      const allDataSheet = XLSX.utils.json_to_sheet(allData);
      XLSX.utils.book_append_sheet(workbook, allDataSheet, 'アクセス統計');

      const fileName = `analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('データのエクスポートに失敗しました。');
    }
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
              <h1 className="text-3xl tracking-wider font-light">アクセス統計</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTimeRange('day')}
                className={`px-4 py-2 text-xs tracking-wider border transition ${
                  timeRange === 'day'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                24時間
              </button>
              <button
                onClick={() => setTimeRange('week')}
                className={`px-4 py-2 text-xs tracking-wider border transition ${
                  timeRange === 'week'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                7日間
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-4 py-2 text-xs tracking-wider border transition ${
                  timeRange === 'month'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                30日間
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 text-xs tracking-wider border border-gray-900 bg-gray-900 text-white hover:bg-gray-800 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                エクスポート
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">読み込み中...</div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Eye className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                    <h3 className="text-sm tracking-wider text-gray-600">総ページビュー</h3>
                  </div>
                  <p className="text-3xl font-light">{overallStats.totalPageViews}</p>
                </div>

                <div className="border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <UserCheck className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                    <h3 className="text-sm tracking-wider text-gray-600">ユニークアクセス数</h3>
                  </div>
                  <p className="text-3xl font-light">{overallStats.uniqueVisitors}</p>
                </div>

                <div className="border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <ShoppingCart className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                    <h3 className="text-sm tracking-wider text-gray-600">カート追加数</h3>
                  </div>
                  <p className="text-3xl font-light">{overallStats.totalCartAdditions}</p>
                </div>

                <div className="border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                    <h3 className="text-sm tracking-wider text-gray-600">商品購入数</h3>
                  </div>
                  <p className="text-3xl font-light">{overallStats.totalPurchases}</p>
                </div>
              </div>

              <div className="border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm tracking-wider text-gray-600">ページ別アクセス数</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 tracking-wider">ページ名</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">総アクセス数</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">ユニークアクセス数<br />(合計)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">ユニークアクセス数<br />(会員登録済)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">ユニークアクセス数<br />(非会員)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pageStats.length > 0 ? (
                        pageStats.map((stat) => (
                          <tr key={stat.page_path}>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium">{stat.page_title}</div>
                              <div className="text-xs text-gray-500 mt-1">{stat.page_path}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">{stat.view_count}</td>
                            <td className="px-4 py-3 text-sm text-right">{stat.unique_visitors}</td>
                            <td className="px-4 py-3 text-sm text-right">{stat.member_visitors}</td>
                            <td className="px-4 py-3 text-sm text-right">{stat.guest_visitors}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                            この期間のアクセスデータがありません
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm tracking-wider text-gray-600">商品別統計</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 tracking-wider">商品名</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">カート追加<br />(総数)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">カート追加<br />(ユニーク)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">購入数<br />(総数)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">購入数<br />(ユニーク)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">売上</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productStats.length > 0 ? (
                        productStats.map((stat) => (
                          <tr key={stat.product_id}>
                            <td className="px-4 py-3 text-sm">{stat.product_name}</td>
                            <td className="px-4 py-3 text-sm text-right">{stat.cart_additions_total}</td>
                            <td className="px-4 py-3 text-sm text-right">{stat.cart_additions_unique}</td>
                            <td className="px-4 py-3 text-sm text-right">{stat.purchases_total}</td>
                            <td className="px-4 py-3 text-sm text-right">{stat.purchases_unique}</td>
                            <td className="px-4 py-3 text-sm text-right">¥{stat.revenue.toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                            この期間のデータがありません
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm tracking-wider text-gray-600">スタイリング別アクセス数</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 tracking-wider">スタイリング名</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">総アクセス数</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">ユニークアクセス数<br />(合計)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">ユニークアクセス数<br />(会員登録済)</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 tracking-wider">ユニークアクセス数<br />(非会員)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stylingStats.length > 0 ? (
                        stylingStats.map((stat) => (
                          <tr key={stat.styling_id}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <ImageIcon className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                                <div className="text-sm font-medium">{stat.styling_title}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">{stat.view_count}</td>
                            <td className="px-4 py-3 text-sm text-right">{stat.unique_visitors}</td>
                            <td className="px-4 py-3 text-sm text-right">{stat.member_visitors}</td>
                            <td className="px-4 py-3 text-sm text-right">{stat.guest_visitors}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                            この期間のアクセスデータがありません
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
