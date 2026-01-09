import { useEffect, useState } from 'react';
import { api } from '../lib/api-client';
import { BarChart3, Eye, Users, ShoppingCart, Package, Download, ImageIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AnalyticsSummary {
  total_page_views: number;
  unique_visitors: number;
  total_orders: number;
  total_revenue: number;
  total_products: number;
  total_users: number;
  cart_additions: number;
}

interface PageViewData {
  page_path: string;
  page_title: string;
  views: number;
  unique_sessions: number;
  logged_in_users: number;
  anonymous_users: number;
}

interface ProductStats {
  product_id: string;
  product_name: string;
  cart_additions: number;
  unique_cart_users: number;
  purchases: number;
  unique_purchasers: number;
  revenue: number;
}

interface StylingStats {
  styling_id: string;
  styling_title: string;
  image_url: string;
  views: number;
  unique_sessions: number;
  logged_in_users: number;
  anonymous_users: number;
}

type Period = '24h' | '7d' | '30d';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [pageViews, setPageViews] = useState<PageViewData[]>([]);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [stylingStats, setStylingStats] = useState<StylingStats[]>([]);
  const [period, setPeriod] = useState<Period>('7d');

  const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const [summaryData, pageViewsData] = await Promise.all([
        api.admin.getAnalyticsSummary(),
        api.admin.getPageViews(days),
      ]);
      
      setSummary(summaryData);
      
      // ページ別の集計
      const pagePathStats = pageViewsData.reduce((acc: Record<string, PageViewData>, pv: any) => {
        const key = pv.page_path;
        if (!acc[key]) {
          acc[key] = { 
            page_path: pv.page_path,
            page_title: pv.page_title || getPageTitle(pv.page_path),
            views: 0, 
            unique_sessions: 0,
            logged_in_users: 0,
            anonymous_users: 0,
          };
        }
        acc[key].views += parseInt(String(pv.views));
        acc[key].unique_sessions += parseInt(String(pv.unique_sessions));
        return acc;
      }, {});

      const sortedPages = Object.values(pagePathStats).sort((a, b) => b.views - a.views);
      setPageViews(sortedPages);

      // 商品・スタイリング統計（仮データ）
      // 実際のAPIからデータを取得する場合はここを更新
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  function getPageTitle(path: string): string {
    const titles: Record<string, string> = {
      '/': 'Home',
      '/shop': 'Shop',
      '/cart': 'Cart',
      '/styling': 'Styling List',
      '/about': 'About',
      '/contact': 'Contact',
      '/login': 'Login',
      '/my-account': 'My Account',
    };
    if (path.startsWith('/shop/')) return path.replace('/shop/', '');
    if (path.startsWith('/styling/')) return path.replace('/styling/', '');
    return titles[path] || path;
  }

  function exportToExcel() {
    const pageData = pageViews.map(pv => ({
      'ページ名': pv.page_title,
      'パス': pv.page_path,
      '総アクセス数': pv.views,
      'ユニークアクセス数（合計）': pv.unique_sessions,
    }));

    const ws = XLSX.utils.json_to_sheet(pageData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'アクセス統計');

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `アクセス統計_${date}.xlsx`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-[1400px] mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-gray-300 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl tracking-[0.2em] font-light">
              アクセス統計
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex border border-gray-300">
              {(['24h', '7d', '30d'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-xs tracking-wider transition ${
                    period === p
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p === '24h' ? '24時間' : p === '7d' ? '7日間' : '30日間'}
                </button>
              ))}
            </div>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs tracking-wider hover:bg-gray-800 transition"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              エクスポート
            </button>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              <span className="text-xs tracking-wider text-gray-500">総ページビュー</span>
            </div>
            <p className="text-4xl font-light text-gray-900">
              {(summary?.total_page_views || 0).toLocaleString()}
            </p>
          </div>
          
          <div className="border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              <span className="text-xs tracking-wider text-gray-500">ユニークアクセス数</span>
            </div>
            <p className="text-4xl font-light text-gray-900">
              {(summary?.unique_visitors || 0).toLocaleString()}
            </p>
          </div>
          
          <div className="border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              <span className="text-xs tracking-wider text-gray-500">カート追加数</span>
            </div>
            <p className="text-4xl font-light text-gray-900">
              {(summary?.cart_additions || 0).toLocaleString()}
            </p>
          </div>
          
          <div className="border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              <span className="text-xs tracking-wider text-gray-500">商品購入数</span>
            </div>
            <p className="text-4xl font-light text-gray-900">
              {(summary?.total_orders || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* ページ別アクセス数 */}
        <div className="border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-sm tracking-wider font-light">ページ別アクセス数</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs tracking-wider text-gray-500 font-normal">
                    ページ名
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    総アクセス数
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    ユニークアクセス数<br />（合計）
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    ユニークアクセス数<br />（会員登録済）
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    ユニークアクセス数<br />（非会員）
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageViews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  pageViews.map((page, index) => (
                    <tr key={page.page_path} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{page.page_title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{page.page_path}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {page.views.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {page.unique_sessions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {page.logged_in_users.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                        {page.anonymous_users.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 商品別統計 */}
        <div className="border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-sm tracking-wider font-light">商品別統計</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs tracking-wider text-gray-500 font-normal">
                    商品名
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    カート追加<br />（総数）
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    カート追加<br />（ユニーク）
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    購入数<br />（総数）
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    購入数<br />（ユニーク）
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    売上
                  </th>
                </tr>
              </thead>
              <tbody>
                {productStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  productStats.map((product, index) => (
                    <tr key={product.product_id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.product_name}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{product.cart_additions}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{product.unique_cart_users}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{product.purchases}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{product.unique_purchasers}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">¥{Math.floor(product.revenue).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* スタイリング別アクセス数 */}
        <div className="border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-sm tracking-wider font-light">スタイリング別アクセス数</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs tracking-wider text-gray-500 font-normal">
                    スタイリング名
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    総アクセス数
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    ユニークアクセス数<br />（合計）
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    ユニークアクセス数<br />（会員登録済）
                  </th>
                  <th className="px-6 py-4 text-center text-xs tracking-wider text-gray-500 font-normal">
                    ユニークアクセス数<br />（非会員）
                  </th>
                </tr>
              </thead>
              <tbody>
                {stylingStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  stylingStats.map((styling, index) => (
                    <tr key={styling.styling_id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {styling.image_url ? (
                            <img src={styling.image_url} alt="" className="w-10 h-10 object-cover bg-gray-100" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <span className="text-sm text-gray-900">{styling.styling_title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{styling.views}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{styling.unique_sessions}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{styling.logged_in_users}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-900">{styling.anonymous_users}</td>
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
