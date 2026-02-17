import { Link } from 'react-router-dom';
import { Package, Image, Users, Shield, BarChart3, ShoppingBag, Shirt } from 'lucide-react';

export default function AdminDashboard() {
  const adminSections = [
    {
      title: '商品管理',
      subtitle: 'Product Management',
      description: '商品の追加、編集、削除を行います',
      icon: Package,
      path: '/admin/products',
      color: 'border-gray-900',
    },
    {
      title: 'スタイリング管理',
      subtitle: 'Styling Management',
      description: 'スタイリング画像とコンテンツを管理します',
      icon: Image,
      path: '/admin/styling',
      color: 'border-gray-900',
    },
    {
      title: 'ワードローブ',
      subtitle: 'Wardrobe Management',
      description: '所有アイテムの管理、スタイリング、サイズ推薦',
      icon: Shirt,
      path: '/admin/wardrobe',
      color: 'border-gray-900',
    },
    {
      title: 'アカウント管理',
      subtitle: 'Account Management',
      description: 'ユーザーと管理者権限を管理します',
      icon: Users,
      path: '/admin/accounts',
      color: 'border-gray-900',
    },
    {
      title: 'アクセス統計',
      subtitle: 'Analytics',
      description: 'サイトのアクセス数や売上データを確認します',
      icon: BarChart3,
      path: '/admin/analytics',
      color: 'border-gray-900',
    },
    {
      title: '注文管理',
      subtitle: 'Order Management',
      description: '注文状況の確認と発送管理を行います',
      icon: ShoppingBag,
      path: '/admin/orders',
      color: 'border-gray-900',
    },
  ];

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 border border-gray-300 mb-6">
            <Shield className="w-7 h-7 text-gray-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl md:text-4xl tracking-[0.3em] mb-3 font-light">
            ADMIN DASHBOARD
          </h1>
          <p className="text-xs tracking-[0.15em] text-gray-500">
            管理者ダッシュボード / Administrator Control Panel
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {adminSections.map((section) => (
            <Link
              key={section.path}
              to={section.path}
              className="group border border-gray-200 p-8 hover:border-gray-900 transition-all duration-300"
            >
              <div className={`w-14 h-14 border ${section.color} flex items-center justify-center mb-6 group-hover:bg-gray-900 transition-colors duration-300`}>
                <section.icon className="w-6 h-6 text-gray-900 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
              </div>

              <h2 className="text-xl tracking-wider font-light mb-2">
                {section.title}
              </h2>
              <p className="text-xs tracking-[0.15em] text-gray-500 mb-4">
                {section.subtitle}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {section.description}
              </p>

              <div className="mt-6 flex items-center text-xs tracking-wider text-gray-900 group-hover:translate-x-2 transition-transform duration-300">
                管理画面へ
                <span className="ml-2">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-50 border border-gray-200">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Shield className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
            </div>
            <div className="text-sm text-gray-600 leading-relaxed">
              <p className="font-medium mb-3 tracking-wider">管理者機能へようこそ</p>
              <p className="mb-2">
                このダッシュボードから、THE LONG GAMEの全ての管理機能にアクセスできます。
              </p>
              <p>
                各セクションでは、商品情報の管理、コンテンツの更新、ユーザー権限の管理が可能です。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
